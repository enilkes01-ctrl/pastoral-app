import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

function churchFilter(req: AuthRequest) {
  return req.user!.role === 'admin' ? {} : { churchId: { in: req.user!.churchIds } };
}

// Agenda de visitas (todas las de la iglesia del usuario, o todas si es admin)
router.get('/', async (req: AuthRequest, res) => {
  const visits = await prisma.visitSchedule.findMany({
    where: { member: churchFilter(req) },
    include: {
      member: { select: { name: true, phone: true, churchId: true } },
      user: { select: { firstName: true, lastName: true } },
    },
    orderBy: { scheduledDate: 'asc' },
  });
  res.json(visits);
});

const VALID_TYPES = ['visita', 'llamada', 'mensaje'];

router.post('/', async (req: AuthRequest, res) => {
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

  res.status(201).json(visit);
});

router.put('/:id', async (req: AuthRequest, res) => {
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

  res.json(updated);
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const visit = await prisma.visitSchedule.findFirst({
    where: { id: Number(req.params.id), member: churchFilter(req) },
  });
  if (!visit) return res.status(404).json({ error: 'Visita no encontrada' });

  await prisma.visitSchedule.delete({ where: { id: visit.id } });
  res.status(204).send();
});

export default router;
