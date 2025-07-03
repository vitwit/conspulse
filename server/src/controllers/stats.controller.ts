import { Request, Response } from 'express';
import { z } from 'zod';
import db from '../db';
import { config } from '../config';
import formatZodErrors from '../utils/zod';
import logger from '../logger/logger';

export const StatsSchema = z.object({
    address: z.string(),
    moniker: z.string(),
    version: z.string(),
    earliestAppHash: z.string(),
    latestAppHash: z.string(),
    isSyncing: z.boolean(),
    earliestBlockHeight: z.number(),
    latestBlockHeight: z.number(),
    votingPower: z.number(),
    height: z.number(),
    blockTime: z.number(),
    nodeID: z.string(),
    peers: z.array(z.string()),
    network: z.string(),
    os: z.string(),
    goVersion: z.string(),

});

export const SubmitStatsSchema = z.object({
    secret: z.string().min(1),
    stats: StatsSchema,
});

export const submitStats = async (
    req: any,
    res: any
) => {
    const result = SubmitStatsSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            message: 'Invalid payload',
            errors: formatZodErrors(result.error),
        });
    }

    const { secret, stats } = result.data;
    if (secret !== config.API_SECRET) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const registered = await db.isNodeRegistered(stats.address);
        if (!registered) {
            return res.status(404).json({
                message: "Node not registered"
            })
        }

        await db.storeNodeStats(stats);

        return res.status(200).json({
            message: "stats saved successfully"
        });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const getStats = async (
    req: any,
    res: any
) => {
    try {
        const nodes = await db.getNodes();
        return res.status(200).json({
            nodes
        });
    } catch(err) {
        logger.error(`Internal server error ${err}`);
        return res.status(500).json({ message: 'Internal server error' });
    }
}