# Contributing

Read [README.md](README.md) for setup and [ARCHITECTURE.md](docs/ARCHITECTURE.md) for domain rules. Use Node 24.15+ within major 24 and the committed npm lockfile. `.nvmrc` matches the Docker runtime.

1. Create a branch describing your change.
2. Keep changes focused and preserve existing migrations and user data.
3. Run the checks below. For authentication, task state, media or notification changes, also run the isolated integration/browser scenarios described in the project guide.
4. Open a pull request describing the problem, resulting behavior and checks actually executed. Include screenshots for visible UI changes.

```sh
npm ci
npm run db:generate
npm run lint
npm run typecheck
npm run build
npm test
```

The GitHub workflow runs these checks on pushes to main and pull requests. It also builds both static demos and runs production-demo browser scenarios. Full-server and Docker acceptance have a separate local test setup.

Use `.env.example` to understand configuration; run `npm run setup` to create local secrets. Keep `.env`, uploads, database backups, downloaded binaries and test session artifacts out of commits. Describe bug reports with reproduction steps, expected/actual behavior and relevant redacted logs. Report security issues privately to the repository owner rather than including sensitive information in a public issue.
