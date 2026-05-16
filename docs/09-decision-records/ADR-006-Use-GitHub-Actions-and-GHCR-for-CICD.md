# ADR-006: Use GitHub Actions and GHCR for CI/CD

## Status
Accepted

## Date
2026-05-15

## Context
SkillSwap needs a repeatable way to build and deploy the Spring Boot backend. The backend is packaged as a Docker image and runs on an Azure VM. The repository already lives on GitHub, so repository-integrated automation is a natural fit.

Repository evidence:

- `.github/workflows/deploy.yml` triggers on pushes to `main`.
- The workflow checks out code, installs Java 17, runs Gradle `bootJar`, logs in to GHCR, builds and pushes the backend Docker image, and deploys to the Azure VM over SSH.
- GHCR authentication uses the GitHub-provided `GITHUB_TOKEN`.
- The workflow deploys the `latest` image tag and restarts the `backend-api` container on the VM.
- The workflow injects database, Azure Blob Storage, and Clerk runtime configuration into the container from GitHub Actions secrets.

## Decision
We decided to use GitHub Actions for backend build/deploy automation and GitHub Container Registry for backend Docker image storage.

On pushes to `main`, the backend JAR is built, a Docker image is published to GHCR, and the Azure VM pulls and runs the image.

## Rationale
- GitHub Actions is integrated with the repository and does not require operating a separate CI server.
- GHCR is integrated with GitHub and can authenticate using `GITHUB_TOKEN`.
- Docker image publication standardizes the backend deployment artifact.
- SSH deployment matches the current Azure VM hosting model.
- The workflow reduces manual artifact transfer and manual container restart steps.
- The approach is simple enough for the project's current scale and easy to explain during handover.

## Alternatives Considered
- Manual deployment
  - Why considered: Existing docs include manual fallback patterns for emergency or CI outage scenarios.
  - Why not selected: Manual deployment is more error-prone, slower, and less repeatable than an automated workflow.
  - Source status: Explicitly documented fallback, not the standard path.

- Docker Hub
  - Why considered: It is a common public/private container registry.
  - Why not selected: GHCR avoids a separate registry account/token and is directly integrated with GitHub permissions and `GITHUB_TOKEN`.
  - Source status: Explicitly documented comparison.

- Azure DevOps Pipelines and Azure Container Registry
  - Why considered: They would align with Azure infrastructure.
  - Why not selected: They would add another CI/CD system and registry while the current GitHub/GHCR flow is already implemented.
  - Source status: Reasonable inferred alternative.

- Jenkins
  - Why considered: It is a flexible self-hosted CI/CD option.
  - Why not selected: Operating Jenkins would add maintenance burden that is not justified for the current project.
  - Source status: Reasonable inferred alternative.

- Vercel-only deployment
  - Why considered: Vercel already handles frontend deployment.
  - Why not selected: The backend is a Dockerized Spring Boot service deployed to an Azure VM, which is outside Vercel's documented frontend-only role in this project.
  - Source status: Reasonable inferred alternative.

## Consequences
### Positive Consequences
- Backend deployment is triggered from the repository's main branch.
- Build and deployment steps are visible in GitHub Actions logs.
- GHCR stores the backend Docker image using the same GitHub account/repository ecosystem.
- Secrets are referenced through GitHub Actions secrets instead of being committed to source code.
- The workflow includes Docker restart policy and bounded container log settings.

### Negative Consequences / Trade-offs
- Deployment depends on GitHub Actions, GHCR, network access, and SSH availability to the VM.
- The workflow uses SSH credentials with operational access to the VM; least privilege and key rotation require care.
- The workflow deploys only a `latest` image tag, so deterministic rollback is limited.
- `bootJar` builds the deployable JAR but is not the same as a full test/security/dependency scan pipeline.
- No production database migration step, container image signing, vulnerability scanning, or formal approval gate was found.
- The deployment stops and removes the existing container before starting the new one, so there is no zero-downtime rollout.

### Future Considerations
- Publish immutable image tags using commit SHA or release version.
- Document rollback by image digest/tag.
- Add backend tests, dependency scanning, container vulnerability scanning, and optional branch protection/approval gates.
- Use a least-privilege deployment user and document SSH key rotation.
- Consider OIDC-based cloud deployment or a managed container deployment flow if the project moves away from VM SSH.
- Add a controlled database migration step once the schema migration process is standardized.

## Related Documentation
- `docs/Project-Overview.md`
- `docs/03-architecture/System-Architecture.md`
- `docs/03-architecture/Security-Design.md`
- `docs/06-operations/Deployment-Runbook.md`
- `docs/06-operations/Troubleshooting-Guide.md`
- `doc/cloud/SkillSwap-Cloud-Deployment.md`
- `doc/cloud/SkillSwap-README-Deployment.md`
- `.github/workflows/deploy.yml`
- `skill-swap-backend/build.gradle`
- `skill-swap-backend/Dockerfile`
