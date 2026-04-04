const request = require("supertest");
const express = require("express");

const app = express();
app.get("/health", (req, res) => res.json({ status: "ok" }));

describe("GET /health", () => {
  it("returns status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
