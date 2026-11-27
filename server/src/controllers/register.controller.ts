import { Request, Response } from 'express';
import { z } from 'zod';
import db from '../db';
import { config } from '../config';
import formatZodErrors from '../utils/zod';
import { secretsMatch } from '../utils/secret';

export const NodeInfoSchema = z.object({
    id: z.string(),
    version: z.string(),
    network: z.string(),
    os: z.string(),
    goVersion: z.string(),
    address: z.string(),
    pubkeyType: z.string(),
    pubkey: z.string(),
    isValidator: z.boolean(),
}).strict(); // fail-closed: reject any unexpected field (e.g. a leaked private key) instead of silently stripping it

export const RegisterRequestSchema = z.object({
    secret: z.string().min(1),
    nodeInfo: NodeInfoSchema,
}).strict();

export const registerNode = async (
    req: any,
    res: any
) => {
    const result = RegisterRequestSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            message: 'Invalid payload',
            errors: formatZodErrors(result.error),
        });
    }

    const { secret, nodeInfo } = result.data;
    if (!secretsMatch(secret, config.API_SECRET)) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const registered = await db.isNodeRegistered(nodeInfo.address);
        if (registered) {
            return res.status(400).json({
                message: "Node already registered"
            })
        }

        await db.registerNode(nodeInfo);
        return res.status(200).json(nodeInfo);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
