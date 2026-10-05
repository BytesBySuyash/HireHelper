# HireHelper recovery checkpoint

## Goal and original requirements
Implement the portfolio marketplace specified in docs/REQUIREMENTS.md. Angular standalone/Material web, NestJS REST API, PostgreSQL/Prisma, Mailpit OTP, local uploads, cookie sessions and authenticated SSE. No payments or external accounts. One helper per task with transactional assignment. Preserve all security, accessibility and testing requirements from the supplied build prompt.

## Architecture and stack
npm workspaces apps/web and apps/api. Same-origin /api reverse proxy. Node 24, Angular 21 LTS with TypeScript 5.9, NestJS 11, Prisma 7 PostgreSQL driver adapter. Exact dependencies recorded in package manifests and lockfile once installed. Version references: https://angular.dev/reference/versions and https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7.

## Completed milestones
- Read pasted user protocol and attached specification. Empty repository confirmed. No AGENTS.md found in workspace or D drive root. Git initialized.

## Current milestone
1: workspace, compatible versions, configuration, database.

CURRENT TASK: Create workspace/configuration and normalized database schema.
CURRENT FILES: package.json, apps/api, apps/web, scripts, compose.yaml, docs.
NEXT STEP: Install pinned packages using supported local Node 24, validate schema and build.

## Implementation ledger
Files created: .gitignore, CODEX_PROGRESS.md, TODO.md. All subsequent files tracked by Git.
Files modified: none previously existed.
Database changes: none applied yet.
API endpoints completed: none yet.
Frontend components completed: none yet.
Backend modules completed: none yet.
Dependencies installed: none yet.
Required environment: DATABASE_URL, SESSION_SECRET, OTP_SECRET, APP_ORIGIN, SMTP_HOST/PORT/FROM, UPLOAD_DIR, NODE_ENV. Setup generates local secrets; never commit .env.
Credentials still needed: no third-party keys for local development.
Tests executed: tool availability/version inspection only.
Tests passed: none yet.
Tests failed: none yet.
Known limitations: host Node 23.11.0 is unsupported; Docker, psql and pg_ctl absent from PATH. Native services/container acceptance cannot run until runtime supplied. Registry access requires escalation; initial npm query failed ENOTCACHED under sandbox.

## USER ACTION REQUIRED
- Install/start Docker Desktop with Compose v2 and WSL2 on Windows to run PostgreSQL/Mailpit and complete service testing. Free for eligible personal use; see Docker licensing for other use. No API key. Development can continue without Docker; runtime checks cannot.
- Install Node 24 LTS for native development. A project-local ignored runtime may be used for build verification without replacing system Node.

## Remaining tasks
See TODO.md; none of the full acceptance criteria are claimed complete.

## RESUME POINT
LAST COMPLETED TASK: Initial inspection and Git initialization.
CURRENT PROJECT STATE: Empty workspace with recovery files.
CURRENTLY IMPLEMENTING: Workspace/configuration/database.
EXACT NEXT STEP: Read Git status and manifests, continue first unfinished TODO.
NEXT FILE TO OPEN: TODO.md
NEXT COMMAND TO RUN: git status --short
REMAINING ISSUES: Docker unavailable; unsupported host Node.
