import fs from "node:fs";
import path from "node:path";
import type { TemplateInfo } from "../templates.js";

// --- CI Layer ---

export function writeCI(targetDir: string, template: TemplateInfo): void {
  const workflowDir = path.join(targetDir, ".github", "workflows");
  fs.mkdirSync(workflowDir, { recursive: true });
  fs.writeFileSync(path.join(workflowDir, "ci.yml"), buildCIWorkflow(template));
}

function buildCIWorkflow(template: TemplateInfo): string {
  switch (template.language) {
    case "go":
      return buildGoCI();
    case "python":
      return buildPythonCI();
    case "rust":
      return buildRustCI();
    case "java":
      return buildJavaCI();
    case "ruby":
      return buildRubyCI();
    case "php":
      return buildPhpCI();
    default:
      return buildNodeCI(template);
  }
}

function buildNodeCI(template: TemplateInfo): string {
  const needsBuild =
    template.id === "node-nestjs" ||
    template.id === "node-nextjs" ||
    template.id === "fullstack-nextjs" ||
    template.id === "monorepo-turbo";
  const buildStep = needsBuild ? "\n      - run: npm run build" : "";

  return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci${buildStep}
      - run: npm run lint --if-present

  # deploy:
  #   needs: build
  #   if: github.ref == 'refs/heads/main'
  #   runs-on: ubuntu-latest
  #   steps:
  #     - uses: actions/checkout@v4
  #     - name: Install Theo CLI
  #       run: npm install -g @usetheo/cli
  #     - name: Deploy
  #       run: theo deploy --yes
  #       env:
  #         THEO_TOKEN: \${{ secrets.THEO_TOKEN }}
`;
}

function buildGoCI(): string {
  return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: "1.22"
      - run: go build ./...
      - run: go vet ./...

  # deploy:
  #   needs: build
  #   if: github.ref == 'refs/heads/main'
  #   runs-on: ubuntu-latest
  #   steps:
  #     - uses: actions/checkout@v4
  #     - name: Install Theo CLI
  #       run: npm install -g @usetheo/cli
  #     - name: Deploy
  #       run: theo deploy --yes
  #       env:
  #         THEO_TOKEN: \${{ secrets.THEO_TOKEN }}
`;
}

function buildPythonCI(): string {
  return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements.txt
      - run: pip install ruff
      - run: ruff check .

  # deploy:
  #   needs: build
  #   if: github.ref == 'refs/heads/main'
  #   runs-on: ubuntu-latest
  #   steps:
  #     - uses: actions/checkout@v4
  #     - name: Install Theo CLI
  #       run: npm install -g @usetheo/cli
  #     - name: Deploy
  #       run: theo deploy --yes
  #       env:
  #         THEO_TOKEN: \${{ secrets.THEO_TOKEN }}
`;
}

function buildRustCI(): string {
  return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo build
      - run: cargo clippy -- -D warnings
      - run: cargo fmt --check

  # deploy:
  #   needs: build
  #   if: github.ref == 'refs/heads/main'
  #   runs-on: ubuntu-latest
  #   steps:
  #     - uses: actions/checkout@v4
  #     - name: Install Theo CLI
  #       run: npm install -g @usetheo/cli
  #     - name: Deploy
  #       run: theo deploy --yes
  #       env:
  #         THEO_TOKEN: \${{ secrets.THEO_TOKEN }}
`;
}

function buildJavaCI(): string {
  return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "21"
      - uses: gradle/actions/setup-gradle@v3
      - run: ./gradlew build

  # deploy:
  #   needs: build
  #   if: github.ref == 'refs/heads/main'
  #   runs-on: ubuntu-latest
  #   steps:
  #     - uses: actions/checkout@v4
  #     - name: Install Theo CLI
  #       run: npm install -g @usetheo/cli
  #     - name: Deploy
  #       run: theo deploy --yes
  #       env:
  #         THEO_TOKEN: \${{ secrets.THEO_TOKEN }}
`;
}

function buildRubyCI(): string {
  return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: "3.2"
          bundler-cache: true
      - run: bundle install
      - run: bundle exec rubocop --format simple

  # deploy:
  #   needs: build
  #   if: github.ref == 'refs/heads/main'
  #   runs-on: ubuntu-latest
  #   steps:
  #     - uses: actions/checkout@v4
  #     - name: Install Theo CLI
  #       run: npm install -g @usetheo/cli
  #     - name: Deploy
  #       run: theo deploy --yes
  #       env:
  #         THEO_TOKEN: \${{ secrets.THEO_TOKEN }}
`;
}

function buildPhpCI(): string {
  return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: "8.2"
          tools: composer
      - run: composer install --no-interaction
      - run: composer lint --no-interaction || true

  # deploy:
  #   needs: build
  #   if: github.ref == 'refs/heads/main'
  #   runs-on: ubuntu-latest
  #   steps:
  #     - uses: actions/checkout@v4
  #     - name: Install Theo CLI
  #       run: npm install -g @usetheo/cli
  #     - name: Deploy
  #       run: theo deploy --yes
  #       env:
  #         THEO_TOKEN: \${{ secrets.THEO_TOKEN }}
`;
}
