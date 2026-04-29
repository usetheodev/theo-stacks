import fs from "node:fs";
import path from "node:path";
import type { TemplateInfo } from "../templates.js";
import { readPackageJson } from "./types.js";

export function applyAuth(targetDir: string, template: TemplateInfo): void {
  switch (template.language) {
    case "node":
      if (template.id === "node-fastify") {
        applyAuthFastify(targetDir);
      } else if (template.id === "node-nestjs") {
        applyAuthNestJS(targetDir);
      } else {
        applyAuthExpress(targetDir);
      }
      break;
    case "go":
      applyAuthGo(targetDir);
      break;
    case "python":
      applyAuthPython(targetDir);
      break;
    case "rust":
      applyAuthRust(targetDir);
      break;
    case "java":
      applyAuthJava(targetDir);
      break;
    case "ruby":
      applyAuthRuby(targetDir);
      break;
    case "php":
      applyAuthPhp(targetDir);
      break;
  }
}

function applyAuthExpress(targetDir: string): void {
  const pkgPath = path.join(targetDir, "package.json");
  const pkg = readPackageJson(pkgPath);
  pkg.dependencies = {
    ...(pkg.dependencies as Record<string, string>),
    jsonwebtoken: "^9.0.0",
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const middlewareDir = path.join(targetDir, "src", "middleware");
  fs.mkdirSync(middlewareDir, { recursive: true });

  fs.writeFileSync(
    path.join(middlewareDir, "auth.js"),
    `const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

module.exports = { authenticate, generateToken };
`,
  );
}

function applyAuthFastify(targetDir: string): void {
  const pkgPath = path.join(targetDir, "package.json");
  const pkg = readPackageJson(pkgPath);
  pkg.dependencies = {
    ...(pkg.dependencies as Record<string, string>),
    jsonwebtoken: "^9.0.0",
    "fastify-plugin": "^5.0.0",
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const pluginsDir = path.join(targetDir, "src", "plugins");
  fs.mkdirSync(pluginsDir, { recursive: true });

  fs.writeFileSync(
    path.join(pluginsDir, "auth.js"),
    `const fp = require("fastify-plugin");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

module.exports = fp(async function authPlugin(fastify) {
  fastify.decorate("authenticate", async function (request, reply) {
    const token = request.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      reply.code(401).send({ error: "Unauthorized" });
      return;
    }
    try {
      request.user = jwt.verify(token, JWT_SECRET);
    } catch {
      reply.code(401).send({ error: "Invalid token" });
    }
  });

  fastify.decorate("generateToken", function (payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
  });
});
`,
  );
}

function applyAuthNestJS(targetDir: string): void {
  const pkgPath = path.join(targetDir, "package.json");
  const pkg = readPackageJson(pkgPath);
  pkg.dependencies = {
    ...(pkg.dependencies as Record<string, string>),
    jsonwebtoken: "^9.0.0",
  };
  pkg.devDependencies = {
    ...(pkg.devDependencies as Record<string, string>),
    "@types/jsonwebtoken": "^9.0.0",
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const guardsDir = path.join(targetDir, "src", "guards");
  fs.mkdirSync(guardsDir, { recursive: true });

  fs.writeFileSync(
    path.join(guardsDir, "auth.guard.ts"),
    `import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import * as jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace("Bearer ", "");
    if (!token) throw new UnauthorizedException();
    try {
      request.user = jwt.verify(token, JWT_SECRET);
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}

export function generateToken(payload: Record<string, unknown>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}
`,
  );
}

function applyAuthGo(targetDir: string): void {
  const goModPath = path.join(targetDir, "go.mod");
  let goMod = fs.readFileSync(goModPath, "utf-8");
  goMod += `\nrequire github.com/golang-jwt/jwt/v5 v5.2.1\n`;
  fs.writeFileSync(goModPath, goMod);

  const authDir = path.join(targetDir, "internal", "auth");
  fs.mkdirSync(authDir, { recursive: true });

  fs.writeFileSync(
    path.join(authDir, "auth.go"),
    `package auth

import (
\t"encoding/json"
\t"net/http"
\t"os"
\t"strings"
\t"time"

\t"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserKey contextKey = "user"

var jwtSecret = []byte(getSecret())

func getSecret() string {
\ts := os.Getenv("JWT_SECRET")
\tif s == "" {
\t\treturn "change-me-in-production"
\t}
\treturn s
}

func Authenticate(next http.Handler) http.Handler {
\treturn http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
\t\tauth := r.Header.Get("Authorization")
\t\ttokenStr := strings.TrimPrefix(auth, "Bearer ")
\t\tif tokenStr == "" || tokenStr == auth {
\t\t\tw.Header().Set("Content-Type", "application/json")
\t\t\tw.WriteHeader(http.StatusUnauthorized)
\t\t\tjson.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
\t\t\treturn
\t\t}

\t\ttoken, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
\t\t\treturn jwtSecret, nil
\t\t})
\t\tif err != nil || !token.Valid {
\t\t\tw.Header().Set("Content-Type", "application/json")
\t\t\tw.WriteHeader(http.StatusUnauthorized)
\t\t\tjson.NewEncoder(w).Encode(map[string]string{"error": "Invalid token"})
\t\t\treturn
\t\t}

\t\tnext.ServeHTTP(w, r)
\t})
}

func GenerateToken(claims map[string]interface{}) (string, error) {
\tmapClaims := jwt.MapClaims{
\t\t"exp": time.Now().Add(24 * time.Hour).Unix(),
\t}
\tfor k, v := range claims {
\t\tmapClaims[k] = v
\t}
\ttoken := jwt.NewWithClaims(jwt.SigningMethodHS256, mapClaims)
\treturn token.SignedString(jwtSecret)
}
`,
  );
}

function applyAuthPython(targetDir: string): void {
  const reqPath = path.join(targetDir, "requirements.txt");
  let reqs = fs.readFileSync(reqPath, "utf-8");
  reqs += "pyjwt>=2.0.0\n";
  fs.writeFileSync(reqPath, reqs);

  fs.writeFileSync(
    path.join(targetDir, "auth.py"),
    `import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
security = HTTPBearer()


def authenticate(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )


def generate_token(payload: dict) -> str:
    payload["exp"] = datetime.now(timezone.utc) + timedelta(hours=24)
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")
`,
  );
}

function applyAuthRust(targetDir: string): void {
  const cargoPath = path.join(targetDir, "Cargo.toml");
  let cargo = fs.readFileSync(cargoPath, "utf-8");
  cargo += `\n[dependencies.jsonwebtoken]\nversion = "9"\n`;
  fs.writeFileSync(cargoPath, cargo);

  const srcDir = path.join(targetDir, "src");
  fs.writeFileSync(
    path.join(srcDir, "auth.rs"),
    `use axum::{
    extract::Request,
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
}

fn get_secret() -> String {
    std::env::var("JWT_SECRET").unwrap_or_else(|_| "change-me-in-production".to_string())
}

pub async fn authenticate(req: Request, next: Next) -> Response {
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    let token = auth_header.strip_prefix("Bearer ").unwrap_or("");
    if token.is_empty() {
        return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Unauthorized"}))).into_response();
    }

    match decode::<Claims>(
        token,
        &DecodingKey::from_secret(get_secret().as_bytes()),
        &Validation::default(),
    ) {
        Ok(_) => next.run(req).await,
        Err(_) => (StatusCode::UNAUTHORIZED, Json(json!({"error": "Invalid token"}))).into_response(),
    }
}

pub fn generate_token(sub: &str) -> Result<String, jsonwebtoken::errors::Error> {
    let claims = Claims {
        sub: sub.to_string(),
        exp: (chrono::Utc::now() + chrono::Duration::hours(24)).timestamp() as usize,
    };
    encode(&Header::default(), &claims, &EncodingKey::from_secret(get_secret().as_bytes()))
}
`,
  );
}

function applyAuthJava(targetDir: string): void {
  const buildFile = path.join(targetDir, "build.gradle.kts");
  let gradle = fs.readFileSync(buildFile, "utf-8");
  gradle = gradle.replace(
    'implementation("org.springframework.boot:spring-boot-starter-web")',
    `implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("io.jsonwebtoken:jjwt-api:0.12.5")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.5")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.5")`,
  );
  fs.writeFileSync(buildFile, gradle);

  const filterDir = path.join(targetDir, "src", "main", "java", "com", "theo", "app", "config");
  fs.writeFileSync(
    path.join(filterDir, "JwtFilter.java"),
    `package com.theo.app.config;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.*;
import jakarta.servlet.http.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

public class JwtFilter implements Filter {

    private static final String SECRET = System.getenv("JWT_SECRET") != null
            ? System.getenv("JWT_SECRET") : "change-me-in-production-needs-32chars!";

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;

        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            response.setStatus(401);
            response.setContentType("application/json");
            response.getWriter().write("{\\"error\\":\\"Unauthorized\\"}");
            return;
        }

        try {
            String token = auth.substring(7);
            Jwts.parser()
                .verifyWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .build()
                .parseSignedClaims(token);
            chain.doFilter(req, res);
        } catch (Exception e) {
            response.setStatus(401);
            response.setContentType("application/json");
            response.getWriter().write("{\\"error\\":\\"Invalid token\\"}");
        }
    }
}
`,
  );
}

function applyAuthRuby(targetDir: string): void {
  const gemfile = path.join(targetDir, "Gemfile");
  let gems = fs.readFileSync(gemfile, "utf-8");
  gems += `\ngem "jwt", "~> 2.8"\n`;
  fs.writeFileSync(gemfile, gems);

  fs.writeFileSync(
    path.join(targetDir, "auth.rb"),
    `require "jwt"

JWT_SECRET = ENV.fetch("JWT_SECRET", "change-me-in-production")

def authenticate!(request)
  auth = request.env["HTTP_AUTHORIZATION"]
  halt 401, { error: "Unauthorized" }.to_json unless auth&.start_with?("Bearer ")

  token = auth.sub("Bearer ", "")
  begin
    JWT.decode(token, JWT_SECRET, true, algorithm: "HS256")
  rescue JWT::DecodeError
    halt 401, { error: "Invalid token" }.to_json
  end
end

def generate_token(payload)
  payload[:exp] = Time.now.to_i + 86_400
  JWT.encode(payload, JWT_SECRET, "HS256")
end
`,
  );
}

// --- Auth OAuth/OIDC ---

export function applyAuthOAuth(targetDir: string, template: TemplateInfo): void {
  switch (template.language) {
    case "node":
      if (template.id === "node-fastify") {
        applyAuthOAuthFastify(targetDir);
      } else if (template.id === "node-nestjs") {
        applyAuthOAuthNestJS(targetDir);
      } else {
        applyAuthOAuthExpress(targetDir);
      }
      break;
    case "go":
      applyAuthOAuthGo(targetDir);
      break;
    case "python":
      applyAuthOAuthPython(targetDir);
      break;
    case "rust":
      applyAuthOAuthRust(targetDir);
      break;
    case "java":
      applyAuthOAuthJava(targetDir);
      break;
    case "ruby":
      applyAuthOAuthRuby(targetDir);
      break;
    case "php":
      applyAuthOAuthPhp(targetDir);
      break;
  }
}

function applyAuthOAuthExpress(targetDir: string): void {
  const pkgPath = path.join(targetDir, "package.json");
  const pkg = readPackageJson(pkgPath);
  pkg.dependencies = {
    ...(pkg.dependencies as Record<string, string>),
    "openid-client": "^5.0.0",
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const middlewareDir = path.join(targetDir, "src", "middleware");
  fs.mkdirSync(middlewareDir, { recursive: true });

  fs.writeFileSync(
    path.join(middlewareDir, "oauth.js"),
    `const { Issuer } = require("openid-client");

let client;

async function initOIDC() {
  const issuer = await Issuer.discover(process.env.OIDC_ISSUER_URL);
  client = new issuer.Client({
    client_id: process.env.OIDC_CLIENT_ID,
    client_secret: process.env.OIDC_CLIENT_SECRET,
  });
}

async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    if (!client) await initOIDC();
    const userinfo = await client.userinfo(token);
    req.user = userinfo;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = { authenticate, initOIDC };
`,
  );
}

function applyAuthOAuthFastify(targetDir: string): void {
  const pkgPath = path.join(targetDir, "package.json");
  const pkg = readPackageJson(pkgPath);
  pkg.dependencies = {
    ...(pkg.dependencies as Record<string, string>),
    "openid-client": "^5.0.0",
    "fastify-plugin": "^5.0.0",
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const pluginsDir = path.join(targetDir, "src", "plugins");
  fs.mkdirSync(pluginsDir, { recursive: true });

  fs.writeFileSync(
    path.join(pluginsDir, "oauth.js"),
    `const fp = require("fastify-plugin");
const { Issuer } = require("openid-client");

module.exports = fp(async function oauthPlugin(fastify) {
  const issuer = await Issuer.discover(process.env.OIDC_ISSUER_URL);
  const client = new issuer.Client({
    client_id: process.env.OIDC_CLIENT_ID,
    client_secret: process.env.OIDC_CLIENT_SECRET,
  });

  fastify.decorate("authenticate", async function (request, reply) {
    const token = request.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      reply.code(401).send({ error: "Unauthorized" });
      return;
    }
    try {
      request.user = await client.userinfo(token);
    } catch {
      reply.code(401).send({ error: "Invalid token" });
    }
  });
});
`,
  );
}

function applyAuthOAuthNestJS(targetDir: string): void {
  const pkgPath = path.join(targetDir, "package.json");
  const pkg = readPackageJson(pkgPath);
  pkg.dependencies = {
    ...(pkg.dependencies as Record<string, string>),
    "openid-client": "^5.0.0",
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const guardsDir = path.join(targetDir, "src", "guards");
  fs.mkdirSync(guardsDir, { recursive: true });

  fs.writeFileSync(
    path.join(guardsDir, "oauth.guard.ts"),
    `import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Issuer } from "openid-client";

let client: any;

@Injectable()
export class OAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace("Bearer ", "");
    if (!token) throw new UnauthorizedException();
    try {
      if (!client) {
        const issuer = await Issuer.discover(process.env.OIDC_ISSUER_URL!);
        client = new issuer.Client({
          client_id: process.env.OIDC_CLIENT_ID!,
          client_secret: process.env.OIDC_CLIENT_SECRET!,
        });
      }
      request.user = await client.userinfo(token);
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
`,
  );
}

function applyAuthOAuthGo(targetDir: string): void {
  const goModPath = path.join(targetDir, "go.mod");
  let goMod = fs.readFileSync(goModPath, "utf-8");
  goMod += `\nrequire (\n\tgithub.com/coreos/go-oidc/v3 v3.10.0\n\tgolang.org/x/oauth2 v0.21.0\n)\n`;
  fs.writeFileSync(goModPath, goMod);

  const authDir = path.join(targetDir, "internal", "auth");
  fs.mkdirSync(authDir, { recursive: true });

  fs.writeFileSync(
    path.join(authDir, "oauth.go"),
    `package auth

import (
\t"context"
\t"encoding/json"
\t"net/http"
\t"os"
\t"strings"

\t"github.com/coreos/go-oidc/v3/oidc"
)

var verifier *oidc.IDTokenVerifier

func InitOIDC() error {
\tprovider, err := oidc.NewProvider(context.Background(), os.Getenv("OIDC_ISSUER_URL"))
\tif err != nil {
\t\treturn err
\t}
\tverifier = provider.Verifier(&oidc.Config{ClientID: os.Getenv("OIDC_CLIENT_ID")})
\treturn nil
}

func OAuthAuthenticate(next http.Handler) http.Handler {
\treturn http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
\t\tauth := r.Header.Get("Authorization")
\t\ttokenStr := strings.TrimPrefix(auth, "Bearer ")
\t\tif tokenStr == "" || tokenStr == auth {
\t\t\tw.Header().Set("Content-Type", "application/json")
\t\t\tw.WriteHeader(http.StatusUnauthorized)
\t\t\tjson.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
\t\t\treturn
\t\t}

\t\t_, err := verifier.Verify(r.Context(), tokenStr)
\t\tif err != nil {
\t\t\tw.Header().Set("Content-Type", "application/json")
\t\t\tw.WriteHeader(http.StatusUnauthorized)
\t\t\tjson.NewEncoder(w).Encode(map[string]string{"error": "Invalid token"})
\t\t\treturn
\t\t}

\t\tnext.ServeHTTP(w, r)
\t})
}
`,
  );
}

function applyAuthOAuthPython(targetDir: string): void {
  const reqPath = path.join(targetDir, "requirements.txt");
  let reqs = fs.readFileSync(reqPath, "utf-8");
  reqs += "authlib>=1.3.0\nhttpx>=0.27.0\n";
  fs.writeFileSync(reqPath, reqs);

  fs.writeFileSync(
    path.join(targetDir, "oauth.py"),
    `import os

import httpx
from authlib.integrations.starlette_client import OAuth
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

OIDC_ISSUER_URL = os.getenv("OIDC_ISSUER_URL", "https://your-provider.com")
OIDC_CLIENT_ID = os.getenv("OIDC_CLIENT_ID", "your-client-id")

security = HTTPBearer()


async def authenticate(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{OIDC_ISSUER_URL}/userinfo",
                headers={"Authorization": f"Bearer {credentials.credentials}"},
            )
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
                )
            return resp.json()
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )
`,
  );
}

function applyAuthOAuthRust(targetDir: string): void {
  const cargoPath = path.join(targetDir, "Cargo.toml");
  let cargo = fs.readFileSync(cargoPath, "utf-8");
  cargo += `\n[dependencies.openidconnect]\nversion = "3"\n\n[dependencies.reqwest]\nversion = "0.12"\nfeatures = ["json"]\n`;
  fs.writeFileSync(cargoPath, cargo);

  const srcDir = path.join(targetDir, "src");
  fs.writeFileSync(
    path.join(srcDir, "oauth.rs"),
    `use axum::{
    extract::Request,
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

pub async fn authenticate(req: Request, next: Next) -> Response {
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    let token = auth_header.strip_prefix("Bearer ").unwrap_or("");
    if token.is_empty() {
        return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Unauthorized"}))).into_response();
    }

    let issuer_url = std::env::var("OIDC_ISSUER_URL").unwrap_or_default();
    let client = reqwest::Client::new();
    match client
        .get(format!("{}/userinfo", issuer_url))
        .bearer_auth(token)
        .send()
        .await
    {
        Ok(resp) if resp.status().is_success() => next.run(req).await,
        _ => (StatusCode::UNAUTHORIZED, Json(json!({"error": "Invalid token"}))).into_response(),
    }
}
`,
  );
}

function applyAuthOAuthJava(targetDir: string): void {
  const buildFile = path.join(targetDir, "build.gradle.kts");
  let gradle = fs.readFileSync(buildFile, "utf-8");
  gradle = gradle.replace(
    'implementation("org.springframework.boot:spring-boot-starter-web")',
    `implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-resource-server")`,
  );
  fs.writeFileSync(buildFile, gradle);

  const appYml = path.join(targetDir, "src", "main", "resources", "application.yml");
  let yml = fs.readFileSync(appYml, "utf-8");
  yml += `
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: \${OIDC_ISSUER_URL:https://your-provider.com}
`;
  fs.writeFileSync(appYml, yml);
}

function applyAuthOAuthRuby(targetDir: string): void {
  const gemfile = path.join(targetDir, "Gemfile");
  let gems = fs.readFileSync(gemfile, "utf-8");
  gems += `\ngem "omniauth", "~> 2.1"\ngem "omniauth_openid_connect", "~> 0.7"\n`;
  fs.writeFileSync(gemfile, gems);

  fs.writeFileSync(
    path.join(targetDir, "oauth.rb"),
    `require "net/http"
require "json"

OIDC_ISSUER_URL = ENV.fetch("OIDC_ISSUER_URL", "https://your-provider.com")

def authenticate_oauth!(request)
  auth = request.env["HTTP_AUTHORIZATION"]
  halt 401, { error: "Unauthorized" }.to_json unless auth&.start_with?("Bearer ")

  token = auth.sub("Bearer ", "")
  uri = URI("#{OIDC_ISSUER_URL}/userinfo")
  req = Net::HTTP::Get.new(uri)
  req["Authorization"] = "Bearer #{token}"

  res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") do |http|
    http.request(req)
  end

  halt 401, { error: "Invalid token" }.to_json unless res.is_a?(Net::HTTPOK)
  JSON.parse(res.body)
end
`,
  );
}

// --- Auth OAuth (PHP) ---

function applyAuthPhp(targetDir: string): void {
  const composerPath = path.join(targetDir, "composer.json");
  const composer = JSON.parse(fs.readFileSync(composerPath, "utf-8"));

  composer.require = {
    ...composer.require,
    "firebase/php-jwt": "^6.0",
  };

  fs.writeFileSync(composerPath, JSON.stringify(composer, null, 2) + "\n");

  const middlewareDir = path.join(targetDir, "src", "Middleware");
  fs.mkdirSync(middlewareDir, { recursive: true });

  fs.writeFileSync(
    path.join(middlewareDir, "AuthJwt.php"),
    `<?php

declare(strict_types=1);

namespace App\\Middleware;

use Firebase\\JWT\\JWT;
use Firebase\\JWT\\Key;
use Psr\\Http\\Message\\ResponseInterface as Response;
use Psr\\Http\\Message\\ServerRequestInterface as Request;
use Psr\\Http\\Server\\MiddlewareInterface;
use Psr\\Http\\Server\\RequestHandlerInterface as RequestHandler;
use Slim\\Psr7\\Response as SlimResponse;

class AuthJwt implements MiddlewareInterface
{
    private string $secret;

    public function __construct()
    {
        $this->secret = getenv('JWT_SECRET') ?: 'change-me-in-production';
    }

    public function process(Request $request, RequestHandler $handler): Response
    {
        $auth = $request->getHeaderLine('Authorization');
        $token = str_replace('Bearer ', '', $auth);

        if (empty($token) || $token === $auth) {
            return $this->unauthorized('Unauthorized');
        }

        try {
            JWT::decode($token, new Key($this->secret, 'HS256'));
            return $handler->handle($request);
        } catch (\\Throwable) {
            return $this->unauthorized('Invalid token');
        }
    }

    private function unauthorized(string $message): Response
    {
        $response = new SlimResponse();
        $response->getBody()->write(json_encode(['error' => $message]));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus(401);
    }
}
`,
  );
}

function applyAuthOAuthPhp(targetDir: string): void {
  const composerPath = path.join(targetDir, "composer.json");
  const composer = JSON.parse(fs.readFileSync(composerPath, "utf-8"));

  composer.require = {
    ...composer.require,
    "guzzlehttp/guzzle": "^7.0",
  };

  fs.writeFileSync(composerPath, JSON.stringify(composer, null, 2) + "\n");

  const middlewareDir = path.join(targetDir, "src", "Middleware");
  fs.mkdirSync(middlewareDir, { recursive: true });

  fs.writeFileSync(
    path.join(middlewareDir, "AuthOAuth.php"),
    `<?php

declare(strict_types=1);

namespace App\\Middleware;

use GuzzleHttp\\Client;
use Psr\\Http\\Message\\ResponseInterface as Response;
use Psr\\Http\\Message\\ServerRequestInterface as Request;
use Psr\\Http\\Server\\MiddlewareInterface;
use Psr\\Http\\Server\\RequestHandlerInterface as RequestHandler;
use Slim\\Psr7\\Response as SlimResponse;

class AuthOAuth implements MiddlewareInterface
{
    private string $issuerUrl;

    public function __construct()
    {
        $this->issuerUrl = getenv('OIDC_ISSUER_URL') ?: 'https://your-provider.com';
    }

    public function process(Request $request, RequestHandler $handler): Response
    {
        $auth = $request->getHeaderLine('Authorization');
        $token = str_replace('Bearer ', '', $auth);

        if (empty($token) || $token === $auth) {
            return $this->unauthorized('Unauthorized');
        }

        try {
            $client = new Client();
            $resp = $client->get($this->issuerUrl . '/userinfo', [
                'headers' => ['Authorization' => "Bearer $token"],
            ]);

            if ($resp->getStatusCode() !== 200) {
                return $this->unauthorized('Invalid token');
            }

            return $handler->handle($request);
        } catch (\\Throwable) {
            return $this->unauthorized('Invalid token');
        }
    }

    private function unauthorized(string $message): Response
    {
        $response = new SlimResponse();
        $response->getBody()->write(json_encode(['error' => $message]));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus(401);
    }
}
`,
  );
}
