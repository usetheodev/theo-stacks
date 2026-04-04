const Fastify = require("fastify");

let app;

beforeEach(() => {
  app = Fastify();
  app.get("/health", async () => ({ status: "ok" }));
});

afterEach(() => app.close());

describe("GET /health", () => {
  it("returns status ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).status).toBe("ok");
  });
});
