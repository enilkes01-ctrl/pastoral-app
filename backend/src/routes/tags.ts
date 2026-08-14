import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (_req, res) => {
  const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
  res.json(tags);
}));

// Solo un admin puede crear nuevas etiquetas (categorías reutilizables)
router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const { name, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });

  const existing = await prisma.tag.findUnique({ where: { name: name.trim() } });
  if (existing) return res.status(409).json({ error: 'Ya existe una etiqueta con ese nombre' });

  const tag = await prisma.tag.create({ data: { name: name.trim(), color } });
  res.status(201).json(tag);
}));

router.put('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { name, color } = req.body;
  const tag = await prisma.tag.update({
    where: { id: Number(req.params.id) },
    data: { name, color },
  });
  res.json(tag);
}));

router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  await prisma.tag.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

export default router;
