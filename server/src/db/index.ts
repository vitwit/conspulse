import { config } from '../config';
import { Database } from './db';

const db = new Database(
    config.CLICKHOUSE_HOST,
    config.CLICKHOUSE_USER,
    config.CLICKHOUSE_PASSWORD,
    config.CLICKHOUSE_DATABASE,
);

export default db;
