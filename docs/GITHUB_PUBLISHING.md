# Publish HireHelper from VS Code

The project already has a Git repository and commit history. Publish the existing folder; no reinitialization or ZIP upload is needed.

1. Open `D:\HireHelp` with VS Code's File > Open Folder.
2. Open Source Control with Ctrl+Shift+G. Commit any changes you intentionally want to publish. Existing commits are already ready to push.
3. Press Ctrl+Shift+P and run **Publish to GitHub**.
4. Sign in to your intended GitHub account in the browser if requested.
5. Choose an available repository name, such as `hirehelper`, and public or private visibility. Public lets resume reviewers inspect the code directly.
6. Complete publishing. VS Code creates the GitHub repository, adds the remote and pushes the local commits.
7. Open the repository on GitHub and check the README preview, files and Actions tab. The first hosted CI run is only verified once it succeeds there.

Official instructions: [VS Code publishing documentation](https://code.visualstudio.com/docs/sourcecontrol/repos-remotes#publish-to-github).

## Portfolio presentation

Suggested description: **Full-stack task marketplace with email OTP, helper assignment workflows, image uploads and live notifications. Built with Angular, NestJS, PostgreSQL, Prisma and Docker.**

Suggested topics: `angular`, `nestjs`, `typescript`, `postgresql`, `prisma`, `docker`, `playwright`, `full-stack`.

Use the existing real screenshots and architecture diagrams. A short demo video can show registration/OTP, task creation, helper acceptance, completion and live notifications. Add a demo link once recorded. If you deploy publicly, configure HTTPS and real email delivery; localhost URLs only work on your own running computer.

Choose a LICENSE that reflects how you want others to use your work before inviting reuse. A license has not been selected automatically. GitHub's license chooser can generate the file after you choose one. Do not imply company endorsement or production adoption.

Preserve local recovery documents for future work. They contain build history and machine-specific paths; if you later create a portfolio-focused distribution, review which internal notes you want public. `.env`, `.tools`, runtime uploads, dependencies, logs and backups are ignored and should remain local.

After publishing, future updates follow **edit -> stage -> commit -> push** from Source Control. Publishing uploads the repository; it does not deploy the website.
