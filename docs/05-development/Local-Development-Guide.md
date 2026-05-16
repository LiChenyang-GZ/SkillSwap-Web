# Local Development Guide

Last reviewed: 2026-05-15

## 1. Document Purpose

This guide helps developers set up and run SkillSwap locally. It focuses on local onboarding for the React frontend, Spring Boot backend, PostgreSQL database, Clerk authentication, and media upload configuration.

This is not a cloud deployment guide. Production hosting, DNS, TLS, VM setup, and CI/CD details are intentionally summarized only where they affect local development.

Setup instructions below were checked against the repository files. When a step is inferred from implementation rather than directly automated by the repository, it is labelled `Inferred from implementation`. When details are unclear or conflicting, they are labelled `Requires verification`.

## 2. Prerequisites

| Tool or service | Version / requirement | Local requirement | Source |
|---|---:|---|---|
| Node.js | Requires verification. Use Node.js 20+ unless the team confirms another version. `package.json` has no `engines`; locked frontend dependencies include packages requiring Node 20 and Vite allowing Node 18/20/22. | Required for frontend | `skill-swap-frontend/package.json`, `package-lock.json` |
| npm | Requires verification. Use the npm bundled with Node.js 20+. | Required for frontend | `package-lock.json` lockfile v3 |
| Java | 17 | Required for backend | `README.md`, `skill-swap-backend/build.gradle` |
| Gradle | Use Gradle Wrapper 8.14.3 | Required for backend | `skill-swap-backend/gradle/wrapper/gradle-wrapper.properties` |
| PostgreSQL | Requires verification. Local profile points to PostgreSQL at `localhost:5432` and database `skill_swap_dev`; production docs mention PostgreSQL 16.x. | Required unless using an explicitly configured remote/dev database | `application-dev.properties`, database docs |
| Docker | Requires verification for local development. A backend Dockerfile exists, but no `docker-compose.yml` or local Docker service stack was found. | Optional | `skill-swap-backend/Dockerfile` |
| Clerk account / project | Required for real sign-in. Backend has development issuer/JWKS fallback; frontend still requires a Clerk publishable key. | Required for authenticated flows | `main.tsx`, `application.properties` |
| Azure Blob Storage | Required only for local media upload flows unless replaced by a compatible local/test account. | Conditional | `AzureBlobStorageService.java`, `application.properties` |
| Supabase | Not required for normal local upload flow. Supabase storage settings remain for legacy cleanup compatibility and an unused frontend utility. | Conditional / requires verification | `SupabaseStorageService.java`, `src/utils/supabase/supabase.ts` |

## 3. Repository Structure

Only directories that exist in the repository are listed.

| Path | Purpose |
|---|---|
| `skill-swap-frontend` | React 18, TypeScript, Vite frontend. Contains UI screens, services, Clerk setup, Vite config, and frontend environment files. |
| `skill-swap-backend` | Java 17 Spring Boot backend. Contains REST controllers, services, repositories, JPA entities, Gradle build files, Dockerfile, and Spring configuration. |
| `docs` | Current project documentation, including overview, requirements, architecture, API documentation, user/admin guides, and this local development guide. |
| `doc` | Older or supporting technical notes, including cloud deployment, auth implementation notes, AI review docs, and manual SQL scripts. |
| `.github/workflows` | GitHub Actions workflows for backend deployment and AI-assisted PR review. |
| `.github/scripts` | Node.js scripts used by AI review workflows. |

## 4. Initial Setup

Clone the repository:

```bash
git clone <REPOSITORY_URL>
cd SkillSwap-Web
```

Install frontend dependencies:

```bash
cd skill-swap-frontend
npm install
```

Build backend dependencies and compile the backend:

Windows:

```powershell
cd skill-swap-backend
.\gradlew.bat build
```

macOS/Linux:

```bash
cd skill-swap-backend
./gradlew build
```

Notes:

- `build` is documented in `README.md` and supported by the Gradle project.
- `build` runs tests. The current backend test is a Spring context-load test, and the application contains a startup database smoke check. If the database is not configured, backend build/test may fail.
- CI/CD uses `bootJar` to build the deployable JAR. For a compile/package check without the full `build` lifecycle, use the CI-supported task:

Windows:

```powershell
.\gradlew.bat bootJar
```

macOS/Linux:

```bash
./gradlew bootJar
```

## 5. Frontend Local Setup

### Frontend Directory

```bash
cd skill-swap-frontend
```

### Install Command

```bash
npm install
```

`npm install` is documented in the root `README.md`. A `package-lock.json` exists, so the dependency tree is lockfile-based.

### Development Server Command

```bash
npm run dev
```

The `dev` script runs `vite`. Vite is configured to use port `3000` and open the browser automatically.

Default local URL:

```text
http://localhost:3000
```

Source: `skill-swap-frontend/package.json`, `skill-swap-frontend/vite.config.ts`.

### Frontend Environment File

Create a local ignored environment file in `skill-swap-frontend`, for example:

```text
skill-swap-frontend/.env.local
```

Example local values:

```env
VITE_CLERK_PUBLISHABLE_KEY=<CLERK_PUBLISHABLE_KEY>
VITE_API_BASE_URL=http://localhost:8080
VITE_AUTH_REDIRECT_URL=http://localhost:3000/explore
VITE_IMAGE_UPLOAD_MAX_BYTES=10485760
```

Do not store real production secrets in frontend environment files. Any `VITE_` value is browser-visible after build.

### How the Frontend Connects to the Backend Locally

The frontend reads `VITE_API_BASE_URL` from `src/lib/api.ts`.

If `VITE_API_BASE_URL` is not set, the frontend falls back to:

```text
http://localhost:8080
```

The backend CORS configuration allows local frontend origins:

```text
http://localhost:3000
http://127.0.0.1:3000
http://localhost:5173
http://127.0.0.1:5173
```

`5173` appears in CORS and one auth redirect fallback for older/default Vite usage, but the current Vite config serves on `3000`.

### Common Frontend Setup Issues

| Issue | Cause | Fix |
|---|---|---|
| App crashes with `Missing VITE_CLERK_PUBLISHABLE_KEY` | `main.tsx` throws when the Clerk publishable key is missing. | Add `VITE_CLERK_PUBLISHABLE_KEY=<CLERK_PUBLISHABLE_KEY>` to `.env.local` and restart Vite. |
| API calls go to the wrong backend | `VITE_API_BASE_URL` is missing or points to production/another server. | Set `VITE_API_BASE_URL=http://localhost:8080`. |
| OAuth redirect returns to the wrong port | Clerk redirect URL does not match local Vite port. | Configure Clerk and `VITE_AUTH_REDIRECT_URL` for `http://localhost:3000/explore`. |
| Supabase env warnings or future feature issues | `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are typed and read by an unused utility. | Not required for normal current frontend flow; add placeholders only if a feature imports that utility. Requires verification. |

## 6. Backend Local Setup

### Backend Directory

```bash
cd skill-swap-backend
```

### Build Command

Windows:

```powershell
.\gradlew.bat build
```

macOS/Linux:

```bash
./gradlew build
```

CI/CD build artifact command:

Windows:

```powershell
.\gradlew.bat bootJar
```

macOS/Linux:

```bash
./gradlew bootJar
```

### Run Command

Use the local `dev` profile for local development:

Windows:

```powershell
.\gradlew.bat bootRun --args="--spring.profiles.active=dev"
```

macOS/Linux:

```bash
./gradlew bootRun --args="--spring.profiles.active=dev"
```

Default backend URL:

```text
http://localhost:8080
```

Health check:

```bash
curl -i http://localhost:8080/health
```

Expected successful response:

```text
HTTP/1.1 204 No Content
```

### Local Profile

The local profile is `dev`.

Verified profile behavior:

| Setting | `dev` profile behavior | Source |
|---|---|---|
| Database URL | Points to local PostgreSQL database `skill_swap_dev` on port `5432` | `application-dev.properties` |
| Hibernate schema handling | `spring.jpa.hibernate.ddl-auto=none` | `application-dev.properties` |
| Flyway runtime | Disabled | `application-dev.properties` |
| Server port | Inherited as `8080` from default `application.properties` unless overridden by `PORT` | `application.properties` |
| JWT issuer/JWKS | Inherited from default properties, with development Clerk fallback values when env vars are absent | `application.properties` |
| Multipart upload limits | 10 MB file size, 12 MB request size in dev | `application-dev.properties` |

Important: running `bootRun` without `--spring.profiles.active=dev` uses the default application properties, which are production-oriented. Use the `dev` profile for local development.

### Backend Environment File

`build.gradle` loads a backend `.env` file for `bootRun` and `test`, passing keys as environment variables and JVM system properties.

Recommended local file:

```text
skill-swap-backend/.env
```

Example local-only values:

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/skill_swap_dev?sslmode=disable
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=<DATABASE_PASSWORD>
CLERK_ISSUER_URI=<CLERK_ISSUER_URI>
CLERK_JWKS_URI=<CLERK_JWKS_URI>
CLERK_SECRET_KEY=<CLERK_SECRET_KEY>
AZURE_STORAGE_CONNECTION_STRING=<AZURE_STORAGE_CONNECTION_STRING>
AZURE_STORAGE_MEDIA_CONTAINER=<AZURE_STORAGE_MEDIA_CONTAINER>
AZURE_STORAGE_SAS_DAYS=0
```

Requires verification: `application-dev.properties` currently contains concrete local datasource values directly. Prefer local overrides through `.env` or command-line/Spring properties, and do not copy real secrets into documentation.

### Clerk Development Fallback

Supported by code/configuration: if `CLERK_ISSUER_URI` and `CLERK_JWKS_URI` are not set, the backend falls back to a configured Clerk development issuer and JWKS endpoint in `application.properties`.

This fallback only helps the backend validate tokens from that matching Clerk development instance. The frontend still requires `VITE_CLERK_PUBLISHABLE_KEY`, and the Clerk project must be configured to issue tokens accepted by the backend.

Requires verification: frontend code calls `getToken({ template: "signupTemplate" })`. Confirm that the local Clerk project has a JWT template named `signupTemplate` or adjust the frontend/backend token configuration consistently.

### Common Backend Setup Issues

| Issue | Cause | Fix |
|---|---|---|
| Backend starts against the wrong database | `dev` profile was not activated. | Run `bootRun --args="--spring.profiles.active=dev"`. |
| Backend fails during startup DB smoke check | PostgreSQL is not running, database does not exist, credentials are wrong, or schema is missing. | Verify PostgreSQL, datasource settings, and schema setup. |
| Protected API calls return `401` | Missing, expired, or invalid Clerk JWT. | Sign in again, verify Clerk issuer/JWKS, and check token template. |
| Admin APIs return `403` | Local `user_account.role` does not map to admin. | Requires maintainer database role verification. No admin provisioning UI was found. |
| Upload endpoints return storage configuration error | Azure Blob settings are missing. | Add `AZURE_STORAGE_CONNECTION_STRING` and `AZURE_STORAGE_MEDIA_CONTAINER`. |

## 7. Database Local Setup

### Is Local PostgreSQL Required?

For the repository's explicit `dev` profile, yes: local PostgreSQL is expected at:

```text
jdbc:postgresql://localhost:5432/skill_swap_dev?sslmode=disable
```

Source: `skill-swap-backend/src/main/resources/application-dev.properties`.

It is also possible to point the backend at a configured remote/dev PostgreSQL database using Spring datasource overrides. That is supported by Spring Boot and by the production deployment workflow pattern, but the exact local remote database process requires verification.

### Creating the Local Database

Requires verification: no repository script, Docker Compose service, or documented command was found that creates the local `skill_swap_dev` database.

Create the database with your local PostgreSQL tooling before starting the backend. Do not use production credentials locally.

### Schema and Migrations

Verified schema assets:

| Asset | Location | Notes |
|---|---|---|
| Flyway migrations | `skill-swap-backend/src/main/resources/db/migration` | Migration files exist. |
| Schema dump | `skill-swap-backend/src/main/resources/db/schema.sql` | Historical/current snapshot, but docs note it may not include every latest auth mapping change. |
| Manual SQL scripts | `doc/sql` | Manual auth-subject and cleanup scripts exist. |
| Gradle Flyway plugin | `skill-swap-backend/build.gradle` | Configured for local `skill_swap_dev`. |

Runtime Flyway is disabled in all inspected Spring application property files:

```properties
spring.flyway.enabled=false
```

JPA/Hibernate schema behavior:

| Profile | Hibernate schema setting | Meaning |
|---|---|---|
| default | `ddl-auto=validate` | Expects schema to already exist and match entities. |
| `dev` | `ddl-auto=none` | Does not create or update schema. |
| `supabase` | `ddl-auto=update` | Historical/alternate profile. Do not assume this is the current local standard. |

Inferred from implementation: if using Flyway locally, the Gradle plugin provides a `flywayMigrate` task configured for the local database and migrations folder. This requires a reachable local PostgreSQL database and credentials such as `DB_USER` and `DB_PASSWORD` in `skill-swap-backend/.env`.

Windows:

```powershell
.\gradlew.bat flywayMigrate
```

macOS/Linux:

```bash
./gradlew flywayMigrate
```

Requires verification: the current documentation does not clearly state whether local schema setup should use Flyway, `schema.sql`, manual SQL, or an existing prepared database.

## 8. Authentication Setup

SkillSwap uses Clerk on the frontend and Spring Security OAuth2 Resource Server on the backend.

Local authentication requirements:

1. Create or use a Clerk development application.
2. Set `VITE_CLERK_PUBLISHABLE_KEY=<CLERK_PUBLISHABLE_KEY>` for the frontend.
3. Ensure the backend JWT issuer/JWKS settings match the Clerk instance that issues frontend session tokens.
4. Confirm the frontend token template `signupTemplate` exists or update the code/configuration consistently. Requires verification.
5. For admin workflows, ensure the authenticated Clerk user maps to a local `user_account` row with role `admin` or `role_admin`.

Backend development fallback:

- Supported: backend defaults to a development Clerk issuer/JWKS when `CLERK_ISSUER_URI` and `CLERK_JWKS_URI` are absent.
- Not sufficient by itself: frontend still needs `VITE_CLERK_PUBLISHABLE_KEY`, and tokens must be issued by the matching Clerk instance.

No active local username/password login or `/dev` login flow was found. Older local JWT/dev-login code is disabled or documented as deprecated.

## 9. Media / File Upload Setup

Current active upload implementation:

| Upload type | Endpoint | Storage service |
|---|---|---|
| User avatar | `POST /api/v1/users/me/avatar` | Azure Blob Storage |
| Workshop image | `POST /api/v1/admin/workshops/{id}/image` | Azure Blob Storage |
| Memory media | `POST /api/v1/admin/memories/media` | Azure Blob Storage |

Source: upload controllers/services and `AzureBlobStorageService.java`.

Local setup:

```env
AZURE_STORAGE_CONNECTION_STRING=<AZURE_STORAGE_CONNECTION_STRING>
AZURE_STORAGE_MEDIA_CONTAINER=<AZURE_STORAGE_MEDIA_CONTAINER>
AZURE_STORAGE_SAS_DAYS=0
```

Behavior verified from implementation:

- The backend creates the configured blob container if it does not exist.
- The backend returns either a plain blob URL or a read-only SAS URL, depending on `AZURE_STORAGE_SAS_DAYS`.
- Uploads validate that files are images and respect configured/default size limits.
- Supabase storage remains for cleanup compatibility with older URLs, but active upload paths call Azure Blob Storage.

Requires verification:

- No local filesystem media storage fallback was found.
- No Azurite/local Blob emulator configuration was found.
- Production deployment docs/workflow refer to `AZURE_STORAGE_MEMORIES_CONTAINER`, while backend code reads `AZURE_STORAGE_MEDIA_CONTAINER`. Use `AZURE_STORAGE_MEDIA_CONTAINER` for local backend configuration unless the code is changed.

## 10. Environment Variables

### Frontend Local Environment Variables

| Name | Required for local development? | Purpose | Example placeholder value | Source |
|---|---|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Initializes Clerk React SDK. Frontend throws if missing. | `<CLERK_PUBLISHABLE_KEY>` | `src/main.tsx`, `src/vite-env.d.ts` |
| `VITE_API_BASE_URL` | Recommended | Backend API base URL. Falls back to `http://localhost:8080` if missing. | `http://localhost:8080` | `src/lib/api.ts` |
| `VITE_AUTH_REDIRECT_URL` | Recommended for Clerk local redirects | Overrides auth redirect target. | `http://localhost:3000/explore` | `src/lib/authRedirect.ts` |
| `VITE_IMAGE_UPLOAD_MAX_BYTES` | Optional | Frontend image size label/limit. Defaults to 10 MB if absent or invalid. | `10485760` | `src/shared/constants/uploadLimits.ts` |
| `VITE_SUPABASE_URL` | No for current normal flow; requires verification | Read by an unused Supabase utility. | `<SUPABASE_URL>` | `src/utils/supabase/supabase.ts`, `src/vite-env.d.ts` |
| `VITE_SUPABASE_ANON_KEY` | No for current normal flow; requires verification | Read by an unused Supabase utility. Browser-visible. | `<SUPABASE_ANON_KEY>` | `src/utils/supabase/supabase.ts`, `src/vite-env.d.ts` |
| `VITE_SUPABASE_STORAGE_BUCKET` | No; requires verification | Typed but no direct current usage found. | `<SUPABASE_STORAGE_BUCKET>` | `src/vite-env.d.ts` |

Note: non-`VITE_` variables in frontend `.env` files are not exposed to Vite client code.

### Backend Local Environment Variables

| Name | Required for local development? | Purpose | Example placeholder value | Source |
|---|---|---|---|---|
| `SPRING_DATASOURCE_URL` | Recommended override | Local JDBC URL. Useful to avoid relying on checked-in profile values. | `jdbc:postgresql://localhost:5432/skill_swap_dev?sslmode=disable` | Spring Boot override pattern, deploy workflow |
| `SPRING_DATASOURCE_USERNAME` | Recommended override | Local database username. | `<DATABASE_USER>` | Spring Boot override pattern, deploy workflow |
| `SPRING_DATASOURCE_PASSWORD` | Recommended override | Local database password. | `<DATABASE_PASSWORD>` | Spring Boot override pattern, deploy workflow |
| `DB_USER` | Conditional | Used by Gradle Flyway configuration; defaults to `postgres` if absent. | `<DATABASE_USER>` | `build.gradle` |
| `DB_PASSWORD` | Conditional | Used by default datasource placeholder and Gradle Flyway password. | `<DATABASE_PASSWORD>` | `application.properties`, `build.gradle` |
| `PORT` | Optional | Backend server port; defaults to `8080`. | `8080` | `application.properties`, `application-supabase.properties` |
| `CLERK_ISSUER_URI` | Optional for backend startup; recommended for matching local Clerk | JWT issuer. Backend has dev fallback if absent. | `<CLERK_ISSUER_URI>` | `application.properties` |
| `CLERK_JWKS_URI` | Optional for backend startup; recommended for matching local Clerk | JWKS endpoint. Backend has dev fallback if absent. | `<CLERK_JWKS_URI>` | `application.properties` |
| `CLERK_SECRET_KEY` | Requires verification | Backend property exists, but no direct code usage was found beyond configuration. | `<CLERK_SECRET_KEY>` | `application.properties` |
| `AZURE_STORAGE_CONNECTION_STRING` | Required for upload flows | Azure Blob Storage connection string. | `<AZURE_STORAGE_CONNECTION_STRING>` | `application.properties`, `AzureBlobStorageService.java` |
| `AZURE_STORAGE_MEDIA_CONTAINER` | Required for upload flows unless default `media` is acceptable | Azure Blob container name used by backend code. | `<AZURE_STORAGE_MEDIA_CONTAINER>` | `application.properties`, `AzureBlobStorageService.java` |
| `AZURE_STORAGE_SAS_DAYS` | Optional | If greater than 0, returned blob URLs include read-only SAS. | `0` | `application.properties`, `AzureBlobStorageService.java` |
| `VITE_SUPABASE_URL` | Conditional / legacy cleanup | Supabase project URL for legacy storage cleanup. | `<SUPABASE_URL>` | `application.properties`, `SupabaseStorageService.java` |
| `SUPABASE_SERVICE_ROLE_KEY` | Conditional / legacy cleanup | Supabase service role key for legacy storage cleanup. | `<SUPABASE_SERVICE_ROLE_KEY>` | `application.properties`, `SupabaseStorageService.java` |
| `SUPABASE_STORAGE_BUCKET` | Conditional / legacy cleanup | Supabase storage bucket; defaults to `skillswap-media`. | `<SUPABASE_STORAGE_BUCKET>` | `application.properties`, `SupabaseStorageService.java` |
| `SUPABASE_PASSWORD` | Only for `supabase` profile | Database password for historical/alternate Supabase profile. | `<SUPABASE_PASSWORD>` | `application-supabase.properties` |
| `JWT_HS256_SECRET` | No for current auth flow | Historical/commented JWT config only. | `<JWT_HS256_SECRET>` | Commented config/docs; old auth code disabled |

### Production-Only / Deployment Variables

These are not required to run the application locally unless you are testing deployment automation.

| Name | Required for local development? | Purpose | Example placeholder value | Source |
|---|---|---|---|---|
| `AZURE_VM_IP` | No | GitHub Actions SSH target for backend deployment. | `<AZURE_VM_IP>` | `.github/workflows/deploy.yml` |
| `AZURE_VM_USER` | No | GitHub Actions SSH user. | `<AZURE_VM_USER>` | `.github/workflows/deploy.yml` |
| `SSH_PRIVATE_KEY` | No | GitHub Actions SSH private key secret. | `<SSH_PRIVATE_KEY>` | `.github/workflows/deploy.yml` |
| `DB_URL` | No | GitHub Actions secret mapped to `SPRING_DATASOURCE_URL` in the deployed container. | `<DATABASE_URL>` | `.github/workflows/deploy.yml` |
| `DB_USERNAME` | No | GitHub Actions secret mapped to `SPRING_DATASOURCE_USERNAME`. | `<DATABASE_USER>` | `.github/workflows/deploy.yml` |
| `DB_PASSWORD` | No as production value | GitHub Actions secret mapped to `SPRING_DATASOURCE_PASSWORD`. Use a separate local value for development. | `<DATABASE_PASSWORD>` | `.github/workflows/deploy.yml` |
| `AZURE_STORAGE_MEMORIES_CONTAINER` | No; requires verification | Deployment workflow sets this name, but backend code reads `AZURE_STORAGE_MEDIA_CONTAINER`. | `<AZURE_STORAGE_MEDIA_CONTAINER>` | `.github/workflows/deploy.yml`, `application.properties` |
| `OPENAI_API_KEY` | No | AI review workflow secret. | `<OPENAI_API_KEY>` | `.github/workflows/ai-pr-review.yml`, `ai-review-inline.yml` |
| `ANTHROPIC_API_KEY` | No | AI review workflow secret. | `<ANTHROPIC_API_KEY>` | `.github/workflows/ai-pr-review.yml`, `ai-review-inline.yml` |
| `VITE_API_BASE_URL` | No as production value | Frontend production API URL, configured by hosting provider. Use local `http://localhost:8080` for local development. | `<API_BASE_URL>` | frontend code, cloud docs |
| `VITE_CLERK_PUBLISHABLE_KEY` | No as production value | Production Clerk publishable key. Use a development key locally. | `<CLERK_PUBLISHABLE_KEY>` | frontend code, cloud docs |

## 11. Running the Full Application Locally

1. Start PostgreSQL.

   The repository does not include a Docker Compose service or database creation script. Ensure a PostgreSQL database named `skill_swap_dev` exists, or override datasource settings to point at your chosen development database.

2. Prepare backend environment.

   Add local backend configuration to `skill-swap-backend/.env` or provide equivalent environment variables. Do not use production secrets.

3. Start the backend with the `dev` profile.

   Windows:

   ```powershell
   cd skill-swap-backend
   .\gradlew.bat bootRun --args="--spring.profiles.active=dev"
   ```

   macOS/Linux:

   ```bash
   cd skill-swap-backend
   ./gradlew bootRun --args="--spring.profiles.active=dev"
   ```

4. Verify backend health.

   ```bash
   curl -i http://localhost:8080/health
   ```

   Expect `204 No Content`.

5. Prepare frontend environment.

   Add local frontend configuration to `skill-swap-frontend/.env.local`.

6. Start the frontend.

   ```bash
   cd skill-swap-frontend
   npm run dev
   ```

7. Open the frontend.

   ```text
   http://localhost:3000
   ```

8. Verify login and API connection.

   - Public pages should load without login.
   - Sign in through Clerk.
   - Confirm the frontend can call `GET /api/v1/users/me`.
   - Check the browser network tab for API requests to `http://localhost:8080`.
   - For upload flows, confirm Azure Blob configuration is present.

## 12. Running Tests

### Frontend Tests

No frontend test script was found in `skill-swap-frontend/package.json`.

Unsupported commands:

```bash
npm test
```

Do not document or rely on a frontend test command until one is added to `package.json`.

### Backend Tests

Backend test command:

Windows:

```powershell
cd skill-swap-backend
.\gradlew.bat test
```

macOS/Linux:

```bash
cd skill-swap-backend
./gradlew test
```

Current test coverage:

- One Spring Boot context-load test exists at `src/test/java/club/skillswap/SkillSwapBackendApplicationTests.java`.
- `build.gradle` configures JUnit Platform.
- Requires verification: because the application context includes datasource configuration and a startup DB smoke check, tests may require a valid database configuration.

## 13. Code Quality and Build Commands

### Frontend

| Command | Supported? | Purpose | Source |
|---|---|---|---|
| `npm run dev` | Yes | Start Vite dev server. | `package.json` |
| `npm run build` | Yes | Build frontend. Vite output directory is `build`. | `package.json`, `vite.config.ts` |
| `npm run preview` | Yes | Preview built frontend with Vite preview. | `package.json` |
| `npm run build:now` | Yes | Alias for `vite build`. | `package.json` |
| `npm run deploy` | Requires verification | Script uses Unix commands and references `dist`, while Vite output is configured as `build`. Treat as deployment-related and not part of local onboarding. | `package.json`, `vite.config.ts` |
| `npm run lint` | No | No lint script found. | `package.json` |
| `npm run format` | No | No format script found. | `package.json` |
| `npm run typecheck` | No | TypeScript is installed, but no type-check script exists. | `package.json` |
| `npm test` | No | No test script found. | `package.json` |

### Backend

| Command | Supported? | Purpose | Source |
|---|---|---|---|
| `.\gradlew.bat bootRun --args="--spring.profiles.active=dev"` | Yes on Windows | Run backend locally with dev profile. | `README.md`, Gradle Spring Boot plugin |
| `./gradlew bootRun --args="--spring.profiles.active=dev"` | Yes on macOS/Linux | Run backend locally with dev profile. | `README.md`, Gradle Spring Boot plugin |
| `.\gradlew.bat build` / `./gradlew build` | Yes | Compile, test, and build. | `README.md`, `build.gradle` |
| `.\gradlew.bat test` / `./gradlew test` | Yes | Run backend tests. | `build.gradle` |
| `.\gradlew.bat bootJar` / `./gradlew bootJar` | Yes | Build deployable backend JAR. Used by CI/CD. | `build.gradle`, `.github/workflows/deploy.yml` |
| `.\gradlew.bat flywayMigrate` / `./gradlew flywayMigrate` | Inferred from implementation | Run Flyway migrations using Gradle plugin config. Requires DB setup and verification. | `build.gradle` |

## 14. Troubleshooting Local Setup

| Issue | Symptom | Likely cause | Diagnostic step | Fix |
|---|---|---|---|---|
| Frontend cannot reach backend | Browser network requests fail or show connection refused. | Backend is not running, wrong `VITE_API_BASE_URL`, or wrong port. | Check browser network tab and run `curl -i http://localhost:8080/health`. | Start backend on port `8080` or set `VITE_API_BASE_URL` to the actual backend URL. |
| CORS issue | Browser blocks API request with CORS error. | Frontend origin is not in backend allowed origins. | Confirm frontend URL is `http://localhost:3000` or `http://127.0.0.1:3000`. | Use the configured Vite port `3000`, or update CORS deliberately if the local port changes. |
| Backend fails to start | Gradle run exits during Spring Boot startup. | Database unavailable, wrong profile, missing JWT config, or schema mismatch. | Check backend logs and confirm `--spring.profiles.active=dev` is present. | Start PostgreSQL, verify datasource settings, activate `dev`, and ensure schema exists. |
| Database connection failed | Backend logs show connection refused/authentication failed or DB smoke check fails. | PostgreSQL not running, database missing, or credentials wrong. | Connect using your PostgreSQL client to `localhost:5432` and database `skill_swap_dev`. | Create/configure a local dev database and use local credentials. Requires verification because no repo DB creation script exists. |
| Schema validation/query failure | Backend starts but API calls fail with missing table/column errors. | Schema not applied or migrations/manual SQL not run. | Compare active DB schema with `db/migration`, `db/schema.sql`, and current entities. | Apply the agreed local schema process. Requires verification because runtime Flyway is disabled. |
| Authentication/JWT validation failed | Protected endpoints return `401`. | Token issuer/JWKS does not match backend config, token expired, or Clerk template missing. | Inspect backend JWT config and confirm frontend Clerk project. | Use matching `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_ISSUER_URI`, and `CLERK_JWKS_URI`; verify `signupTemplate`. |
| Admin access denied | Admin screen loads but API returns `403`. | Local user role is not `admin` or `role_admin`. | Call `/api/v1/users/me` and inspect role in response. | Update local database role through an approved maintainer process. No admin role UI exists. |
| Missing environment variable | Frontend crashes or backend property is blank. | Required local env var not set or dev server was not restarted after editing `.env`. | Check `.env.local` or `.env` variable names. | Add the variable using placeholders for docs, real local dev values in ignored files, then restart the process. |
| Blob upload failed | Avatar/workshop/memory upload returns storage error or `502`. | Missing/invalid Azure Blob connection string or container setting. | Check backend logs for Azure Blob errors. | Set `AZURE_STORAGE_CONNECTION_STRING` and `AZURE_STORAGE_MEDIA_CONTAINER`; confirm storage account access. |
| File too large | Upload returns `413` or validation error. | File exceeds frontend/backend upload limits. | Compare file size to 10 MB default and multipart limits. | Use a smaller image or adjust local limits consistently. |
| Port already in use | Vite or Spring Boot cannot bind to port. | Another process uses `3000` or `8080`. | Check running processes for the port. | Stop the process or configure a different port. If changing frontend port, verify CORS and auth redirects. |
| Gradle cannot download dependencies | Gradle wrapper or dependencies fail to resolve. | Network/proxy/cache issue. | Check Gradle error output and local network access. | Restore network access or use an existing Gradle cache. |

## 15. Local vs Production Differences

| Area | Local development | Production / deployment |
|---|---|---|
| Frontend hosting | Vite dev server on `http://localhost:3000`. | Static hosting through Vercel according to deployment docs. |
| Backend runtime | Gradle `bootRun` with `dev` profile. | Dockerized Spring Boot JAR behind reverse proxy according to deployment docs/workflow. |
| Database | Local PostgreSQL profile points to `localhost:5432/skill_swap_dev`, or a configured dev database. | Managed PostgreSQL with deployment secrets. Do not use production credentials locally. |
| Schema | Requires verification. Migrations and schema scripts exist, but runtime Flyway is disabled. | Requires verification. Deployment docs describe operational DB migration/import separately. |
| Authentication | Clerk development project/key, backend dev issuer/JWKS fallback if env vars are absent. | Clerk production project and production issuer/JWKS values injected by deployment systems. |
| Blob storage | Azure Blob configuration needed only for local upload testing. No local storage fallback found. | Azure Blob Storage configured through deployment secrets. |
| Environment variables | Local ignored `.env.local` and `.env` files. | Vercel/GitHub Actions/runtime secrets. |
| HTTPS/TLS | Local HTTP unless developer adds their own TLS setup. | HTTPS through hosting/reverse proxy according to deployment docs. |
| CORS | Allows localhost and 127.0.0.1 on ports `3000` and `5173`. | Allows configured deployed frontend origins in code. |

## 16. Verification Checklist

Use this checklist after setup:

- [ ] Frontend dependencies install with `npm install`.
- [ ] Frontend starts with `npm run dev`.
- [ ] Frontend opens at `http://localhost:3000`.
- [ ] Backend starts with `bootRun --args="--spring.profiles.active=dev"`.
- [ ] Backend health check returns `204 No Content` from `/health`.
- [ ] PostgreSQL connection succeeds during backend startup.
- [ ] Database schema supports the current JPA entities.
- [ ] Clerk sign-in works in the frontend.
- [ ] `GET /api/v1/users/me` succeeds after login.
- [ ] Public workshop and memory APIs load.
- [ ] Admin APIs work for a local user whose database role is admin.
- [ ] Avatar upload works if Azure Blob local config is present.
- [ ] Workshop/memory image upload works if testing admin media flows.

## 17. Known Limitations and Assumptions

### Requires Verification

- Exact supported Node.js version, because no top-level `engines` field exists.
- Exact local PostgreSQL version.
- Official local database creation command, because no repo script or Docker Compose service was found.
- Official local schema setup process, because migrations and schema files exist but runtime Flyway is disabled.
- Whether local developers should use Flyway, `schema.sql`, manual SQL, or a prepared database.
- Clerk JWT template `signupTemplate` setup.
- Admin role provisioning process for local databases.
- Whether `CLERK_SECRET_KEY` is needed by current backend code, because no direct code usage was found beyond property configuration.
- Exact production Azure Blob container variable naming, because workflow/docs and backend properties differ.
- Frontend `npm run deploy`, because it references `dist` while Vite outputs `build`.

### Inferred from Implementation

- Local database name `skill_swap_dev` is the intended local DB because the `dev` profile points to it.
- Gradle `flywayMigrate` can be used locally because the Flyway plugin and local migration config exist.
- Supabase storage is legacy cleanup compatibility rather than the active upload target.
- Local media uploads require a real or compatible Azure Blob configuration because no local storage fallback was found.

### Missing Automation or Improvements

- Add a checked-in `.env.example` for frontend and backend with placeholders only.
- Remove concrete local credentials from tracked application properties and rely on local overrides.
- Add a local Docker Compose file for PostgreSQL if the team wants one-command onboarding.
- Clarify and automate schema setup.
- Add frontend test/lint/type-check scripts.
- Add stronger backend tests beyond context load.
- Align Azure Blob container environment variable names across backend code, docs, and workflow.
- Avoid printing sensitive configuration previews from build/runtime tasks.

## 18. Verification Notes

### Directly Verified from Repository Files

- Frontend scripts from `skill-swap-frontend/package.json`: `dev`, `build`, `preview`, `build:now`, `deploy`.
- Frontend port and output directory from `skill-swap-frontend/vite.config.ts`: dev server port `3000`, build output `build`.
- Frontend environment usage from `src/main.tsx`, `src/lib/api.ts`, `src/lib/authRedirect.ts`, `src/shared/constants/uploadLimits.ts`, `src/utils/supabase/supabase.ts`, and `src/vite-env.d.ts`.
- Backend Java version, dependencies, Gradle wrapper, `bootRun`, `test`, `bootJar`, `.env` loading, and Flyway plugin config from `skill-swap-backend/build.gradle` and Gradle wrapper properties.
- Backend application profiles from `application.properties`, `application-dev.properties`, and `application-supabase.properties`.
- Database schema evidence from `src/main/resources/db/migration`, `src/main/resources/db/schema.sql`, and `doc/sql`.
- Authentication/security from `WebSecurityConfiguration.java`, `JwtConverter.java`, frontend Clerk code, and auth docs.
- CORS from `CorsConfig.java`.
- Health check from `HealthController.java`.
- Media upload behavior from upload controllers/services and `AzureBlobStorageService.java`.
- Tests from `src/test/java/club/skillswap/SkillSwapBackendApplicationTests.java`.
- CI/CD build command from `.github/workflows/deploy.yml`.
- Deployment context from `doc/cloud`, without copying production secrets or connection strings.

### Inferred Details

- Local developers should run the backend with `--spring.profiles.active=dev` because the default properties are production-oriented.
- Local schema setup needs an explicit maintainer decision despite available migrations and schema assets.
- Local upload testing needs Azure Blob-compatible configuration because the active upload service requires it at upload time.

### Details Requiring Further Verification

- Canonical Node/npm versions.
- Canonical local database bootstrap and migration process.
- Whether backend tests should use a test profile or test container in future.
- Clerk local template/claims configuration.
- Production storage container variable name alignment.
- Whether existing `.env` files should be replaced with `.env.example` templates for onboarding.
