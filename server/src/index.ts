import express, { Request, Response } from 'express';
import logger from './logger/logger';
import { exit } from 'process';
import db from './db';
import { config } from './config';
import router from './routes/register.routes';
import cors from 'cors';

import cron from 'node-cron';
import { blockCache } from './controllers/cache';
import { averageBlockTime, blockTimeBuckets, connectWS } from './tmrpc';
import { createServer } from 'http';
import { setupWebSocket } from './ws';


connectWS();

// REST client
const app = express();
const PORT = Number(config.PORT) || 3000;
app.use(express.json());
app.use(cors());

export const server = createServer(app);

(async () => {
    try {
        await db.initialize();
        await db.initializeSchema("./src/db/schema.sql");

        app.use('/api', router);

        app.get('/api/stats', async (req: Request, res: Response) => {
            res.status(200).json({
                averageBlockTime: `${(averageBlockTime / 1000).toFixed(2)}s`,
                blockPropagation: blockTimeBuckets,
                blocksWindow: blockCache,
            })
        })

        server.listen(PORT, '0.0.0.0', () => {
            logger.info(`Server running at http://localhost:${PORT}`);
        });

        setupWebSocket(server);

    } catch (err: any) {
        logger.error(err);
        exit(1);
    }

})();


// CRON section for cleanup

// Schedule task to run every 15 minutes
cron.schedule('*/15 * * * *', async () => {
    logger.info(`Pruning records job started`);
    await db.cleanOldRecords();

});
