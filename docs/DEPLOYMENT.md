# Publish HireHelper on GitHub and Vercel

Vercel hosts the static browser demo. GitHub holds the complete source, including the local backend. No database, SMTP, storage provider or backend secret is required for this deployment. Public deployment has not yet been verified.

## Prepare and preview

Use Node 24.15+ within major 24 and run these commands in PowerShell from the project root:

```powershell
npm ci
npm run build:vercel
npm run check:vercel
npm run preview:vercel
```

Visit http://localhost:4202/#/login. The production output is `apps/web/dist/vercel/browser`, confirmed by the build configuration and artifact checker. The build uses `demo-mode.pages.ts`, base href `/`, hashed assets and hash routes. It does not build or launch NestJS, access Prisma databases or read `.env`. The default frontend build continues to use `demo-mode.ts` with demo mode disabled.

## Upload using VS Code

Open the existing project in VS Code. In Source Control review the changes and commit them, then select **Publish to GitHub** (also available through Ctrl+Shift+P). Sign in to your GitHub account, select **public**, and use `hirehelper` as the repository name. Publish the existing history. Do not include `.env`, `.tools`, uploads or test output. Keep the lockfile and both application directories.

Alternatively, create an empty public `hirehelper` repository on GitHub without a generated README or license, then run:

```powershell
git status
git remote -v
git branch --show-current
git remote add origin https://github.com/BytesBySuyash/hirehelper.git
git push -u origin main
```

Run `remote add` only when `origin` is absent. If an existing remote points elsewhere, check it before changing it. The final command assumes the checked branch is `main`. GitHub credentials are handled by the credential manager or VS Code, not added to project files.

Suggested description: “Task assistance application with an Angular portfolio demo and a NestJS/PostgreSQL backend.” Suggested topics: `angular`, `nestjs`, `postgresql`, `prisma`, `typescript`, `portfolio`, `task-management`.

Local preparation was verified with lint/type checks, normal builds, backend units, both static builds/artifact checks, nine demo browser scenarios and two real Docker browser scenarios. A clean tracked-only Linux Node 24 install and final Vercel build passed without local secrets or helpers. These checks do not verify the future hosted domain or GitHub Actions run.

## Import into Vercel

Create a free personal Vercel account, sign in with GitHub and authorize access to this repository. Select Add New → Project → Import `hirehelper`. This is the one hosting account needed; no Neon, Render, Gmail or Cloudinary account is required for the static demo.

| Setting | Value |
|---|---|
| Root Directory | Repository root (`.`); leave the selector at its default |
| Framework Preset | Other |
| Node.js Version | 24.x |
| Install Command | `npm ci` |
| Build Command | `npm run build:vercel` |
| Output Directory | `apps/web/dist/vercel/browser` |
| Environment Variables | None |

`vercel.json` supplies the install/build/output settings and selects no framework auto-preset. Confirm Node 24.x under Project Settings → Build and Deployment. Vercel selects its available Node 24 patch; `.nvmrc` does not guarantee that exact patch on Vercel. Official references: [Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [build settings](https://vercel.com/docs/builds/configure-a-build), [project configuration](https://vercel.com/docs/project-configuration).

Select Deploy. On success copy the actual production URL from Vercel. Do not infer a domain from the project name. Open it in a fresh browser, select a member, exercise the garden walkthrough, upload a fictional image, reload a `#/tasks/...` URL, and check the mobile layout. Missing scripts and assets should return 404; no rewrite is configured to mask those errors. Check browser Network for zero `/api` calls and no EventSource connections. Add the verified URL to the README and GitHub Website field only after this succeeds.

The local share asset and favicon are original SVG files. Some social sites do not render SVG previews; a PNG and absolute `og:image` URL can be added after the actual domain is known. No canonical URL is invented.

## Update an existing deployment

After making and checking changes:

```powershell
git status
git add apps scripts tests .github package.json package-lock.json vercel.json vercel.playwright.config.ts README.md docs .gitignore
git commit -m "Describe the change"
git push
```

Review the staged diff before committing. If there are no changes, skip the commit. Vercel normally redeploys the linked production branch. Inspect both Vercel build logs and GitHub Actions; these are independent pipelines, so passing local checks does not prove a hosted run passed or that Vercel waits for CI.

## Optional Pages deployment

Pages remains a manual secondary target; pushing no longer automatically publishes it. See [Pages instructions](GITHUB_PAGES.md). Build it with `npm run build:pages -- --base-href /HireHelper/` and preview with `npm run preview:pages`. Its output is `apps/web/dist/pages/browser`. Its data is separate from the Vercel site's data.

## Portfolio wording

Factual resume bullet: “Built a task assistance application using Angular, NestJS and PostgreSQL, with OTP authentication, transaction-safe helper assignment and task completion workflows; prepared an interactive browser-local portfolio demo for static hosting.” Change “prepared” to “deployed” only after publication. Add a short real screen recording later. The repository owner still needs to choose any license; none is added automatically.
