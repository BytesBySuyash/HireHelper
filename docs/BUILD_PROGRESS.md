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
