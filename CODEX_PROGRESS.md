# HireHelper recovery checkpoint

## Goal and original requirements
Build the complete independent portfolio marketplace in docs/REQUIREMENTS.md under the user's docs/RECOVERY_PROTOCOL.txt protocol. Angular standalone/Material frontend, NestJS REST backend, PostgreSQL/Prisma, Mailpit OTP email, opaque cookie sessions, CSRF, persistent sanitized images and authenticated SSE. One helper per task. No payments, chat, maps, AI APIs, hosted-service requirement or Infosys endorsement. Full original requirements are preserved, not replaced by this summary.

## Architecture and technology
npm workspaces apps/web and apps/api; same-origin /api development proxy and Nginx. Angular core 21.2.25, CLI/build 21.2.24, Material/CDK 21.2.14; TypeScript 5.9.3; Node 24.15.0; NestJS 11.2.7; Prisma/client/adapter-pg 7.10.0, PostgreSQL 17.6; Mailpit 1.27.8. Exact dependencies/overrides and lockfile are committed. Compatible Angular 21 LTS/TS5.9/Node24 selected from angular.dev/reference/versions; Prisma 7 uses prisma.config.ts + PostgreSQL adapter. Patched Swagger 11.4.7, multer 2.4.0, nodemailer 10.0.14, sharp 0.35.5. Targeted transitive security overrides documented in docs/ARCHITECTURE.md. Test dependencies explicit at root; avoid incidental npm hoisting.

## Completed milestones
1. Inspected empty repository and supplied files; no AGENTS.md in workspace/D root. Git initialized; requirements and protocol preserved.
2. Pinned/installable workspaces and lockfile, configuration validation, secure idempotent setup, Compose/Dockerfiles/native dev scripts.
3. Normalized UUID Prisma schema and two migrations: initial tables, then timestamptz conversion. Both applied to real isolated PostgreSQL. Opt-in idempotent fictional seed tested twice and expanded to 30 tasks.
4. Registration/login/OTP/reset/email/password/profile, sessions and security guards.
5. Task CRUD/feed/detail/request/assignment lifecycle; transactional acceptance/cancellation with notifications.
6. Sanitized image upload/download, upload ownership, avatar updates, persisted notifications/SSE/cleanup.
7. Angular lazy auth/shell/feed/task form/detail/requests/settings, dashboard counts, mobile drawer/desktop collapse, account menu, validation/skeletons/errors/confirmations/local asset.
8. Real PostgreSQL/Mailpit/Chromium testing and captured screenshots at 360/768/1440; native restart persistence.
9. README, architecture/ER/lifecycle/API/security/deployment/interview/resume documentation.

## Current milestone
Final validation and recovery checkpoint. Native implementation validated; Docker Compose acceptance remains blocked by missing Docker.

CURRENT TASK: Save final source/tests/docs and accurately record remaining Docker acceptance.
CURRENT FILES: CODEX_PROGRESS.md, TODO.md, docs/BUILD_PROGRESS.md, README.md.
NEXT STEP: Confirm final build/audit and Git checkpoint; when Docker is available run the Compose acceptance path.

## Implementation ledger
Files created/modified: all project files are tracked by Git; use git show --stat and git ls-files. Major paths: apps/api/src/{auth,security,db,config,dto,tasks,media,events,notifications,main}.ts; apps/api/prisma/{schema.prisma,seed.ts,migrations}; apps/web/src/app/{core,auth-page,shell,task-list,task-form,task-detail,requests,settings}.ts; styles.scss, main.ts; compose*.yaml, Dockerfiles/nginx; scripts; tests; docs; root manifests/configuration. No unrelated pre-existing files existed.
Database changes: User, OtpChallenge, Session, Task, TaskRequest, TaskAssignment, Notification, UploadedFile, RateLimit; UUID keys, FKs, enums, unique email/task-request/task-assignment constraints and indexes. All dates timestamptz(3). UTC connection options required for Prisma adapter parsing on non-UTC native DBs. Migrations preserve data; no development volume reset.
API implemented: /api/v1/auth/csrf, register, login, forgot, resend, verify, reset, me, profile, password, email, logout; dashboard; tasks feed/mine/detail/CRUD and requests; received/sent request lists and accept/reject/withdraw; cancel/start/complete-request/confirm/return; files upload/download; notifications list/unread/read/read-all/events; health/readiness. Swagger /api/docs with DTO schemas.
Frontend implemented: all six sidebar features and auth/reset/OTP/detail/edit/assigned work; Material controls and responsive original layout; typed clients, CSRF interceptor, session navigation, SSE reconnect reconciliation. Device timezone display; uploaded images and local SVG fallback.
Important decisions: explicit task row locks with READ COMMITTED (not raw SERIALIZABLE errors); unique assignment as second integrity boundary. Notifications in same transaction, publish after commit. Single API SSE bus. Contact details only to assigned participants. Public sanitized attached avatars/task images; unattached media private. No cancellation after work starts/reassignment/resubmission.
Dependencies installed: workspace lockfile and ignored project-local Node24/PostgreSQL/Mailpit/Chromium. System Node23 untouched.
Required env: all variables explained in README/.env.example; setup generates ignored .env only if absent. Backend secrets never enter Angular. No third-party credentials needed locally.

## Tests actually executed and results
- Prisma client generation: passed; both migrations applied and repeat deploy no-op passed.
- npm run lint: passed; generated .angular caches excluded.
- npm run typecheck: both apps passed.
- npm run build: both production apps passed.
- npm test: 4 unit/security tests passed (signed CSRF/origin, hash binding, schedule, SSE recipient isolation/logout cleanup).
- Real API scenario: concurrency exactly one DB assignment with competing 409; ownership/state transitions/completion return/confirm/cancellation; request duplicates/withdrawal; notification persistence/unread/isolation; avatar/image ownership/sanitization; malicious SVG rejection; logout/reset revocation/single-use. Passed.
- Real auth edge scenario: wrong/expired OTP, five attempts, resend 60s/invalidation, concurrent consume one winner, login OTP, email change and current-password change, account rate limits. Passed.
- Seeded feed scenario: Mailpit demo login OTP, real nonempty pagination/search/location, own/closed/expired exclusion, stale expiry request rejection, invalid task ranges/fields, edit/delete. Passed.
- Browser owner/helper scenario: registration via Mailpit, real task picture upload/download, offer/accept/start/return/complete, live notifications and offline reconnect reconciliation, 360/768/1440 no overflow/deep reload, expired-session redirect. Passed on affected rerun.
- Browser pre-OTP/incorrect-code/CSRF scenario: passed.
- Full five-scenario run initially passed auth/feed/pre-OTP and failed image fixture imports after dependency unhoisting. Root sharp/pg test dependencies declared; affected three-scenario rerun passed 3/3 (52.0 seconds). All five distinct scenarios have passing final results; do not claim the initially failed full run passed.
- Native PostgreSQL user/task/notification counts and attached avatar bytes persisted after real PostgreSQL/Mailpit restart: passed.
- npm audit: zero known advisories after patches/scoped overrides (snapshot; final recheck recorded in BUILD_PROGRESS).
- Screenshots only from running application: docs/screenshots/feed-{360,768,1440}.png.
Failures resolved: CommonJS top-level await; SSE data typing; wrong Prisma CLI entry; EPERM sandbox engine (escalated); raw serialization error mapped incorrectly; hidden test upload parent; native timestamp/driver timezone; SSE network failure wrongly treated as logout; generated-cache linting; image test dependency hoisting. Notification previews bounded to DB field length.
Not executed: Docker Compose image build/start/fresh-volume/restart acceptance, HTTPS production or external SMTP deployment.

## Runtime state and recovery commands
Temporary native test services are stopped at handoff to free startup ports. Native test stack uses PostgreSQL 127.0.0.1:55432/hirehelper_test, Mailpit SMTP51025/inbox58025, API3000 and web4200. .tools/test-db and .tools/test-uploads preserve isolated data; .env development data untouched. Test secrets regenerate per API launch. API uses scripts/test-stack.mjs; web npm run dev:web. Optional local services script requires downloaded ignored binaries (documented in README); normal reproducible path uses compose.test.yaml.
On this host npm.ps1 invokes unsupported system Node23. Use Node24 directly with npm CLI:
  & '.\.tools\node_modules\node\bin\node.exe' 'D:\2.programming buddies\node js\node_modules\npm\bin\npm-cli.js' run build
For native test-stack runner, set NPM_CLI_PATH to that npm CLI and prepend .tools/node_modules/node/bin to PATH. Prefer installing supported Node24 for normal usage.

## USER ACTION REQUIRED
- Docker Desktop/Compose v2 is not installed on this host. Obtain from official Docker Desktop Windows installation docs; enable/start WSL2 engine. Docker is free for eligible personal use (check current license for other use). No credential/env key needed. Native work/tests can continue without it; container acceptance cannot.
- Native standard commands require Node24 LTS, available from nodejs.org at no cost. Install or use existing ignored local runtime. No private API key required.
- Optional real SMTP only for real delivery: provider supplies host/port/TLS/user/password/app password/sender. Enter SMTP_* in backend ignored .env; costs vary. Local development fully works without it using Mailpit.
- Production requires HTTPS APP_ORIGIN, COOKIE_SECURE=true, real SMTP and DEMO_SEED=false; never use demo credentials for real users.

## Known limitations and remaining tasks
Docker acceptance is genuinely unverified, not a completed milestone. Single API instance SSE only, local file storage, no payments/chat/maps/reassignment, no cancellation after start, no request resubmission. See TODO.md for exact pending acceptance. No known failing native test remains after affected reruns. All secrets/generated directories remain ignored.

## RESUME POINT
LAST COMPLETED TASK: Native acceptance, patched dependencies, source/docs and persistent recovery ledger.
CURRENT PROJECT STATE: Working built Angular/Nest/PostgreSQL/Mailpit application; native acceptance passed; Docker unavailable.
CURRENTLY IMPLEMENTING: Final checkpoint only; next unfinished acceptance requires Docker.
EXACT NEXT STEP: Inspect repo/progress/TODO/Git; verify Docker availability; run docker compose up --build -d and validate migration/readiness/login/task/image/SSE/deep-link/persistence using Compose services, without deleting existing volumes.
NEXT FILE TO OPEN: TODO.md
NEXT COMMAND TO RUN: docker compose version
REMAINING ISSUES: Docker Compose path unexecuted; HTTPS/external SMTP production deployment intentionally not performed.

## 2026-10-05 prerequisite and link recovery
CURRENT TASK: User requests working local links and PowerShell prerequisite installation. Docker installer found at D:\USER\Downloads\Docker Desktop Installer.exe; Docker executable absent; WSL reports not installed. Existing system Node23 unsupported; local Node24 available. App ports currently stopped. Next: verify installer, install WSL/Docker and supported Node, start services and probe URLs. Preserve existing databases and .env.


## Latest recovery state (supersedes earlier runtime observations)
Docker is installed in LOCALAPPDATA\Programs\DockerDesktop, CLI29.8.1/Composev5.5.1; absent from PATH. WSL missing; approved docker info returned engine HTTP500. Virtualization enabled, Windows26200, no administrator token. Native services restarted; final probes app4200/docs/readiness/inbox58025 all HTTP200. Compose inbox8025 remains offline. Native test data preserved.
Official Node24.21 MSI downloaded complete, OpenJS signature valid, not installed. WSL3.0.1 MSI partial after connection reset (about45MB of350.6MB), invalid signature; do not install. New PowerShell installation/start helper scripts syntax-checked only. Automatic approval review last rejected a browser check due to usage limit; action not executed, no new browser/Compose/system-install acceptance. No Git checkpoint attempted after rejection; latest changes uncommitted.
CURRENT TASK: User requested copy-paste context for new Codex account and prerequisite/link recovery. Full handoff saved in docs/NEW_CHAT_HANDOFF.md.
EXACT NEXT STEP: Read full handoff; recheck services; finish verified WSL download/admin installation and Node24 install, reboot with user agreement if required, verify engine, stop project-native listeners before Compose, then perform remaining Compose acceptance preserving all data.


Docker virtualization diagnostic: Ryzen5 4600H / Lenovo82EY reports VirtualizationFirmwareEnabled=true and HypervisorPresent=true. SLAT/VMMonitor WMI flags false under running hypervisor, do not infer unsupported hardware. WSL still missing. Normal token cannot inspect optional features/BCD. Next: administrator feature check and WSL repair without automatic reboot.


Docker virtualization repair: administrator UAC launch succeeded. Both VirtualMachinePlatform and Microsoft-Windows-Subsystem-Linux were Disabled; Enable-WindowsOptionalFeature completed for both with NoRestart warnings. Windows RebootPending key is now present. WSL installer (wsl --install --no-distribution) remains running, PID33956 under admin PowerShell30812, with established HTTPS download connection. Log: .tools/docker-wsl-repair.log; script: .tools/repair-docker-wsl.ps1. Do not duplicate installer or reboot during download. Once log shows completion, user must save work/restart Windows, then verify wsl --version and Docker engine. No reboot or Docker validation performed yet.


Docker recovery verified: WSL3.0.1 installed, default distro docker-desktop/version2; no Windows reboot-pending marker. Approved Docker engine info succeeds with server29.8.1; backend log confirms linux/wsl running. App ports stopped after restart. CURRENT TASK: First Compose build/start and local URL verification; preserve .env and all volumes.


Prepared ignored .tools browser smoke adapted from existing marketplace test to Compose inbox8025. Native-only DB expiry omitted; remaining registration/OTP/images/lifecycle/SSE/responsive/deep reload assertions unchanged. Persistence fixture/storage saved under ignored .tools; tests not executed yet. First image build in progress.

