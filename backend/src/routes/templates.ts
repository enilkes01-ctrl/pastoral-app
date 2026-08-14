import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();
router.use(requireAuth);

// Sin requireAdmin: tanto Enilkes como Joselo pueden crear/editar/borrar plantillas.
router.get('/', asyncHandler(async (_req, res) => {
  const templates = await prisma.messageTemplate.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
  res.json(templates);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, category, body } = req.body;
  if (!name?.trim() || !category || !body?.trim()) {
    return res.status(400).json({ error: 'Nombre, categoría y texto son requeridos' });
  }

  const template = await prisma.messageTemplate.create({
    data: { name: name.trim(), category, body: body.trim() },
  });
  res.status(201).json(template);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const { name, category, body } = req.body;
  const template = await prisma.messageTemplate.update({
    where: { id: Number(req.params.id) },
    data: { name, category, body },
  });
  res.json(template);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await prisma.messageTemplate.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

export default router;
