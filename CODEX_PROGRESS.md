# HireHelper recovery checkpoint

## Goal and original requirements
Implement the portfolio marketplace specified in docs/REQUIREMENTS.md. Angular standalone/Material web, NestJS REST API, PostgreSQL/Prisma, Mailpit OTP, local uploads, cookie sessions and authenticated SSE. No payments or external accounts. One helper per task with transactional assignment. Preserve all security, accessibility and testing requirements from the supplied build prompt.

## Architecture and stack
npm workspaces apps/web and apps/api. Same-origin /api reverse proxy. Node 24, Angular 21 LTS with TypeScript 5.9, NestJS 11, Prisma 7 PostgreSQL driver adapter. Exact dependencies recorded in package manifests and lockfile once installed. Version references: https://angular.dev/reference/versions and https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7.

## Completed milestones
- Read pasted user protocol and attached specification. Empty repository confirmed. No AGENTS.md found in workspace or D drive root. Git initialized.

## Current milestone
6: verification and documentation. Source implementations exist; runtime integration remains unverified.

CURRENT TASK: Fix test runner and migration generation; add isolated acceptance tests and documentation.
CURRENT FILES: apps/api/test, apps/api/prisma/migrations, scripts, docs, README.md.
NEXT STEP: Inspect running validation command results; implement integration/browser harness.

## Implementation ledger
Files created: .gitignore, CODEX_PROGRESS.md, TODO.md. All subsequent files tracked by Git.
Files modified: none previously existed.
Database changes: normalized Prisma schema and SQL migration generation (not applied to a live DB).
API endpoints implemented: auth/csrf/register/login/forgot/resend/verify/reset/me/profile/password/email/logout; dashboard; tasks CRUD/feed/mine; received/sent requests and accept/reject/withdraw; task cancel/start/complete-request/confirm/return; uploads/download; notifications list/unread/read/read-all/SSE; health/readiness; Swagger. All under /api/v1 except /api/docs.
Frontend components implemented: lazy auth page, shell, task list, task form, detail, requests, settings; Api/Auth services and CSRF interceptor. Material SCSS responsive theme, local fallback SVG.
Backend modules implemented: configuration, database, security guards, auth, tasks, media, events, notifications.
Dependencies installed: npm install completed (766 packages). Lockfile exists. Ignored project-local Node 24.15.0 downloaded; system Node preserved. First install npm shim used Node 23 inadvertently; verification explicitly invokes Node 24 plus npm-cli.js.
Required environment: DATABASE_URL, SESSION_SECRET, OTP_SECRET, APP_ORIGIN, SMTP_HOST/PORT/FROM, UPLOAD_DIR, NODE_ENV. Setup generates local secrets; never commit .env.
Credentials still needed: no third-party keys for local development.
Tests executed: npm run build (both apps), Prisma client generation, API type check, lint, first unit test attempt.
Tests passed: both production builds; Prisma client generation; lint; both app typechecks; 4 security/unit checks (signed CSRF/origin, hash purpose binding, schedule validation, SSE isolation and logout completion). Migration SQL verified on disk.
Tests failed (resolved): initial unit runner failed because top-level await in CommonJS; fixed and all 4 passed. Direct Prisma build/index.js is a non-CLI compatibility entry in this release; use npm exec workspace to invoke actual CLI. Sandbox Prisma engine failed EPERM; escalation allowed.
Known limitations: host Node 23.11.0 is unsupported; Docker, psql and pg_ctl absent from PATH. Native services/container acceptance cannot run until runtime supplied. Registry access requires escalation; initial npm query failed ENOTCACHED under sandbox.

## USER ACTION REQUIRED
- Install/start Docker Desktop with Compose v2 and WSL2 on Windows to run PostgreSQL/Mailpit and complete service testing. Free for eligible personal use; see Docker licensing for other use. No API key. Development can continue without Docker; runtime checks cannot.
- Install Node 24 LTS for native development. A project-local ignored runtime may be used for build verification without replacing system Node.

## Remaining tasks
See TODO.md; none of the full acceptance criteria are claimed complete.

## RESUME POINT
LAST COMPLETED TASK: API and Angular source implementations and successful production builds.
CURRENT PROJECT STATE: Dependencies and local config installed; DB/service testing blocked by missing Docker. Source must still be runtime audited.
CURRENTLY IMPLEMENTING: Migration/test runner verification and integration harness/docs.
EXACT NEXT STEP: Inspect test/typecheck results and complete independent TODO items.
NEXT FILE TO OPEN: apps/api/test/security.test.ts
NEXT COMMAND TO RUN: git status --short
REMAINING ISSUES: Docker/PostgreSQL/Mailpit unavailable; integration/Compose/browser acceptance unverified. Native dev runner changed to tsc to preserve Nest decorator metadata.
