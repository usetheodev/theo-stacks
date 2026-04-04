const express = require("express");
const cors = require("cors");
const pinoHttp = require("pino-http");

const app = express();
const port = process.env.PORT || 3000;

const logger = pinoHttp({
  level: process.env.LOG_LEVEL || "info",
});

app.use(logger);
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Hello from Theo!" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Readiness probe — customize: add database/redis checks for production
app.get("/ready", (req, res) => {
  res.json({ status: "ready" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Error handler
app.use((err, req, res, _next) => {
  req.log.error(err);
  res.status(err.status || 500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message,
  });
});

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Graceful shutdown
function shutdown(signal) {
  console.log(`${signal} received — shutting down`);
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
