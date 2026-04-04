const express = require("express");
const cors = require("cors");
const pino = require("pino");

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

const app = express();
const port = process.env.PORT || 3000;

let isShuttingDown = false;
let isProcessingJob = false;

app.use(cors());

// Health endpoint for Kubernetes probes
app.get("/health", (req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({ status: "shutting-down" });
  }
  res.json({ status: "ok" });
});

// Readiness probe — customize: add database/redis checks for production
app.get("/ready", (req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({ status: "shutting-down" });
  }
  res.json({ status: "ready" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Error handler
app.use((err, req, res, _next) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(port, () => {
  logger.info({ port }, "Health server running");
});

// Worker loop
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || "5000", 10);

async function processJob() {
  // Replace this with your actual job logic:
  // - poll a queue (SQS, Redis, RabbitMQ)
  // - process pending database records
  // - run a scheduled task
  isProcessingJob = true;
  try {
    logger.info("Processing job...");
  } finally {
    isProcessingJob = false;
  }
}

async function runWorker() {
  logger.info({ pollInterval: POLL_INTERVAL_MS }, "Worker started");

  while (!isShuttingDown) {
    try {
      await processJob();
    } catch (err) {
      logger.error({ err }, "Job processing failed");
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  logger.info("Worker loop stopped");
}

// Graceful shutdown
function shutdown(signal) {
  logger.info({ signal }, "Shutdown signal received");
  isShuttingDown = true;

  const checkInterval = setInterval(() => {
    if (!isProcessingJob) {
      clearInterval(checkInterval);
      logger.info("Shutdown complete");
      process.exit(0);
    }
  }, 500);

  setTimeout(() => {
    logger.warn("Forcing shutdown after timeout");
    process.exit(1);
  }, 30000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

runWorker();
