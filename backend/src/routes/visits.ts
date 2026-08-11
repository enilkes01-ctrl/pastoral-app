import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();
router.use(requireAuth);

function churchFilter(req: AuthRequest) {
  return req.user!.role === 'admin' ? {} : { churchId: { in: req.user!.churchIds } };
}

// Agenda (visitas, llamadas o mensajes) de todas las iglesias accesibles
router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const visits = await prisma.visitSchedule.findMany({
    where: { member: churchFilter(req) },
    include: {
      member: { select: { name: true, phone: true, churchId: true } },
      user: { select: { firstName: true, lastName: true } },
    },
    orderBy: { scheduledDate: 'asc' },
  });
  res.json(visits);
}));

const VALID_TYPES = ['visita', 'llamada', 'mensaje'];

// Recalcula la fecha de la última visita completada de un miembro
async function recalcLastVisit(memberId: number) {
  const latest = await prisma.visitSchedule.findFirst({
    where: { memberId, type: 'visita', status: 'completada' },
    orderBy: { scheduledDate: 'desc' },
  });
  await prisma.member.update({
    where: { id: memberId },
    data: { lastVisit: latest?.scheduledDate ?? null },
  });
}

router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const { memberId, type, scheduledDate, notes, assignedTo } = req.body;

  if (!memberId || !scheduledDate) {
    return res.status(400).json({ error: 'Miembro y fecha son requeridos' });
  }
  if (type && !VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Tipo inválido' });
  }

  const member = await prisma.member.findFirst({
    where: { id: Number(memberId), ...churchFilter(req) },
  });
  if (!member) return res.status(404).json({ error: 'Miembro no encontrado' });

  const visit = await prisma.visitSchedule.create({
    data: {
      memberId: member.id,
      type: type || 'visita',
      scheduledDate: new Date(scheduledDate),
      notes,
      assignedTo: assignedTo || req.user!.id,
    },
  });

  await prisma.member.update({
    where: { id: member.id },
    data: { messageSuggested: true },
  });

  res.status(201).json(visit);
}));

router.put('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const visit = await prisma.visitSchedule.findFirst({
    where: { id: Number(req.params.id), member: churchFilter(req) },
  });
  if (!visit) return res.status(404).json({ error: 'Visita no encontrada' });

  const { status, notes, scheduledDate } = req.body;
  const updated = await prisma.visitSchedule.update({
    where: { id: visit.id },
    data: {
      status,
      notes,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
    },
  });

  if (updated.type === 'visita') await recalcLastVisit(updated.memberId);

  res.json(updated);
}));

router.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const visit = await prisma.visitSchedule.findFirst({
    where: { id: Number(req.params.id), member: churchFilter(req) },
  });
  if (!visit) return res.status(404).json({ error: 'Visita no encontrada' });

  await prisma.visitSchedule.delete({ where: { id: visit.id } });

  if (visit.type === 'visita') await recalcLastVisit(visit.memberId);

  res.status(204).send();
}));

export default router;
