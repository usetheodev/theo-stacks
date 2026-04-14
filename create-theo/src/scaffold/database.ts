import fs from "node:fs";
import path from "node:path";
import type { TemplateInfo } from "../templates.js";
import { readPackageJson } from "./types.js";

export function applyDatabase(targetDir: string, template: TemplateInfo): void {
  switch (template.language) {
    case "node":
      applyPrisma(targetDir, template);
      break;
    case "go":
      applyGorm(targetDir);
      break;
    case "python":
      applySqlalchemy(targetDir);
      break;
    case "rust":
      applyDiesel(targetDir);
      break;
    case "java":
      applySpringDataJpa(targetDir);
      break;
    case "ruby":
      applySequel(targetDir);
      break;
    case "php":
      applyDoctrine(targetDir);
      break;
  }
}

function applyPrisma(targetDir: string, template: TemplateInfo): void {
  const pkgPath = path.join(targetDir, "package.json");
  const pkg = readPackageJson(pkgPath);

  pkg.dependencies = {
    ...(pkg.dependencies as Record<string, string>),
    "@prisma/client": "^6.0.0",
  };
  pkg.devDependencies = {
    ...(pkg.devDependencies as Record<string, string>),
    prisma: "^6.0.0",
  };
  pkg.scripts = {
    ...(pkg.scripts as Record<string, string>),
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
  };

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const prismaDir = path.join(targetDir, "prisma");
  fs.mkdirSync(prismaDir, { recursive: true });

  fs.writeFileSync(
    path.join(prismaDir, "schema.prisma"),
    `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`,
  );

  const isTypeScript = template.id === "node-nestjs";
  const libDir = path.join(targetDir, "src", "lib");
  fs.mkdirSync(libDir, { recursive: true });

  if (isTypeScript) {
    fs.writeFileSync(
      path.join(libDir, "db.ts"),
      `import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
`,
    );
  } else {
    fs.writeFileSync(
      path.join(libDir, "db.js"),
      `const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = { prisma };
`,
    );
  }
}

function applyGorm(targetDir: string): void {
  const goModPath = path.join(targetDir, "go.mod");
  let goMod = fs.readFileSync(goModPath, "utf-8");

  goMod += `
require (
\tgorm.io/gorm v1.25.12
\tgorm.io/driver/postgres v1.5.11
)
`;

  fs.writeFileSync(goModPath, goMod);

  const dbDir = path.join(targetDir, "internal", "database");
  fs.mkdirSync(dbDir, { recursive: true });

  fs.writeFileSync(
    path.join(dbDir, "database.go"),
    `package database

import (
\t"fmt"
\t"os"

\t"gorm.io/driver/postgres"
\t"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() error {
\tdsn := os.Getenv("DATABASE_URL")
\tif dsn == "" {
\t\tdsn = "host=localhost user=postgres password=postgres dbname=mydb port=5432 sslmode=disable"
\t}

\tdb, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
\tif err != nil {
\t\treturn fmt.Errorf("failed to connect to database: %w", err)
\t}

\tDB = db
\treturn nil
}
`,
  );

  const modelsDir = path.join(targetDir, "internal", "models");
  fs.mkdirSync(modelsDir, { recursive: true });

  fs.writeFileSync(
    path.join(modelsDir, "user.go"),
    `package models

import "time"

type User struct {
\tID        uint      \`json:"id" gorm:"primaryKey"\`
\tEmail     string    \`json:"email" gorm:"uniqueIndex"\`
\tName      string    \`json:"name"\`
\tCreatedAt time.Time \`json:"created_at"\`
\tUpdatedAt time.Time \`json:"updated_at"\`
}
`,
  );
}

function applySqlalchemy(targetDir: string): void {
  const reqPath = path.join(targetDir, "requirements.txt");
  let reqs = fs.readFileSync(reqPath, "utf-8");

  reqs += `sqlalchemy>=2.0.0\npsycopg2-binary>=2.9.0\nalembic>=1.13.0\n`;

  fs.writeFileSync(reqPath, reqs);

  fs.writeFileSync(
    path.join(targetDir, "database.py"),
    `import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://user:password@localhost:5432/mydb"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
`,
  );

  fs.writeFileSync(
    path.join(targetDir, "models.py"),
    `from sqlalchemy import Column, DateTime, Integer, String, func

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
`,
  );
}

function applyDiesel(targetDir: string): void {
  const cargoPath = path.join(targetDir, "Cargo.toml");
  let cargo = fs.readFileSync(cargoPath, "utf-8");
  cargo += `\n[dependencies.diesel]\nversion = "2"\nfeatures = ["postgres"]\n\n[dependencies.dotenvy]\nversion = "0.15"\n`;
  fs.writeFileSync(cargoPath, cargo);

  const srcDir = path.join(targetDir, "src");
  fs.writeFileSync(
    path.join(srcDir, "db.rs"),
    `use diesel::prelude::*;
use diesel::pg::PgConnection;
use std::env;

pub fn establish_connection() -> PgConnection {
    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/mydb".to_string());
    PgConnection::establish(&database_url)
        .unwrap_or_else(|_| panic!("Error connecting to {}", database_url))
}
`,
  );
}

function applySpringDataJpa(targetDir: string): void {
  const buildFile = path.join(targetDir, "build.gradle.kts");
  let gradle = fs.readFileSync(buildFile, "utf-8");
  gradle = gradle.replace(
    'implementation("org.springframework.boot:spring-boot-starter-web")',
    `implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    runtimeOnly("org.postgresql:postgresql")`,
  );
  fs.writeFileSync(buildFile, gradle);

  const appYml = path.join(targetDir, "src", "main", "resources", "application.yml");
  let yml = fs.readFileSync(appYml, "utf-8");
  yml += `
  datasource:
    url: \${DATABASE_URL:jdbc:postgresql://localhost:5432/mydb}
    username: postgres
    password: postgres
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
`;
  fs.writeFileSync(appYml, yml);

  const entityDir = path.join(targetDir, "src", "main", "java", "com", "theo", "app", "entity");
  fs.mkdirSync(entityDir, { recursive: true });

  fs.writeFileSync(
    path.join(entityDir, "User.java"),
    `package com.theo.app.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    private String name;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
`,
  );

  const repoDir = path.join(targetDir, "src", "main", "java", "com", "theo", "app", "repository");
  fs.mkdirSync(repoDir, { recursive: true });

  fs.writeFileSync(
    path.join(repoDir, "UserRepository.java"),
    `package com.theo.app.repository;

import com.theo.app.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
}
`,
  );
}

function applySequel(targetDir: string): void {
  const gemfile = path.join(targetDir, "Gemfile");
  let gems = fs.readFileSync(gemfile, "utf-8");
  gems += `\ngem "sequel", "~> 5.0"\ngem "pg", "~> 1.5"\n`;
  fs.writeFileSync(gemfile, gems);

  fs.writeFileSync(
    path.join(targetDir, "database.rb"),
    `require "sequel"

DATABASE_URL = ENV.fetch("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/mydb")
DB = Sequel.connect(DATABASE_URL)

DB.create_table?(:users) do
  primary_key :id
  String :email, unique: true, null: false
  String :name
  DateTime :created_at, default: Sequel::CURRENT_TIMESTAMP
  DateTime :updated_at, default: Sequel::CURRENT_TIMESTAMP
end

class User < Sequel::Model(:users)
end
`,
  );
}

function applyDoctrine(targetDir: string): void {
  const composerPath = path.join(targetDir, "composer.json");
  const composer = JSON.parse(fs.readFileSync(composerPath, "utf-8"));

  composer.require = {
    ...composer.require,
    "doctrine/dbal": "^4.0",
    "doctrine/orm": "^3.0",
  };

  fs.writeFileSync(composerPath, JSON.stringify(composer, null, 2) + "\n");

  const srcDir = path.join(targetDir, "src");
  fs.mkdirSync(srcDir, { recursive: true });

  fs.writeFileSync(
    path.join(srcDir, "database.php"),
    `<?php

declare(strict_types=1);

use Doctrine\\DBAL\\DriverManager;

$databaseUrl = getenv('DATABASE_URL') ?: 'pdo-pgsql://postgres:postgres@localhost:5432/mydb';

$connection = DriverManager::getConnection(['url' => $databaseUrl]);
`,
  );
}
