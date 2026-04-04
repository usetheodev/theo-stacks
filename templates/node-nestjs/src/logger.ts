import { LoggerService } from "@nestjs/common";
import * as pino from "pino";

const logger = (pino as any)({ level: process.env.LOG_LEVEL || "info" });

export class PinoLogger implements LoggerService {
  log(message: string, context?: string) {
    logger.info({ context }, message);
  }

  error(message: string, trace?: string, context?: string) {
    logger.error({ context, trace }, message);
  }

  warn(message: string, context?: string) {
    logger.warn({ context }, message);
  }

  debug(message: string, context?: string) {
    logger.debug({ context }, message);
  }

  verbose(message: string, context?: string) {
    logger.trace({ context }, message);
  }
}
