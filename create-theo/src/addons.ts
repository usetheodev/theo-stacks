import type { TemplateType } from "./templates.js";
import { AddonConflictError } from "./errors.js";

export type AddonId = "redis" | "auth-jwt" | "auth-oauth" | "queue";

export interface AddonInfo {
  id: AddonId;
  name: string;
  description: string;
}

export const addons: AddonInfo[] = [
  { id: "redis", name: "Redis", description: "Cache with Redis client" },
  { id: "auth-jwt", name: "Auth (JWT)", description: "JWT authentication middleware" },
  { id: "auth-oauth", name: "Auth (OAuth/OIDC)", description: "OAuth 2.0 / OpenID Connect authentication" },
  { id: "queue", name: "Queue", description: "Background job queue" },
];

export function getAvailableAddons(
  templateType: TemplateType,
  language: string,
): AddonInfo[] {
  return addons.filter((addon) => {
    switch (addon.id) {
      case "redis":
        return templateType === "api" || templateType === "worker";
      case "auth-jwt":
      case "auth-oauth":
        return templateType === "api";
      case "queue":
        return (
          (templateType === "api" || templateType === "worker") &&
          ["node", "go", "python", "php"].includes(language)
        );
      default:
        return false;
    }
  });
}

export function supportsAddons(templateType: TemplateType): boolean {
  return templateType === "api" || templateType === "worker";
}

export function resolveAddonDependencies(selected: AddonId[]): AddonId[] {
  const result = [...selected];

  // auth-jwt and auth-oauth are mutually exclusive
  if (result.includes("auth-jwt") && result.includes("auth-oauth")) {
    throw new AddonConflictError("JWT", "OAuth");
  }

  if (result.includes("queue") && !result.includes("redis")) {
    result.unshift("redis");
  }
  return result;
}

export function listAddonIds(): string[] {
  return addons.map((a) => a.id);
}

export function getAddon(id: string): AddonInfo | undefined {
  return addons.find((a) => a.id === id);
}
