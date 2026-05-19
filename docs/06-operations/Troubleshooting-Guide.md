# SkillSwap Troubleshooting Guide

Last reviewed: 2026-05-15

## 1. Document Purpose

This guide helps SkillSwap developers and maintainers diagnose and resolve common local development, deployment, runtime, API, authentication, database, storage, and frontend/backend integration issues.

It is intentionally symptom-based. It does not replace:

- Deployment procedures: `docs/06-operations/Deployment-Runbook.md`
- Architecture overview: `docs/03-architecture/System-Architecture.md`
- Security design: `docs/03-architecture/Security-Design.md` when available
- Testing strategy and manual test cases: `docs/08-testing/` when available

Where a step is inferred rather than explicitly documented, it is labelled `Inferred from implementation`.

## 2. Troubleshooting Scope

This guide covers:

- Local development issues
- Frontend runtime and build issues
- Backend runtime issues
- API integration issues
- Authentication and authorization issues
- Database connection and schema issues
- Azure Blob Storage and media upload issues
- CI/CD deployment failures
- Docker and backend container issues
- Nginx, HTTPS, and reverse proxy issues documented for production

This guide does not cover:

- Full deployment procedures
- Full security design or threat modelling
- Full testing strategy
- Full system architecture explanation
- Initial cloud resource provisioning
- Backup/restore procedures beyond basic troubleshooting evidence

## 3. Quick Diagnostic Checklist

Use this first-pass checklist before digging into a specific symptom:

- [ ] Is the frontend running at the expected local or hosted URL?
- [ ] Is the backend running and reachable at `<API_BASE_URL>/health`?
- [ ] In production, is the backend container running?
- [ ] Are required frontend variables such as `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_API_BASE_URL` configured?
- [ ] Are required backend runtime variables configured?
- [ ] Is the database reachable from the backend?
- [ ] Does the database schema match the current backend entities?
- [ ] Is authentication configured for the same Clerk issuer/JWKS that issued the frontend token?
- [ ] Is the frontend pointing to the correct API base URL?
- [ ] Is Nginx running in production?
- [ ] Is HTTPS working for the API URL?
- [ ] Are recent GitHub Actions, Vercel, Docker, Nginx, or backend logs available?

## 4. Common Diagnostic Commands

Run local repository commands from the repository root unless a command changes directory explicitly. Run Docker and Nginx commands on the production VM or the relevant Docker host.

### Frontend

```bash
cd skill-swap-frontend
npm install
```

```bash
cd skill-swap-frontend
npm run dev
```

```bash
cd skill-swap-frontend
npm run build
```

Notes:

- `npm run dev` starts Vite. The repository Vite config uses port `3000`.
- `npm run build` runs `vite build`; the configured output directory is `build`.
- No frontend `test`, `lint`, or `typecheck` script was found in `package.json`.

### Backend

Windows PowerShell:

```powershell
cd skill-swap-backend
.\gradlew.bat build
```

```powershell
cd skill-swap-backend
.\gradlew.bat bootRun --args="--spring.profiles.active=dev"
```

```powershell
cd skill-swap-backend
.\gradlew.bat test
```

macOS/Linux:

```bash
cd skill-swap-backend
./gradlew build
```

```bash
cd skill-swap-backend
./gradlew bootRun --args="--spring.profiles.active=dev"
```

```bash
cd skill-swap-backend
./gradlew test
```

CI-supported backend artifact build:

```bash
cd skill-swap-backend
./gradlew bootJar --no-daemon
```

Notes:

- The backend requires Java 17.
- The Gradle wrapper is configured for Gradle 8.14.3.
- `build` and `test` may require database configuration because the Spring context starts with datasource configuration and a startup DB smoke check.

### API

```bash
curl -i <API_BASE_URL>/health
```

Expected successful health response:

```text
HTTP/1.1 204 No Content
```

```bash
curl -i -H "Authorization: Bearer <JWT_TOKEN>" <API_BASE_URL>/<ENDPOINT>
```

Root URL check, useful only for network reachability:

```bash
curl -i <API_BASE_URL>
```

Note: the API root is not documented as an application endpoint and may return `404`; use `/health` for backend liveness.

Example protected profile check:

```bash
curl -i -H "Authorization: Bearer <JWT_TOKEN>" <API_BASE_URL>/api/v1/users/me
```

### Production VM / Docker

```bash
docker ps
```

```bash
docker logs <CONTAINER_NAME> --tail 100
```

```bash
docker inspect <CONTAINER_NAME>
```

```bash
docker restart <CONTAINER_NAME>
```

```bash
df -h
```

```bash
free -h
```

Notes:

- The current workflow starts the backend container as `backend-api`.
- Use `<CONTAINER_NAME>` in shared notes unless you are documenting a verified environment.

### Nginx

```bash
sudo systemctl status nginx
```

```bash
sudo nginx -t
```

```bash
sudo journalctl -u nginx --no-pager --tail 100
```

### GitHub Actions and Vercel

- GitHub Actions: open the failed run in the repository Actions tab and inspect the first failed workflow step.
- Vercel: inspect the deployment build logs, environment variables, output directory, and deployed commit in the Vercel project dashboard.

## 5. Troubleshooting Format

Each issue below uses this structure:

- Symptom
- Likely causes
- Diagnostic steps
- Resolution steps
- Prevention notes
- Source / confidence

Confidence labels:

- `Verified from code/docs`: directly supported by repository files or existing documentation.
- `Inferred from implementation`: derived from code behavior or standard runtime behavior, but not explicitly documented as an operational procedure.
- `Requires verification`: depends on live infrastructure, secret stores, production settings, or a process not fully represented in the repository.

## 6. Frontend Issues

### 6.1 Frontend Development Server Does Not Start

- Symptom: `npm run dev` fails, exits immediately, or the browser does not open `http://localhost:3000`.
- Likely causes:
  - Dependencies are not installed.
  - Node/npm version is incompatible.
  - Port `3000` is already in use.
  - `VITE_CLERK_PUBLISHABLE_KEY` is missing and the app throws during startup.
- Diagnostic steps:
  - Run `npm install` in `skill-swap-frontend`.
  - Run `npm run dev` and read the terminal error.
  - Check whether another process is using port `3000`.
  - Check `.env.local` for `VITE_CLERK_PUBLISHABLE_KEY`.
- Resolution steps:
  - Reinstall dependencies with `npm install`.
  - Add `VITE_CLERK_PUBLISHABLE_KEY=<CLERK_PUBLISHABLE_KEY>` to a local ignored env file.
  - Stop the process using port `3000` or deliberately change the Vite port and update CORS/auth redirects consistently.
- Prevention notes:
  - Keep local frontend env values in ignored env files.
  - Restart Vite after changing env variables.
- Source / confidence: Verified from code/docs.

### 6.2 Frontend Build Fails

- Symptom: `npm run build` fails locally or in Vercel.
- Likely causes:
  - TypeScript or Vite build error.
  - Missing build-time environment variable.
  - Dependency install failure.
  - Vercel output directory mismatch.
- Diagnostic steps:
  - Run `npm run build` locally from `skill-swap-frontend`.
  - Review Vercel build logs for the first failing command.
  - Confirm Vercel uses `npm run build`.
  - Confirm the output directory is `build` unless intentionally overridden.
- Resolution steps:
  - Fix the first compile/build error.
  - Configure required Vercel environment variables.
  - Align Vercel output directory with `vite.config.ts`.
- Prevention notes:
  - Do not rely on the frontend `deploy` script for production; it references older static deployment assumptions and requires verification.
- Source / confidence: Verified from code/docs.

### 6.3 Frontend Shows a Blank Page

- Symptom: The browser opens but shows a blank page or React does not render.
- Likely causes:
  - Missing `VITE_CLERK_PUBLISHABLE_KEY`.
  - Runtime JavaScript error.
  - Static assets not served from the deployed build.
  - Direct route navigation missing SPA fallback in hosting configuration.
- Diagnostic steps:
  - Open the browser developer console.
  - Check for `Missing VITE_CLERK_PUBLISHABLE_KEY`.
  - Check the Network tab for failed JavaScript or CSS assets.
  - In Vercel, verify `vercel.json` SPA fallback is active.
- Resolution steps:
  - Add the missing Clerk publishable key and redeploy/restart.
  - Fix the runtime error shown in the browser console.
  - Confirm Vercel serves unmatched routes through `/index.html`.
- Prevention notes:
  - Frontend `VITE_` variables are build-time/browser-visible values. Do not place backend secrets in them.
- Source / confidence: Verified from code/docs.

### 6.4 Frontend Cannot Reach Backend API

- Symptom: Browser Network tab shows failed API requests, connection refused, CORS errors, or requests going to the wrong host.
- Likely causes:
  - Backend is not running.
  - `VITE_API_BASE_URL` is missing or wrong.
  - Backend is running on a different port.
  - Nginx or HTTPS is failing in production.
  - CORS origin is not allowed by backend configuration.
- Diagnostic steps:
  - Check the actual request URL in the browser Network tab.
  - Run `curl -i <API_BASE_URL>/health`.
  - Confirm local backend is on `http://localhost:8080` unless `PORT` was changed.
  - Confirm frontend env uses `VITE_API_BASE_URL=<API_BASE_URL>`.
  - For CORS, compare the browser origin with allowed origins in backend CORS configuration.
- Resolution steps:
  - Start the backend.
  - Set `VITE_API_BASE_URL` to the intended backend URL and restart/rebuild the frontend.
  - Use the configured local Vite port `3000`, or update CORS deliberately if changing ports.
  - In production, diagnose Docker and Nginx before changing frontend code.
- Prevention notes:
  - Keep local and production frontend API URLs separate.
  - Vercel env changes require a new deployment to affect the built SPA.
- Source / confidence: Verified from code/docs.

### 6.5 Environment Variables Not Loaded in Frontend

- Symptom: Frontend continues using the old API URL or crashes despite editing env files.
- Likely causes:
  - Env file is in the wrong directory.
  - Variable is missing the `VITE_` prefix.
  - Vite dev server was not restarted.
  - Production build was not redeployed after changing Vercel env.
- Diagnostic steps:
  - Confirm the env file is under `skill-swap-frontend`.
  - Confirm variables are named `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_BASE_URL`, `VITE_AUTH_REDIRECT_URL`, or `VITE_IMAGE_UPLOAD_MAX_BYTES` as applicable.
  - Check the Network tab to see the API base URL being used.
- Resolution steps:
  - Rename variables to use the `VITE_` prefix.
  - Restart `npm run dev`.
  - Redeploy on Vercel after production env changes.
- Prevention notes:
  - Treat all frontend env values as public.
- Source / confidence: Verified from code/docs.

### 6.6 Authentication UI or Session State Not Working

- Symptom: Sign-in UI does not load, user is redirected back to auth, or API calls are made without a bearer token.
- Likely causes:
  - Missing Clerk publishable key.
  - Clerk redirect URL mismatch.
  - Frontend token template `signupTemplate` is missing or misconfigured in Clerk.
  - Session expired or not loaded yet.
- Diagnostic steps:
  - Check browser console for Clerk errors.
  - Check the Network tab for `Authorization` headers on protected API calls.
  - Confirm `VITE_AUTH_REDIRECT_URL` points to the expected frontend URL if configured.
  - Confirm Clerk project settings match the current local or production frontend URL.
- Resolution steps:
  - Configure `VITE_CLERK_PUBLISHABLE_KEY`.
  - Align Clerk redirect URLs with `<FRONTEND_URL>`.
  - Verify the `signupTemplate` token template or update the frontend/backend token flow consistently.
  - Sign out and sign in again to refresh the session.
- Prevention notes:
  - Keep development and production Clerk configuration separate.
- Source / confidence: Verified from code/docs for Clerk usage and token request; `signupTemplate` setup requires verification.

### 6.7 Browser Shows a CORS Error

- Symptom: Browser blocks an API request with a CORS error, often before frontend code receives a normal API response.
- Likely causes:
  - Frontend origin is not in the backend allowed origins.
  - Frontend is running on an unexpected port.
  - Production frontend URL changed but backend CORS config was not updated.
  - Request is going to the wrong API base URL.
- Diagnostic steps:
  - Check the browser console and Network tab for the blocked request origin.
  - Confirm local frontend is running on `http://localhost:3000` or another origin explicitly allowed by backend CORS.
  - Confirm `VITE_API_BASE_URL` points to the intended backend.
  - In production, verify the deployed frontend origin is allowed without exposing private URLs in notes.
- Resolution steps:
  - Use the configured local Vite port `3000`.
  - Correct `VITE_API_BASE_URL`.
  - If a production frontend URL changed, update backend CORS deliberately and redeploy.
- Prevention notes:
  - CORS is enforced by browsers. A same request may work from `curl` while failing in the browser.
- Source / confidence: Verified from code/docs.

## 7. Backend Local Development Issues

### 7.1 Backend Fails to Start Locally

- Symptom: `bootRun` exits during Spring Boot startup.
- Likely causes:
  - `dev` profile was not activated.
  - Java 17 is not available.
  - Database is unavailable or schema is missing.
  - JWT issuer/JWKS configuration cannot initialize.
  - Port `8080` is already in use.
- Diagnostic steps:
  - Run `java -version` and confirm Java 17.
  - Start with `bootRun --args="--spring.profiles.active=dev"`.
  - Read startup logs around datasource, Hibernate, JWT decoder, and port binding errors.
  - Run `curl -i http://localhost:8080/health` after startup.
- Resolution steps:
  - Use Java 17.
  - Activate the `dev` profile for local development.
  - Start or configure PostgreSQL.
  - Free port `8080` or set `PORT` deliberately and update the frontend API URL.
- Prevention notes:
  - Do not run local development against production-oriented defaults by accident.
- Source / confidence: Verified from code/docs.

### 7.2 Java, Gradle, or Dependency Resolution Fails

- Symptom: Gradle fails before the application starts.
- Likely causes:
  - Java version mismatch.
  - Gradle wrapper distribution or dependencies cannot be downloaded.
  - Network/proxy issue.
- Diagnostic steps:
  - Confirm Java 17.
  - Use the checked-in Gradle wrapper, not a system Gradle version.
  - Review the first dependency or wrapper download error.
- Resolution steps:
  - Install Java 17 and retry with `.\gradlew.bat` or `./gradlew`.
  - Restore network access or configure developer proxy/cache settings.
- Prevention notes:
  - Keep build instructions tied to the Gradle wrapper.
- Source / confidence: Verified from code/docs.

### 7.3 Backend Missing Environment Variables

- Symptom: Backend starts with wrong config, upload endpoints fail, or auth uses unexpected issuer/JWKS.
- Likely causes:
  - `skill-swap-backend/.env` is missing.
  - Variable names do not match Spring properties.
  - Production variables are not passed into the Docker container.
- Diagnostic steps:
  - For local `bootRun`, check the loaded `.env` key names printed by Gradle without sharing values.
  - Confirm backend storage variables include `AZURE_STORAGE_CONNECTION_STRING` and `AZURE_STORAGE_MEDIA_CONTAINER`.
  - Confirm datasource variables use Spring names such as `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, and `SPRING_DATASOURCE_PASSWORD` when overriding runtime config.
  - Confirm auth variables include `CLERK_ISSUER_URI` and `CLERK_JWKS_URI` when not using the configured development fallback.
- Resolution steps:
  - Add local values to ignored backend env files.
  - Restart `bootRun` after env changes.
  - For Docker, pass required variables when starting the container.
- Prevention notes:
  - Do not paste real env values into tickets or documentation.
  - The Gradle `bootRun` task prints loaded key names and currently prints a password preview; sanitize logs before sharing.
- Source / confidence: Verified from code/docs.

### 7.4 Port Already in Use

- Symptom: Backend cannot bind to port `8080`, or frontend cannot bind to port `3000`.
- Likely causes:
  - Another local backend/frontend process is still running.
  - A previous Java/Gradle process did not exit.
  - Another service uses the same port.
- Diagnostic steps:
  - Check running processes for `8080` or `3000`.
  - Check whether another terminal is running `bootRun` or Vite.
- Resolution steps:
  - Stop the duplicate process.
  - If intentionally changing ports, update `PORT`, `VITE_API_BASE_URL`, CORS, and auth redirect settings consistently.
- Prevention notes:
  - Keep one frontend and one backend instance per local port.
- Source / confidence: Verified from code/docs; process inspection is inferred from implementation.

### 7.5 Backend Cannot Connect to Database

- Symptom: Backend startup logs show connection refused, authentication failed, SSL error, or the DB smoke check fails.
- Likely causes:
  - PostgreSQL is not running.
  - Database does not exist.
  - Wrong datasource URL, username, or password.
  - Production database requires SSL but URL lacks the right SSL mode.
  - Local profile points to a local development database that has not been created.
- Diagnostic steps:
  - Read the backend startup datasource error.
  - Confirm `<DB_URL>` is a JDBC URL for Spring Boot.
  - For local development, confirm the configured local database exists and is reachable.
  - For production, confirm the runtime datasource URL uses SSL settings required by the managed database.
- Resolution steps:
  - Start PostgreSQL or correct the database URL.
  - Use local development credentials locally.
  - Use production secret stores for production values.
  - Apply the expected schema through the team's verified migration/setup process.
- Prevention notes:
  - Runtime Flyway is disabled in inspected Spring profiles, so schema creation should not be assumed at startup.
- Source / confidence: Verified from code/docs; live database reachability requires verification.

### 7.6 Backend Cannot Validate JWT

- Symptom: Protected endpoints return `401` even after frontend login.
- Likely causes:
  - Missing `Authorization: Bearer <JWT_TOKEN>` header.
  - Token is expired.
  - Token issuer does not match `CLERK_ISSUER_URI`.
  - JWKS endpoint does not match `CLERK_JWKS_URI`.
  - Token signing algorithm/configuration does not match backend JWT configuration.
  - Frontend is requesting the wrong token template.
- Diagnostic steps:
  - Use the browser Network tab to confirm the `Authorization` header is present.
  - Call a protected endpoint with `curl` and the same token.
  - Inspect backend logs around JWT decoder initialization.
  - Confirm frontend and backend point to the same Clerk environment.
- Resolution steps:
  - Sign in again to refresh the session token.
  - Align `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_ISSUER_URI`, and `CLERK_JWKS_URI`.
  - Verify the frontend token template `signupTemplate` exists or update the token request consistently.
- Prevention notes:
  - Keep development and production Clerk keys/issuers separate.
- Source / confidence: Verified from code/docs; exact Clerk dashboard settings require verification.

### 7.7 Application Starts but API Returns Unexpected Errors

- Symptom: `/health` works, but application APIs return `500`, `404`, `409`, or validation errors.
- Likely causes:
  - Database schema does not match entities.
  - Required rows are missing.
  - Authenticated user cannot be mapped to a local user record.
  - Admin role is not configured in the local database.
  - Storage settings are missing for upload paths.
- Diagnostic steps:
  - Check the API response body for `timestamp`, `status`, `error`, `message`, and `path`.
  - Check backend logs for the corresponding request.
  - For authenticated calls, try `GET /api/v1/users/me`.
  - For admin calls, verify the returned profile role and backend authority mapping.
- Resolution steps:
  - Fix the schema or data issue through the verified database process.
  - Correct local user `auth_subject`/role mapping where appropriate.
  - Configure Azure Blob settings for upload flows.
- Prevention notes:
  - Treat `/health` as HTTP liveness only; it does not prove every API dependency works.
- Source / confidence: Verified from code/docs.

## 8. API Issues

### 8.1 `400 Bad Request`

- Symptom: API returns status `400`.
- Likely causes:
  - Bean Validation failed for a request DTO.
  - Required JSON body or multipart file is missing.
  - Business rule failed, such as invalid workshop status transition, full workshop, duplicate join, closed attendance, duplicate memory slug, unsupported memory status, or invalid storage object path.
  - Upload content type is not accepted.
- Diagnostic steps:
  - Read the `message` field in the error response.
  - Confirm `Content-Type: application/json` for JSON requests.
  - Confirm upload requests use `multipart/form-data` with form field `file`.
  - Compare the request body with the API documentation.
- Resolution steps:
  - Correct the request body, headers, route, or file field.
  - Retry only after fixing the validation or business-rule issue.
- Prevention notes:
  - Frontend validation helps, but backend validation is the source of truth.
- Source / confidence: Verified from code/docs.

### 8.2 `401 Unauthorized`

- Symptom: Protected API call returns `401`.
- Likely causes:
  - Missing bearer token.
  - Expired or invalid JWT.
  - Backend cannot validate token issuer/JWKS.
  - Controller/service requires login for the action.
- Diagnostic steps:
  - Check the request has `Authorization: Bearer <JWT_TOKEN>`.
  - Try `GET /api/v1/users/me` with the same token.
  - Check backend auth logs.
- Resolution steps:
  - Sign in again.
  - Send the bearer token.
  - Align Clerk frontend and backend configuration.
- Prevention notes:
  - Spring Security authentication failures may not use the same JSON error body as application exceptions.
- Source / confidence: Verified from code/docs.

### 8.3 `403 Forbidden`

- Symptom: API returns `403`, often with `Admin access required`, `Only the host...`, or email verification messaging.
- Likely causes:
  - User is authenticated but lacks admin role.
  - User is not the owner/host for the requested action.
  - Token explicitly indicates an unverified email.
  - Local `user_account.auth_subject` does not match the current Clerk subject for an expected admin.
- Diagnostic steps:
  - Call `GET /api/v1/users/me` and inspect the profile role.
  - Confirm the database role normalizes to `admin` or `role_admin`.
  - Confirm the JWT `sub` maps to `user_account.auth_subject`.
  - Confirm the action is allowed for the user and resource.
- Resolution steps:
  - Correct role or auth-subject mapping through an approved maintainer database process.
  - Use an account with the required owner/admin access.
  - Complete email verification if the identity provider requires it.
- Prevention notes:
  - There is no verified admin role management UI; role fixes are operational.
- Source / confidence: Verified from code/docs; live role corrections require verification.

### 8.4 `404 Not Found`

- Symptom: API returns `404`.
- Likely causes:
  - Wrong path, ID, or slug.
  - Requested record does not exist.
  - Pending or rejected workshop is hidden from a non-admin/non-facilitator user.
  - Draft or archived memory is not public.
  - Static resource path does not exist.
- Diagnostic steps:
  - Confirm route and path parameter format.
  - For workshop detail, confirm whether the caller is public, host, or admin.
  - For memory detail, confirm the memory is published.
  - Check backend logs for not-found handling.
- Resolution steps:
  - Correct the endpoint path or ID.
  - Authenticate as a user allowed to view restricted resources.
  - Publish the memory entry if it should be public.
- Prevention notes:
  - Some restricted resources intentionally appear as not found to unauthorized viewers.
- Source / confidence: Verified from code/docs.

### 8.5 `409 Conflict`

- Symptom: API returns `409`.
- Likely causes:
  - Database integrity violation, often related records blocking a delete.
- Diagnostic steps:
  - Read backend logs for `DataIntegrityViolationException`.
  - Identify related records such as participants, notifications, or media rows.
- Resolution steps:
  - Do not force-delete data through undocumented commands.
  - Escalate to a maintainer to inspect active foreign-key behavior.
- Prevention notes:
  - Delete behavior differs between migrations/schema evidence and may require live DB verification.
- Source / confidence: Verified from code/docs; active DB constraints require verification.

### 8.6 `413 Payload Too Large`

- Symptom: Upload returns `413`.
- Likely causes:
  - File exceeds servlet multipart limit.
  - File exceeds `app.upload.max-image-bytes`.
  - Frontend and backend upload limits are not aligned.
- Diagnostic steps:
  - Check file size.
  - Confirm frontend `VITE_IMAGE_UPLOAD_MAX_BYTES` if configured.
  - Confirm backend multipart and `app.upload.max-image-bytes` settings.
- Resolution steps:
  - Upload a smaller image.
  - If changing limits, update frontend display limits and backend limits together.
- Prevention notes:
  - Default application-level image limit is 10 MB in current code/docs.
- Source / confidence: Verified from code/docs.

### 8.7 `423 Locked`

- Symptom: Admin memory update/delete returns `423`.
- Likely causes:
  - Draft memory entry is not locked for the current admin session.
  - Another admin owns the active edit lock.
  - Lock expired.
- Diagnostic steps:
  - Re-open the memory entry in the admin memory studio.
  - Check the response message for lock owner/expiry context.
- Resolution steps:
  - Acquire the edit lock again.
  - Coordinate with the other admin or wait for expiry.
- Prevention notes:
  - Memory concurrency uses edit locks, not active version-based optimistic locking.
- Source / confidence: Verified from code/docs.

### 8.8 `500 Internal Server Error`

- Symptom: API returns `500` with a generic message.
- Likely causes:
  - Unhandled backend exception.
  - Database schema mismatch or missing table/column.
  - Unexpected null/data state.
  - Storage read failure mapped as internal error.
- Diagnostic steps:
  - Check backend application logs for the stack trace.
  - Match the request path and timestamp with Docker/backend logs.
  - Confirm database schema and required environment variables.
- Resolution steps:
  - Fix the underlying exception, configuration, or schema mismatch.
  - Escalate if production data correction or schema migration is needed.
- Prevention notes:
  - Production-oriented error responses avoid exposing stack traces to clients; use server logs for details.
- Source / confidence: Verified from code/docs.

### 8.9 `502 Bad Gateway` from API or Upload Flow

- Symptom: Browser/API call returns `502`.
- Likely causes:
  - Nginx cannot reach the backend container.
  - Azure Blob access/upload/delete failed.
  - Upstream backend is unavailable.
- Diagnostic steps:
  - If response is from Nginx, check `sudo systemctl status nginx` and backend container status.
  - If response body mentions storage, check backend logs for Azure Blob errors.
  - Run `curl -i <API_BASE_URL>/health`.
- Resolution steps:
  - Restart the backend container if it is unhealthy.
  - Fix Azure Blob connection string/container configuration for storage errors.
  - Fix Nginx upstream configuration if it cannot reach `localhost:8080`.
- Prevention notes:
  - Distinguish Nginx `502` from application-level storage `502` by checking response body and logs.
- Source / confidence: Verified from code/docs for storage mapping; Nginx behavior is supported by deployment docs and requires live verification.

## 9. Authentication and Authorization Issues

### 9.1 Login Succeeds but Backend Rejects API Request

- Symptom: User appears signed in, but protected API calls fail with `401` or `403`.
- Likely causes:
  - Frontend did not attach the token.
  - Token issuer/JWKS does not match backend configuration.
  - Clerk development and production instances are mixed.
  - Local user record has wrong or missing `auth_subject`.
  - Admin role is missing for admin-only APIs.
- Diagnostic steps:
  - Check the request headers in the Network tab.
  - Call `/api/v1/users/me` with the same token.
  - Check backend JWT decoder startup logs.
  - Verify user mapping in `user_account.auth_subject`.
- Resolution steps:
  - Sign in again and retry.
  - Align Clerk frontend and backend environment values.
  - Correct internal user mapping or role through maintainer process.
- Prevention notes:
  - Never share raw JWTs in issue reports; describe status codes and timestamps instead.
- Source / confidence: Verified from code/docs.

### 9.2 Missing `Authorization` Header

- Symptom: Protected endpoint returns `401` and backend sees an unauthenticated request.
- Likely causes:
  - Caller used public `fetch` without passing token.
  - Frontend service call did not obtain a Clerk token (`getAuthToken()` returned null).
  - Manual `curl` command omitted the header.
- Diagnostic steps:
  - Inspect the request headers.
  - Compare with a known working request from `apiCall<T>()`.
- Resolution steps:
  - Add `Authorization: Bearer <JWT_TOKEN>`.
  - Ensure the frontend obtains a Clerk token via `getAuthToken()` before the protected call.
- Prevention notes:
  - Public endpoints do not prove protected endpoint auth is configured correctly.
- Source / confidence: Verified from code/docs.

### 9.3 Clerk Issuer or JWKS Mismatch

- Symptom: Valid-looking token still returns `401`.
- Likely causes:
  - Backend `CLERK_ISSUER_URI` or `CLERK_JWKS_URI` points to a different Clerk environment.
  - Frontend uses a different Clerk publishable key than the backend expects.
  - Production frontend calls a backend still configured for development issuer/JWKS or the reverse.
- Diagnostic steps:
  - Confirm the frontend Clerk publishable key belongs to the same Clerk instance as backend issuer/JWKS.
  - Check backend logs printed during JWT decoder initialization.
  - Verify production secrets in GitHub Actions and Vercel without exposing values.
- Resolution steps:
  - Align Clerk environment variables.
  - Redeploy backend and frontend after changing secret stores.
- Prevention notes:
  - Keep a deployment checklist for Clerk environment changes; do not hard-code live issuer values in troubleshooting docs.
- Source / confidence: Verified from code/docs; live Clerk values require verification.

### 9.4 Admin Access Denied

- Symptom: Admin menu is hidden or admin APIs return `403`.
- Likely causes:
  - Backend profile role is not `admin` or `role_admin`.
  - `JwtConverter` cannot find the local user by `auth_subject`.
  - User is signed into a different Clerk environment than expected.
- Diagnostic steps:
  - Call `GET /api/v1/users/me`.
  - Check the profile `role`.
  - Verify the JWT subject maps to the expected local user.
  - Check backend logs for admin API request status.
- Resolution steps:
  - Correct the internal user role/auth-subject mapping through an approved maintainer process.
  - Sign out and back in after role correction.
- Prevention notes:
  - Admin provisioning is operational; no verified admin user-management UI exists.
- Source / confidence: Verified from code/docs; exact provisioning process requires verification.

### 9.5 User Identity Not Mapped to Internal Record

- Symptom: Profile or ownership/admin checks behave unexpectedly after authentication or environment cutover.
- Likely causes:
  - Clerk `sub` changed between development and production.
  - Existing database row lacks current `auth_subject`.
  - Schema is missing `auth_subject`/`auth_provider` support.
- Diagnostic steps:
  - Confirm the current JWT subject.
  - Check whether a local `user_account` row exists for that subject.
  - Verify the active database has the expected auth mapping columns.
- Resolution steps:
  - Use the documented/approved maintainer process to map the correct subject.
  - Apply missing auth-subject schema changes if they are absent.
- Prevention notes:
  - Do not copy sample SQL with real subjects into documentation; use placeholders.
- Source / confidence: Verified from code/docs; active production schema requires verification.

## 10. Database Issues

### 10.1 Database Connection Failed

- Symptom: Backend cannot start or logs datasource connection errors.
- Likely causes:
  - Database host/port unreachable.
  - Wrong `<DB_URL>`, username, or password.
  - SSL setting incorrect for the environment.
  - Network/firewall issue.
- Diagnostic steps:
  - Check backend logs around the startup DB smoke check.
  - Confirm local profile uses a local development database.
  - Confirm production JDBC URL uses SSL as required by the managed database.
  - Confirm Docker container has datasource env vars.
- Resolution steps:
  - Correct datasource configuration.
  - Restore database/network availability.
  - Restart the backend process or container after env fixes.
- Prevention notes:
  - Keep local and production database credentials separate.
- Source / confidence: Verified from code/docs; live network status requires verification.

### 10.2 SSL Requirement Not Met

- Symptom: Production database connection fails with SSL-related errors.
- Likely causes:
  - Production `<DB_URL>` lacks the required SSL mode.
  - Local-style JDBC URL was used in production.
- Diagnostic steps:
  - Inspect the configured JDBC URL shape without exposing credentials.
  - Compare local vs production database URL requirements.
- Resolution steps:
  - Configure production datasource URL with the required SSL mode.
  - Restart the backend container after updating secrets.
- Prevention notes:
  - Do not use local `sslmode=disable` settings in production.
- Source / confidence: Verified from code/docs.

### 10.3 Missing Tables or Schema Mismatch

- Symptom: Backend starts or API calls fail with missing table, missing column, or Hibernate validation errors.
- Likely causes:
  - Database schema has not been created.
  - Flyway migrations/manual SQL were not applied.
  - `schema.sql` is historical and may not match latest entities.
  - Runtime Flyway is disabled in inspected profiles.
- Diagnostic steps:
  - Check backend logs for table/column names.
  - Compare active schema with JPA entities and migration/manual SQL files.
  - Check whether auth mapping columns such as `auth_subject` exist if auth issues are present.
- Resolution steps:
  - Apply schema changes through the team's verified migration process.
  - Do not assume application startup will run migrations.
- Prevention notes:
  - Keep schema changes explicit in deployment planning.
- Source / confidence: Verified from code/docs; active DB DDL requires verification.

### 10.4 Data Not Persisted as Expected

- Symptom: User profile, workshop, notification, or memory changes disappear or do not show in the UI.
- Likely causes:
  - Frontend is pointing at the wrong backend/database.
  - Request failed but the UI did not surface the error clearly.
  - Local database differs from production database.
  - User is mapped to a different internal record due to auth subject mismatch.
- Diagnostic steps:
  - Check browser Network tab for failed save requests.
  - Confirm `VITE_API_BASE_URL` points at the intended backend.
  - Check backend logs and database record for the expected user/workshop/memory ID.
- Resolution steps:
  - Point frontend to the correct backend.
  - Fix the failed API request.
  - Correct auth subject mapping if the user is split across records.
- Prevention notes:
  - Include the environment and URL in support evidence, but do not include credentials.
- Source / confidence: Inferred from implementation.

### 10.5 Admin/User Identity Mapping Issue

- Symptom: Expected admin user is treated as a regular member, or user-owned data appears under a different account.
- Likely causes:
  - Current Clerk subject does not match `user_account.auth_subject`.
  - Existing row was created from a different identity provider/environment.
  - Admin role is on a different internal user row.
- Diagnostic steps:
  - Compare current JWT subject with `user_account.auth_subject`.
  - Check whether duplicate rows exist for the same email or user.
  - Confirm `role` value on the mapped row.
- Resolution steps:
  - Use approved database maintenance process to correct mapping and role.
- Prevention notes:
  - Clerk user IDs differ between environments; plan cutovers carefully.
- Source / confidence: Verified from code/docs; live DB correction requires verification.

### 10.6 Migration or Import Failure

- Symptom: Manual database migration/import fails or schema changes are incomplete.
- Likely causes:
  - Using a Spring JDBC URL where `psql` expects a PostgreSQL URI.
  - Missing permissions.
  - SQL order or existing constraints conflict.
  - Runtime Flyway assumptions do not match current configuration.
- Diagnostic steps:
  - Check the exact failed SQL statement or migration step.
  - Confirm the connection string format is appropriate for the tool being used.
  - Check whether the target database already has partially applied objects.
- Resolution steps:
  - Follow the deployment runbook or maintainer-approved migration procedure.
  - Escalate before applying manual destructive fixes.
- Prevention notes:
  - Do not add ad hoc schema changes during troubleshooting without recording them.
- Source / confidence: Verified from docs for manual migration pattern; exact migration process requires verification.

### 10.7 Database Max Client Connections Reached

- Symptom: Backend or local development logs show too many PostgreSQL connections or max client connections reached.
- Likely causes:
  - Multiple local backend/Java processes are running.
  - Connection pool settings exceed the database tier.
  - Previous local processes did not shut down cleanly.
- Diagnostic steps:
  - Check whether multiple `bootRun`, Java, or Gradle processes are active.
  - Check the database error message and active connection count with your database tooling.
  - Review Hikari pool settings for the active Spring profile.
- Resolution steps:
  - Stop duplicate local backend processes.
  - Restart the backend after connections are released.
  - If this occurs in production, escalate before changing pool sizes or database tier.
- Prevention notes:
  - Keep only one local backend process running unless intentionally testing concurrency.
- Source / confidence: Verified from README and backend profile configuration; live database limits require verification.

## 11. Azure Blob Storage / Media Upload Issues

### 11.1 Image Upload Fails

- Symptom: Avatar, workshop image, or memory media upload fails.
- Likely causes:
  - Missing `AZURE_STORAGE_CONNECTION_STRING`.
  - Wrong or missing `AZURE_STORAGE_MEDIA_CONTAINER`.
  - File is empty, too large, or not an accepted image.
  - Azure Blob service cannot be reached.
  - Production workflow passes `AZURE_STORAGE_MEMORIES_CONTAINER`, while backend code reads `AZURE_STORAGE_MEDIA_CONTAINER`.
- Diagnostic steps:
  - Check backend logs for Azure Blob configuration or upload errors.
  - Confirm the request is `multipart/form-data` with field `file`.
  - Confirm file size and content type.
  - Inspect Docker env/configuration without printing secret values.
- Resolution steps:
  - Set `AZURE_STORAGE_CONNECTION_STRING=<AZURE_STORAGE_CONNECTION_STRING>`.
  - Set `AZURE_STORAGE_MEDIA_CONTAINER=<BLOB_CONTAINER>` for the backend implementation.
  - Align deployment workflow/docs/code variable names before relying on production uploads.
  - Retry with a supported image under the configured size limit.
- Prevention notes:
  - Track the known storage container variable-name mismatch until it is fixed.
- Source / confidence: Verified from code/docs.

### 11.2 Blob URL Not Returned or Not Displayed

- Symptom: Upload appears successful but frontend does not display the image.
- Likely causes:
  - Backend did not persist returned URL.
  - Frontend received an empty or relative URL.
  - Blob container access does not allow the returned plain URL.
  - SAS URL generation is disabled or failed.
- Diagnostic steps:
  - Inspect the upload API response.
  - Check the persisted `avatarUrl`, workshop image URL, or memory media URL.
  - Open the returned media URL in a browser without exposing private SAS tokens in reports.
  - Check `AZURE_STORAGE_SAS_DAYS` if private container access is expected.
- Resolution steps:
  - Fix storage access or enable SAS URLs if the container is private.
  - Correct the frontend display mapping if the URL is present but not rendered.
- Prevention notes:
  - Public-read versus SAS URL behavior depends on storage configuration and should be verified in the live environment.
- Source / confidence: Verified from code/docs; active storage access level requires verification.

### 11.3 File Stored but Not Visible in Frontend

- Symptom: Blob exists, but image still does not appear in SkillSwap.
- Likely causes:
  - API response was not saved to database.
  - Frontend is using stale cached data or old API base URL.
  - Browser cannot access the blob URL.
  - URL is a SAS URL that expired.
- Diagnostic steps:
  - Refresh the frontend and inspect API response data.
  - Check the Network tab for image request status.
  - Confirm the stored URL points to the intended container/object.
- Resolution steps:
  - Re-upload or save the corrected URL through the supported API.
  - Fix storage access/SAS settings.
  - Rebuild/redeploy frontend if it was pointing at the wrong API.
- Prevention notes:
  - Do not store uploads on VM disk; current active upload paths use object storage.
- Source / confidence: Inferred from implementation.

## 12. Docker and Backend Container Issues

### 12.1 Container Does Not Start or Exits Immediately

- Symptom: `docker ps` does not show the backend container, or it exits shortly after start.
- Likely causes:
  - Missing JAR in image build context.
  - Missing runtime environment variables.
  - Database connection fails during startup.
  - Port binding conflict.
  - VM memory pressure.
- Diagnostic steps:
  - Run `docker ps`.
  - Run `docker logs <CONTAINER_NAME> --tail 100`.
  - Run `docker inspect <CONTAINER_NAME>` and inspect state/exit information.
  - Check `free -h` and `df -h`.
- Resolution steps:
  - Fix the first startup error shown in Docker logs.
  - Ensure the image contains `build/libs/skill-swap-backend.jar`.
  - Pass datasource, storage, and Clerk variables into the container.
  - Restart after fixing env/configuration.
- Prevention notes:
  - CI uses `./gradlew bootJar --no-daemon` and a Dockerfile that copies `build/libs/skill-swap-backend.jar`.
- Source / confidence: Verified from code/docs.

### 12.2 Container Runs but API Is Unavailable

- Symptom: `docker ps` shows the container, but `<API_BASE_URL>/health` fails.
- Likely causes:
  - Nginx cannot reach `localhost:8080`.
  - Container port mapping is wrong.
  - Backend is still starting or stuck.
  - Network security allows only Nginx/HTTPS, not direct public port `8080`.
- Diagnostic steps:
  - Check `docker logs <CONTAINER_NAME> --tail 100`.
  - Confirm Docker port mapping includes `8080:8080`.
  - From the VM, test the backend on localhost.
  - From outside, test through the HTTPS API URL.
- Resolution steps:
  - Correct port mapping when starting the container.
  - Restart the backend container after fixing env/startup errors.
  - Fix Nginx upstream if local backend is reachable but public API is not.
- Prevention notes:
  - Deployment docs state public traffic should go through Nginx, not direct external port `8080`.
- Source / confidence: Verified from docs/workflow; live VM network requires verification.

### 12.3 Environment Variables Not Passed Into Container

- Symptom: Container starts with default or blank config; DB/auth/storage fails.
- Likely causes:
  - GitHub Actions secret missing.
  - `docker run -e` variable name does not match backend property.
  - Storage container variable mismatch.
- Diagnostic steps:
  - Inspect the GitHub Actions deploy step logs for masked secret presence and command failure.
  - Run `docker inspect <CONTAINER_NAME>` and check configured environment variable names without sharing values.
  - Confirm backend properties read the same variable names.
- Resolution steps:
  - Add missing GitHub Actions secrets.
  - Use `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `CLERK_ISSUER_URI`, `CLERK_JWKS_URI`, `AZURE_STORAGE_CONNECTION_STRING`, and `AZURE_STORAGE_MEDIA_CONTAINER` as applicable.
- Prevention notes:
  - Keep workflow, deployment docs, and backend property names aligned.
- Source / confidence: Verified from code/docs.

### 12.4 Docker Logs Grow Too Large

- Symptom: VM disk fills unexpectedly, or Docker log files are large.
- Likely causes:
  - Container was started without log rotation flags.
  - Excessive application logging.
- Diagnostic steps:
  - Run `df -h`.
  - Run `docker inspect <CONTAINER_NAME>` and review log configuration.
  - Check recent Docker logs for repetitive errors.
- Resolution steps:
  - Restart the container through the documented workflow/runbook path that includes log rotation.
  - Fix the repetitive application error causing log volume.
- Prevention notes:
  - Current GitHub Actions workflow starts the container with `json-file` log rotation: max size `10m`, max files `3`.
- Source / confidence: Verified from docs/workflow.

### 12.5 VM Memory Pressure or OOM

- Symptom: Container exits during deploy/startup, VM is slow, or logs indicate memory pressure.
- Likely causes:
  - VM has limited RAM.
  - Docker pull/startup plus JVM memory exceeds available memory.
  - Swap is missing or disabled.
- Diagnostic steps:
  - Run `free -h`.
  - Run `docker inspect <CONTAINER_NAME>` and inspect state information.
  - Check Docker/backend logs around exit time.
- Resolution steps:
  - Restart the container once memory pressure clears.
  - Verify swap/resource configuration against the deployment docs.
  - Escalate before changing VM size or OS-level memory settings.
- Prevention notes:
  - Existing cloud docs describe a 2 GiB swap file and JVM memory options for a small VM.
- Source / confidence: Verified from docs/Dockerfile; live VM state requires verification.

## 13. Nginx / HTTPS / Reverse Proxy Issues

### 13.1 `502 Bad Gateway` from Nginx

- Symptom: Browser sees `502 Bad Gateway` before reaching the backend application.
- Likely causes:
  - Backend container is stopped.
  - Backend port `8080` is not reachable from the VM.
  - Nginx upstream points to the wrong address/port.
  - Backend is starting slowly or crashed.
- Diagnostic steps:
  - Run `sudo systemctl status nginx`.
  - Run `docker ps`.
  - Run `docker logs <CONTAINER_NAME> --tail 100`.
  - Run `sudo journalctl -u nginx --no-pager --tail 100`.
- Resolution steps:
  - Restart the backend container if it is stopped or unhealthy.
  - Fix backend startup/configuration errors.
  - Validate Nginx config with `sudo nginx -t`.
- Prevention notes:
  - Keep Nginx as the public entry point and backend on internal port `8080`.
- Source / confidence: Verified from docs; live Nginx config requires verification.

### 13.2 HTTP Does Not Redirect to HTTPS

- Symptom: `http://...` does not redirect to HTTPS.
- Likely causes:
  - Nginx HTTP server block is missing or disabled.
  - Nginx is not running.
  - DNS points somewhere else.
- Diagnostic steps:
  - Check `sudo systemctl status nginx`.
  - Run `sudo nginx -t`.
  - Inspect Nginx logs.
  - Confirm DNS for the API host points to the expected VM.
- Resolution steps:
  - Restore the documented Nginx HTTP-to-HTTPS configuration.
  - Reload/restart Nginx only after config test passes.
- Prevention notes:
  - Keep TLS/proxy setup details in cloud deployment docs; this guide is diagnostic only.
- Source / confidence: Supported by deployment docs; live DNS/Nginx config requires verification.

### 13.3 HTTPS Certificate Issue

- Symptom: Browser shows certificate warning, certificate expired, or HTTPS request fails before API response.
- Likely causes:
  - Certificate expired or renewal failed.
  - Nginx certificate path is wrong.
  - DNS no longer matches certificate host.
- Diagnostic steps:
  - Check browser certificate details.
  - Check Nginx logs.
  - Run `sudo nginx -t`.
  - Verify Certbot/system renewal status using the VM's documented operational process.
- Resolution steps:
  - Escalate to the operator responsible for TLS/Certbot on the VM.
  - Do not bypass TLS in production troubleshooting.
- Prevention notes:
  - Certificate issuance/renewal setup belongs in deployment/cloud docs.
- Source / confidence: Supported by deployment docs; live certificate state requires verification.

### 13.4 Nginx Configuration Syntax Error

- Symptom: Nginx fails to reload/start.
- Likely causes:
  - Invalid Nginx config syntax.
  - Missing certificate file path.
  - Duplicate server block conflict.
- Diagnostic steps:
  - Run `sudo nginx -t`.
  - Run `sudo journalctl -u nginx --no-pager --tail 100`.
- Resolution steps:
  - Fix the syntax error shown by `nginx -t`.
  - Reload only after the test passes.
- Prevention notes:
  - Test Nginx config before restart/reload.
- Source / confidence: Supported by deployment docs; exact config file path requires live verification.

### 13.5 Nginx Running but Cannot Reach Backend Container

- Symptom: Nginx status is active, but API requests fail.
- Likely causes:
  - Backend container is not running.
  - Container port mapping missing.
  - Backend listens on a different port due to `PORT`.
  - Nginx upstream still points to `localhost:8080`.
- Diagnostic steps:
  - Run `docker ps`.
  - Run `docker logs <CONTAINER_NAME> --tail 100`.
  - Confirm backend `server.port` and Docker port mapping.
- Resolution steps:
  - Restore backend container mapping to `8080:8080`, or update Nginx and deployment docs consistently if changing it.
- Prevention notes:
  - The current Dockerfile exposes `8080`, and the workflow maps `8080:8080`.
- Source / confidence: Verified from Dockerfile/workflow/docs.

## 14. CI/CD and Deployment Pipeline Issues

### 14.1 GitHub Actions Backend Build Fails

- Symptom: Workflow fails during `Build JAR with Gradle`.
- Likely causes:
  - Compile error.
  - Test/context-load failure.
  - Java/Gradle dependency resolution failure.
  - Backend requires database configuration for tests/startup context.
- Diagnostic steps:
  - Open the failed Actions run.
  - Inspect the first failed build step.
  - Reproduce locally with `./gradlew bootJar --no-daemon` from `skill-swap-backend`.
- Resolution steps:
  - Fix compile or test errors.
  - If the failure is environment-specific, document the missing configuration and update the pipeline deliberately.
- Prevention notes:
  - CI deploy workflow builds `bootJar`, not the full frontend.
- Source / confidence: Verified from workflow/build files.

### 14.2 Docker Image Build Fails

- Symptom: Workflow fails during Docker build/push.
- Likely causes:
  - JAR was not produced at `build/libs/skill-swap-backend.jar`.
  - Docker build context is wrong.
  - Dockerfile cannot copy the JAR.
- Diagnostic steps:
  - Check whether Gradle produced `build/libs/skill-swap-backend.jar`.
  - Confirm Docker build context is `./skill-swap-backend`.
  - Inspect Docker build logs.
- Resolution steps:
  - Fix the Gradle artifact build.
  - Keep `bootJar.archiveFileName` aligned with Dockerfile `COPY`.
- Prevention notes:
  - Do not rename the boot JAR without updating Dockerfile and workflow together.
- Source / confidence: Verified from code/workflow.

### 14.3 GHCR Login or Push Fails

- Symptom: Workflow fails at GHCR login or image push.
- Likely causes:
  - `GITHUB_TOKEN` permissions or package permissions issue.
  - Registry unavailable.
  - Image name/owner mismatch.
- Diagnostic steps:
  - Inspect the GHCR login/push step logs.
  - Confirm workflow image name and repository permissions.
- Resolution steps:
  - Correct repository/package permissions.
  - Retry after transient registry failures.
- Prevention notes:
  - The workflow uses `GITHUB_TOKEN`; no separate Docker Hub token is documented.
- Source / confidence: Verified from workflow; permissions require verification.

### 14.4 SSH Deployment Step Fails

- Symptom: Workflow builds image but fails deploying to Azure VM.
- Likely causes:
  - Missing or invalid `AZURE_VM_IP`, `AZURE_VM_USER`, or `SSH_PRIVATE_KEY`.
  - VM unavailable.
  - SSH blocked or key mismatch.
  - Docker unavailable on VM.
- Diagnostic steps:
  - Inspect the `appleboy/ssh-action` step logs.
  - Confirm required GitHub Actions secrets exist without exposing values.
  - Confirm VM is reachable through the approved operational path.
- Resolution steps:
  - Correct GitHub Actions SSH secrets.
  - Restore VM/SSH/Docker availability.
- Prevention notes:
  - Do not paste private keys into logs, tickets, or docs.
- Source / confidence: Verified from workflow/docs; live VM reachability requires verification.

### 14.5 Docker Pull Fails on Azure VM

- Symptom: SSH deploy step reaches VM but fails at `docker pull`.
- Likely causes:
  - GHCR login failed on VM.
  - Image tag not available.
  - Network/registry issue from VM.
- Diagnostic steps:
  - Review deploy step logs around `docker login` and `docker pull`.
  - Check GHCR package availability for the expected image tag.
- Resolution steps:
  - Fix GHCR authentication/permissions.
  - Re-run the workflow after the image push succeeds.
- Prevention notes:
  - Current deployment uses `latest`; robust rollback/version pinning is limited.
- Source / confidence: Verified from workflow/docs.

### 14.6 New Deployment Does Not Appear Live

- Symptom: GitHub Actions succeeded, but API behavior still appears old.
- Likely causes:
  - Frontend is calling a different backend URL.
  - Container did not restart with new image.
  - Browser/client cache or stale frontend deployment.
  - Vercel frontend deployment is separate from backend deployment.
- Diagnostic steps:
  - Check Actions run commit and status.
  - Run `docker ps` and `docker logs <CONTAINER_NAME> --tail 100` on the VM.
  - Check frontend Network tab for API URL.
  - Check Vercel deployed commit and build logs.
- Resolution steps:
  - Restart/redeploy the backend through the runbook path.
  - Redeploy frontend if its env/build output is stale.
  - Correct `VITE_API_BASE_URL` if pointing to an old API.
- Prevention notes:
  - Backend and frontend deploy separately.
- Source / confidence: Verified from docs/workflow.

### 14.7 Vercel Frontend Deployment Fails

- Symptom: Vercel build fails or deployed frontend is unavailable.
- Likely causes:
  - Frontend build error.
  - Missing Vercel env variables.
  - Wrong output directory.
  - Vercel project connected to wrong root directory.
- Diagnostic steps:
  - Read Vercel deployment logs.
  - Confirm build command is `npm run build`.
  - Confirm output directory is `build`.
  - Confirm `VITE_API_BASE_URL` and `VITE_CLERK_PUBLISHABLE_KEY`.
- Resolution steps:
  - Fix the build error or env configuration.
  - Redeploy the frontend.
- Prevention notes:
  - Frontend env variables are injected at build time; changing them requires redeploy.
- Source / confidence: Verified from code/docs; live Vercel settings require verification.

### 14.8 Frontend Deployed but Still Calls Old Backend URL

- Symptom: Production frontend loads but API requests go to an old URL.
- Likely causes:
  - Vercel `VITE_API_BASE_URL` is stale.
  - Deployment predates env change.
  - Browser has an old build cached.
- Diagnostic steps:
  - Inspect Network tab request host.
  - Check Vercel env var and deployed commit/build time.
- Resolution steps:
  - Update `VITE_API_BASE_URL=<API_BASE_URL>` in Vercel.
  - Trigger a new Vercel deployment.
  - Hard refresh or test in a clean browser session.
- Prevention notes:
  - Do not hard-code production API URLs in client code.
- Source / confidence: Verified from code/docs.

## 15. Production Runtime Issues

### 15.1 Backend API Unavailable

- Symptom: `<API_BASE_URL>/health` fails in production.
- Likely causes:
  - Backend container stopped.
  - Nginx down or misconfigured.
  - VM/network/DNS problem.
  - Backend startup failure due to DB/auth/env.
- Diagnostic steps:
  - Run `curl -i <API_BASE_URL>/health`.
  - On the VM, run `docker ps`.
  - Check Docker logs and Nginx status/logs.
  - Check `df -h` and `free -h`.
- Resolution steps:
  - Restart the backend container if appropriate.
  - Fix the first error shown in logs.
  - Escalate for VM/DNS/TLS issues.
- Prevention notes:
  - Health endpoint confirms HTTP liveness only.
- Source / confidence: Verified from code/docs; live infrastructure requires verification.

### 15.2 Frontend Loads but API Calls Fail

- Symptom: Static frontend renders, but data/actions fail.
- Likely causes:
  - Wrong `VITE_API_BASE_URL`.
  - Backend unavailable.
  - CORS origin not allowed.
  - Auth token rejected by backend.
- Diagnostic steps:
  - Inspect Network tab for request URL, status, response body, and CORS/auth errors.
  - Check backend `/health`.
  - Check backend CORS and Clerk configuration.
- Resolution steps:
  - Correct frontend env and redeploy.
  - Restore backend/Nginx.
  - Align CORS/auth settings.
- Prevention notes:
  - Browser console plus Network tab usually identifies the failing layer quickly.
- Source / confidence: Verified from code/docs.

### 15.3 Authentication Works Locally but Not in Production

- Symptom: Local login/API works, production returns `401`/`403`.
- Likely causes:
  - Production Clerk frontend key does not match backend issuer/JWKS.
  - Vercel env uses development Clerk values.
  - Backend secrets use development Clerk values.
  - Production user role/auth_subject is not mapped.
- Diagnostic steps:
  - Compare production Vercel Clerk key with backend Clerk issuer/JWKS environment.
  - Check backend logs for JWT validation errors.
  - Confirm `/api/v1/users/me` response and role.
- Resolution steps:
  - Align production Clerk values in Vercel and GitHub Actions/runtime secrets.
  - Correct production user mapping/role through maintainer process.
- Prevention notes:
  - Development and production Clerk users have different subjects.
- Source / confidence: Verified from code/docs; live Clerk configuration requires verification.

### 15.4 File Upload Works Locally but Not in Production

- Symptom: Upload succeeds locally but fails in production.
- Likely causes:
  - Production container missing Azure Blob variables.
  - Workflow uses `AZURE_STORAGE_MEMORIES_CONTAINER` while backend reads `AZURE_STORAGE_MEDIA_CONTAINER`.
  - Blob container access differs between environments.
  - File size/content type differs.
- Diagnostic steps:
  - Check production Docker env names via `docker inspect <CONTAINER_NAME>` without sharing values.
  - Check backend logs for Azure Blob errors.
  - Compare uploaded file type/size.
- Resolution steps:
  - Align production storage env var names and redeploy.
  - Verify storage container access and SAS/public-read behavior.
- Prevention notes:
  - Treat the storage variable mismatch as a known operational risk.
- Source / confidence: Verified from code/docs; live storage account access requires verification.

### 15.5 Database Works Locally but Not in Production

- Symptom: Local backend works; production backend fails DB startup or API queries.
- Likely causes:
  - Production `<DB_URL>`/credentials wrong.
  - SSL mode missing.
  - Schema migrations/manual SQL not applied to production.
  - Network/firewall issue.
- Diagnostic steps:
  - Check Docker logs for datasource/Hibernate errors.
  - Confirm GitHub Actions secrets are configured.
  - Confirm production schema matches current entities.
- Resolution steps:
  - Correct secret values.
  - Apply required schema changes through verified process.
  - Restart/redeploy backend.
- Prevention notes:
  - No automatic migration step exists in the backend deployment workflow.
- Source / confidence: Verified from docs/workflow; live DB schema requires verification.

### 15.6 Admin Workflow Works Locally but Not in Production

- Symptom: Admin pages or actions fail only in production.
- Likely causes:
  - Production user lacks admin role.
  - Clerk production subject differs from local/development subject.
  - Backend production JWT issuer/JWKS mismatch.
  - API base URL points to the wrong backend.
- Diagnostic steps:
  - Call `/api/v1/users/me` in production and inspect role.
  - Verify current Clerk subject mapping in production DB.
  - Check Network tab and backend logs for `401`/`403`.
- Resolution steps:
  - Correct production auth-subject/role mapping through maintainer process.
  - Align production Clerk configuration.
- Prevention notes:
  - Admin role provisioning is not self-service in the current app.
- Source / confidence: Verified from code/docs; production DB correction requires verification.

## 16. Log Locations and Useful Evidence

Collect evidence without exposing passwords, secrets, private keys, raw tokens, database connection strings, or private URLs.

| Evidence source | What to look for |
|---|---|
| Browser developer console | Runtime JavaScript errors, Clerk errors, missing env messages |
| Browser Network tab | Request URL, status code, response body, CORS errors, missing `Authorization` header |
| Frontend terminal/build logs | Vite startup/build errors |
| Vercel deployment logs | Install/build/output-directory/env-related failures |
| Backend application logs | Spring Boot startup, DB smoke check, JWT decoder config, exception stack traces |
| Docker logs | Container startup failure, runtime exceptions, database/storage errors |
| Docker inspect | Container state, port mapping, environment variable names, log configuration |
| GitHub Actions logs | First failed workflow step, Gradle/Docker/GHCR/SSH deploy failures |
| Nginx service/journal logs | Proxy failures, config errors, certificate/load problems |
| Database error messages | Connection refused, auth failed, SSL required, missing relation/column |

Useful evidence to include in escalation:

- Environment: local, production frontend, or production backend.
- Approximate time and timezone.
- Page or endpoint affected.
- HTTP status code and sanitized response message.
- Browser request URL host only, if safe to share.
- Recent deployment run link or commit SHA.
- Whether the user was public, signed-in member, or admin.

Do not include:

- Raw JWTs
- Passwords
- API keys
- Private keys
- Full production database URLs
- Blob connection strings or SAS tokens
- Full secret values from GitHub Actions, Vercel, or local env files

## 17. Escalation and Recovery Notes

Stop troubleshooting and escalate when:

- Production data may be corrupted or incorrectly mapped.
- A schema change or migration is required.
- Admin role or `auth_subject` correction is needed in production.
- TLS, DNS, or VM access is failing.
- Repeated `500` errors affect multiple users.
- Secrets may have been exposed.
- Docker/Nginx fixes require changing live production configuration.

Safe recovery actions supported by docs/code:

- Restart the backend container:

  ```bash
  docker restart <CONTAINER_NAME>
  ```

- Re-run a failed GitHub Actions workflow after correcting configuration.
- Redeploy the frontend after Vercel environment changes.
- Check Docker/Nginx status and logs before making configuration changes.

Avoid in this guide:

- Destructive database commands.
- Manual deletes of Docker containers or images without following the Deployment Runbook.
- Rollback procedures. See `docs/06-operations/Deployment-Runbook.md` for rollback notes and current limitations.
- Copying real credentials into documentation or support messages.

## 18. Known Troubleshooting Limitations

- `/health` exists and returns `204 No Content`, but it is a shallow HTTP liveness check. It does not prove database, Clerk, Azure Blob, or admin workflows are healthy.
- No centralized metrics, tracing, alerting, or log aggregation stack was found in the repository.
- No staging or QA deployment environment was found in docs/code.
- Backend deployment is documented as a single VM/container.
- Live Vercel project settings cannot be verified from the repository.
- Live DNS, TLS certificate state, Nginx config files, and VM state require direct production access.
- Runtime Flyway migration is disabled in inspected Spring profiles; schema setup/migration process requires maintainer verification.
- The deployment workflow/docs and backend code use different Azure Blob container variable names: workflow/docs mention `AZURE_STORAGE_MEMORIES_CONTAINER`, while backend code reads `AZURE_STORAGE_MEDIA_CONTAINER`.
- Frontend automated test/lint/typecheck scripts were not found in `package.json`.
- Backend test coverage visible in the repository is limited to a Spring context-load test.
- Some behaviors require verification against production configuration, especially Clerk, CORS, storage container access, database schema, DNS, and Vercel settings.
- `docs/03-architecture/Security-Design.md` and `docs/08-testing/` were referenced by planning/runbook docs but were not present in the inspected worktree at the time of this review.

## 19. Verification Notes

### Directly Supported by Code or Repository Configuration

- Frontend commands: `npm install`, `npm run dev`, `npm run build`.
- Frontend dev port `3000` and build output directory `build`.
- Frontend `VITE_API_BASE_URL` fallback to `http://localhost:8080`.
- Frontend `VITE_CLERK_PUBLISHABLE_KEY` requirement.
- Frontend bearer-token and `FormData` handling through service helpers.
- Backend Java 17, Gradle wrapper, `build`, `test`, `bootRun`, and `bootJar`.
- Backend `/health` endpoint returning `204 No Content`.
- Backend startup DB smoke check.
- Spring Security OAuth2 Resource Server JWT/JWKS validation.
- CORS configuration with localhost origins and configured deployed frontend origins.
- Role mapping from `user_account.auth_subject` and `user_account.role`.
- Global exception handler statuses for common errors.
- Upload endpoints and Azure Blob storage implementation.
- Default upload size behavior and image content-type checks.
- Dockerfile using Eclipse Temurin 17 JRE Alpine and port `8080`.
- GitHub Actions backend deployment workflow to GHCR and Azure VM.
- Docker log rotation flags in the workflow.
- Vercel SPA fallback through `vercel.json`.

### Inferred from Implementation

- Port conflict diagnosis through local process inspection.
- Stale frontend build behavior after env changes.
- Browser cache/stale deployment effects.
- Data persistence symptoms caused by frontend pointing to the wrong backend.
- Media display failures caused by stored URL/access mismatch.
- Production runtime triage order from frontend to Nginx to container to backend logs.

### Requires Verification

- Live production API and frontend URLs.
- Current Vercel project root/output/env configuration.
- Live Azure VM health, swap, disk, Docker daemon state, and Nginx configuration.
- Live DNS and TLS certificate state.
- Current Clerk development/production issuer, JWKS, token template, and OAuth settings.
- Active production database schema and whether all SQL migrations/manual scripts were applied.
- Active Azure Blob container name, access level, and SAS/public-read behavior.
- Any monitoring, alerting, backup, or restore systems configured outside the repository.
