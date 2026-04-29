import { input, select, confirm, checkbox } from "@inquirer/prompts";
import {
  templates,
  templateCategories,
  getTemplatesByType,
  type TemplateInfo,
  type TemplateType,
} from "./templates.js";
import { sanitizeProjectName, validateProjectName } from "./validate.js";
import {
  stylingOptions,
  hasFrontend,
  type StylingOption,
} from "./styling.js";
import { supportsDatabase, getOrmForLanguage, type Language } from "./database.js";
import {
  getAvailableAddons,
  resolveAddonDependencies,
  supportsAddons,
  type AddonId,
} from "./addons.js";

export interface UserChoices {
  projectName: string;
  template: TemplateInfo;
  styling: StylingOption | null;
  database: boolean;
  addons: AddonId[];
  externalRepo?: string;
}

export async function promptUser(
  initialName?: string,
  templateId?: string,
  stylingId?: string,
  databaseArg?: boolean,
  addArg?: string,
  isCI?: boolean,
): Promise<UserChoices> {
  const rawName =
    initialName ??
    (await input({
      message: "What's your project name?",
      default: "my-theo-app",
      validate: (val) => validateProjectName(sanitizeProjectName(val)),
    }));

  const projectName = sanitizeProjectName(rawName);

  let template: TemplateInfo | undefined;

  if (templateId) {
    template = templates.find((t) => t.id === templateId);
    if (!template) {
      const valid = templates.map((t) => t.id).join(", ");
      throw new Error(
        `Unknown template: "${templateId}". Available: ${valid}`,
      );
    }
  } else {
    const chosenType = await select<TemplateType | "external">({
      message: "What do you want to build?",
      choices: [
        ...templateCategories.map((c) => ({
          name: `${c.name} — ${c.description}`,
          value: c.id as TemplateType | "external",
        })),
        { name: "GitHub — Use a community template (user/repo)", value: "external" as const },
      ],
    });

    if (chosenType === "external") {
      const repo = await input({
        message: "GitHub repository (user/repo or user/repo#branch):",
        validate: (val: string) => val.includes("/") || "Must be in format user/repo",
      });
      return {
        projectName,
        template: { id: "external", name: "External", description: repo, language: "node" as const, type: "api" as const, defaultPort: null },
        styling: null,
        database: false,
        addons: [],
        externalRepo: repo,
      };
    }

    const filtered = getTemplatesByType(chosenType);

    if (filtered.length === 1) {
      template = filtered[0];
    } else {
      const chosen = await select({
        message: "Pick a template:",
        choices: filtered.map((t) => ({
          name: `${t.name} — ${t.description}`,
          value: t.id,
        })),
      });

      template = templates.find((t) => t.id === chosen)!;
    }
  }

  let styling: StylingOption | null = null;

  if (hasFrontend(template.id)) {
    if (stylingId) {
      styling = stylingOptions.find((s) => s.id === stylingId) ?? null;
      if (!styling) {
        const valid = stylingOptions.map((s) => s.id).join(", ");
        throw new Error(
          `Unknown styling option: "${stylingId}". Available: ${valid}`,
        );
      }
    } else if (!isCI) {
      const chosenStyling = await select({
        message: "Pick a styling option:",
        choices: stylingOptions.map((s) => ({
          name: `${s.name} — ${s.description}`,
          value: s.id,
        })),
      });

      styling = stylingOptions.find((s) => s.id === chosenStyling)!;
    }

    if (styling?.id === "none") {
      styling = null;
    }
  }

  let database = false;

  if (supportsDatabase(template.type)) {
    if (databaseArg !== undefined) {
      database = databaseArg;
    } else if (!isCI) {
      const orm = getOrmForLanguage(template.language as Language);
      database = await confirm({
        message: `Add a PostgreSQL database? (via ${orm.name})`,
        default: false,
      });
    }
  }

  let selectedAddons: AddonId[] = [];

  if (supportsAddons(template.type)) {
    const available = getAvailableAddons(template.type, template.language);

    if (addArg) {
      selectedAddons = addArg.split(",").map((s) => s.trim()) as AddonId[];
    } else if (!isCI && available.length > 0) {
      selectedAddons = await checkbox({
        message: "Add optional modules:",
        choices: available.map((a) => ({
          name: `${a.name} — ${a.description}`,
          value: a.id,
        })),
      });
    }

    selectedAddons = resolveAddonDependencies(selectedAddons);
  }

  return { projectName, template, styling, database, addons: selectedAddons };
}
