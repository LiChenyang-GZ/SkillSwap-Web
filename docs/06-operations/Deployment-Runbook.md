# Deployment Runbook

Last reviewed: 2026-05-15

## 1. Document Purpose

This runbook provides step-by-step deployment procedures for SkillSwap operators and maintainers. It focuses on executing, verifying, and recovering deployments for the current documented production model.

Detailed architecture, troubleshooting, security design, and testing strategy are covered separately:

- Architecture: `docs/03-architecture/System-Architecture.md`
- Cloud deployment background: `doc/cloud/SkillSwap-Cloud-Deployment.md`
- Local development: `docs/05-development/Local-Development-Guide.md`
- Troubleshooting: planned separately in `docs/06-operations/Troubleshooting-Guide.md`
- Security design: planned separately in `docs/03-architecture/Security-Design.md`
- Testing strategy: planned separately under `docs/08-testing/`

## 2. Deployment Scope

This runbook covers:

- Backend deployment
- Frontend deployment
- Required secrets and environment variables
- Manual backend deployment fallback
- Deployment verification
- Rollback notes and current limitations

This runbook does not cover:

- Full architecture explanation
- Detailed symptom-based troubleshooting
- Security architecture or threat modelling
- Test strategy or manual test case design
- Initial cloud resource provisioning beyond deployment prerequisites

## 3. Deployment Overview

| Area | Current documented model |
|---|---|
| Frontend hosting | Vercel Git integration for the React/Vite SPA |
| Backend hosting target | Azure VM running Docker behind Nginx |
| Containerisation | Spring Boot JAR packaged into a Docker image using `skill-swap-backend/Dockerfile` |
| Database service | Azure Database for PostgreSQL Flexible Server |
| Object storage service | Azure Blob Storage |
| Authentication provider | Clerk |
| Backend CI/CD pipeline | GitHub Actions workflow `.github/workflows/deploy.yml` |
| Container registry | GitHub Container Registry (GHCR) |

The frontend and backend deploy separately. A push to `main` triggers the backend GitHub Actions deployment and, according to existing cloud documentation, also triggers Vercel's frontend deployment through Vercel's Git integration.

## 4. Deployment Environments

Only local development and production are clearly supported by the repository and existing documentation. No staging or QA deployment environment was found.

| Environment | Purpose | Deployment method | Configuration source |
|---|---|---|---|
| Local development | Developer setup and local verification | Manual local commands: Vite dev server and Gradle `bootRun` | Local ignored env files, `application-dev.properties`, `vite.config.ts`, Local Development Guide |
| Production | Public deployed SkillSwap application | Backend: GitHub Actions to GHCR and Azure VM. Frontend: Vercel Git integration | GitHub Actions secrets, Vercel environment variables, backend runtime env vars, cloud docs |

## 5. Pre-Deployment Checklist

- [ ] Code is committed and pushed to the intended branch.
- [ ] For production backend deployment, the branch is `main`.
- [ ] `.github/workflows/deploy.yml` is present and enabled.
- [ ] Required GitHub Actions secrets are configured.
- [ ] Required Vercel frontend environment variables are configured.
- [ ] Azure VM is available over SSH.
- [ ] Docker is installed and running on the Azure VM.
- [ ] Nginx is installed and configured on the VM if HTTPS/API traffic is expected through Nginx.
- [ ] Database connection details are available as deployment secrets.
- [ ] Azure Blob Storage configuration is available as deployment secrets.
- [ ] Clerk production issuer, JWKS endpoint, secret key, and frontend publishable key are available.
- [ ] DNS and HTTPS configuration are already in place if the deployed URLs depend on them.
- [ ] Any required database schema or data migration has been completed or scheduled as a manual operational step.

## 6. Required Secrets and Environment Variables

Do not commit real secrets, passwords, private keys, API keys, production tokens, database connection strings, or sensitive account identifiers. Use deployment secret stores and placeholders only in documentation.

### A. GitHub Actions Secrets

These secrets are used by `.github/workflows/deploy.yml` for backend deployment.

| Secret name | Purpose | Used by | Required for deployment? | Placeholder example |
|---|---|---|---|---|
| `AZURE_VM_IP` | Azure VM SSH host | `appleboy/ssh-action` | Yes | `<AZURE_VM_IP>` |
| `AZURE_VM_USER` | Azure VM SSH username | `appleboy/ssh-action` | Yes | `<AZURE_VM_USER>` |
| `SSH_PRIVATE_KEY` | Private key for SSH deployment | `appleboy/ssh-action` | Yes | `<SSH_PRIVATE_KEY>` |
| `DB_URL` | PostgreSQL JDBC URL injected as `SPRING_DATASOURCE_URL` | Docker `run` command | Yes | `<DB_URL>` |
| `DB_USERNAME` | PostgreSQL username injected as `SPRING_DATASOURCE_USERNAME` | Docker `run` command | Yes | `<DB_USERNAME>` |
| `DB_PASSWORD` | PostgreSQL password injected as `SPRING_DATASOURCE_PASSWORD` | Docker `run` command | Yes | `<DB_PASSWORD>` |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob Storage connection string | Docker `run` command | Yes for upload flows | `<AZURE_STORAGE_CONNECTION_STRING>` |
| `CLERK_ISSUER_URI` | Clerk production JWT issuer | Docker `run` command | Yes for production auth | `<CLERK_ISSUER_URI>` |
| `CLERK_JWKS_URI` | Clerk production JWKS endpoint | Docker `run` command | Yes for production auth | `<CLERK_JWKS_URI>` |
| `CLERK_SECRET_KEY` | Clerk backend secret key | Docker `run` command | Yes in current deployment configuration | `<CLERK_SECRET_KEY>` |

Notes:

- `GITHUB_TOKEN` is automatically provided by GitHub Actions and is used for GHCR login in the workflow.
- The workflow currently sets `AZURE_STORAGE_MEMORIES_CONTAINER="memories"` directly in the `docker run` command. The backend implementation reads `AZURE_STORAGE_MEDIA_CONTAINER` through `app.storage.azure.blob.container`. This mismatch requires verification before relying on media uploads in production.

### B. Backend Runtime Environment Variables

| Variable name | Purpose | Required? | Where configured | Placeholder example |
|---|---|---|---|---|
| `SPRING_DATASOURCE_URL` | PostgreSQL JDBC URL | Yes | Injected from GitHub secret `DB_URL` | `<DB_URL>` |
| `SPRING_DATASOURCE_USERNAME` | PostgreSQL username | Yes | Injected from GitHub secret `DB_USERNAME` | `<DB_USERNAME>` |
| `SPRING_DATASOURCE_PASSWORD` | PostgreSQL password | Yes | Injected from GitHub secret `DB_PASSWORD` | `<DB_PASSWORD>` |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob Storage connection string | Yes for upload flows | Injected from GitHub secret | `<AZURE_STORAGE_CONNECTION_STRING>` |
| `AZURE_STORAGE_MEMORIES_CONTAINER` | Blob container name used by current workflow and cloud docs | Requires verification | Hard-coded in current workflow as `memories` | `<AZURE_STORAGE_MEMORIES_CONTAINER>` |
| `AZURE_STORAGE_MEDIA_CONTAINER` | Blob container name read by backend implementation | Yes for intended Azure Blob container selection; not currently injected by workflow | `application.properties` placeholder / deployment environment | `<AZURE_STORAGE_MEDIA_CONTAINER>` |
| `AZURE_STORAGE_SAS_DAYS` | Optional SAS URL validity setting for blob URLs | Optional | `application.properties` placeholder / deployment environment | `<AZURE_STORAGE_SAS_DAYS>` |
| `CLERK_ISSUER_URI` | JWT issuer for Clerk | Yes for production auth | Injected from GitHub secret | `<CLERK_ISSUER_URI>` |
| `CLERK_JWKS_URI` | JWKS endpoint for JWT validation | Yes for production auth | Injected from GitHub secret | `<CLERK_JWKS_URI>` |
| `CLERK_SECRET_KEY` | Clerk backend secret key | Yes in current deployment configuration | Injected from GitHub secret | `<CLERK_SECRET_KEY>` |
| `PORT` | Spring Boot server port; default is `8080` | No unless overriding default | `application.properties` placeholder | `8080` |
| `VITE_SUPABASE_URL` | Legacy Supabase storage compatibility setting | No for current Azure deployment; conditional for legacy cleanup | Backend properties | `<SUPABASE_URL>` |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy Supabase storage service role key | No for current Azure deployment; conditional for legacy cleanup | Backend properties | `<SUPABASE_SERVICE_ROLE_KEY>` |
| `SUPABASE_STORAGE_BUCKET` | Legacy Supabase storage bucket | No for current Azure deployment; conditional for legacy cleanup | Backend properties | `<SUPABASE_STORAGE_BUCKET>` |

### C. Frontend Deployment Environment Variables

These values are configured in the Vercel project dashboard and are injected at build time. `VITE_` variables are browser-visible after build, so do not place backend secrets in frontend variables.

| Variable name | Purpose | Required? | Where configured | Placeholder example |
|---|---|---|---|---|
| `VITE_API_BASE_URL` | Backend API base URL used by frontend service modules | Yes for production | Vercel environment variables | `<API_BASE_URL>` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk frontend publishable key | Yes | Vercel environment variables | `<CLERK_PUBLISHABLE_KEY>` |
| `VITE_AUTH_REDIRECT_URL` | Optional auth redirect override | Optional | Vercel environment variables | `<AUTH_REDIRECT_URL>` |
| `VITE_IMAGE_UPLOAD_MAX_BYTES` | Optional frontend upload size limit | Optional | Vercel environment variables | `<IMAGE_UPLOAD_MAX_BYTES>` |
| `VITE_SUPABASE_URL` | Legacy/unused Supabase utility setting observed in frontend code | Not required for current documented deployment | Vercel environment variables if a feature needs it | `<SUPABASE_URL>` |
| `VITE_SUPABASE_ANON_KEY` | Legacy/unused Supabase utility setting observed in frontend code | Not required for current documented deployment | Vercel environment variables if a feature needs it | `<SUPABASE_ANON_KEY>` |

## 7. Automated Backend Deployment

The normal backend deployment path is the GitHub Actions workflow at `.github/workflows/deploy.yml`.

### Trigger

The workflow runs on pushes to `main`:

```yaml
on:
  push:
    branches:
      - main
```

### Verified Pipeline Stages

1. Check out source with `actions/checkout@v4`.
2. Set up Java 17 using `actions/setup-java@v4` with Temurin.
3. Build the backend JAR from `./skill-swap-backend`.
4. Log in to GHCR using the GitHub Actions `GITHUB_TOKEN`.
5. Build and push the Docker image from the backend directory.
6. SSH into the Azure VM.
7. Stop and remove the existing `backend-api` container.
8. Pull the latest backend image from GHCR.
9. Start a new `backend-api` container with runtime environment variables.
10. Prune old Docker images.

### Build and Image Commands

The workflow builds the JAR with:

```bash
./gradlew bootJar --no-daemon
```

The Gradle build fixes the boot JAR name as:

```text
build/libs/skill-swap-backend.jar
```

The Dockerfile expects that fixed JAR path:

```dockerfile
COPY build/libs/skill-swap-backend.jar app.jar
ENTRYPOINT ["java", "-Xmx512m", "-Xms256m", "-jar", "app.jar"]
```

The workflow pushes a `latest` image to GHCR:

```yaml
tags: ghcr.io/${{ env.IMAGE_NAME }}:latest
```

### VM Redeploy Command Excerpt

This excerpt is based on the current workflow. Sensitive values are shown as placeholders.

```bash
docker stop backend-api || true
docker rm backend-api || true

docker pull <GHCR_IMAGE>:latest

docker run -d \
  --name backend-api \
  --restart unless-stopped \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  -p 8080:8080 \
  -e SPRING_DATASOURCE_URL="<DB_URL>" \
  -e SPRING_DATASOURCE_USERNAME="<DB_USERNAME>" \
  -e SPRING_DATASOURCE_PASSWORD="<DB_PASSWORD>" \
  -e AZURE_STORAGE_CONNECTION_STRING="<AZURE_STORAGE_CONNECTION_STRING>" \
  -e AZURE_STORAGE_MEMORIES_CONTAINER="<AZURE_STORAGE_MEMORIES_CONTAINER>" \
  -e CLERK_ISSUER_URI="<CLERK_ISSUER_URI>" \
  -e CLERK_JWKS_URI="<CLERK_JWKS_URI>" \
  -e CLERK_SECRET_KEY="<CLERK_SECRET_KEY>" \
  <GHCR_IMAGE>:latest

docker image prune -f
```

Requires verification: the backend code reads `AZURE_STORAGE_MEDIA_CONTAINER`, while the current workflow injects `AZURE_STORAGE_MEMORIES_CONTAINER`. Align the variable name before treating this as verified media upload configuration.

## 8. Automated Frontend Deployment

The normal frontend deployment path is Vercel's Git integration, as documented in the existing cloud deployment documentation.

### Trigger

Existing cloud documentation states that frontend deployments are triggered automatically by pushes to `main`. No frontend GitHub Actions deployment workflow was found in the repository.

### Build Configuration

Repository-verified frontend build command:

```bash
npm run build
```

`package.json` maps this to:

```bash
vite build
```

Repository-verified output directory from `skill-swap-frontend/vite.config.ts`:

```text
build
```

The existing cloud deployment documentation says the frontend output directory is `dist` / `build`. The repository Vite config currently sets `build`, so Vercel should use `build` unless the Vercel project has an explicit override.

### Frontend Deployment Steps

1. Push the frontend change to `main`.
2. Confirm Vercel starts a deployment for the connected project.
3. Confirm Vercel uses `npm run build`.
4. Confirm the output directory is `build`, unless intentionally overridden in Vercel.
5. Confirm Vercel environment variables include `VITE_API_BASE_URL` and `VITE_CLERK_PUBLISHABLE_KEY`.
6. Confirm SPA fallback routing is active. The repository includes `skill-swap-frontend/vercel.json` routing all unmatched paths to `/index.html`.

Detailed frontend hosting architecture is covered in the cloud deployment and system architecture documents.

## 9. Manual Backend Deployment Fallback

Use this only when the automated backend workflow is unavailable or a manual redeploy is needed. The current standard path is automated GitHub Actions deployment.

### Fallback A: Manually Redeploy the Current GHCR Image

This follows the same container lifecycle as the GitHub Actions workflow.

1. SSH into the Azure VM.

   ```bash
   ssh -i <SSH_PRIVATE_KEY> <AZURE_VM_USER>@<AZURE_VM_IP>
   ```

2. Log in to GHCR if needed.

   ```bash
   docker login ghcr.io -u <GITHUB_USERNAME>
   ```

3. Pull the image and restart the backend container.

   ```bash
   docker pull <GHCR_IMAGE>:latest

   docker stop backend-api || true
   docker rm backend-api || true

   docker run -d \
     --name backend-api \
     --restart unless-stopped \
     --log-driver json-file \
     --log-opt max-size=10m \
     --log-opt max-file=3 \
     -p 8080:8080 \
     -e SPRING_DATASOURCE_URL="<DB_URL>" \
     -e SPRING_DATASOURCE_USERNAME="<DB_USERNAME>" \
     -e SPRING_DATASOURCE_PASSWORD="<DB_PASSWORD>" \
     -e AZURE_STORAGE_CONNECTION_STRING="<AZURE_STORAGE_CONNECTION_STRING>" \
     -e AZURE_STORAGE_MEDIA_CONTAINER="<AZURE_STORAGE_MEDIA_CONTAINER>" \
     -e CLERK_ISSUER_URI="<CLERK_ISSUER_URI>" \
     -e CLERK_JWKS_URI="<CLERK_JWKS_URI>" \
     -e CLERK_SECRET_KEY="<CLERK_SECRET_KEY>" \
     <GHCR_IMAGE>:latest
   ```

4. Verify the container started.

   ```bash
   docker ps
   docker logs backend-api --tail 50
   ```

### Fallback B: Build and Push the Image Manually

Inferred from implementation: this uses the same Gradle task, Dockerfile, and GHCR image pattern as the workflow, but it is not separately automated by a repository script.

1. Build the backend JAR locally from the backend directory.

   ```bash
   cd skill-swap-backend
   ./gradlew bootJar --no-daemon
   ```

   Windows PowerShell:

   ```powershell
   cd skill-swap-backend
   .\gradlew.bat bootJar --no-daemon
   ```

2. Build and push the Docker image.

   ```bash
   docker build -t <GHCR_IMAGE>:latest .
   docker push <GHCR_IMAGE>:latest
   ```

3. SSH into the VM and run Fallback A to pull and restart the container.

### Documented Artifact Transfer Note

The existing cloud deployment documentation includes an older manual pattern that builds a JAR locally and transfers it to the VM with `scp`. The exact VM-side Docker build context for that path is not represented by a checked-in script, and the current Dockerfile expects `build/libs/skill-swap-backend.jar` inside the Docker build context.

Treat direct JAR transfer as a fallback pattern requiring operator preparation, not as the preferred current manual path. If used, keep all paths and credentials as placeholders:

```bash
scp -i <SSH_PRIVATE_KEY> \
  build/libs/skill-swap-backend.jar \
  <AZURE_VM_USER>@<AZURE_VM_IP>:<REMOTE_BACKEND_BUILD_PATH>/build/libs/skill-swap-backend.jar
```

Then build and run the image on the VM only if the VM contains a valid backend Docker build context:

```bash
cd <REMOTE_BACKEND_BUILD_PATH>
docker build --no-cache -t <LOCAL_BACKEND_IMAGE> .
```

## 10. Database Migration or Setup During Deployment

No automatic database migration step exists in the backend deployment workflow. The repository contains Flyway dependencies, a Gradle Flyway plugin configuration, migration SQL files, manual SQL files, and a schema dump, but inspected application profiles set `spring.flyway.enabled=false`.

Current operational conclusion: database schema changes are a manual deployment responsibility and require verification before production deployment.

### Manual Data Migration Pattern

Existing cloud documentation includes a `pg_dump` / `psql` migration pattern. Use placeholders only:

```bash
pg_dump "<SOURCE_DB_URL>" > backup.sql
psql "<TARGET_POSTGRES_URL>" < backup.sql
```

Use a `psql`-compatible PostgreSQL connection URI for `<TARGET_POSTGRES_URL>`. Do not pass the Spring JDBC-style `DB_URL` secret directly to `psql` unless it has been converted to the expected PostgreSQL URI format.

### Schema Change Notes

1. Review pending schema changes before deploying backend code that depends on them.
2. Confirm whether the required SQL exists under `skill-swap-backend/src/main/resources/db/migration` or `doc/sql`.
3. Apply schema changes through the team's agreed manual process.
4. Confirm the production database matches the JPA model before starting the new backend container.

Inferred from implementation: `./gradlew flywayMigrate` exists through the Gradle Flyway plugin, but the checked-in Flyway configuration targets local-style configuration and is not documented as the production deployment path.

Recommended future improvement: standardise production migration execution through an explicit runbook step, CI/CD job, or controlled manual migration command.

## 11. Post-Deployment Verification Checklist

- [ ] GitHub Actions backend workflow completed successfully.
- [ ] Vercel frontend deployment completed successfully.
- [ ] `backend-api` container is running on the Azure VM.
- [ ] Backend logs show successful Spring Boot startup.
- [ ] Nginx is running if backend traffic is served through Nginx.
- [ ] HTTPS API endpoint responds.
- [ ] `/health` responds successfully.
- [ ] Frontend can reach the backend API configured by `VITE_API_BASE_URL`.
- [ ] Clerk authentication flow works in production.
- [ ] Authenticated profile request works after login.
- [ ] Database connection works through normal API reads.
- [ ] File upload works if Azure Blob Storage upload flows are in scope for the release.
- [ ] Admin access works for configured admin users if admin features are in scope for the release.

This checklist is limited to deployment verification. Detailed troubleshooting belongs in the separate troubleshooting guide.

## 12. Basic Verification Commands

Run these on the Azure VM unless otherwise noted.

```bash
docker ps
```

```bash
docker logs backend-api --tail 50
```

```bash
sudo systemctl status nginx
```

Run this from a machine that can reach the deployed API:

```bash
curl -i <API_BASE_URL>/health
```

Optional VM resource checks:

```bash
free -h
```

```bash
df -h
```

Keep command output review focused on whether deployment completed and the service is reachable. Symptom-specific diagnostics should be documented in `docs/06-operations/Troubleshooting-Guide.md`.

## 13. Rollback Notes

Current rollback capability is limited.

The backend workflow pushes and deploys a `latest` image tag. Because formal versioned image tags are not implemented in the current workflow, rollback is not robust by default.

Current realistic options:

1. Revert the problematic commit and push the revert to `main` so the normal workflow redeploys.
2. Re-run a previous successful GitHub Actions workflow if the previous run is available and still checks out/builds the intended commit.
3. Manually redeploy a previous image only if a usable previous image digest or tag is available in GHCR.

Frontend rollback depends on Vercel's project deployment history and permissions. Use Vercel's deployment rollback controls only if available in the configured Vercel project.

Recommended future improvement: add immutable image tags such as commit SHA tags, document digest-based rollback, and keep a short rollback procedure tied to GHCR image history.

## 14. Known Deployment Limitations

- No formal staging or QA deployment environment was found.
- Backend rollback is limited because the workflow deploys `latest`.
- Database migration is manual or requires verification; no workflow migration stage exists.
- Backend deployment targets a single Azure VM.
- No Infrastructure as Code was found for recreating cloud resources.
- Limited monitoring or alerting is documented in the repository.
- Deployment depends on GitHub Actions availability.
- Deployment depends on Azure VM SSH availability.
- Production media upload configuration requires verification because workflow/docs use `AZURE_STORAGE_MEMORIES_CONTAINER`, while backend implementation reads `AZURE_STORAGE_MEDIA_CONTAINER`.
- The frontend Vercel project settings are documented, but the live Vercel dashboard configuration is not verifiable from the repository.

## 15. Verification Notes

### Directly Supported by Existing Cloud Deployment Documentation

- Production frontend is hosted on Vercel.
- Production backend runs on an Azure VM with Docker and Nginx.
- PostgreSQL is hosted on Azure Database for PostgreSQL Flexible Server.
- Media is stored in Azure Blob Storage.
- Authentication uses Clerk.
- Backend CI/CD uses GitHub Actions and GHCR.
- The documented backend deployment flow builds a JAR, builds/pushes a Docker image, SSHs to the VM, pulls the image, and restarts the container.
- Existing docs include a manual `pg_dump` / `psql` database migration pattern.

### Verified from Repository Configuration

- `.github/workflows/deploy.yml` triggers on push to `main`.
- The backend workflow uses Java 17, Gradle `bootJar`, Docker build/push, GHCR, SSH deployment, `backend-api`, `--restart unless-stopped`, Docker log rotation flags, and `docker image prune -f`.
- `skill-swap-backend/build.gradle` configures Java 17, Spring Boot, Flyway dependencies/plugin, and fixed JAR name `skill-swap-backend.jar`.
- `skill-swap-backend/Dockerfile` runs the JAR with Eclipse Temurin 17 JRE Alpine and exposes port `8080`.
- `skill-swap-frontend/package.json` defines `npm run build` as `vite build`.
- `skill-swap-frontend/vite.config.ts` sets the frontend output directory to `build`.
- `skill-swap-frontend/vercel.json` provides SPA fallback routing to `/index.html`.
- Backend properties read database, Clerk, and Azure Blob settings from environment placeholders.
- Runtime Flyway is disabled in inspected application property files.
- `/health` exists and returns `204 No Content` when the backend is running.

### Inferred from Implementation

- Manual local Docker image build and push can follow the same Dockerfile and GHCR image pattern as the workflow.
- `./gradlew flywayMigrate` is available through the Gradle Flyway plugin, but production usage is not documented.
- File upload verification should exercise Azure Blob-backed upload flows because the active upload service uses Azure Blob Storage.

### Requires Further Verification

- Live production URLs and current DNS records.
- Current Vercel project build/output settings.
- Exact active Azure Blob container variable used in production.
- Whether all migration/manual SQL changes have been applied to the production database.
- Current Clerk production configuration and enabled OAuth providers.
- Any monitoring, alerting, or backup systems configured outside the repository.
