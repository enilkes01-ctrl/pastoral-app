import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();
router.use(requireAuth);

function churchFilter(req: AuthRequest) {
  return req.user!.role === 'admin' ? {} : { churchId: { in: req.user!.churchIds } };
}

const VALID_STATUSES = ['activo', 'contestada', 'caducada'];

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const requests = await prisma.prayerRequest.findMany({
    where: { member: churchFilter(req) },
    include: {
      member: { select: { name: true, phone: true, churchId: true } },
      user: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
  });
  res.json(requests);
}));

router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const { memberId, description, scheduledAt, assignedTo } = req.body;

  if (!memberId || !description) {
    return res.status(400).json({ error: 'Miembro y descripción son requeridos' });
  }

  const member = await prisma.member.findFirst({
    where: { id: Number(memberId), ...churchFilter(req) },
  });
  if (!member) return res.status(404).json({ error: 'Miembro no encontrado' });

  const request = await prisma.prayerRequest.create({
    data: {
      memberId: member.id,
      description,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      assignedTo: assignedTo || req.user!.id,
    },
  });

  res.status(201).json(request);
}));

router.put('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const request = await prisma.prayerRequest.findFirst({
    where: { id: Number(req.params.id), member: churchFilter(req) },
  });
  if (!request) return res.status(404).json({ error: 'Pedido de oración no encontrado' });

  const { description, scheduledAt, status } = req.body;
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Estatus inválido' });
  }

  const updated = await prisma.prayerRequest.update({
    where: { id: request.id },
    data: {
      description,
      scheduledAt: scheduledAt === undefined ? undefined : scheduledAt ? new Date(scheduledAt) : null,
      status,
    },
  });

  res.json(updated);
}));

router.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const request = await prisma.prayerRequest.findFirst({
    where: { id: Number(req.params.id), member: churchFilter(req) },
  });
  if (!request) return res.status(404).json({ error: 'Pedido de oración no encontrado' });

  await prisma.prayerRequest.delete({ where: { id: request.id } });

  res.status(204).send();
}));

export default router;
