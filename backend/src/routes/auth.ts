import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// Limitador de intentos de login en memoria (sin dependencia nueva) — se reinicia
// si el backend se reinicia, es una protección liviana, no un límite duro.
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

function registerFailedLogin(key: string) {
  const attempt = loginAttempts.get(key) || { count: 0, lockedUntil: 0 };
  attempt.count += 1;
  if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
    attempt.lockedUntil = Date.now() + LOGIN_LOCK_MS;
    attempt.count = 0;
  }
  loginAttempts.set(key, attempt);
}

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  const key = email.toLowerCase();
  const attempt = loginAttempts.get(key);
  if (attempt && attempt.lockedUntil > Date.now()) {
    return res.status(429).json({ error: 'Demasiados intentos fallidos. Intenta de nuevo en unos minutos.' });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { accessChurches: true },
  });
  if (!user) {
    registerFailedLogin(key);
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  if (!user.active) {
    return res.status(403).json({ error: 'Cuenta desactivada. Contacta a tu administrador.' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    registerFailedLogin(key);
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  loginAttempts.delete(key);

  const churchIds = [user.churchId, ...user.accessChurches.map((c) => c.id)];

  const token = jwt.sign(
    { id: user.id, role: user.role, churchIds },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      churchId: user.churchId,
      churchIds,
    },
  });
}));

// Solo un admin puede crear nuevos usuarios (visitadores/asociados)
router.post('/register', requireAuth, requireAdmin, asyncHandler(async (req: AuthRequest, res) => {
  const { email, password, firstName, lastName, role, churchId, additionalChurchIds } = req.body;

  if (!email || !password || !churchId) {
    return res.status(400).json({ error: 'Email, contraseña e iglesia son requeridos' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      firstName,
      lastName,
      role: role || 'visitador',
      churchId,
      accessChurches: additionalChurchIds?.length
        ? { connect: additionalChurchIds.map((id: number) => ({ id })) }
        : undefined,
    },
    include: { accessChurches: true },
  });

  res.status(201).json({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    churchId: user.churchId,
    accessChurches: user.accessChurches,
  });
}));

router.get('/me', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      churchId: true,
      church: { select: { name: true } },
      accessChurches: { select: { id: true, name: true } },
    },
  });
  res.json(user);
}));

router.put('/me/password', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return res.status(400).json({ error: 'La contraseña actual es incorrecta' });

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

  res.status(204).send();
}));

export default router;
