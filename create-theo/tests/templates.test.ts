import { templates, getTemplate, listTemplateIds } from "../src/templates.js";

describe("templates registry", () => {
  it("has 8 templates", () => {
    expect(templates).toHaveLength(8);
  });

  it("each template has required fields", () => {
    for (const t of templates) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(["node", "go", "python"]).toContain(t.language);
    }
  });

  it("getTemplate returns correct template", () => {
    const t = getTemplate("node-express");
    expect(t).toBeDefined();
    expect(t!.id).toBe("node-express");
  });

  it("getTemplate returns undefined for unknown", () => {
    expect(getTemplate("nonexistent")).toBeUndefined();
  });

  it("listTemplateIds returns all ids", () => {
    const ids = listTemplateIds();
    expect(ids).toContain("node-express");
    expect(ids).toContain("node-fastify");
    expect(ids).toContain("node-nextjs");
    expect(ids).toContain("go-api");
    expect(ids).toContain("python-fastapi");
    expect(ids).toContain("monorepo-turbo");
    expect(ids).toContain("fullstack-nextjs");
    expect(ids).toContain("node-nestjs");
  });

  it("no duplicate template ids", () => {
    const ids = listTemplateIds();
    expect(new Set(ids).size).toBe(ids.length);
  });
});
