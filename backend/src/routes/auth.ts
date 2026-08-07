import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { accessChurches: true },
  });
  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

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
});

// Solo un admin puede crear nuevos usuarios (visitadores/asociados)
router.post('/register', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
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
});

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
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
});

export default router;
