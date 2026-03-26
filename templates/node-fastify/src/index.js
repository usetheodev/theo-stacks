const fastify = require("fastify")({ logger: true });

const port = process.env.PORT || 3000;

fastify.get("/", async () => {
  return { message: "Hello from Theo!" };
});

fastify.get("/health", async () => {
  return { status: "ok" };
});

fastify.listen({ port: Number(port), host: "0.0.0.0" }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
