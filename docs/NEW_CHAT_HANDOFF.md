# Copy-paste handoff for the next Codex account

Continue the existing HireHelper project in D:\HireHelp on this same Windows computer, using PowerShell. Do not recreate it, delete databases/volumes, overwrite .env, or change architecture unnecessarily. The original build request and recovery protocol are saved in docs/REQUIREMENTS.md and docs/RECOVERY_PROTOCOL.txt. Read those plus CODEX_PROGRESS.md, TODO.md, docs/BUILD_PROGRESS.md, README.md, and git status/log before making changes. Newer recovery entries override older runtime observations. The user's latest requests are to repair the local links, check their downloaded Docker, identify and install remaining prerequisites through PowerShell, and continue the unfinished Docker acceptance. The user authorizes that work; don't stop at a plan.

## Current implementation

An npm workspace with Angular 21 standalone/lazy routes and Material in apps/web, NestJS 11 in apps/api, Prisma 7/PostgreSQL 17, Mailpit, local image storage and cookie-authenticated SSE. Required Node version >=24.15.0 <25. Dockerfiles pin Node 24.15.0. Compose runs PostgreSQL, Mailpit, API migrations/start and nginx/web, preserving DB/mail/upload volumes. See package manifests/lockfile for exact versions.

Implemented: register/login with mandatory six-digit email OTP on every login, password reset, expiry/attempt/resend rate limits, Argon2id, hashed opaque sessions, HttpOnly cookies, CSRF/origin protection, profile/avatar/email/password changes; task CRUD, search/location/pagination, helper requests and concurrent acceptance; assignment lifecycle OPEN -> ASSIGNED -> IN_PROGRESS -> COMPLETION_PENDING -> COMPLETED with owner return/cancel rules; persisted notifications and live SSE with reconnect reconciliation; sanitized image uploads, upload ownership/cleanup; responsive dashboard/feed/tasks/requests/settings/auth UI; Swagger docs and health/readiness. Local development needs no external API keys or real email provider. OTP is read from Mailpit.

Important choices: task row locks at READ COMMITTED plus unique assignment enforce exactly one accepted helper; notifications persist in the same transaction then publish after commit. All schema dates are timestamptz(3), Prisma PostgreSQL connections set timezone UTC. SSE expires sessions on actual 401 rather than network errors. Sanitized attached task/avatar media is public; unattached media is owner-only. No payments/chat/maps/reassignment or cancellation after work starts. Production HTTPS/external SMTP deployment is outside the completed native acceptance.

## What was verified

Both migrations deployed to real isolated PostgreSQL; idempotent opt-in seed; production builds, type checks, lint, four security/unit tests; real auth expiry/attempt/cooldown/concurrent OTP tests; API concurrency/ownership/lifecycle/upload/reset/notification tests; seeded feed tests; browser owner/helper task-image/lifecycle/SSE offline reconnect/session expiry and responsive/deep reload checks. Native database and attached-image persistence survived an actual service restart. Last npm audit was zero known advisories. Screenshots in docs/screenshots are from the real app.

Accurate test history: the five-scenario run initially had three passes/two image-import failures due to dependency hoisting. Explicit sharp/pg test dependencies fixed that. The affected three-scenario rerun passed 3/3 in 52 seconds. All five distinct scenarios have passing final results, but do not claim that initial full run passed. Docker builds/start/restart/fresh-volume acceptance remain unverified.

## Latest machine state: 2026-10-05

The previous handoff stopped all native services, causing the localhost links to fail. In this turn they were restarted with hidden PowerShell-launched processes. The final HTTP probes returned 200 for:

- http://localhost:4200 (app)
- http://localhost:4200/api/docs
- http://localhost:4200/api/v1/health/ready
- http://localhost:58025 (native OTP inbox)

These are local URLs, requiring running services on this computer. Port 8025 is the Compose inbox and is not yet live. Recheck ports/processes/HTTP rather than assuming the native preview survived switching accounts or rebooting. A newly requested browser-render check did not execute because approval review hit its usage limit; previous-turn browser acceptance is recorded above.

Native services: PostgreSQL loopback55432 database hirehelper_test; Mailpit SMTP51025/inbox58025; API3000; web4200. Database and images are retained in ignored .tools/test-db and .tools/test-uploads. scripts/test-env.mjs generates fresh test secrets at API launch, separate from development .env. Never expose the .env contents in output.

Docker IS installed at C:\Users\suyas\AppData\Local\Programs\DockerDesktop, despite being absent from PATH and C:\Program Files\Docker. The initial absent-Docker statement was corrected after checking the newer per-user location. Direct CLI version: Docker29.8.1; Composev5.5.1. Docker Desktop/backend processes are running. A sandbox engine check was permission denied; an approved check outside the sandbox returned HTTP500 from dockerDesktopLinuxEngine. WSL reports not installed even when running wsl --install --no-distribution. The process has no Windows administrator token. Hardware virtualization was verified enabled; Windows build26200.

Original Docker download: D:\USER\Downloads\Docker Desktop Installer.exe, valid Docker Inc. signature. Don't reinstall Docker unnecessarily.

Global node is unsupported v23.11.0 at D:\2.programming buddies\node js\node.exe. Supported ignored local runtime: D:\HireHelp\.tools\node_modules\node\bin\node.exe, v24.15.0. npm.ps1 uses the old global runtime even after PATH prepending, so invoke the npm CLI with the supported node explicitly:

    & '.\.tools\node_modules\node\bin\node.exe' 'D:\2.programming buddies\node js\node_modules\npm\bin\npm-cli.js' run build

Downloaded .tools/node-v24.21.0-x64.msi is complete (33,230,848 bytes), valid OpenJS Foundation signature, NOT installed yet. Downloaded .tools/wsl.3.0.1.0.x64.msi is PARTIAL (about45MB out of350.6MB): connection reset and signature UnknownError. DO NOT INSTALL the partial WSL file. Redownload from official Microsoft WSL GitHub release assets and verify Microsoft signature before installing.

Two NEW untracked scripts: scripts/install-windows-prerequisites.ps1 and scripts/start-windows.ps1. Both passed PowerShell syntax parsing, but installation/startup is NOT acceptance-tested. The installer resolves official latest Node24 LTS and stable WSL x64 MSI, verifies signatures/publishers, reuses valid cached installers, refuses bad downloads, installs via msiexec /norestart, enables VirtualMachinePlatform and Microsoft-Windows-Subsystem-Linux with -NoRestart. Requires administrator PowerShell. The start helper locates per-user/system Docker and supported Node, idempotently creates absent .env, runs docker info/compose up --build -d, waits for readiness and prints URLs. Review before use. Scripts do not reboot automatically.

## Approval/usage limitation

An early escalation review failed due to model capacity. Later approved checks/downloads/native launches worked. The last request (new browser smoke check) was rejected because automatic approval review reported a usage limit. No action from that rejected call executed. Further escalations/Git commits/system installs were not attempted after that. This is an approval service availability problem, not a finding that the actions are unsafe. Do not bypass approvals; the user's new account should restore ability to request normal approved execution. Windows UAC/admin permission is a separate requirement for system setup.

## Working tree and next steps

Last committed checkpoint e0bf968 (native acceptance complete and Docker resume point). Current changes are uncommitted: CODEX_PROGRESS.md, TODO.md, docs/BUILD_PROGRESS.md, README.md, this handoff, and the two new scripts. Keep these changes and make a checkpoint when allowed. .tools/MSIs/logs/data and .env remain ignored.

1. Read the recovery documents and inspect current services, git status and installed tools. Confirm actual HTTP availability.
2. Finish the official WSL download; verify its signature. Install Node24 and WSL in an administrator context using the prepared script or equivalent safe PowerShell. Expect Windows UAC and potentially a reboot; do not restart the computer without user agreement. Do not install Ubuntu merely for Docker unless needed. No Python/Java/manual PostgreSQL/manual Mailpit download is needed for Compose.
3. After restart, open Docker Desktop with WSL2 backend, verify wsl --version and docker info. Fix PATH or use direct executable. Install script does not fix old Node23 PATH precedence globally; verify Get-Command node/npm and node --version. Prefer explicit installed Node24 path until PATH is correct.
4. Ensure native API/web are stopped before Compose takes ports3000/4200. Stop only identified project processes; preserve native data. Run npm setup idempotently and docker compose up --build -d. No docker compose down -v and no destructive reset.
5. Verify migrations/readiness, localhost4200, inbox8025, Swagger, auth+real OTP, tasks/uploads/SSE/deep links, persistent data/images after container restart. Record actual failures and fix them. Fresh-volume validation must use an isolated Compose project rather than deleting development volumes.
6. Update CODEX_PROGRESS/TODO/BUILD_PROGRESS and commit stable milestones. Complete final Docker signoff only after real acceptance succeeds.

Native restart fallback uses existing local binaries, requiring permission for child processes outside restrictive sandbox: scripts/local-test-services.mjs, scripts/test-stack.mjs, Angular CLI. Set NPM_CLI_PATH to the npm CLI path above and prepend .tools/node_modules/node/bin to PATH before starting test-stack. Start web in apps/web with supported Node and root node_modules/@angular/cli/bin/ng.js serve --host127.0.0.1 --proxy-configproxy.conf.json (pass flags as separate arguments). Logs are .tools/services-recovery*.log, api-recovery*.log, web-recovery*.log. Current launch IDs were services30704/API runner29164/API child31372/web24056, but recheck rather than trusting stale PIDs.

Keep working autonomously within authorized scope, use PowerShell, keep the user informed, preserve data/secrets, and distinguish verified facts from unfinished work.

## Newer Docker virtualization repair (supersedes earlier approval limitation)
Administrator escalation now worked. Firmware virtualization=true and HypervisorPresent=true verified on Lenovo82EY/Ryzen4600H. Both required Windows features were disabled; administrator repair enabled them without reboot. Windows now has restart pending. Background official wsl --install --no-distribution is downloading over HTTPS (WSL process33956, admin PowerShell30812 at last check). Review .tools/docker-wsl-repair.log and actual process state; do not start duplicate installs. Wait for completion, then ask user to save work/restart Windows and reopen Docker. WSL completion/Docker startup remain unverified. .tools/repair-docker-wsl.ps1 is the exact repair script.


## Latest: Docker engine healthy after restart
WSL3.0.1 installed successfully; default distro docker-desktop/version2. Docker server29.8.1 now responds to info; no pending reboot marker. Earlier WSL/virtualization blockers resolved. Native app ports stopped after reboot. First docker compose up --build -d is in progress (pulls PostgreSQL/Mailpit/Node/nginx and builds API/web). Ignored Compose browser smoke prepared from existing marketplace tests with inbox8025 and native-only DB expiry removed; not yet run. Check latest CODEX_PROGRESS.md and containers for outcome.

## FINAL LATEST STATE: local Docker acceptance complete
Docker build/start with new named volumes succeeded. API Dockerfile now chowns only writable /data rather than all /app; non-root uploads verified. Compose app4200/inbox8025/docs/readiness all HTTP200. Two adapted browser marketplace/auth-guard scenarios passed2/2 in27.6s, including password/login OTP, image upload, acceptance/return/completion, SSE/offline reconnect, responsive layouts and nginx deep reloads. Actual Compose restart preserved session, task, notifications, exact image SHA256, inbox and browser deep link; repeated migrations no-op. All four containers left running; native test services remain stopped and preserved. Earlier blockers/in-progress statements are historical. No further prerequisite download required for Docker. Optional global Node24 remains uninstalled; signed MSI downloaded/local Node24 available. Source/doc final checkpoint follows; check git log/status. No production HTTPS/external SMTP deployment performed. Continue from updated CODEX_PROGRESS.md/README rather than replaying old installation steps.
