# SkillSwap Project Overview

## 1. Project Summary

SkillSwap is a full-stack web platform for the Skill Swap Club at The University of Sydney. The application supports skill-sharing workshop discovery, workshop submission and attendance, administrative review of submitted workshops, user profile management, notifications, and public event memory pages.

The repository is structured as a decoupled React frontend and Spring Boot backend:

- `skill-swap-frontend`: React 18, TypeScript, Vite, Tailwind CSS, Clerk authentication, and feature-based UI modules.
- `skill-swap-backend`: Java 17, Spring Boot 3, Spring Security, JPA/Hibernate, PostgreSQL, JWT validation, role-based admin access, and media storage services.
- `.github/workflows`: backend deployment automation and AI-assisted PR review workflows.
- `doc`: cloud deployment, authentication, AI review, and refactor planning documentation.

This overview has been reviewed against the current source code, build configuration, GitHub Actions workflows, and existing documentation. Where a detail is inferred from product flow rather than directly proven by a running environment, it is marked as inferred.

## 2. Business Problem / User Need

Skill-sharing clubs need a lightweight way to coordinate workshops without relying on scattered forms, chat messages, and manually maintained event pages. The platform centralizes the workflow from workshop submission to public discovery, giving the club a clearer operating model for content review, attendance, and post-event knowledge retention.

The current implementation addresses these needs through:

- A public workshop catalogue and workshop detail pages.
- Authenticated workshop creation and attendance actions.
- Admin review tools for submitted workshops.
- Notifications for workshop submission, approval, rejection, cancellation, and admin updates.
- Public memory pages for preserving event outcomes and community content.

Inferred product need: the system is designed to reduce manual coordination overhead for club operators and make workshop information easier for students to find and act on.

## 3. Target Users

- Students and club members who browse upcoming workshops and view event memory pages.
- Authenticated users who submit workshops, manage their own hosted workshops, and join or leave workshops.
- Admin users who review, approve, reject, cancel, update, and upload images for workshops.
- Admin users who create and maintain memory pages through the memory studio.
- Technical maintainers who operate the backend deployment, environment configuration, and CI/CD workflows.

## 4. Core Features

### Workshop Discovery And Participation

- Public workshop listing through `/api/v1/workshops/public`.
- Public workshop detail retrieval through `/api/v1/workshops/{id}` with visibility checks for restricted statuses.
- Authenticated user workshop lists for hosted workshops and attending workshops.
- Workshop join and leave operations with capacity checks and attendance close-time validation.
- Lifecycle-aware status resolution for approved workshops, including upcoming, ongoing, and completed states.

### Workshop Submission And Admin Review

- Authenticated workshop creation, defaulting new workshops to `pending`.
- Admin review endpoints for listing all workshops, listing pending workshops, viewing details, updating pending workshop content, approving, rejecting, cancelling, and uploading workshop images.
- Role-based admin checks based on `user_account.role` and Spring Security authorities.
- Review metadata stored on workshops, including reviewed-by, reviewed-at, review comment, approved-at, image URL, USU approval status, and hidden-by-host state.

### Authentication And User Profiles

- Frontend authentication through Clerk React SDK.
- Backend JWT verification through Spring Security OAuth2 Resource Server and JWKS configuration.
- Local user mapping using `user_account.auth_subject` and `auth_provider`, supporting non-UUID external identity subjects such as Clerk user IDs.
- User profile endpoints for current-user profile, profile updates, avatar upload, and user skills.
- User stats for hosted and attended workshop counts.

### Notifications

- Notification persistence in the `notifications` table.
- User endpoints for listing notifications, unread count, marking one notification as read, and marking all notifications as read.
- Notifications generated for workshop submissions, approval/rejection decisions, admin updates, and cancellations.

### Memory Pages

- Public memory listing and public memory detail by slug.
- Admin memory studio APIs for creating, updating, deleting, publishing, archiving, and uploading media.
- Markdown-oriented memory content model with title, slug, cover URL, content, media URLs, status, published timestamp, and author/update metadata.
- Current concurrency control is based on draft edit locks with an owner and expiry time. The repository contains historical migrations that added a `version` column, but a later migration removes it and the current entity/DTO do not expose version-based optimistic locking.

### Media Uploads

- Azure Blob Storage service for memory media, workshop images, and user avatars.
- Supabase Storage service remains in the codebase for compatibility/cleanup of older public URLs.
- Upload validation includes image-only checks and configurable maximum image size.

### Engineering Operations

- Backend Dockerfile packages the Spring Boot JAR into an Eclipse Temurin Java 17 runtime image.
- GitHub Actions backend deployment workflow builds the Gradle boot JAR, builds and pushes a Docker image to GHCR, and redeploys the container on an Azure VM over SSH.
- AI-assisted PR review workflows can be triggered from PR comments for inline review or summary review using OpenAI or Claude APIs.

## 5. Technical Stack

| Layer | Technologies Verified In Repository |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Radix UI components, Clerk React SDK, React Markdown, remark/rehype plugins, Sonner |
| Backend | Java 17, Spring Boot 3.5, Spring Web, Spring Security, OAuth2 Resource Server, Spring Data JPA, Hibernate, Bean Validation, Lombok |
| Database | PostgreSQL, JPA repositories, Flyway configuration and SQL migrations |
| Storage | Azure Blob Storage SDK, Supabase Storage compatibility service |
| Authentication | Clerk on the frontend; JWT/JWKS verification in the backend; role mapping from PostgreSQL |
| CI/CD | GitHub Actions, Gradle, Docker, GitHub Container Registry, SSH deployment to Azure VM |
| Deployment Docs | Vercel frontend hosting; Azure VM backend; Azure PostgreSQL; Azure Blob Storage; Nginx; Let's Encrypt/Certbot |

## 6. High-Level Architecture

```text
User Browser
  |
  | React SPA, Clerk session token
  v
Vercel-hosted frontend
  |
  | HTTPS API calls with Authorization: Bearer <JWT>
  v
Nginx reverse proxy on Azure VM
  |
  v
Dockerized Spring Boot backend
  |
  |-- PostgreSQL for users, workshops, participants, notifications, memories
  |-- Azure Blob Storage for uploaded media
  |-- Clerk JWKS endpoint for JWT verification
```

Backend deployment flow:

```text
push to main
  |
  v
GitHub Actions
  |
  |-- Set up JDK 17
  |-- Run Gradle bootJar
  |-- Build Docker image
  |-- Push image to GHCR
  |-- SSH to Azure VM
  |-- Pull latest image and restart backend-api container
```

The frontend is documented as deployed through Vercel's Git integration. The backend is documented as deployed to an Azure VM behind Nginx and TLS, with PostgreSQL and Blob Storage hosted on Azure.

## 7. My Contribution

Based on the repository and documentation, the project contribution can be described as full-stack and operational rather than only UI delivery:

- Built and maintained a React/Spring Boot platform for workshop discovery, workshop submission, attendance, admin moderation, user profiles, notifications, and event memories.
- Implemented or documented admin-oriented review workflows for submitted workshops, including status transitions, review metadata, restricted visibility, and role-based access control.
- Built Markdown-based memory page workflows with public pages and an admin memory studio.
- Implemented the current memory editing safety model using draft edit locks with owner and expiry handling.
- Integrated Clerk authentication with backend JWT verification and database-backed role mapping.
- Integrated Azure Blob Storage for uploaded media while retaining cleanup compatibility for historical Supabase-hosted media URLs.
- Added backend deployment automation with GitHub Actions, Docker, GHCR, and Azure VM redeployment.
- Designed repository-level AI-assisted PR review workflows with context-first inline review, strict/normal policies, diff truncation awareness, and fallback comment behavior.
- Produced technical and operational documentation covering authentication, deployment, CI/CD, AI review usage, and implementation/refactor planning.

Note: the current code does not support a claim of active version-based optimistic locking for memory edits. The supported current claim is draft edit-lock based concurrency control.

## 8. Documentation And Operational Work Completed

Existing repository documentation supports the resume positioning around technical and operational handover work. User/admin workflows are represented through the implemented product flows and this overview, but no current standalone end-user manual was found in the active documentation set reviewed.

- `doc/cloud/SkillSwap-Cloud-Deployment.md` documents cloud architecture, Azure resources, Vercel frontend deployment, Nginx/TLS, DNS, CI/CD, environment variables, deployment runbook, VM resource management, and architecture decisions.
- `doc/cloud/SkillSwap-README-Deployment.md` provides a shorter operational deployment summary.
- `doc/cloud/SkillSwap-Deployment-Interview.md` provides a concise architecture and deployment explanation suitable for interview or portfolio discussion.
- `doc/DEV_AUTH_IMPLEMENTATION.md` and `doc/DEV_LOGIN_IMPLEMENTATION.md` clarify the current Clerk-based authentication flow and explicitly deprecate older `/dev` login/JWT flows.
- `doc/AI_REVIEW_GUIDE.md` documents the AI PR review trigger commands, permissions, review modes, model selection, strict/normal policies, required secrets, and troubleshooting.
- `doc/sql` and `skill-swap-backend/src/main/resources/db/migration` contain database change scripts and migrations for auth subject support, workshop review flow, notifications, user roles, memory pages, edit locks, and hidden workshop states.

Operationally, the repository includes:

- Backend Docker packaging.
- GitHub Actions backend deployment automation.
- Environment-variable based runtime configuration for database, Clerk, and storage credentials.
- Runbook-style deployment instructions and fallback manual deployment steps.
- Troubleshooting guidance for AI review workflows and local authentication.

API contract caveat: the current REST contracts are verifiable from controllers, DTOs, frontend service modules, and migrations. Earlier standalone API documentation files appear to be absent from the current working tree, so this overview does not claim that a current, complete API reference document exists.

## 9. Current Deployment Status

The current deployment status is verified from repository documentation and workflow configuration, not by live environment inspection.

- Frontend: documented as hosted on Vercel with SPA routing support through `vercel.json`.
- Backend: documented as a Dockerized Spring Boot service running on an Azure VM behind Nginx and HTTPS/TLS.
- Database: documented as Azure Database for PostgreSQL Flexible Server. The backend is configured for PostgreSQL through Spring Data JPA.
- Object storage: Azure Blob Storage is implemented in the backend and documented for uploaded media.
- Authentication: current docs and code indicate Clerk login on the frontend and backend JWT/JWKS validation.
- CI/CD: `.github/workflows/deploy.yml` triggers on pushes to `main`, builds the backend JAR, pushes a Docker image to GHCR, and redeploys over SSH.
- PR review operations: `.github/workflows/ai-review-inline.yml` and `.github/workflows/ai-pr-review.yml` provide comment-triggered AI review workflows.

Deployment caveat for handover: the backend reads the Azure Blob container from `AZURE_STORAGE_MEDIA_CONTAINER`, while the deployment workflow and cloud docs refer to `AZURE_STORAGE_MEMORIES_CONTAINER`. Unless another production override exists outside the repository, this naming mismatch should be aligned so the intended container is used consistently.

## 10. Limitations And Future Improvements

- Add stronger automated test coverage. The backend currently contains a basic Spring context-load test, but the repository does not show broad unit, integration, API contract, or frontend test coverage.
- Align deployment configuration names for Azure Blob container selection across backend properties, GitHub Actions, and documentation.
- Decide whether memory editing should remain lock-based or reintroduce version-based optimistic locking. The current source supports edit locks, while historical migrations show a removed `version` column.
- Reconcile outdated documentation paths and older auth references. The current docs indicate Clerk is the active flow and older dev login/JWT flows are deprecated.
- Improve configuration hygiene before public handover by reviewing environment-specific values in property files and ensuring secrets are only supplied through environment variables or secret stores.
- Add API contract documentation generated from the current controllers/DTOs, such as OpenAPI, to reduce drift between implementation and hand-written docs.
- Clarify the database migration strategy because SQL migrations and Flyway configuration exist, while application profiles currently disable Flyway at runtime.
- Add frontend CI checks for TypeScript, build, and lint/test coverage if not already handled outside the repository.
- Add observability and rollback procedures for production operations, such as health checks, structured logs, deployment verification steps, and documented rollback commands.
- Consider managed container hosting in future if operational load grows beyond what a single VM can comfortably support.
- Complete or remove unfinished product areas, such as the placeholder feedback/reviews page and disabled credit system.

## Professional Relevance

### Consulting Relevance

- Requirements analysis: translates club operations into product workflows for discovery, submission, moderation, attendance, and memory preservation.
- Documentation: includes architecture, authentication, deployment, CI/CD, AI review usage, environment configuration, and runbook-style operational guidance.
- Stakeholder-facing workflows: supports students, workshop hosts, admins, and maintainers with distinct flows and permissions.
- Operational readiness: documents cloud infrastructure, deployment automation, secrets, VM resource considerations, and troubleshooting paths.
- Risk and deployment planning: captures trade-offs around Clerk, Vercel, Azure VM hosting, Blob Storage, Nginx/TLS, GHCR, and fallback manual deployment.

### Software Engineering Relevance

- Full-stack implementation: React/TypeScript frontend integrated with a Spring Boot backend and PostgreSQL persistence.
- REST API design: controller/service/repository boundaries for workshops, users, notifications, memories, and admin operations.
- Cloud deployment: Vercel frontend, Dockerized backend on Azure VM, Azure PostgreSQL, Azure Blob Storage, Nginx, and HTTPS/TLS.
- CI/CD: GitHub Actions workflow for Gradle build, Docker image publication to GHCR, and remote redeployment.
- Authentication and storage integration: Clerk JWT validation, database-backed role mapping, Azure Blob media uploads, and compatibility handling for older Supabase media URLs.

## Evidence Reviewed

- Frontend source structure, routing, service modules, and type models under `skill-swap-frontend/src`.
- Frontend build/deployment configuration in `skill-swap-frontend/package.json`, `vite.config.ts`, and `vercel.json`.
- Backend build/runtime configuration in `skill-swap-backend/build.gradle`, `Dockerfile`, and `src/main/resources/application*.properties`.
- Backend controllers, services, repositories, entities, DTOs, and migrations under `skill-swap-backend/src/main`.
- Existing cloud, authentication, AI review, and SQL documentation under `doc`.
- CI/CD and AI review workflow files under `.github/workflows` and scripts under `.github/scripts`.
