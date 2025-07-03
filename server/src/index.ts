import express, { Request, Response } from 'express';
import logger from './logger/logger';
import { exit } from 'process';
import db from './db';
import { config } from './config';
import router from './routes/register.routes';
import path from 'path';
import next from 'next';
import cors from 'cors';

let API_SECRET: string = '';
const dev = process.env.NODE_ENV !== 'production';

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

const nextApp = next({ dev, dir: path.join(__dirname, '../../dashboard') });

const app = express();
const PORT = config.PORT || 3000;
app.use(express.json());
app.use(cors());


(async () => {
    try {
        await nextApp.prepare();
        await db.initialize();
        await db.initializeSchema("./src/db/schema.sql");
        const handle = nextApp.getRequestHandler();

        app.use('/api', router);

        // app.use('/favicon.ico', express.static(path.join(__dirname, '../../dashboard/public/favicon.ico')));
        // app.use(
        //     '/dashboard/_next',
        //     express.static(path.join(__dirname, '../../dashboard/.next/static'))
        // );
        // app.use('/conspulse-logo.svg', express.static(path.join(__dirname, '../../dashboard/public/conspulse-logo.svg')));
        // app.use('/polygon-logo.svg', express.static(path.join(__dirname, '../../dashboard/public/polygon-logo.svg')));
        // app.all('/{*any}', (req, res) => {
        //     return handle(req, res);
        // });



        app.listen(PORT, () => {
            logger.info(`Server running at http://localhost:${PORT}`);
        });
    } catch (err: any) {
        logger.error(err);
        exit(1);
    }

})();
