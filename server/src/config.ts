import dotenv from 'dotenv';
import { z } from 'zod';
import logger from './logger/logger';

dotenv.config();

const configSchema = z.object({
  API_SECRET: z.string().min(1),
  CLICKHOUSE_HOST: z.string().url(),
  CLICKHOUSE_USER: z.string(),
  CLICKHOUSE_PASSWORD: z.string(),
  CLICKHOUSE_DATABASE: z.string(),
  PORT: z.string().optional().default('3000'),
  RPC_URL: z.string(),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
