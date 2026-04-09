import { detectPackageManager, getInstallCommand, getRunCommand, getExecCommand } from "../src/packageManager.js";

describe("detectPackageManager", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.npm_config_user_agent;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("detects npm from user agent", () => {
    process.env.npm_config_user_agent = "npm/10.2.0 node/v20.9.0";
    expect(detectPackageManager()).toBe("npm");
  });

  it("detects pnpm from user agent", () => {
    process.env.npm_config_user_agent = "pnpm/8.10.0 npm/? node/v20.9.0";
    expect(detectPackageManager()).toBe("pnpm");
  });

  it("detects yarn from user agent", () => {
    process.env.npm_config_user_agent = "yarn/4.0.0 npm/? node/v20.9.0";
    expect(detectPackageManager()).toBe("yarn");
  });

  it("detects bun from user agent", () => {
    process.env.npm_config_user_agent = "bun/1.0.0";
    expect(detectPackageManager()).toBe("bun");
  });

  it("defaults to npm when no user agent", () => {
    delete process.env.npm_config_user_agent;
    expect(detectPackageManager()).toBe("npm");
  });
});

describe("getInstallCommand", () => {
  it("returns npm install with silent flags", () => {
    const args = getInstallCommand("npm");
    expect(args).toContain("install");
    expect(args).toContain("--no-fund");
    expect(args).toContain("--no-audit");
    expect(args).toContain("--loglevel=error");
  });

  it("returns yarn install with no-fund", () => {
    const args = getInstallCommand("yarn");
    expect(args).toContain("install");
    expect(args).toContain("--no-fund");
  });

  it("returns pnpm install", () => {
    const args = getInstallCommand("pnpm");
    expect(args).toEqual(["install"]);
  });

  it("returns bun install", () => {
    const args = getInstallCommand("bun");
    expect(args).toEqual(["install"]);
  });
});

describe("getRunCommand", () => {
  it("returns npm run for npm", () => {
    expect(getRunCommand("npm", "dev")).toBe("npm run dev");
  });

  it("returns pnpm run for pnpm", () => {
    expect(getRunCommand("pnpm", "dev")).toBe("pnpm run dev");
  });

  it("returns yarn run for yarn", () => {
    expect(getRunCommand("yarn", "dev")).toBe("yarn run dev");
  });

  it("returns bun run for bun", () => {
    expect(getRunCommand("bun", "dev")).toBe("bun run dev");
  });
});

describe("getExecCommand", () => {
  it("returns npx for npm", () => {
    expect(getExecCommand("npm")).toBe("npx");
  });

  it("returns pnpm exec for pnpm", () => {
    expect(getExecCommand("pnpm")).toBe("pnpm exec");
  });

  it("returns yarn for yarn", () => {
    expect(getExecCommand("yarn")).toBe("yarn");
  });

  it("returns bunx for bun", () => {
    expect(getExecCommand("bun")).toBe("bunx");
  });
});
