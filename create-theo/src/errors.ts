export class TheoError extends Error {
  constructor(
    public readonly module: string,
    message: string,
    public readonly meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "TheoError";
  }
}

export class TemplateNotFoundError extends TheoError {
  constructor(templateId: string, searchPath: string) {
    super("scaffold", `Template "${templateId}" not found at ${searchPath}`, {
      templateId,
      searchPath,
    });
    this.name = "TemplateNotFoundError";
  }
}

export class ScaffoldIOError extends TheoError {
  constructor(filePath: string, detail: string) {
    super("scaffold", `Failed to read ${filePath}. ${detail}`, { filePath });
    this.name = "ScaffoldIOError";
  }
}

export class DependencyInstallError extends TheoError {
  constructor(packageManager: string) {
    super(
      "scaffold",
      `Failed to install dependencies. Run "${packageManager} install" manually.`,
      { packageManager },
    );
    this.name = "DependencyInstallError";
  }
}

export class AddonConflictError extends TheoError {
  constructor(addonA: string, addonB: string) {
    super(
      "addons",
      `Cannot select both ${addonA} and ${addonB} authentication. Choose one.`,
      { addonA, addonB },
    );
    this.name = "AddonConflictError";
  }
}
