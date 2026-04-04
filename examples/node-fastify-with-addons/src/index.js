const Fastify = require("fastify");
const cors = require("@fastify/cors");

const fastify = Fastify({ logger: true });
const port = process.env.PORT || 3000;

async function start() {
  await fastify.register(cors);

  fastify.get("/", async () => {
    return { message: "Hello from Theo!" };
  });

  fastify.get("/health", async () => {
    return { status: "ok" };
  });

  fastify.get("/ready", async () => {
    // Customize: add database/redis connectivity checks for production
    return { status: "ready" };
  });

  fastify.setNotFoundHandler((req, reply) => {
    reply.code(404).send({ error: "Not Found" });
  });

  fastify.setErrorHandler((error, req, reply) => {
    req.log.error(error);
    reply.code(error.statusCode || 500).send({
      error:
        process.env.NODE_ENV === "production"
          ? "Internal Server Error"
          : error.message,
    });
  });

  try {
    await fastify.listen({ port: Number(port), host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
function shutdown(signal) {
  fastify.log.info(`${signal} received — shutting down`);
  fastify.close().then(
    () => process.exit(0),
    () => process.exit(1),
  );
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start();
