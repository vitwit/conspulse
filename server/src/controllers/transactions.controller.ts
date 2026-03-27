import db from '../db';
import logger from '../logger/logger';

export const getTransactions = async (
    req: any,
    res: any
) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '10', 10);

        const txs = await db.getTxsPaginated(page, limit);

        return res.status(200).json({
            txs
        });
    } catch (err) {
        logger.error(`Internal server error ${err}`);
        return res.status(500).json({ message: `Internal server error, ${err}` });
    }
}

export const getTransaction = async (
    req: any,
    res: any
) => {
    try {
        const { hash } = req.params;

        const tx = await db.getTransaction(hash);
        return res.status(200).json({
            tx
        });
    } catch (err) {
        logger.error(`Internal server error ${err}`);
        return res.status(500).json({ message: `Internal server error, ${err}` });
    }
}