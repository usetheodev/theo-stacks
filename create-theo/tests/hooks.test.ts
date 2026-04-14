import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { parseHooks, runPostScaffoldHook } from "../src/hooks.js";

describe("hooks", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "theo-hooks-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("parseHooks", () => {
    it("returns empty object when theo.yaml does not exist", () => {
      expect(parseHooks(tempDir)).toEqual({});
    });

    it("returns empty object when theo.yaml has no hooks section", () => {
      fs.writeFileSync(
        path.join(tempDir, "theo.yaml"),
        'version: 1\nproject: "test"\n',
      );
      expect(parseHooks(tempDir)).toEqual({});
    });

    it("parses postscaffold hook from theo.yaml", () => {
      fs.writeFileSync(
        path.join(tempDir, "theo.yaml"),
        'version: 1\nproject: "test"\n\nhooks:\n  postscaffold: "npm run setup"\n',
      );
      expect(parseHooks(tempDir)).toEqual({ postscaffold: "npm run setup" });
    });

    it("parses postscaffold hook without quotes", () => {
      fs.writeFileSync(
        path.join(tempDir, "theo.yaml"),
        'version: 1\nproject: "test"\n\nhooks:\n  postscaffold: npm run setup\n',
      );
      expect(parseHooks(tempDir)).toEqual({ postscaffold: "npm run setup" });
    });
  });

  describe("runPostScaffoldHook", () => {
    it("executes the hook command in the target directory", () => {
      const markerFile = path.join(tempDir, "hook-ran.txt");
      runPostScaffoldHook(tempDir, `echo "done" > hook-ran.txt`);
      expect(fs.existsSync(markerFile)).toBe(true);
    });

    it("throws on invalid command", () => {
      expect(() =>
        runPostScaffoldHook(tempDir, "nonexistent-command-xyz"),
      ).toThrow();
    });
  });
});
