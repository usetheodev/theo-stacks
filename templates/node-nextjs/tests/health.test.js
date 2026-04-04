const { GET } = require("../src/app/api/health/route");

describe("GET /api/health", () => {
  it("returns status ok", async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.status).toBe("ok");
  });
});
