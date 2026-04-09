// Next.js instrumentation — structured logging and graceful shutdown
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const pino = require("pino");
    const logger = pino({ level: process.env.LOG_LEVEL || "info" });

    globalThis.__logger = logger;
    logger.info("Application starting");

    // Graceful shutdown
    const shutdown = (signal: string) => {
      logger.info({ signal }, "Shutdown signal received");
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  }
}
