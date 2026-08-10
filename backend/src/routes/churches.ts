import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// Admin ve todas las iglesias; el resto ve solo las que tiene asignadas
router.get('/', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const churches = await prisma.church.findMany({
    where: req.user!.role === 'admin' ? {} : { id: { in: req.user!.churchIds } },
    orderBy: { name: 'asc' },
  });
  res.json(churches);
}));

export default router;
