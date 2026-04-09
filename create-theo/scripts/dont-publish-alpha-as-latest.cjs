/**
 * Pre-pack validation script.
 * Prevents publishing alpha/beta versions as "latest" on npm.
 * Run via "prepack" hook in package.json.
 */

const fs = require("fs");
const path = require("path");

const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"),
);
const version = packageJson.version;
const isPrerelease = /-(alpha|beta|rc|dev)/.test(version);

// Check npm publish flags for --tag
const args = process.argv.slice(2);
const npmConfigTag = process.env.npm_config_tag;
const tag = args.find((a) => a.startsWith("--tag="))?.split("=")[1] || npmConfigTag || "latest";

if (isPrerelease && tag === "latest") {
  console.error(
    `\n  ✖ Cannot publish prerelease version "${version}" as "latest".`,
  );
  console.error(`    Use: npm publish --tag=alpha\n`);
  process.exit(1);
}

if (!isPrerelease && tag !== "latest") {
  console.warn(
    `\n  ⚠ Publishing stable version "${version}" with tag "${tag}" instead of "latest".`,
  );
  console.warn(`    This is unusual. Did you mean to publish as "latest"?\n`);
}
