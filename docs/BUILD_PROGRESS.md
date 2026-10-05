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
