import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();
router.use(requireAuth);

function churchFilter(req: AuthRequest) {
  return req.user!.role === 'admin' ? {} : { churchId: { in: req.user!.churchIds } };
}

const VALID_TYPES = [
  'volver-a-visitar',
  'llamar',
  'enviar-material',
  'coordinar-ayuda',
  'contactar-anciano',
  'orar',
  'personalizada',
];

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const tasks = await prisma.task.findMany({
    where: { member: churchFilter(req) },
    include: {
      member: { select: { name: true, phone: true, churchId: true } },
      user: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(tasks);
}));

router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const { memberId, type, description, dueDate, relatedVisitId, assignedTo } = req.body;

  if (!memberId || !type) {
    return res.status(400).json({ error: 'Miembro y tipo son requeridos' });
  }
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Tipo inválido' });
  }

  const member = await prisma.member.findFirst({
    where: { id: Number(memberId), ...churchFilter(req) },
  });
  if (!member) return res.status(404).json({ error: 'Miembro no encontrado' });

  const task = await prisma.task.create({
    data: {
      memberId: member.id,
      type,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      relatedVisitId: relatedVisitId ? Number(relatedVisitId) : undefined,
      assignedTo: assignedTo || req.user!.id,
    },
  });

  res.status(201).json(task);
}));

router.put('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const task = await prisma.task.findFirst({
    where: { id: Number(req.params.id), member: churchFilter(req) },
  });
  if (!task) return res.status(404).json({ error: 'Tarea no encontrada' });

  const { status, type, description, dueDate } = req.body;
  if (type && !VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Tipo inválido' });
  }

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      status,
      type,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    },
  });

  res.json(updated);
}));

router.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const task = await prisma.task.findFirst({
    where: { id: Number(req.params.id), member: churchFilter(req) },
  });
  if (!task) return res.status(404).json({ error: 'Tarea no encontrada' });

  await prisma.task.delete({ where: { id: task.id } });

  res.status(204).send();
}));

export default router;
