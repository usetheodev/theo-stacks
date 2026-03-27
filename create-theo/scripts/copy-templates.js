import { cpSync, copyFileSync, rmSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, "../../templates");
const dest = resolve(__dirname, "../templates");

if (existsSync(dest)) {
  rmSync(dest, { recursive: true });
}

cpSync(src, dest, {
  recursive: true,
  filter: (source) => !source.includes("node_modules"),
});

console.log("Templates copied to create-theo/templates/");

const readmeSrc = resolve(__dirname, "../../README.md");
const readmeDest = resolve(__dirname, "../README.md");
copyFileSync(readmeSrc, readmeDest);
console.log("README.md copied to create-theo/");
