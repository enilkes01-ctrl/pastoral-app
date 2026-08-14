import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();
router.use(requireAuth);

// Admin ve todas las iglesias; visitador solo las que tiene asignadas
function churchFilter(req: AuthRequest) {
  return req.user!.role === 'admin' ? {} : { churchId: { in: req.user!.churchIds } };
}

// Determina a qué iglesia debe asignarse un nuevo registro, validando acceso
function resolveTargetChurchId(req: AuthRequest, providedChurchId?: number): number | null {
  if (req.user!.role === 'admin') return providedChurchId || null;
  if (req.user!.churchIds.length === 1) return req.user!.churchIds[0];
  if (providedChurchId && req.user!.churchIds.includes(providedChurchId)) return providedChurchId;
  return null;
}

const FOLLOW_UP_LEVELS = ['normal', 'prioritario', 'urgente'];

async function findAccessibleMember(req: AuthRequest, id: number) {
  return prisma.member.findFirst({ where: { id, ...churchFilter(req) } });
}

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
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
}));

router.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const member = await prisma.member.findFirst({
    where: { id: Number(req.params.id), ...churchFilter(req) },
    include: {
      church: { select: { name: true } },
      families: { orderBy: { createdAt: 'asc' } },
      needs: { orderBy: { createdAt: 'desc' } },
      contacts: { orderBy: { date: 'desc' }, take: 15, include: { user: { select: { firstName: true, lastName: true } } } },
      visits: { orderBy: { scheduledDate: 'desc' }, take: 15, include: { user: { select: { firstName: true, lastName: true } } } },
      tags: true,
    },
  });

  if (!member) return res.status(404).json({ error: 'Miembro no encontrado' });
  res.json(member);
}));

router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const { name, phone, email, status, notes, churchId } = req.body;

  if (!name) return res.status(400).json({ error: 'El nombre es requerido' });

  const targetChurchId = resolveTargetChurchId(req, churchId ? Number(churchId) : undefined);
  if (!targetChurchId) return res.status(400).json({ error: 'La iglesia es requerida' });

  const member = await prisma.member.create({
    data: { name, phone, email, status, notes, churchId: targetChurchId },
  });

  res.status(201).json(member);
}));

router.put('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const existing = await findAccessibleMember(req, Number(req.params.id));
  if (!existing) return res.status(404).json({ error: 'Miembro no encontrado' });

  const {
    name,
    phone,
    email,
    status,
    notes,
    photo,
    address,
    birthDate,
    baptismDate,
    ministries,
    responsibilities,
    interests,
    followUpLevel,
    nextAction,
  } = req.body;

  if (followUpLevel && !FOLLOW_UP_LEVELS.includes(followUpLevel)) {
    return res.status(400).json({ error: 'Nivel de seguimiento inválido' });
  }

  const member = await prisma.member.update({
    where: { id: existing.id },
    data: {
      name,
      phone,
      email,
      status,
      notes,
      photo,
      address,
      birthDate: birthDate === undefined ? undefined : birthDate ? new Date(birthDate) : null,
      baptismDate: baptismDate === undefined ? undefined : baptismDate ? new Date(baptismDate) : null,
      ministries,
      responsibilities,
      interests,
      followUpLevel,
      nextAction,
    },
  });

  res.json(member);
}));

router.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const existing = await findAccessibleMember(req, Number(req.params.id));
  if (!existing) return res.status(404).json({ error: 'Miembro no encontrado' });

  await prisma.member.delete({ where: { id: existing.id } });
  res.status(204).send();
}));

// Familia
router.post('/:id/families', asyncHandler(async (req: AuthRequest, res) => {
  const member = await findAccessibleMember(req, Number(req.params.id));
  if (!member) return res.status(404).json({ error: 'Miembro no encontrado' });

  const { name, relation, dob } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es requerido' });

  const family = await prisma.family.create({
    data: { memberId: member.id, name, relation, dob: dob ? new Date(dob) : null },
  });
  res.status(201).json(family);
}));

router.put('/:id/families/:familyId', asyncHandler(async (req: AuthRequest, res) => {
  const member = await findAccessibleMember(req, Number(req.params.id));
  if (!member) return res.status(404).json({ error: 'Miembro no encontrado' });

  const { name, relation, dob } = req.body;
  const family = await prisma.family.update({
    where: { id: Number(req.params.familyId) },
    data: { name, relation, dob: dob === undefined ? undefined : dob ? new Date(dob) : null },
  });
  res.json(family);
}));

router.delete('/:id/families/:familyId', asyncHandler(async (req: AuthRequest, res) => {
  const member = await findAccessibleMember(req, Number(req.params.id));
  if (!member) return res.status(404).json({ error: 'Miembro no encontrado' });

  await prisma.family.delete({ where: { id: Number(req.params.familyId) } });
  res.status(204).send();
}));

// Necesidades
router.post('/:id/needs', asyncHandler(async (req: AuthRequest, res) => {
  const member = await findAccessibleMember(req, Number(req.params.id));
  if (!member) return res.status(404).json({ error: 'Miembro no encontrado' });

  const { description, priority } = req.body;
  if (!description) return res.status(400).json({ error: 'La descripción es requerida' });

  const need = await prisma.need.create({
    data: { memberId: member.id, description, priority },
  });
  res.status(201).json(need);
}));

router.put('/:id/needs/:needId', asyncHandler(async (req: AuthRequest, res) => {
  const member = await findAccessibleMember(req, Number(req.params.id));
  if (!member) return res.status(404).json({ error: 'Miembro no encontrado' });

  const { description, priority, resolved } = req.body;
  const need = await prisma.need.update({
    where: { id: Number(req.params.needId) },
    data: { description, priority, resolved },
  });
  res.json(need);
}));

router.delete('/:id/needs/:needId', asyncHandler(async (req: AuthRequest, res) => {
  const member = await findAccessibleMember(req, Number(req.params.id));
  if (!member) return res.status(404).json({ error: 'Miembro no encontrado' });

  await prisma.need.delete({ where: { id: Number(req.params.needId) } });
  res.status(204).send();
}));

// Etiquetas
router.post('/:id/tags/:tagId', asyncHandler(async (req: AuthRequest, res) => {
  const member = await findAccessibleMember(req, Number(req.params.id));
  if (!member) return res.status(404).json({ error: 'Miembro no encontrado' });

  await prisma.member.update({
    where: { id: member.id },
    data: { tags: { connect: { id: Number(req.params.tagId) } } },
  });
  res.status(204).send();
}));

router.delete('/:id/tags/:tagId', asyncHandler(async (req: AuthRequest, res) => {
  const member = await findAccessibleMember(req, Number(req.params.id));
  if (!member) return res.status(404).json({ error: 'Miembro no encontrado' });

  await prisma.member.update({
    where: { id: member.id },
    data: { tags: { disconnect: { id: Number(req.params.tagId) } } },
  });
  res.status(204).send();
}));

export default router;
