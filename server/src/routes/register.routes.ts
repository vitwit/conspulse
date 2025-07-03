import { Router } from 'express';
import { registerNode } from '../controllers/register.controller';
import { submitStats, getStats } from '../controllers/stats.controller';

const router = Router();

router.post('/register', registerNode);
router.post('/submit-stats', submitStats);
router.get('/stats', getStats);

export default router;
