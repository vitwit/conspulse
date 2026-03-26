import { Router } from 'express';
import { registerNode } from '../controllers/register.controller';
import { submitStats, getStats } from '../controllers/stats.controller';
import { getBlocks, getBlock } from '../controllers/blocks.controller';

const router = Router();

router.post('/register', registerNode);
router.post('/submit-stats', submitStats);
router.get('/node-stats', getStats);
router.get('/blocks', getBlocks);
router.get('/blocks/:height', getBlock);

export default router;
