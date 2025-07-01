import pino, { levels } from 'pino';

const logger = pino({
  level: "debug",
  transport: {
    target: 'pino-pretty', 
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

export default logger;
