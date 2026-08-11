import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { getOrGenerateSuggestions } from '../lib/suggestions';

const router = Router();
router.use(requireAuth);

router.get('/today', asyncHandler(async (req: AuthRequest, res) => {
  const all = await getOrGenerateSuggestions();
  const visible =
    req.user!.role === 'admin' ? all : all.filter((m) => req.user!.churchIds.includes(m.churchId));

  res.json(
    visible.map((m) => ({
      id: m.id,
      name: m.name,
      phone: m.phone,
      church: m.church.name,
    }))
  );
}));

export default router;
