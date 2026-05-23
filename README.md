# SkillSwap

SkillSwap is a full-stack web platform for the Skill Swap Club at The University of Sydney. It supports workshop discovery, workshop submission, attendance management, admin review, user profiles, notifications, media uploads, and public memory pages for past events.

The repository is split into a React/Vite frontend, a Spring Boot backend, and a current documentation set under `docs/`.

## What It Does

- Public users can browse workshops and memory pages.
- Authenticated users can manage their profile, upload an avatar, submit workshops, join workshops, leave workshops, and read notifications.
- Admin users can review workshop submissions, approve/reject/cancel workshops, upload workshop images, and manage memory content.
- Uploaded media is stored through Azure Blob Storage.
- Authentication uses Clerk on the frontend and JWT/JWKS validation on the backend.
- Backend deployment is automated through GitHub Actions, Docker, GHCR, and an Azure VM.

## Product Experience

SkillSwap is organized around the main workflows a student club needs to run workshops end to end.

| Product area | Route / surface | What it supports | Screenshot slot |
|---|---|---|---|
| Public home / discovery entry | `/explore` | Browse visible workshops and enter the main product experience. | `docs/assets/readme/01-explore.png` |
| Workshop detail | `/explore` detail state | Inspect workshop information, capacity, timing, location/online status, and attendance actions. | `docs/assets/readme/02-workshop-detail.png` |
| Workshop submission | create workshop flow | Authenticated users submit workshop proposals for admin review. | `docs/assets/readme/03-submit-workshop.png` |
| User dashboard | `/dashboard` | Manage profile, avatar, hosted workshops, attended workshops, and account-specific activity. | `docs/assets/readme/04-dashboard.png` |
| Notifications | dashboard / notification surface | Read workshop submission, approval, rejection, cancellation, and admin update notifications. | `docs/assets/readme/05-notifications.png` |
| Admin workshop review | `/admin/workshops` | Review pending submissions, edit workshop details, upload cover images, approve, reject, or cancel workshops. | `docs/assets/readme/06-admin-review.png` |
| Public memory wall | `/memory` | Browse published event memory pages and community highlights. | `docs/assets/readme/07-memory-wall.png` |
| Memory detail | `/memory/<slug>` | Read a published memory page with Markdown content and media. | `docs/assets/readme/08-memory-detail.png` |
| Memory studio | `/admin/memory` | Admin content workflow for draft/published/archived memories, media uploads, and edit locks. | `docs/assets/readme/09-memory-studio.png` |

Add screenshots under `docs/assets/readme/` using the suggested filenames above. The README intentionally lists screenshot slots as paths instead of embedding missing images, so it stays clean before screenshots are committed.

## Tech Stack

| Area | Stack |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Clerk React SDK |
| Backend | Java 17, Spring Boot 3.5, Spring Security, OAuth2 Resource Server, Spring Data JPA, Bean Validation |
| Database | PostgreSQL, JPA/Hibernate, Flyway configuration and SQL migration files |
| Storage | Azure Blob Storage |
| Auth | Clerk session/JWT issuing, Spring Security JWT validation, database-backed role mapping |
| Deployment | Vercel frontend, Dockerized backend on Azure VM, Nginx/TLS, GitHub Actions, GHCR |

## Repository Map

```text
skill-swap-frontend/   React/Vite frontend application
skill-swap-backend/    Spring Boot backend API
docs/                  Current project documentation
.github/workflows/     Backend tests, deployment, and AI review workflows
```

## Documentation

Start with the documentation index:

- [Documentation Index](docs/00-Documentation-Index.md)
- [Project Overview](docs/01-Project-Overview.md)
- [Functional Requirements](docs/02-requirements/Functional-Requirements.md)
- [Non-Functional Requirements](docs/02-requirements/Non-Functional-Requirements.md)
- [System Architecture](docs/03-architecture/System-Architecture.md)
- [Security Design](docs/03-architecture/Security-Design.md)
- [API Documentation](docs/04-api/API-Documentation.md)
- [Local Development Guide](docs/05-development/Local-Development-Guide.md)
- [Deployment Runbook](docs/06-operations/Deployment-Runbook.md)
- [Troubleshooting Guide](docs/06-operations/Troubleshooting-Guide.md)

## Local Development

For the full setup, use the [Local Development Guide](docs/05-development/Local-Development-Guide.md). The commands below are the common path.

### Prerequisites

- Node.js 20+ recommended for the frontend.
- Java 17 for the backend.
- Docker for backend tests, because the test profile uses Testcontainers PostgreSQL.
- PostgreSQL for local backend development unless you point Spring to another dev database.
- Clerk project values for frontend and backend auth.
- Azure Blob Storage configuration only if testing upload flows locally.

### Frontend

```bash
cd skill-swap-frontend
npm install
npm run dev
```

Default local frontend URL:

```text
http://localhost:3000
```

Create `skill-swap-frontend/.env.local` with local frontend values:

```env
VITE_CLERK_PUBLISHABLE_KEY=<CLERK_PUBLISHABLE_KEY>
VITE_API_BASE_URL=http://localhost:8080
VITE_AUTH_REDIRECT_URL=http://localhost:3000/explore
VITE_IMAGE_UPLOAD_MAX_BYTES=10485760
```

### Backend

```bash
cd skill-swap-backend
./gradlew bootRun --args="--spring.profiles.active=dev"
```

On Windows PowerShell:

```powershell
cd skill-swap-backend
.\gradlew.bat bootRun --args="--spring.profiles.active=dev"
```

Create `skill-swap-backend/.env` with local backend values:

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/skill_swap_dev?sslmode=disable
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=<DATABASE_PASSWORD>
DEV_DB_PASSWORD=<DATABASE_PASSWORD>
CLERK_ISSUER_URI=<CLERK_ISSUER_URI>
CLERK_JWKS_URI=<CLERK_JWKS_URI>
CLERK_SECRET_KEY=<CLERK_SECRET_KEY>
AZURE_STORAGE_CONNECTION_STRING=<AZURE_STORAGE_CONNECTION_STRING>
AZURE_STORAGE_MEDIA_CONTAINER=<AZURE_STORAGE_MEDIA_CONTAINER>
AZURE_STORAGE_SAS_DAYS=0
```

Current backend security configuration requires non-blank `CLERK_ISSUER_URI` and `CLERK_JWKS_URI`.

## Build And Test

Frontend build:

```bash
cd skill-swap-frontend
npm run build
```

Backend tests:

```bash
cd skill-swap-backend
./gradlew test
```

Backend deployable JAR:

```bash
cd skill-swap-backend
./gradlew bootJar --no-daemon
```

The backend test suite uses the `test` profile and Testcontainers PostgreSQL, so Docker must be running for `./gradlew test`.

## Deployment Summary

- Frontend: documented as deployed through Vercel's Git integration.
- Backend: GitHub Actions builds a Spring Boot JAR, builds/pushes a Docker image to GHCR, SSHs to the Azure VM, and restarts the `backend-api` container.
- Database: PostgreSQL, documented as Azure Database for PostgreSQL in production docs.
- Media: Azure Blob Storage via `AZURE_STORAGE_CONNECTION_STRING` and `AZURE_STORAGE_MEDIA_CONTAINER`.
- HTTPS/TLS: documented through Nginx and Let's Encrypt/Certbot on the VM.

See the [Deployment Runbook](docs/06-operations/Deployment-Runbook.md) before changing production deployment settings.

## Current Constraints

- No generated OpenAPI spec exists yet; use [API Documentation](docs/04-api/API-Documentation.md) and backend controllers/DTOs as the current API reference.
- Runtime Flyway execution is disabled in inspected application profiles, so schema migration process needs maintainer confirmation.
- Backend test coverage includes security regression and infrastructure tests, but broader API/domain/frontend coverage still needs expansion.
- Live production settings such as Clerk dashboard configuration, DNS, Nginx, Azure firewall rules, Blob container access level, and monitoring require direct environment verification.

## Contributing Workflow

```bash
git pull origin main
git checkout -b <branch-name>
```

Make changes, run the relevant checks, push the branch, and open a pull request. Backend test CI runs on backend changes through `.github/workflows/backend-tests.yml`.
