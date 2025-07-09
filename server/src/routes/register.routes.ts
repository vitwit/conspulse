import { Router } from 'express';
import { registerNode } from '../controllers/register.controller';
import { submitStats, getStats } from '../controllers/stats.controller';

const router = Router();

router.post('/register', registerNode);
router.post('/submit-stats', submitStats);
router.get('/node-stats', getStats);

export default router;
