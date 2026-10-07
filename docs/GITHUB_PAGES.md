# Publish the HireHelper portfolio demo on GitHub Pages

This is an optional secondary deployment. Vercel is the primary target; see [deployment instructions](DEPLOYMENT.md). It uses only GitHub; no Render, Neon, SMTP or Cloudinary account is needed. The website uses fictional sample people and browser-local data. The real NestJS/PostgreSQL backend remains in the source repository and runs separately.

## Preview first

```powershell
npm ci
npm run build:pages -- --base-href /HireHelper/
node scripts/check-pages-build.mjs --base /HireHelper/
npm run preview:pages
```

Open `http://localhost:4201/HireHelper/#/login` while the preview server is running. Select Mira, Theo or Sam. The same build can be published as static files.

## Publish and enable Pages

1. Open `D:\HireHelper` in VS Code. Review the tracked files before making them public; secrets and runtime data must stay ignored.
2. Press Ctrl+Shift+P > Publish to GitHub. Sign in as `BytesBySuyash` and choose public repository `HireHelper`. Publish the existing repository history.
3. On GitHub, open the repository's Settings > Pages.
4. Under Build and deployment, set Source to GitHub Actions.
5. In Actions, open Deploy portfolio demo to GitHub Pages and run it manually; this workflow no longer runs on push.
6. Wait for both build and deploy jobs to succeed. Use the actual URL reported in the `github-pages` deployment environment.
7. Test the page from another device, switch sample people and reload a hash task URL. Then add the verified URL to the repository's Website field and README.

Project address: `https://bytesbysuyash.github.io/HireHelper/`. The Pages artifact must use the exact repository-name casing in its base path; the build check enforces `/HireHelper/` so asset URLs continue to work on GitHub Pages.

## What is deployed

`.github/workflows/pages.yml` installs the locked dependencies, builds the Angular `pages` configuration, checks its artifact, uploads `apps/web/dist/pages/browser`, and deploys it. It never starts Nest, runs database migrations or sends email. It requires GitHub Pages permissions, not backend secrets.

The regular CI workflow checks the full source separately. It currently does not gate Pages deployment; the CI workflow also builds both static artifacts and runs the Vercel demo browser tests.

## Demo behavior

- Sample-account selection replaces password/OTP registration.
- Tasks, offers, notifications, fictional profiles and images are saved to this browser's localStorage.
- The selected person is kept per tab in sessionStorage.
- Other visitors have their own independent sample state.
- Reset demo restores fictional tasks/profiles and refreshes sample dates.
- Hash routes keep static-site refreshes working at `/HireHelper/#/tasks/id`.
- No real passwords, OTP emails, shared PostgreSQL data or server authorization are involved.

For the complete user/domain/data/pipeline explanation, read [PROJECT_GUIDE.md](PROJECT_GUIDE.md).

Official references: [GitHub Pages overview](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [custom deployment workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
