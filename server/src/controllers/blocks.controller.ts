import db from '../db';
import logger from '../logger/logger';

export const getBlocks = async (
    req: any,
    res: any
) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '25', 10);

        const blocks = await db.getBlocksPaginated(page, limit);

        return res.status(200).json({
            blocks
        });
    } catch (err) {
        logger.error(`Internal server error ${err}`);
        return res.status(500).json({ message: `Internal server error, ${err}` });
    }
}

export const getBlock = async (
    req: any,
    res: any
) => {
    try {
        const { height } = req.params;

        const block = await db.getBlock(parseInt(height, 10));
        return res.status(200).json({
            block
        });
    } catch (err) {
        logger.error(`Internal server error ${err}`);
        return res.status(500).json({ message: `Internal server error, ${err}` });
    }
}

export const getSideTx = async (
    req: any,
    res: any
) => {
    try {
        const { height } = req.params;

        const sideTx = await db.getSideTx(parseInt(height, 10));
        return res.status(200).json({
            sideTx
        });
    } catch (err) {
        logger.error(`Internal server error ${err}`);
        return res.status(500).json({ message: `Internal server error, ${err}` });
    }
}