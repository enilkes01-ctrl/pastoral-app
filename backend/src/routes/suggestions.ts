import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { getOrGenerateSuggestionsForUser } from '../lib/suggestions';

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
    }))
  );
}));

export default router;
