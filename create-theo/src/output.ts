import type { TemplateInfo } from "./templates.js";
import type { StylingOption } from "./styling.js";

export function printSuccess(
  projectName: string,
  targetDir: string,
  template: TemplateInfo,
  styling?: StylingOption | null,
): void {
  console.log();
  console.log(`  Created ${projectName} in ./${projectName}`);

  if (styling) {
    console.log(`  Styling: ${styling.name}`);
  }

  console.log();
  console.log("  Next steps:");
  console.log(`    cd ${projectName}`);
  console.log("    theo login        # authenticate (first time only)");
  console.log("    theo deploy       # deploy to production");
  console.log();

  const devInstructions = getDevInstructions(template);
  if (devInstructions) {
    console.log("  Local development:");
    for (const line of devInstructions) {
      console.log(`    ${line}`);
    }
    console.log();
  }
}

function getDevInstructions(template: TemplateInfo): string[] | null {
  switch (template.language) {
    case "node":
      return ["npm install", "npm run dev"];
    case "go":
      return ["go run ."];
    case "python":
      return [
        "pip install -r requirements.txt",
        "uvicorn main:app --reload --port 8000",
      ];
    default:
      return null;
  }
}
