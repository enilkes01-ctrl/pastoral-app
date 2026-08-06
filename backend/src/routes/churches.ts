import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const churches = await prisma.church.findMany({ orderBy: { name: 'asc' } });
  res.json(churches);
});

export default router;
