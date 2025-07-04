import express from 'express';
import logger from './logger/logger';
import { exit } from 'process';
import db from './db';
import { config } from './config';
import router from './routes/register.routes';
import cors from 'cors';

let API_SECRET: string = '';

if (config.API_SECRET) {
    API_SECRET = config.API_SECRET;
} else {
    try {
        const tmp_secret_json = require('./secret.json');
        API_SECRET = String(tmp_secret_json);
    } catch (e) {
        logger.error('API_SECRET NOT SET!!!');
        exit(1);
    }
}

const app = express();
const PORT = config.PORT || 3000;
app.use(express.json());
app.use(cors());


(async () => {
    try {
        await db.initialize();
        await db.initializeSchema("./src/db/schema.sql");

        app.use('/api', router);

        app.listen(PORT, () => {
            logger.info(`Server running at http://localhost:${PORT}`);
        });
    } catch (err: any) {
        logger.error(err);
        exit(1);
    }

})();

import cron from 'node-cron';

// Schedule task to run every 10 minutes
cron.schedule('*/10 * * * *', async () => {
    logger.info(`Pruning records job started`);
    await db.cleanOldRecords();

});
