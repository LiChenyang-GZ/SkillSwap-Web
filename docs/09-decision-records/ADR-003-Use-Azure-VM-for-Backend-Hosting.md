# ADR-003: Use Azure VM for Backend Hosting

## Status
Accepted

## Date
2026-05-15

## Context
SkillSwap's backend is a Java 17 Spring Boot REST API. It needs a runtime for the packaged JAR, access to PostgreSQL and Azure Blob Storage, environment-variable based configuration, and a public HTTPS API endpoint.

Existing deployment documentation describes the backend as a Dockerized Spring Boot application running on an Azure VM behind Nginx. Repository evidence supports this deployment model:

- `skill-swap-backend/Dockerfile` packages the built JAR into an Eclipse Temurin Java 17 runtime image and exposes port `8080`.
- `.github/workflows/deploy.yml` builds the backend JAR, builds/pushes a Docker image to GHCR, and deploys it to an Azure VM over SSH.
- The workflow starts a `backend-api` container with environment variables for database, storage, and Clerk configuration.
- Deployment docs describe Nginx on the VM proxying HTTPS traffic to the backend container.

The project is currently documented as a single-VM deployment, not as a high-availability or horizontally auto-scaling backend.

## Decision
We decided to run the Spring Boot backend on an Azure VM using Docker.

The backend is built into a Docker image, published to GHCR, pulled by the VM, and run as a container. Nginx handles public HTTPS entry and reverse proxying.

## Rationale
- A single VM with Docker is simple to understand and operate for the current project scale.
- Docker gives repeatable runtime packaging without requiring a full orchestration platform.
- The VM model provides control over Nginx, TLS, container lifecycle, logs, and environment variables.
- Azure aligns with the documented database and blob storage deployment.
- The cost and operational complexity are more appropriate for a small portfolio/student project than Kubernetes or a larger managed platform.
- GitHub Actions reduces manual container deployment work even though the VM itself remains manually operated infrastructure.

## Alternatives Considered
- Azure Container Instances
  - Why considered: It can run containers without managing a VM.
  - Why not selected: The existing docs explicitly favor the VM model for control and lower complexity at the current scale. The project already has VM/Nginx/SSH deployment automation.
  - Source status: Explicitly documented as part of the managed-container comparison.

- Azure Kubernetes Service
  - Why considered: It supports managed orchestration, scaling, and multi-container workloads.
  - Why not selected: It is significantly more complex than the needs of the current single-backend deployment.
  - Source status: Explicitly documented as part of the managed-container comparison.

- Azure Container Apps
  - Why considered: It is a managed container platform with scaling and reduced VM maintenance.
  - Why not selected: It would require changing deployment, ingress, environment, and possibly logging/secret workflows. Current docs and workflow are already built around a VM.
  - Source status: Reasonable inferred alternative.

- Azure App Service
  - Why considered: It can host Java or containerized web applications with managed TLS and platform operations.
  - Why not selected: It would reduce VM control but require a different deployment model and platform configuration not represented in the current repository.
  - Source status: Reasonable inferred alternative.

- Fully serverless backend
  - Why considered: It can reduce server management for event-driven workloads.
  - Why not selected: The current Spring Boot REST API, JPA persistence model, and Docker packaging are not designed as serverless functions.
  - Source status: Reasonable inferred alternative.

## Consequences
### Positive Consequences
- Backend packaging and runtime are repeatable through Docker.
- The VM gives direct operational control for Nginx, Certbot, Docker, logs, and emergency access.
- Deployment is automated enough for current needs through GitHub Actions and GHCR.
- The model is easy to explain during portfolio review and handover.

### Negative Consequences / Trade-offs
- The team is responsible for VM OS maintenance, Docker daemon health, disk usage, SSH access, firewall/NSG configuration, and patching.
- The backend is documented as a single VM/container, so high availability and horizontal scaling should not be assumed.
- Deployment depends on SSH access from GitHub Actions to the VM.
- No managed container orchestration, health-based rescheduling, or autoscaling is implemented.
- Protection against direct public access to port `8080` depends on live VM/firewall/NSG configuration and should be verified.
- No Infrastructure as Code was found for recreating the VM and related configuration.

### Future Considerations
- Move to Azure Container Apps, App Service, or another managed container platform if operational load increases.
- Add Infrastructure as Code for VM, firewall/NSG, Nginx, database, and storage setup.
- Bind the backend container only to localhost or a private network behind Nginx if not already enforced.
- Add centralized logs, metrics, uptime checks, and alerting.
- Add a documented rollback path using immutable image tags.

## Related Documentation
- `docs/Project-Overview.md`
- `docs/03-architecture/System-Architecture.md`
- `docs/03-architecture/Security-Design.md`
- `docs/06-operations/Deployment-Runbook.md`
- `docs/06-operations/Troubleshooting-Guide.md`
- `doc/cloud/SkillSwap-Cloud-Deployment.md`
- `doc/cloud/SkillSwap-README-Deployment.md`
- `.github/workflows/deploy.yml`
- `skill-swap-backend/Dockerfile`
- `skill-swap-backend/build.gradle`
- `skill-swap-backend/src/main/resources/application.properties`
