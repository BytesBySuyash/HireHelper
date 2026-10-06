# Interview walkthrough

Current deployment update: **Vercel is the primary static demo target; Pages is optional and manual.** See [DEPLOYMENT.md](DEPLOYMENT.md) for exact settings. Both use the browser adapter and hash routes; the full backend remains local. CI now builds both static targets and tests the Vercel artifact. Date entry uses separate calendar and time controls. Demo recovery preserves unreadable saved data until explicit reset, labels memory fallback, and offers explicit refresh of expired open sample dates. Older Pages-specific descriptions below describe that secondary target.

HireHelper is an independent implementation of an on-demand task assistance brief. Each user can both post and help; roles are permissions on individual tasks, not permanent account categories.

Angular standalone components keep features small, lazy Router routes split the application bundle, Reactive Forms handle validation, HttpClient uses typed interfaces and a CSRF interceptor, signals hold view state, and RxJS coordinates SSE refresh and subscription cleanup. Material provides accessible form controls and the SCSS layout adapts to mobile drawers and desktop cards. UTC ISO timestamps are displayed in the viewer's timezone.

Nest controllers validate input and session guards identify the user. Services perform ownership checks rather than trusting client IDs. PostgreSQL foreign keys/unique constraints protect relationships. Accepting a request locks the task row and atomically creates one assignment, updates all affected requests and persists notifications; the competing owner call returns a conflict.

Password validation starts an OTP challenge, not a session. Argon2id protects passwords; cryptographic OTPs are purpose-bound HMAC hashes with expiration, attempt/resend limits and one-time row-locked consumption. Cookie sessions are opaque and revocable. Password reset authorization cannot log in. State changes require signed CSRF tokens and allowed origin.

Notifications are persisted first and SSE publishes recipient-specific events after commit. Reconnecting fetches the current database list/count so missed events are recoverable. This is designed for a single API instance, not distributed real-time messaging. Mailpit is a local test inbox and needs no provider keys.

## Factual resume templates

Use only after personally reviewing and running the corresponding implementation:

- Independently rebuilt a task assistance marketplace using Angular, NestJS, PostgreSQL and Prisma, with task creation, helper requests and owner-confirmed completion.
- Implemented email OTP authentication, revocable cookie sessions, server authorization, sanitized image uploads and persisted SSE notifications.
- Validated assignment concurrency against PostgreSQL and exercised owner/helper workflows with Playwright browser contexts.

Describe the internship separately and accurately. Do not imply Infosys endorsement, production adoption or invented users/performance metrics. See [PROJECT_GUIDE.md](PROJECT_GUIDE.md) for test scope and pending hosted verification.
