# HireHelper: GitHub to a completely free hosted demo

Plan checked on 2026-10-05. Project folder: D:\HireHelper.

## Status and budget

The local application is built and has passed native and Docker acceptance checks. No GitHub remote or public deployment exists yet. This document is a deployment plan, not a claim that hosted deployment changes have been implemented or tested.

The requested demo must work with the laptop switched off. Use free cloud services, within their quotas, rather than a tunnel to the laptop. Free services can sleep, suspend at quota limits, or change their plans; they do not provide an always-on production guarantee.

Suggested architecture:

- One Render Free web service: Angular frontend and Nest API at the same HTTPS origin.
- Neon Free PostgreSQL: users, tasks, sessions and notifications.
- Cloudinary Free: durable sanitized images.
- Gmail API over HTTPS: OTP messages from a dedicated Gmail account you control. Visitors continue to use HireHelper email/password/OTP; they do not authorize Google access.

No paid domain is needed for Render's provided HTTPS URL or a Gmail sender. Gmail API access requires the owner's OAuth setup; an API key alone cannot send Gmail messages. Keep all services on free plans and do not activate paid upgrades or a paid Google Cloud trial for this demo.

## 1. Upload the existing repository from VS Code

1. File > Open Folder > D:\HireHelper.
2. Open Source Control with Ctrl+Shift+G. Review changes before committing. Keep .env, .tools, runtime uploads and database backups local; they are ignored. Also review tracked recovery notes for personal information you do not want public.
3. Press Ctrl+Shift+P, run Publish to GitHub, and sign in to the intended GitHub account.
4. Choose a repository name such as hirehelper and Public visibility for a resume project.
5. Open the resulting GitHub repository. Check the README, screenshot and Actions tab. Wait for the existing CI workflow to pass; hosted CI has not run yet.
6. Future changes use stage > commit > push in Source Control. Publishing source code does not deploy a website.

Suggested description: Full-stack task marketplace with email OTP, helper assignment workflows, image uploads and live notifications. Built with Angular, NestJS, PostgreSQL, Prisma and Docker.

Official walkthrough: https://code.visualstudio.com/docs/sourcecontrol/repos-remotes#publish-to-github

## 2. Decide on a license

A license describes what others may do with your code. It is not a hosting subscription or something you need to buy.

MIT is a common portfolio choice if you are comfortable letting others use, modify, redistribute and commercially use your code while retaining the license/copyright notice. Hosting does not require selecting MIT. No license has been selected for you.

If you choose MIT: GitHub repository > Add file > Create new file > name LICENSE > Choose a license template > MIT > enter the correct owner/year > review > commit. Pull the remote commit into VS Code before making more local commits. Review third-party asset and dependency licenses separately.

Sources:
- https://choosealicense.com/licenses/mit/
- https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/adding-a-license-to-a-repository

The demo video can be added later without delaying deployment.

## 3. Complete the required hosting code changes

This is an implementation prerequisite. Do not click Deploy on the current Docker Compose setup and expect the complete app to work unchanged.

Pending work:

- Add a deployment container that builds both workspaces and serves Angular and /api from one public service. Existing local nginx points at the Compose-only hostname api:3000; existing API container does not serve the frontend.
- Respect Render's PORT environment variable and bind to 0.0.0.0. Preserve local API_PORT behavior.
- Add optional Cloudinary storage, retaining local disk storage for development. Preserve Sharp image validation/re-encoding, owner access for unattached files, and deletion of abandoned uploads. Store authenticated assets and authorize through the API before serving them; do not expose private draft uploads through public Cloudinary URLs.
- Add an optional Gmail HTTPS email transport with OAuth refresh-token handling. Preserve current local Mailpit/SMTP behavior, OTP expiration, rate limits, resend handling and generic error responses. Update production validation and startup checks to support the chosen transport.
- Add environment examples, a deployment Dockerfile and instructions matching the actual implementation.
- Run existing lint/type checks/build/security checks. Validate the hosted adapters, SPA deep links, cookie/CSRF behavior and SSE before claiming the deployment is ready.

Why changes are necessary: Render Free loses filesystem changes on restart/redeploy/idle spin-down, cannot attach a persistent disk, and blocks outgoing SMTP ports 25, 465 and 587. Render's free database expires after 30 days, so use Neon for this longer-lived demo.

Source: https://render.com/docs/free

## 4. Create the free service accounts

Neon:

1. Open https://neon.com and choose the Free plan.
2. Create a PostgreSQL project/database, preferably geographically near the Render service.
3. In Connect, copy the PostgreSQL connection string for the backend. Preserve its SSL options. A direct connection can be used for migration deployment; follow the final deployment configuration if it separates migration and runtime URLs.
4. Store it in Render's secret environment settings, not the repository or Angular source.
5. Use a separate hosted database; this plan does not copy your local demo data.

Neon's current Free plan includes 0.5 GB database storage per project. Check the account dashboard for current compute and transfer quotas.
Source: https://neon.com/blog/neon-backend-is-ga

Cloudinary:

1. Open https://cloudinary.com and choose Free.
2. Find the product environment's cloud name, API key and API secret in its dashboard.
3. Store backend credentials in Render. Do not create a public unsigned upload preset for this application.
4. Use the authenticated upload/read flow implemented in step 3.

The free plan has usage limits covering storage, delivery and transformations. Watch total usage rather than assuming each category has a separate allowance.
Sources: https://cloudinary.com/pricing and https://cloudinary.com/documentation/control_access_to_media

Gmail API:

1. Use a dedicated Gmail account you control as the OTP sender.
2. In https://console.cloud.google.com create a project and enable Gmail API.
3. Configure Google Auth Platform / OAuth consent and request only the gmail.send scope for sending. The owner authorizes this account; HireHelper visitors do not connect their inboxes.
4. Create an OAuth client appropriate to the private local authorization helper implemented in step 3, with its exact redirect URI. Complete the browser authorization on your own computer using offline access to obtain a refresh token.
5. Put the client ID, client secret, refresh token and sender address in Render's backend secrets. Do not paste them into chat or commit a downloaded OAuth credentials file.
6. Follow Google's publishing/verification requirements for your use case. Tokens issued while an external OAuth app is in Testing normally expire after seven days for Gmail scopes. A long-lived demo must handle this before launch; do not assume a one-time test token remains valid indefinitely.
7. Test delivery to another email account, not just the sender's own inbox. Check spam and sender quota errors. Keep demo traffic small.

Standard Gmail API use is currently available at no additional cost within the published limits; Gmail account sending limits also apply. API quotas/pricing are changing during 2026, so recheck before launch.
Sources:
- https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send
- https://developers.google.com/workspace/gmail/api/reference/quota
- https://developers.google.com/identity/protocols/oauth2
- https://support.google.com/mail/answer/22839

## 5. Deploy on Render after step 3 is implemented

1. Open https://render.com and connect your GitHub account.
2. New > Web Service > select the hirehelper repository and deployment branch.
3. Choose Docker runtime, repository-root build context and the deployment Dockerfile created in step 3. Do not choose the existing API-only Dockerfile for the entire site.
4. Choose Free instance type. Do not add a paid disk or use the expiring Render Free PostgreSQL database.
5. Set health check path to /api/v1/health/ready.
6. Configure environment variables using the final adapter documentation. Existing settings include NODE_ENV=production, DATABASE_URL, SESSION_SECRET, OTP_SECRET, COOKIE_SECURE=true and DEMO_SEED=false. Add the chosen email/image adapter secrets. These adapters and their environment-variable names are not implemented yet; the current SMTP-only validation will reject an incomplete production configuration.
7. Generate separate random production session/OTP secrets. In PowerShell, run the following once per secret, and paste each result directly into Render:

```powershell
$secretBytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($secretBytes)
[Convert]::ToBase64String($secretBytes)
```

8. Set APP_ORIGIN to the exact HTTPS URL assigned by Render, with no path, such as https://hirehelper-actual-name.onrender.com. If you only learn the URL after creation, update this value and redeploy before testing sign-in. Example URLs in this document are not live links.
9. Deploy. Startup must run Prisma migration deployment against Neon before serving requests, and readiness must pass. Never reset the hosted database to resolve a deployment error.
10. Open Render's actual assigned HTTPS URL. The service runs in the cloud and does not require your laptop or Docker Desktop to remain on.

Render Free sleeps after 15 minutes without inbound traffic; waking normally takes about a minute. Add a short cold-start note beside the demo link. Quota exhaustion can suspend services. Do not promise permanent uptime or unlimited free usage.

Sources:
- https://render.com/docs/web-services
- https://render.com/docs/free

## 6. Verify the public demo before adding it to your resume

- Open it from a phone/mobile network or a different computer.
- Register and receive a real OTP in an external inbox. Verify sign-in and an incorrect/expired-code rejection.
- Create a task with an image, offer help from another account, accept, start and complete the task.
- Confirm live notifications, offline reconnect and refreshing a task/detail URL.
- Redeploy/restart the hosted service and verify tasks, images and login behavior persist as expected. Cloud images must survive Render filesystem resets.
- Switch off your laptop and load the public URL again.
- Check browser/network/server logs for errors; do not expose secrets or OTPs in logs.

Then add the actual public URL to GitHub's About > Website field and the README. Add the later video link separately. Keep the existing screenshots, architecture notes and CI status visible.

There is no live deployment URL until the hosting prerequisites, account authorization, deployment and these checks are complete.
