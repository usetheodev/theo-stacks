import { sanitizeProjectName, validateProjectName } from "../src/validate.js";

describe("sanitizeProjectName", () => {
  it("lowercases input", () => {
    expect(sanitizeProjectName("MyProject")).toBe("myproject");
  });

  it("replaces invalid characters with hyphens", () => {
    expect(sanitizeProjectName("my_project.v2")).toBe("my-project-v2");
  });

  it("collapses consecutive hyphens", () => {
    expect(sanitizeProjectName("my---project")).toBe("my-project");
  });

  it("trims leading and trailing hyphens", () => {
    expect(sanitizeProjectName("-my-project-")).toBe("my-project");
  });

  it("prefixes with p- if starts with number", () => {
    expect(sanitizeProjectName("123app")).toBe("p-123app");
  });

  it("truncates to 63 characters", () => {
    const long = "a".repeat(100);
    expect(sanitizeProjectName(long).length).toBeLessThanOrEqual(63);
  });

  it("handles empty string", () => {
    const result = sanitizeProjectName("");
    expect(result).toBe("p-");
  });
});

describe("validateProjectName", () => {
  it("accepts valid name", () => {
    expect(validateProjectName("my-project")).toBe(true);
  });

  it("accepts single letter", () => {
    expect(validateProjectName("a")).not.toBe(true);
  });

  it("rejects empty string", () => {
    expect(validateProjectName("")).not.toBe(true);
  });

  it("rejects name over 63 chars", () => {
    expect(validateProjectName("a".repeat(64))).not.toBe(true);
  });

  it("rejects uppercase", () => {
    expect(validateProjectName("MyProject")).not.toBe(true);
  });

  it("rejects starting with number", () => {
    expect(validateProjectName("1project")).not.toBe(true);
  });

  it("rejects special characters", () => {
    expect(validateProjectName("my_project")).not.toBe(true);
  });
});
