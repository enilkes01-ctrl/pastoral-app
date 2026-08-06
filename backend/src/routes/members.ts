import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// Admin ve todas las iglesias; visitador solo la suya
function churchFilter(req: AuthRequest) {
  return req.user!.role === 'admin' ? {} : { churchId: req.user!.churchId };
}

router.get('/', async (req: AuthRequest, res) => {
  const { search } = req.query;

  const members = await prisma.member.findMany({
    where: {
      ...churchFilter(req),
      ...(search
        ? { name: { contains: String(search), mode: 'insensitive' as const } }
        : {}),
    },
    include: { church: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  res.json(members);
});

router.get('/:id', async (req: AuthRequest, res) => {
  const member = await prisma.member.findFirst({
    where: { id: Number(req.params.id), ...churchFilter(req) },
    include: {
      church: { select: { name: true } },
      families: true,
      needs: { orderBy: { createdAt: 'desc' } },
      contacts: { orderBy: { date: 'desc' }, take: 10 },
      visits: { orderBy: { scheduledDate: 'desc' }, take: 10 },
    },
  });

  if (!member) return res.status(404).json({ error: 'Miembro no encontrado' });
  res.json(member);
});

router.post('/', async (req: AuthRequest, res) => {
  const { name, phone, email, status, notes, churchId } = req.body;

  if (!name) return res.status(400).json({ error: 'El nombre es requerido' });

  const targetChurchId = req.user!.role === 'admin' ? churchId : req.user!.churchId;
  if (!targetChurchId) return res.status(400).json({ error: 'La iglesia es requerida' });

  const member = await prisma.member.create({
    data: { name, phone, email, status, notes, churchId: targetChurchId },
  });

  res.status(201).json(member);
});

router.put('/:id', async (req: AuthRequest, res) => {
  const existing = await prisma.member.findFirst({
    where: { id: Number(req.params.id), ...churchFilter(req) },
  });
  if (!existing) return res.status(404).json({ error: 'Miembro no encontrado' });

  const { name, phone, email, status, notes } = req.body;
  const member = await prisma.member.update({
    where: { id: existing.id },
    data: { name, phone, email, status, notes },
  });

  res.json(member);
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const existing = await prisma.member.findFirst({
    where: { id: Number(req.params.id), ...churchFilter(req) },
  });
  if (!existing) return res.status(404).json({ error: 'Miembro no encontrado' });

  await prisma.member.delete({ where: { id: existing.id } });
  res.status(204).send();
});

// Familia
router.post('/:id/families', async (req: AuthRequest, res) => {
  const member = await prisma.member.findFirst({
    where: { id: Number(req.params.id), ...churchFilter(req) },
  });
  if (!member) return res.status(404).json({ error: 'Miembro no encontrado' });

  const { name, relation, dob } = req.body;
  const family = await prisma.family.create({
    data: { memberId: member.id, name, relation, dob: dob ? new Date(dob) : null },
  });
  res.status(201).json(family);
});

// Necesidades
router.post('/:id/needs', async (req: AuthRequest, res) => {
  const member = await prisma.member.findFirst({
    where: { id: Number(req.params.id), ...churchFilter(req) },
  });
  if (!member) return res.status(404).json({ error: 'Miembro no encontrado' });

  const { description, priority } = req.body;
  if (!description) return res.status(400).json({ error: 'La descripción es requerida' });

  const need = await prisma.need.create({
    data: { memberId: member.id, description, priority },
  });
  res.status(201).json(need);
});

router.put('/:id/needs/:needId', async (req: AuthRequest, res) => {
  const member = await prisma.member.findFirst({
    where: { id: Number(req.params.id), ...churchFilter(req) },
  });
  if (!member) return res.status(404).json({ error: 'Miembro no encontrado' });

  const need = await prisma.need.update({
    where: { id: Number(req.params.needId) },
    data: { resolved: req.body.resolved },
  });
  res.json(need);
});

export default router;
