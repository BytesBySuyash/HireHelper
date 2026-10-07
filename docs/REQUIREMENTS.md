# Product scope

HireHelper is an on-demand task assistance marketplace. Any member can post a task and offer help on another member’s task; account roles are not fixed. The application is an independently rebuilt portfolio project based on an internship brief.

## Main features

- Register and sign in with email verification codes; recover accounts and manage profile details.
- Browse, search and filter open tasks; create tasks with location, schedule and optional image.
- Request to help with a task; owners can review requests and choose one helper.
- Track assigned work through start, completion request and owner confirmation. Owners can return a completion request with a reason or cancel before work starts.
- Receive in-app notifications for relevant task and request updates.

The task lifecycle is `OPEN → ASSIGNED → IN_PROGRESS → COMPLETION_PENDING → COMPLETED`. A task can have at most one assigned helper. Permissions are checked by the API, and assignment is protected by database constraints and a transaction.

## Local application

The full application uses Angular and NestJS with PostgreSQL and Prisma. Local email is captured by Mailpit, and task images are stored on disk. Authentication uses Argon2id password hashes, one-time email codes, revocable cookie sessions, CSRF tokens and origin checks. See [Architecture](ARCHITECTURE.md) for implementation details and [Project guide](PROJECT_GUIDE.md) for setup.

The static portfolio demo uses fictional sample members and browser-local data. It does not connect to the API, send email or share data between visitors. Build-time replacement selects the static adapter; the ordinary web build uses the API.

## Deliberate limits

There are no payments, messaging, maps, phone verification, social sign-in or real public accounts. Locations are entered as text. The project does not claim Infosys endorsement, production use, user counts or performance results. A public full-stack deployment requires separately operated hosting, persistent storage, email delivery and operational safeguards.
