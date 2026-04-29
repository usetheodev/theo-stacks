import fs from "node:fs";
import path from "node:path";
import type { TemplateInfo } from "../templates.js";
import { readPackageJson } from "./types.js";

export function applyRedis(targetDir: string, template: TemplateInfo): void {
  switch (template.language) {
    case "node":
      applyRedisNode(targetDir, template);
      break;
    case "go":
      applyRedisGo(targetDir);
      break;
    case "python":
      applyRedisPython(targetDir);
      break;
    case "rust":
      applyRedisRust(targetDir);
      break;
    case "java":
      applyRedisJava(targetDir);
      break;
    case "ruby":
      applyRedisRuby(targetDir);
      break;
    case "php":
      applyRedisPhp(targetDir);
      break;
  }
}

function applyRedisNode(targetDir: string, template: TemplateInfo): void {
  const pkgPath = path.join(targetDir, "package.json");
  const pkg = readPackageJson(pkgPath);
  pkg.dependencies = {
    ...(pkg.dependencies as Record<string, string>),
    ioredis: "^5.0.0",
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const libDir = path.join(targetDir, "src", "lib");
  fs.mkdirSync(libDir, { recursive: true });

  const isTypeScript = template.id === "node-nestjs";
  if (isTypeScript) {
    fs.writeFileSync(
      path.join(libDir, "redis.ts"),
      `import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
`,
    );
  } else {
    fs.writeFileSync(
      path.join(libDir, "redis.js"),
      `const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

module.exports = { redis };
`,
    );
  }
}

function applyRedisGo(targetDir: string): void {
  const goModPath = path.join(targetDir, "go.mod");
  let goMod = fs.readFileSync(goModPath, "utf-8");
  goMod += `\nrequire github.com/redis/go-redis/v9 v9.7.0\n`;
  fs.writeFileSync(goModPath, goMod);

  const cacheDir = path.join(targetDir, "internal", "cache");
  fs.mkdirSync(cacheDir, { recursive: true });

  fs.writeFileSync(
    path.join(cacheDir, "redis.go"),
    `package cache

import (
\t"context"
\t"os"

\t"github.com/redis/go-redis/v9"
)

var Client *redis.Client

func Connect() error {
\turl := os.Getenv("REDIS_URL")
\tif url == "" {
\t\turl = "redis://localhost:6379"
\t}

\topts, err := redis.ParseURL(url)
\tif err != nil {
\t\treturn err
\t}

\tClient = redis.NewClient(opts)
\treturn Client.Ping(context.Background()).Err()
}
`,
  );
}

function applyRedisPython(targetDir: string): void {
  const reqPath = path.join(targetDir, "requirements.txt");
  let reqs = fs.readFileSync(reqPath, "utf-8");
  reqs += "redis>=5.0.0\n";
  fs.writeFileSync(reqPath, reqs);

  fs.writeFileSync(
    path.join(targetDir, "cache.py"),
    `import os

import redis

r = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
`,
  );
}

function applyRedisRust(targetDir: string): void {
  const cargoPath = path.join(targetDir, "Cargo.toml");
  let cargo = fs.readFileSync(cargoPath, "utf-8");
  cargo += `\n[dependencies.redis]\nversion = "0.25"\nfeatures = ["tokio-comp"]\n`;
  fs.writeFileSync(cargoPath, cargo);

  const srcDir = path.join(targetDir, "src");
  fs.writeFileSync(
    path.join(srcDir, "cache.rs"),
    `use redis::AsyncCommands;

pub async fn get_client() -> redis::Client {
    let url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());
    redis::Client::open(url).expect("Invalid Redis URL")
}
`,
  );
}

function applyRedisJava(targetDir: string): void {
  const buildFile = path.join(targetDir, "build.gradle.kts");
  let gradle = fs.readFileSync(buildFile, "utf-8");
  gradle = gradle.replace(
    'implementation("org.springframework.boot:spring-boot-starter-web")',
    `implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-redis")`,
  );
  fs.writeFileSync(buildFile, gradle);

  const appYml = path.join(targetDir, "src", "main", "resources", "application.yml");
  let yml = fs.readFileSync(appYml, "utf-8");
  yml += `
  data:
    redis:
      url: \${REDIS_URL:redis://localhost:6379}
`;
  fs.writeFileSync(appYml, yml);
}

function applyRedisRuby(targetDir: string): void {
  const gemfile = path.join(targetDir, "Gemfile");
  let gems = fs.readFileSync(gemfile, "utf-8");
  gems += `\ngem "redis", "~> 5.0"\n`;
  fs.writeFileSync(gemfile, gems);

  fs.writeFileSync(
    path.join(targetDir, "cache.rb"),
    `require "redis"

REDIS = Redis.new(url: ENV.fetch("REDIS_URL", "redis://localhost:6379"))
`,
  );
}

function applyRedisPhp(targetDir: string): void {
  const composerPath = path.join(targetDir, "composer.json");
  const composer = JSON.parse(fs.readFileSync(composerPath, "utf-8"));

  composer.require = {
    ...composer.require,
    "predis/predis": "^2.0",
  };

  fs.writeFileSync(composerPath, JSON.stringify(composer, null, 2) + "\n");

  const srcDir = path.join(targetDir, "src");
  fs.mkdirSync(srcDir, { recursive: true });

  fs.writeFileSync(
    path.join(srcDir, "cache.php"),
    `<?php

declare(strict_types=1);

use Predis\\Client;

$redisUrl = getenv('REDIS_URL') ?: 'redis://localhost:6379';
$redis = new Client($redisUrl);
`,
  );
}
