import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/', asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      active: true,
      churchId: true,
      church: { select: { name: true } },
      accessChurches: { select: { id: true, name: true } },
    },
    orderBy: { firstName: 'asc' },
  });
  res.json(users);
}));

router.put('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const { firstName, lastName, role, churchId, additionalChurchIds, active } = req.body;

  if (req.user!.id === id && active === false) {
    return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      firstName,
      lastName,
      role,
      churchId: churchId ? Number(churchId) : undefined,
      active,
      accessChurches: additionalChurchIds
        ? { set: additionalChurchIds.map((cid: number) => ({ id: cid })) }
        : undefined,
    },
    include: { accessChurches: true },
  });

  res.json({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    active: user.active,
    churchId: user.churchId,
    accessChurches: user.accessChurches,
  });
}));

router.put('/:id/password', asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: Number(req.params.id) }, data: { password: hashed } });

  res.status(204).send();
}));

export default router;
