const RFC_1123_MAX_LENGTH = 63;
const RFC_1123_PATTERN = /^[a-z][a-z0-9-]*[a-z0-9]$/;

export function sanitizeProjectName(input: string): string {
  let name = input.toLowerCase();
  name = name.replace(/[^a-z0-9-]/g, "-");
  name = name.replace(/-{2,}/g, "-");
  name = name.replace(/^-+|-+$/g, "");
  name = name.slice(0, RFC_1123_MAX_LENGTH);
  name = name.replace(/-+$/, "");

  if (!name || !/^[a-z]/.test(name)) {
    name = "p-" + name;
  }

  return name;
}

export function validateProjectName(name: string): string | true {
  if (!name || name.trim().length === 0) {
    return "Project name cannot be empty.";
  }

  if (name.length > RFC_1123_MAX_LENGTH) {
    return `Project name must be ${RFC_1123_MAX_LENGTH} characters or fewer.`;
  }

  if (!RFC_1123_PATTERN.test(name)) {
    return "Project name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens.";
  }

  return true;
}
