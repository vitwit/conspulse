import { Router } from 'express';
import { registerNode } from '../controllers/register.controller';
import { submitStats, getStats } from '../controllers/stats.controller';
import { getBlocks, getBlock, getSideTx } from '../controllers/blocks.controller';
import { getTransactions, getTransaction } from '../controllers/transactions.controller';

const router = Router();

router.post('/register', registerNode);
router.post('/submit-stats', submitStats);
router.get('/node-stats', getStats);
router.get('/blocks', getBlocks);
router.get('/blocks/:height', getBlock);
router.get('/sideTx/:height', getSideTx);
router.get('/txs', getTransactions);
router.get('/txs/:hash', getTransaction);

export default router;
