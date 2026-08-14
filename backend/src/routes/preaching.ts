import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();
router.use(requireAuth);

function churchFilter(req: AuthRequest) {
  return req.user!.role === 'admin' ? {} : { churchId: { in: req.user!.churchIds } };
}

// Determina a qué iglesia debe asignarse una predicación, validando acceso
function resolveTargetChurchId(req: AuthRequest, providedChurchId?: number): number | null {
  if (req.user!.role === 'admin') return providedChurchId || null;
  if (req.user!.churchIds.length === 1) return req.user!.churchIds[0];
  if (providedChurchId && req.user!.churchIds.includes(providedChurchId)) return providedChurchId;
  return null;
}

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const preachings = await prisma.preachingSchedule.findMany({
    where: churchFilter(req),
    include: {
      church: { select: { name: true } },
      user: { select: { firstName: true, lastName: true } },
    },
    orderBy: { date: 'asc' },
  });
  res.json(preachings);
}));

router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const { title, date, location, churchId, assignedTo } = req.body;

  if (!title || !date) {
    return res.status(400).json({ error: 'Título y fecha son requeridos' });
  }

  const targetChurchId = resolveTargetChurchId(req, churchId ? Number(churchId) : undefined);
  if (!targetChurchId) return res.status(400).json({ error: 'La iglesia es requerida' });

  const preaching = await prisma.preachingSchedule.create({
    data: {
      title,
      date: new Date(date),
      location,
      churchId: targetChurchId,
      assignedTo: assignedTo || req.user!.id,
    },
  });

  res.status(201).json(preaching);
}));

router.put('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const existing = await prisma.preachingSchedule.findFirst({
    where: { id: Number(req.params.id), ...churchFilter(req) },
  });
  if (!existing) return res.status(404).json({ error: 'Predicación no encontrada' });

  const { title, date, location, assignedTo } = req.body;

  const preaching = await prisma.preachingSchedule.update({
    where: { id: existing.id },
    data: {
      title,
      date: date ? new Date(date) : undefined,
      location,
      assignedTo,
    },
  });

  res.json(preaching);
}));

router.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const existing = await prisma.preachingSchedule.findFirst({
    where: { id: Number(req.params.id), ...churchFilter(req) },
  });
  if (!existing) return res.status(404).json({ error: 'Predicación no encontrada' });

  await prisma.preachingSchedule.delete({ where: { id: existing.id } });
  res.status(204).send();
}));

export default router;
