# ROADMAP — create-theo + Templates

**Objetivo:** `npm create theo@latest` → usuário escolhe stack → projeto pronto para `theo deploy`.
**Data início:** 2026-03-26
**Última atualização:** 2026-03-26

---

## Contexto

O Theo já tem:
- **30+ examples** em `examples/` (fixtures para theo-packs, sem theo.yaml na maioria)
- **3 fixtures E2E** em `infra/tests/e2e/fixtures/` (hello-server, multi-app, dogfood-monorepo)
- **Detecção automática** de 7 monorepo tools + 10 frameworks
- **theo-packs** gerando Dockerfiles para Go, Node, Python, Static

O que falta: **uma experiência de bootstrap zero-fricção** para projetos novos. O `theo init` funciona para projetos existentes. O `create-theo` funciona para projetos novos.

---

## Decisões de Design

### D-01: Templates independentes, não Nx/Turbo forçado
Templates são projetos standalone. Quem quer monorepo Turbo escolhe o template Turbo. Quem quer API simples não carrega tooling de monorepo.

### D-02: `create-theo` como pacote npm separado
Padrão da indústria (`create-vite`, `create-next-app`, `create-remix`). Zero dependência do Theo CLI para scaffolding. O CLI é instalado depois.

### D-03: Templates vivem em `theo-monorepos/templates/`
Source of truth para todos os templates. O `create-theo` copia daqui (bundled no pacote npm ou fetched do GitHub).

### D-04: Todo template deve ser deployável em < 5 minutos
`npm create theo@latest` → `cd my-app` → `theo login` → `theo deploy` → URL live. Nenhum step intermediário.

### D-05: Reusar `examples/` existentes como base
Os 30+ examples do theo-packs já funcionam. Templates do create-theo são versões aprimoradas desses examples: adicionam `theo.yaml`, `README.md`, `/health`, `.gitignore`, e scripts corretos.

---

## Regras

1. Todo template DEVE ter `theo.yaml` válido (version 1, project placeholder)
2. Todo template DEVE ter endpoint `/health` retornando `{ "status": "ok" }`
3. Todo template DEVE respeitar `PORT` via env var
4. Todo template DEVE ter `.gitignore` adequado
5. Todo template DEVE funcionar com `theo deploy` sem editar nenhum arquivo
6. Templates NÃO devem ter dependências desnecessárias — mínimo absoluto
7. `create-theo` NÃO depende do Theo CLI — é independente
8. Done = `npm create theo@latest` → deploy no DigitalOcean funciona

---

## Sequência

```
Sprint 1: Templates Base         → 5 templates funcionais + validação manual
    ↓ GATE: cada template deploya no DO via `theo deploy`
Sprint 2: create-theo CLI        → scaffolder interativo publicável no npm
    ↓ GATE: `npm create theo@latest` funciona end-to-end
Sprint 3: Templates Avançados    → monorepos + fullstack + linguagens adicionais
    ↓ GATE: todos deployam no DO
Sprint 4: Polish + Publicação    → docs, testes, npm publish, landing page
    ↓ GATE: usuário externo consegue usar sem ajuda
```

---

## Sprint 1 — Templates Base

**Objetivo:** 5 templates deployáveis, validados no DigitalOcean.
**Critério de aceite:** `theo deploy` em cada template produz URL acessível.

### Estrutura alvo

```
theo-monorepos/
├── ROADMAP.md
├── templates/
│   ├── node-express/
│   │   ├── theo.yaml
│   │   ├── package.json
│   │   ├── .gitignore
│   │   ├── src/
│   │   │   └── index.js
│   │   └── README.md
│   ├── node-fastify/
│   ├── node-nextjs/
│   ├── go-api/
│   └── python-fastapi/
└── create-theo/           ← Sprint 2
```

### Tasks

#### T1.1 — Estrutura do repositório
**O que:** Criar a estrutura de diretórios `templates/` com README raiz.
**Arquivos:**
- `theo-monorepos/templates/` (dir)
- `theo-monorepos/README.md`
**Critério:** Diretório existe, README explica o propósito.
**Dependências:** Nenhuma.

#### T1.2 — Template: node-express
**O que:** API Express.js mínima, pronta para deploy.
**Arquivos:**
```
templates/node-express/
├── theo.yaml              # project: {{project-name}}, app: api, framework: express, port: 3000
├── package.json           # express + start script
├── .gitignore             # node_modules, .env*, dist
├── src/
│   └── index.js           # Express app com GET / e GET /health
└── README.md              # 3 linhas: install, dev, deploy
```
**Requisitos:**
- `GET /` → `{ "message": "Hello from Theo!" }`
- `GET /health` → `{ "status": "ok" }`
- `process.env.PORT || 3000`
- `package.json` scripts: `start`, `dev`
- theo.yaml com `version: 1`, `type: server`, `framework: express`, `port: 3000`
**Critério:** `npm install && npm start` → server rodando. `theo deploy` → URL acessível.
**Dependências:** T1.1

#### T1.3 — Template: node-fastify
**O que:** API Fastify mínima, pronta para deploy.
**Arquivos:**
```
templates/node-fastify/
├── theo.yaml              # framework: fastify, port: 3000
├── package.json           # fastify + start script
├── .gitignore
├── src/
│   └── index.js           # Fastify app com GET / e GET /health
└── README.md
```
**Requisitos:**
- Mesmos endpoints e regras do T1.2, usando Fastify
- `fastify` como única dependência de produção
**Critério:** `npm install && npm start` → server rodando. `theo deploy` → URL acessível.
**Dependências:** T1.1

#### T1.4 — Template: node-nextjs
**O que:** App Next.js mínima (App Router), pronta para deploy.
**Arquivos:**
```
templates/node-nextjs/
├── theo.yaml              # type: frontend, framework: nextjs, render: server
├── package.json           # next, react, react-dom
├── next.config.js
├── .gitignore
├── src/
│   └── app/
│       ├── layout.js
│       ├── page.js         # Landing page simples
│       └── api/
│           └── health/
│               └── route.js  # GET /api/health → { status: "ok" }
└── README.md
```
**Requisitos:**
- Next.js 14+ com App Router
- `type: frontend`, `framework: nextjs`, `render: server` no theo.yaml
- Health check via API route `/api/health`
- Landing page com texto "Deployed with Theo"
- Mínimo de dependências (next, react, react-dom)
**Critério:** `npm install && npm run dev` → app rodando. `theo deploy` → URL acessível.
**Dependências:** T1.1

#### T1.5 — Template: go-api
**O que:** API Go mínima com net/http (stdlib), pronta para deploy.
**Arquivos:**
```
templates/go-api/
├── theo.yaml              # framework: custom, port: 8080
├── go.mod
├── .gitignore
├── main.go                # net/http com GET / e GET /health
└── README.md
```
**Requisitos:**
- Go 1.22+ com `net/http` (zero dependências externas)
- `GET /` → `{ "message": "Hello from Theo!" }`
- `GET /health` → `{ "status": "ok" }`
- `os.Getenv("PORT")` com fallback 8080
- `go.mod` com module name `{{project-name}}`
**Critério:** `go run .` → server rodando. `theo deploy` → URL acessível.
**Dependências:** T1.1

#### T1.6 — Template: python-fastapi
**O que:** API FastAPI mínima, pronta para deploy.
**Arquivos:**
```
templates/python-fastapi/
├── theo.yaml              # framework: fastapi, port: 8000
├── requirements.txt       # fastapi, uvicorn
├── .gitignore             # __pycache__, .venv, .env*
├── main.py                # FastAPI app com GET / e GET /health
└── README.md
```
**Requisitos:**
- FastAPI + Uvicorn como únicas dependências
- `GET /` → `{ "message": "Hello from Theo!" }`
- `GET /health` → `{ "status": "ok" }`
- `PORT` via env var com fallback 8000
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
**Critério:** `pip install -r requirements.txt && uvicorn main:app` → server rodando. `theo deploy` → URL acessível.
**Dependências:** T1.1

#### T1.7 — Validação local de todos os templates
**O que:** Testar cada template localmente (start, health check, graceful shutdown).
**Processo:**
1. Para cada template: install deps → start → curl /health → curl / → stop
2. Verificar que `theo init --yes` detecta corretamente (framework, port, type)
3. Verificar que theo-packs gera Dockerfile funcional para cada um
**Critério:** 5/5 templates passam validação local.
**Dependências:** T1.2, T1.3, T1.4, T1.5, T1.6

#### T1.8 — Validação no DigitalOcean
**O que:** Deploy real de cada template no ambiente dev DO.
**Processo:**
1. Para cada template: `git init` → `theo login` → `theo init` → `theo deploy`
2. Validar URL acessível com TLS
3. Validar `/health` retorna 200
**Critério:** 5/5 templates deployados e acessíveis no DO.
**Dependências:** T1.7

---

## Sprint 2 — create-theo CLI

**Objetivo:** `npm create theo@latest` funciona end-to-end.
**Critério de aceite:** Usuário roda comando, escolhe template, projeto é scaffolded e deployável.

### Estrutura alvo

```
theo-monorepos/
├── create-theo/
│   ├── package.json        # name: "create-theo", bin: "create-theo"
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts        # entrypoint (#!/usr/bin/env node)
│   │   ├── prompts.ts      # inquirer/prompts interativos
│   │   ├── scaffold.ts     # copia template + substitui placeholders
│   │   ├── templates.ts    # registry de templates disponíveis
│   │   └── utils.ts        # helpers (git init, pkg manager detect)
│   ├── templates/           # cópia bundled dos templates
│   └── tests/
│       └── scaffold.test.ts
└── templates/               # source of truth (Sprint 1)
```

### Tasks

#### T2.1 — Scaffold do pacote create-theo
**O que:** Criar o pacote npm `create-theo` com estrutura TypeScript.
**Arquivos:**
- `create-theo/package.json` (name: "create-theo", bin, scripts)
- `create-theo/tsconfig.json`
- `create-theo/src/index.ts` (entrypoint com shebang)
**Requisitos:**
- TypeScript strict mode
- Build para ESM
- `bin` field apontando para `dist/index.js`
- Dependencies: apenas o necessário (prompts lib, fs-extra ou nativo)
**Critério:** `npm run build` compila sem erros.
**Dependências:** Nenhuma (pode rodar em paralelo com Sprint 1)

#### T2.2 — Sistema de prompts interativos
**O que:** Fluxo de perguntas para o usuário escolher template e nome.
**Arquivo:** `create-theo/src/prompts.ts`
**Fluxo:**
```
1. "What's your project name?" → valida RFC 1123 (mesma regra do theo init)
2. "Pick a template:" → lista com descrição de cada
   ○ Node.js — Express
   ○ Node.js — Fastify
   ○ Node.js — Next.js
   ○ Go — API
   ○ Python — FastAPI
3. "Which package manager?" → (só para Node templates) npm / pnpm / yarn
```
**Requisitos:**
- Aceitar `--template <name>` e `--name <name>` como flags (skip prompts)
- Validação de project name igual ao `theo init` (RFC 1123)
- CI mode: requer `--template` e `--name` (sem interatividade)
**Critério:** Prompts funcionam interativamente e com flags.
**Dependências:** T2.1

#### T2.3 — Engine de scaffolding
**O que:** Copia template, substitui placeholders, inicializa git.
**Arquivo:** `create-theo/src/scaffold.ts`
**Processo:**
1. Copia template do diretório bundled
2. Substitui `{{project-name}}` em theo.yaml, package.json, go.mod, README
3. Roda `git init` no diretório criado
4. Roda install de dependências (npm/pnpm/yarn install ou nada para Go/Python)
**Requisitos:**
- Placeholder: `{{project-name}}` (único, consistente)
- Não corromper binários ou arquivos não-texto
- Manter permissões de arquivo
**Critério:** Projeto gerado funciona sem edição manual.
**Dependências:** T2.1, Sprint 1 completo (templates existem)

#### T2.4 — Bundle de templates no pacote
**O que:** Copiar templates de `templates/` para `create-theo/templates/` no build.
**Arquivo:** `create-theo/package.json` (script de build)
**Processo:**
- Script `prebuild` copia `../templates/*` → `create-theo/templates/`
- `package.json` inclui `templates/` no `files` field
**Critério:** `npm pack` inclui todos os templates.
**Dependências:** T2.1, Sprint 1

#### T2.5 — Output pós-scaffold
**O que:** Mensagem clara após scaffolding mostrando próximos passos.
**Output:**
```
✔ Created my-saas in ./my-saas

  Next steps:
    cd my-saas
    theo login        # authenticate (first time only)
    theo deploy       # deploy to production

  Local development:
    npm install
    npm run dev
```
**Requisitos:**
- Adaptar "Local development" conforme a stack (npm/go/python)
- Sem emojis excessivos, estilo limpo (referência: create-vite)
**Critério:** Output é correto e acionável para cada template.
**Dependências:** T2.3

#### T2.6 — Testes unitários
**O que:** Testes para prompts, scaffold, e validação de nome.
**Arquivo:** `create-theo/tests/scaffold.test.ts`
**Casos:**
- Nome válido → aceito
- Nome inválido (caracteres especiais, muito longo) → rejeitado com mensagem
- Template inexistente → erro claro
- Scaffold gera `theo.yaml` com nome correto
- Scaffold gera todos os arquivos do template
- Scaffold substitui placeholders corretamente
- CI mode sem flags → erro com instruções
**Critério:** Todos os testes passam.
**Dependências:** T2.2, T2.3

#### T2.7 — Validação end-to-end local
**O que:** `npx ./create-theo` → scaffold → start → health check.
**Processo:**
1. Build do create-theo
2. `npx ./create-theo --name test-project --template node-express`
3. `cd test-project && npm install && npm start`
4. `curl localhost:3000/health` → 200
5. Repetir para cada template
**Critério:** 5/5 templates scaffoldam e funcionam.
**Dependências:** T2.6

---

## Sprint 3 — Templates Avançados

**Objetivo:** Templates monorepo + fullstack + mais linguagens.
**Critério de aceite:** Todos deployam no DO via `theo deploy`.

### Tasks

#### T3.1 — Template: monorepo-turbo
**O que:** Turborepo com 2 apps (API + Web) + 1 shared package.
**Estrutura:**
```
templates/monorepo-turbo/
├── theo.yaml              # 2 apps: api (server) + web (frontend)
├── package.json           # workspaces: ["apps/*", "packages/*"]
├── turbo.json
├── .gitignore
├── apps/
│   ├── api/               # Express API
│   │   ├── package.json
│   │   └── src/index.js
│   └── web/               # Next.js frontend
│       ├── package.json
│       └── src/app/...
├── packages/
│   └── shared/            # Shared types/utils
│       ├── package.json
│       └── src/index.js
└── README.md
```
**Critério:** `npm install && npx turbo dev` funciona. `theo deploy` deploya ambos os apps.
**Dependências:** Sprint 1

#### T3.2 — Template: monorepo-pnpm
**O que:** pnpm workspaces com 2 apps (API Fastify + API Go).
**Estrutura:**
```
templates/monorepo-pnpm/
├── theo.yaml              # 2 apps: node-api (server) + go-api (server)
├── pnpm-workspace.yaml
├── package.json
├── .gitignore
├── apps/
│   ├── node-api/          # Fastify
│   └── go-api/            # Go net/http
└── README.md
```
**Critério:** Monorepo misto (Node + Go) deploya ambos via `theo deploy`.
**Dependências:** Sprint 1

#### T3.3 — Template: fullstack-nextjs
**O que:** Next.js fullstack com API routes + DB connection pattern.
**Estrutura:**
```
templates/fullstack-nextjs/
├── theo.yaml              # 1 app: type: frontend, framework: nextjs, render: server
├── package.json
├── .gitignore
├── src/
│   ├── app/
│   │   ├── layout.js
│   │   ├── page.js
│   │   └── api/
│   │       ├── health/route.js
│   │       └── items/route.js   # CRUD example com in-memory store
│   └── lib/
│       └── db.js               # Placeholder para conexão DB (com comentário)
└── README.md
```
**Critério:** App fullstack com API routes funciona. `theo deploy` → URL acessível.
**Dependências:** Sprint 1

#### T3.4 — Template: node-nestjs
**O que:** NestJS API com module pattern, pronta para deploy.
**Estrutura:**
```
templates/node-nestjs/
├── theo.yaml              # framework: nestjs, port: 3000
├── package.json
├── tsconfig.json
├── .gitignore
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── app.controller.ts
│   └── health/
│       ├── health.module.ts
│       └── health.controller.ts
└── README.md
```
**Critério:** `npm run start` → server rodando. `theo deploy` → URL acessível.
**Dependências:** Sprint 1

#### T3.5 — Template: python-django
**O que:** Django mínimo com REST endpoint, pronto para deploy.
**Critério:** `python manage.py runserver` funciona. `theo deploy` → URL acessível.
**Dependências:** Sprint 1

#### T3.6 — Atualizar create-theo com novos templates
**O que:** Adicionar templates do Sprint 3 ao registry e bundle do create-theo.
**Arquivo:** `create-theo/src/templates.ts`
**Critério:** `npm create theo@latest` lista todos os templates (Sprint 1 + Sprint 3).
**Dependências:** T3.1-T3.5, Sprint 2

#### T3.7 — Validação no DigitalOcean
**O que:** Deploy real de cada template novo no DO.
**Critério:** Todos os templates do Sprint 3 deployados e acessíveis.
**Dependências:** T3.6

---

## Sprint 4 — Polish + Publicação

**Objetivo:** Publicar `create-theo` no npm, documentação completa.
**Critério de aceite:** Usuário externo consegue usar sem ajuda.

### Tasks

#### T4.1 — README principal do theo-monorepos
**O que:** README.md na raiz com:
- O que é o create-theo
- Quick start (3 comandos)
- Lista de templates com descrição
- Como contribuir novos templates
**Critério:** README é auto-suficiente para entender e usar.
**Dependências:** Sprint 3

#### T4.2 — Testes de integração automatizados
**O que:** Script que scaffolda cada template e valida (start + health check).
**Arquivo:** `theo-monorepos/scripts/validate-templates.sh`
**Processo:** Para cada template: scaffold → install → start → curl /health → cleanup
**Critério:** Script passa para todos os templates. Pode rodar no CI.
**Dependências:** Sprint 2, Sprint 3

#### T4.3 — GitHub Action para CI
**O que:** Workflow que roda `validate-templates.sh` em PRs.
**Arquivo:** `.github/workflows/templates-ci.yml`
**Critério:** PRs que quebram templates são bloqueados.
**Dependências:** T4.2

#### T4.4 — Preparar para npm publish
**O que:** Finalizar package.json, LICENSE, .npmignore para publicação.
**Arquivo:** `create-theo/package.json`
**Requisitos:**
- `name: "create-theo"` (verificar disponibilidade no npm)
- `version: 0.1.0`
- `license: MIT` (ou o que o Theo usar)
- `repository`, `homepage`, `keywords`
- `.npmignore` excluindo tests, tsconfig, src/
**Critério:** `npm pack` gera tarball limpo com apenas o necessário.
**Dependências:** Sprint 2

#### T4.5 — Publicação no npm
**O que:** `npm publish` do create-theo.
**Processo:**
1. `npm login`
2. `npm publish --access public`
3. Testar: `npm create theo@latest` em máquina limpa
**Critério:** `npm create theo@latest` funciona para qualquer pessoa.
**Dependências:** T4.4

#### T4.6 — Smoke test pós-publicação
**O que:** Em máquina/ambiente limpo, testar o fluxo completo.
**Processo:**
1. `npm create theo@latest`
2. Escolher template
3. `cd project && theo login && theo deploy`
4. Validar URL acessível
**Critério:** Funciona end-to-end sem intervenção manual.
**Dependências:** T4.5

---

## Tabela Resumo

| Sprint | Tasks | Entregável | Status |
|--------|-------|------------|--------|
| 1 — Templates Base | T1.1-T1.7 | 5 templates deployáveis | ✅ Implementado (T1.8 DO pending) |
| 2 — create-theo CLI | T2.1-T2.7 | `npx create-theo` funciona | ✅ Implementado (29/29 testes) |
| 3 — Templates Avançados | T3.1-T3.6 | +3 templates (monorepo, fullstack, NestJS) | ✅ Implementado (8/8 validação) |
| 4 — Polish + Publish | T4.1-T4.6 | Publicado no npm | ⚠️ T4.1-T4.2 feitos, T4.3-T4.6 pending (npm publish) |

---

## Riscos

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Template funciona local mas não no DO | Deploy falha | Validação no DO é gate obrigatório (T1.8, T3.7) |
| theo-packs não gera Dockerfile correto para algum template | Build falha | Testar geração de Dockerfile antes do deploy (T1.7) |
| Nome `create-theo` já ocupado no npm | Não publica | Verificar disponibilidade em T4.4, alternativa: `create-theo-app` |
| Placeholder `{{project-name}}` aparece em runtime | Bug de UX | Teste unitário verifica substituição (T2.6) |
| Templates ficam desatualizados (deps vulneráveis) | Segurança | CI com `npm audit` nos templates (T4.3) |

---

## Relação com Sprint Plan Principal

Este roadmap é um **track paralelo** ao sprint plan do Theo. Não bloqueia nem é bloqueado pelos hardening sprints. Pode ser executado independentemente enquanto o Sprint 6 (status) e sprints futuros continuam.

A única dependência real é que o `theo deploy` funcione end-to-end — o que já está validado no DO desde o Sprint 2.
