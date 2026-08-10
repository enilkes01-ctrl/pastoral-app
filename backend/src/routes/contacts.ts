import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();
router.use(requireAuth);

function churchFilter(req: AuthRequest) {
  return req.user!.role === 'admin' ? {} : { churchId: { in: req.user!.churchIds } };
}

// Historial de contactos de todas las iglesias accesibles (más recientes primero)
router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const contacts = await prisma.contact.findMany({
    where: { member: churchFilter(req) },
    include: {
      member: { select: { name: true, phone: true } },
      user: { select: { firstName: true, lastName: true } },
    },
    orderBy: { date: 'desc' },
  });
  res.json(contacts);
}));

// Historial de contactos de un miembro
router.get('/member/:memberId', asyncHandler(async (req: AuthRequest, res) => {
  const member = await prisma.member.findFirst({
    where: { id: Number(req.params.memberId), ...churchFilter(req) },
  });
  if (!member) return res.status(404).json({ error: 'Miembro no encontrado' });

  const contacts = await prisma.contact.findMany({
    where: { memberId: member.id },
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { date: 'desc' },
  });
  res.json(contacts);
}));

router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const { memberId, type, date, notes, viaSms, viaEmail } = req.body;

  if (!memberId || !type || !date) {
    return res.status(400).json({ error: 'Miembro, tipo y fecha son requeridos' });
  }

  const member = await prisma.member.findFirst({
    where: { id: Number(memberId), ...churchFilter(req) },
  });
  if (!member) return res.status(404).json({ error: 'Miembro no encontrado' });

  const contact = await prisma.contact.create({
    data: {
      memberId: member.id,
      type,
      date: new Date(date),
      notes,
      viaSms: !!viaSms,
      viaEmail: !!viaEmail,
      contactBy: req.user!.id,
    },
  });

  await prisma.member.update({
    where: { id: member.id },
    data: { lastContact: new Date(date) },
  });

  res.status(201).json(contact);
}));

router.put('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const existing = await prisma.contact.findFirst({
    where: { id: Number(req.params.id), member: churchFilter(req) },
  });
  if (!existing) return res.status(404).json({ error: 'Contacto no encontrado' });

  const { type, date, notes, viaSms, viaEmail } = req.body;

  const contact = await prisma.contact.update({
    where: { id: existing.id },
    data: {
      type,
      date: date ? new Date(date) : undefined,
      notes,
      viaSms: viaSms !== undefined ? !!viaSms : undefined,
      viaEmail: viaEmail !== undefined ? !!viaEmail : undefined,
    },
  });

  // Recalcular el último contacto del miembro por si se editó la fecha
  const latest = await prisma.contact.findFirst({
    where: { memberId: existing.memberId },
    orderBy: { date: 'desc' },
  });
  await prisma.member.update({
    where: { id: existing.memberId },
    data: { lastContact: latest?.date ?? null },
  });

  res.json(contact);
}));

export default router;
