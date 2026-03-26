import {
  stylingOptions,
  getStylingOption,
  listStylingIds,
  hasFrontend,
} from "../src/styling.js";

describe("styling registry", () => {
  it("has 8 styling options", () => {
    expect(stylingOptions).toHaveLength(8);
  });

  it("each option has required fields", () => {
    for (const s of stylingOptions) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.description).toBeTruthy();
      expect(s.dependencies).toBeDefined();
      expect(s.devDependencies).toBeDefined();
    }
  });

  it("includes 'none' as first option", () => {
    expect(stylingOptions[0].id).toBe("none");
  });

  it("getStylingOption returns correct option", () => {
    const s = getStylingOption("tailwind");
    expect(s).toBeDefined();
    expect(s!.id).toBe("tailwind");
  });

  it("getStylingOption returns undefined for unknown", () => {
    expect(getStylingOption("nonexistent")).toBeUndefined();
  });

  it("listStylingIds returns all ids", () => {
    const ids = listStylingIds();
    expect(ids).toContain("none");
    expect(ids).toContain("tailwind");
    expect(ids).toContain("shadcn");
    expect(ids).toContain("daisyui");
    expect(ids).toContain("chakra");
    expect(ids).toContain("mantine");
    expect(ids).toContain("bootstrap");
    expect(ids).toContain("bulma");
  });

  it("no duplicate styling ids", () => {
    const ids = listStylingIds();
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("'none' option has no dependencies", () => {
    const none = getStylingOption("none")!;
    expect(Object.keys(none.dependencies)).toHaveLength(0);
    expect(Object.keys(none.devDependencies)).toHaveLength(0);
  });
});

describe("hasFrontend", () => {
  it("returns true for node-nextjs", () => {
    expect(hasFrontend("node-nextjs")).toBe(true);
  });

  it("returns true for fullstack-nextjs", () => {
    expect(hasFrontend("fullstack-nextjs")).toBe(true);
  });

  it("returns true for monorepo-turbo", () => {
    expect(hasFrontend("monorepo-turbo")).toBe(true);
  });

  it("returns false for node-express", () => {
    expect(hasFrontend("node-express")).toBe(false);
  });

  it("returns false for go-api", () => {
    expect(hasFrontend("go-api")).toBe(false);
  });

  it("returns false for python-fastapi", () => {
    expect(hasFrontend("python-fastapi")).toBe(false);
  });

  it("returns false for node-nestjs", () => {
    expect(hasFrontend("node-nestjs")).toBe(false);
  });
});
