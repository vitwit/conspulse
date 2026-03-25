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
import { Registry, decodeTxRaw } from "@cosmjs/proto-signing";
import { VoteExtension } from "./proto/vote_ext";


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

        const registry = new Registry();

        // Register your VoteExtension type
        registry.register("/heimdallv2.sidetxs.VoteExtension", VoteExtension);

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

declare global {
    var __cleanupJobScheduled: boolean | undefined;
}

if (!global.__cleanupJobScheduled) {
    global.__cleanupJobScheduled = true;

    let pruning = false;

    cron.schedule('*/3 * * * *', async () => {
        if (pruning) {
            logger.info('Last pruning job is not completed');
            return;
        }

        pruning = true;
        logger.info(`[cron] Pruning records job started by PID: ${process.pid}`);

        try {
            await db.cleanOldRecords();
        } catch (err) {
            logger.error(`Error during cleanup: ${err}`);
        }

        pruning = false;
    });

    console.log(`[cron] Cleanup job scheduled by PID: ${process.pid}`);
}