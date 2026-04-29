import fs from "node:fs";
import path from "node:path";
import type { TemplateInfo } from "../templates.js";
import { readPackageJson } from "./types.js";

export function applyQueue(targetDir: string, template: TemplateInfo): void {
  switch (template.language) {
    case "node":
      applyQueueNode(targetDir, template);
      break;
    case "go":
      applyQueueGo(targetDir);
      break;
    case "python":
      applyQueuePython(targetDir);
      break;
    case "php":
      applyQueuePhp(targetDir);
      break;
  }
}

function applyQueueNode(targetDir: string, template: TemplateInfo): void {
  const pkgPath = path.join(targetDir, "package.json");
  const pkg = readPackageJson(pkgPath);
  pkg.dependencies = {
    ...(pkg.dependencies as Record<string, string>),
    bullmq: "^5.0.0",
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const libDir = path.join(targetDir, "src", "lib");
  fs.mkdirSync(libDir, { recursive: true });

  const isTypeScript = template.id === "node-nestjs";
  if (isTypeScript) {
    fs.writeFileSync(
      path.join(libDir, "queue.ts"),
      `import { Queue, Worker, type Processor } from "bullmq";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
};

export const defaultQueue = new Queue("default", { connection });

export function createWorker(name: string, processor: Processor) {
  return new Worker(name, processor, { connection });
}

export { connection };
`,
    );
  } else {
    fs.writeFileSync(
      path.join(libDir, "queue.js"),
      `const { Queue, Worker } = require("bullmq");

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
};

const defaultQueue = new Queue("default", { connection });

function createWorker(name, processor) {
  return new Worker(name, processor, { connection });
}

module.exports = { defaultQueue, createWorker, connection };
`,
    );
  }
}

function applyQueueGo(targetDir: string): void {
  const goModPath = path.join(targetDir, "go.mod");
  let goMod = fs.readFileSync(goModPath, "utf-8");
  goMod += `\nrequire github.com/hibiken/asynq v0.24.1\n`;
  fs.writeFileSync(goModPath, goMod);

  const queueDir = path.join(targetDir, "internal", "queue");
  fs.mkdirSync(queueDir, { recursive: true });

  fs.writeFileSync(
    path.join(queueDir, "queue.go"),
    `package queue

import (
\t"os"

\t"github.com/hibiken/asynq"
)

var Client *asynq.Client

func Connect() {
\tredisURL := os.Getenv("REDIS_URL")
\tif redisURL == "" {
\t\tredisURL = "redis://localhost:6379"
\t}

\topt, _ := asynq.ParseRedisURI(redisURL)
\tClient = asynq.NewClient(opt)
}

func Enqueue(task *asynq.Task, opts ...asynq.Option) (*asynq.TaskInfo, error) {
\treturn Client.Enqueue(task, opts...)
}
`,
  );

  fs.writeFileSync(
    path.join(queueDir, "worker.go"),
    `package queue

import (
\t"os"

\t"github.com/hibiken/asynq"
)

func NewWorker(mux *asynq.ServeMux) *asynq.Server {
\tredisURL := os.Getenv("REDIS_URL")
\tif redisURL == "" {
\t\tredisURL = "redis://localhost:6379"
\t}

\topt, _ := asynq.ParseRedisURI(redisURL)
\tsrv := asynq.NewServer(opt, asynq.Config{
\t\tConcurrency: 10,
\t})

\treturn srv
}
`,
  );

  fs.writeFileSync(
    path.join(queueDir, "tasks.go"),
    `package queue

import (
\t"context"
\t"encoding/json"
\t"fmt"

\t"github.com/hibiken/asynq"
)

const TypeExample = "example:process"

type ExamplePayload struct {
\tMessage string \`json:"message"\`
}

func NewExampleTask(msg string) (*asynq.Task, error) {
\tpayload, err := json.Marshal(ExamplePayload{Message: msg})
\tif err != nil {
\t\treturn nil, err
\t}
\treturn asynq.NewTask(TypeExample, payload), nil
}

func HandleExampleTask(ctx context.Context, t *asynq.Task) error {
\tvar p ExamplePayload
\tif err := json.Unmarshal(t.Payload(), &p); err != nil {
\t\treturn err
\t}
\tfmt.Printf("Processing task: %s\\n", p.Message)
\treturn nil
}
`,
  );
}

function applyQueuePython(targetDir: string): void {
  const reqPath = path.join(targetDir, "requirements.txt");
  let reqs = fs.readFileSync(reqPath, "utf-8");
  reqs += "arq>=0.26.0\n";
  fs.writeFileSync(reqPath, reqs);

  fs.writeFileSync(
    path.join(targetDir, "queue_worker.py"),
    `import asyncio
import os

from arq import create_pool
from arq.connections import RedisSettings


async def example_task(ctx, message: str) -> str:
    print(f"Processing: {message}")
    return f"Done: {message}"


class WorkerSettings:
    functions = [example_task]
    redis_settings = RedisSettings.from_dsn(
        os.getenv("REDIS_URL", "redis://localhost:6379")
    )
`,
  );

  fs.writeFileSync(
    path.join(targetDir, "queue_client.py"),
    `import os

from arq import create_pool
from arq.connections import RedisSettings

REDIS_SETTINGS = RedisSettings.from_dsn(
    os.getenv("REDIS_URL", "redis://localhost:6379")
)


async def get_pool():
    return await create_pool(REDIS_SETTINGS)


async def enqueue(pool, task_name: str, *args, **kwargs):
    return await pool.enqueue_job(task_name, *args, **kwargs)
`,
  );
}

function applyQueuePhp(targetDir: string): void {
  const composerPath = path.join(targetDir, "composer.json");
  const composer = JSON.parse(fs.readFileSync(composerPath, "utf-8"));

  composer.require = {
    ...composer.require,
    "symfony/messenger": "^7.0",
    "symfony/redis-messenger": "^7.0",
  };

  fs.writeFileSync(composerPath, JSON.stringify(composer, null, 2) + "\n");

  const messageDir = path.join(targetDir, "src", "Message");
  fs.mkdirSync(messageDir, { recursive: true });

  fs.writeFileSync(
    path.join(messageDir, "ExampleMessage.php"),
    `<?php

declare(strict_types=1);

namespace App\\Message;

class ExampleMessage
{
    public function __construct(
        public readonly string $content,
    ) {}
}
`,
  );

  fs.writeFileSync(
    path.join(messageDir, "ExampleHandler.php"),
    `<?php

declare(strict_types=1);

namespace App\\Message;

class ExampleHandler
{
    public function __invoke(ExampleMessage $message): void
    {
        echo "Processing: " . $message->content . "\\n";
    }
}
`,
  );
}
