import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { getOrGenerateSuggestionsForUser, todayKeyRD } from '../lib/suggestions';

const router = Router();
router.use(requireAuth);

router.get('/today', asyncHandler(async (req: AuthRequest, res) => {
  const members = await getOrGenerateSuggestionsForUser(req.user!);

  res.json(
    members.map((m) => ({
      id: m.id,
      name: m.name,
      phone: m.phone,
      church: m.church.name,
      sent: !!m.sentAt,
    }))
  );
}));

// Marca la sugerencia de hoy para ese miembro como "enviada" (persiste, sobrevive a recargar la página)
router.put('/:memberId/sent', asyncHandler(async (req: AuthRequest, res) => {
  const updated = await prisma.messageSuggestion.updateMany({
    where: { dateKey: todayKeyRD(), userId: req.user!.id, memberId: Number(req.params.memberId) },
    data: { sentAt: new Date() },
  });
  if (updated.count === 0) return res.status(404).json({ error: 'Sugerencia no encontrada' });
  res.status(204).send();
}));

export default router;
