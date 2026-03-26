import { input, select } from "@inquirer/prompts";
import { templates, type TemplateInfo } from "./templates.js";
import { sanitizeProjectName, validateProjectName } from "./validate.js";
import {
  stylingOptions,
  hasFrontend,
  type StylingOption,
} from "./styling.js";

export interface UserChoices {
  projectName: string;
  template: TemplateInfo;
  styling: StylingOption | null;
}

export async function promptUser(
  initialName?: string,
  templateId?: string,
  stylingId?: string,
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
    const chosen = await select({
      message: "Pick a template:",
      choices: templates.map((t) => ({
        name: `${t.name} — ${t.description}`,
        value: t.id,
      })),
    });

    template = templates.find((t) => t.id === chosen)!;
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
    } else {
      const chosenStyling = await select({
        message: "Pick a styling option:",
        choices: stylingOptions.map((s) => ({
          name: `${s.name} — ${s.description}`,
          value: s.id,
        })),
      });

      styling = stylingOptions.find((s) => s.id === chosenStyling)!;
    }

    if (styling.id === "none") {
      styling = null;
    }
  }

  return { projectName, template, styling };
}
