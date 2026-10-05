# Executed build checks

2026-10-05: inspected empty workspace and tool availability; initialized Git.
Installed pinned workspaces (766 packages), downloaded ignored Node 24.15.0 runtime, generated ignored local .env via setup.
Prisma client generation passed. Generated initial SQL migration using workspace Prisma CLI (no live database yet).
Both production builds passed. Both strict type checks passed. ESLint passed.
Four unit checks passed: CSRF signature/origin; hash binding; scheduling; SSE recipient isolation/logout closure.

Failures fixed: SSE MessageEvent data typed unknown; test top-level await CommonJS; native dev tsx lacks Nest decorator metadata (use tsc compiler); incorrect direct Prisma CLI entry.
Environment limitations: Docker, PostgreSQL and Mailpit not installed; evaluating isolated local test runtimes.

Native runtime testing: downloaded ignored Node/PostgreSQL 17.6/Mailpit/Chromium. Applied initial and timezone migrations to isolated DB on 55432. Browser marketplace lifecycle and pre-OTP protection passed, screenshots at 360/768/1440. API integration suite passed concurrency (exactly one assignment; competing 409), ownership/lifecycle, notifications, avatar and malicious uploads, cancellation, withdrawal, logout and reset revocation.
Runtime failures corrected: raw SQL SERIALIZABLE conflict yielded 500 (use READ COMMITTED + row lock); Express blocked hidden test-upload parent (explicit allow on validated generated filename); native timestamp/driver timezone mismatch (timestamptz and explicit UTC connection option). Auth edge rerun still pending.

Authoritative live recovery state: ../CODEX_PROGRESS.md; full checklist: ../TODO.md.

Further checks passed: OTP expiry/5-attempt lockout/60-second cooldown/resend invalidation/concurrent one-time use/login OTP/email change/current-password change; seeded feed pagination/filter/stale expiry/edit/delete; SSE unread reconciliation with helper offline during acceptance; native PostgreSQL user/task/notification counts and attached avatar bytes after service restart.
Dependency audit found 13 advisories (2 critical/11 high); direct packages patched and targeted/scoped root overrides applied. Final audit reports zero known advisories. Generated Angular cache needed an ESLint ignore after dev-server use; source lint passed after exclusion.

Final validation: both app type checks and production builds passed on patched dependencies; final web build also passed after contrast refinement. Four unit checks passed. Full five-scenario run passed auth/feed/pre-OTP but failed image test fixture imports due to incidental hoisting; explicit root sharp/pg test dependencies fixed this. Affected three-scenario rerun passed 3/3 in 52.0 seconds: API concurrency/uploads/reset plus browser task picture/lifecycle/SSE offline reconnect/360-768-1440/deep reload/session expiry plus pre-OTP/CSRF. All five distinct scenarios have passing final results; the initially failed full run is not reported as passing.

Docker Compose acceptance remains blocked: no Docker executable/engine installed. Native PostgreSQL restart persistence passed; Docker image builds/fresh-volume/start/restart/HTTPS production deployment are not verified. Temporary native test services are stopped at handoff; persisted .tools/test-db/test-uploads remain intact. Resume from CODEX_PROGRESS.md, never recreate the project.

Link/prerequisite recovery: Docker found in per-user installation (CLI29.8.1/Composev5.5.1), not on PATH; WSL missing and approved engine info returns HTTP500. Native services restored and app/docs/readiness/inbox58025 return HTTP200. Node24.21 MSI complete with valid OpenJS signature; WSL3.0.1 download partial after reset, not installable. New PowerShell helper scripts syntax-parsed only. Browser smoke request rejected by approval-review usage limit and did not execute. System installs, Compose acceptance and new Git checkpoint remain pending. See NEW_CHAT_HANDOFF.md for new-account continuation.


Docker startup error diagnosis: firmware virtualization and active Windows hypervisor verified. VirtualMachinePlatform and WSL optional feature were disabled, now enabled by admin repair with no automatic reboot. Windows restart pending. Official WSL installation downloading in background; outcome log .tools/docker-wsl-repair.log. Docker post-reboot acceptance pending.


Post-restart verification: WSL3.0.1 installed, default docker-desktop WSL2 distro, Docker engine29.8.1 responds successfully; no reboot-pending marker. First Compose pull/build/start is executing, native test data and .env preserved. Container acceptance not yet completed.

Final Docker acceptance: both images built; new database/mail/upload named volumes created; both migrations deployed and restart migration check no-op passed. API Dockerfile recursive chown of all /app was slow; cancelled that build and limited writable ownership to /data (1.5s). Non-root API upload/read validated by browser. Compose app4200, inbox8025, docs/readiness all200. Two existing marketplace/guard scenarios adapted to Compose inbox passed2/2 in27.6s, with real password login OTP added; native-only SQL session expiry omitted (previous native coverage retained). Real compose restart preserved login session, completed task, notifications, identical SHA256 image bytes, inbox messages and nginx browser deep link. All four services running; PG/Mailpit healthy. Local acceptance complete. HTTPS/external SMTP unverified. Ignored test artifacts: .tools/compose-marketplace.spec.ts, compose-playwright.config.ts, compose-post-restart.mjs, persistence/session fixtures and screenshots.

GitHub preparation: CI workflow/editor/runtime hints/contributing/publishing guide and README preview added. YAML parsed, screenshot reference validated, lint passed and4 security units passed (sandbox spawnEPERM rerun outside sandbox). First hosted CI run awaits repository publication; no remote yet. Existing Linux Docker builds and browser acceptance remain valid; app source unchanged.
