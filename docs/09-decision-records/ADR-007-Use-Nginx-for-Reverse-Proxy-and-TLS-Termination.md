# ADR-007: Use Nginx for Reverse Proxy and TLS Termination

## Status
Accepted

## Date
2026-05-15

## Context
SkillSwap exposes a Spring Boot backend API from an Azure VM. The backend container listens on port `8080`, while production traffic should use HTTPS. Existing cloud documentation describes Nginx on the VM as the public reverse proxy and TLS termination point, with Certbot/Let's Encrypt providing certificates.

Repository and documentation evidence:

- Deployment docs describe HTTP-to-HTTPS redirection, TLS termination at Nginx, and proxying to `localhost:8080`.
- The backend Dockerfile exposes port `8080`, and the deployment workflow maps container port `8080`.
- Security docs state that public API traffic is expected to route through Nginx and that direct public exposure of backend port `8080` should be avoided.
- No checked-in Nginx configuration file was found, so the exact live server block and certificate state require VM verification.

## Decision
We decided to use Nginx as the reverse proxy and TLS termination layer in front of the Spring Boot backend.

Nginx handles public HTTP/HTTPS traffic, redirects HTTP to HTTPS, terminates TLS certificates, and proxies API requests to the backend container on the VM.

## Rationale
- Nginx provides a standard reverse proxy layer between the public internet and the Spring Boot application.
- TLS certificate management is simpler through Certbot/Let's Encrypt than embedding certificate handling in the Spring Boot app.
- HTTP-to-HTTPS redirects can be handled at the web server layer.
- The backend application can remain a plain HTTP service on the VM/container boundary.
- Nginx gives operational flexibility for future routing or additional services without changing application code.
- The approach matches the current Azure VM hosting model and deployment documentation.

## Alternatives Considered
- Spring Boot embedded HTTPS
  - Why considered: Spring Boot's embedded server can be configured to serve HTTPS directly.
  - Why not selected: Certificate issuance, renewal, redirect behavior, and future proxy flexibility are cleaner in Nginx for the current VM deployment.
  - Source status: Explicitly documented comparison.

- Azure Application Gateway
  - Why considered: It can provide managed TLS termination, routing, and gateway features.
  - Why not selected: It would add cost and cloud configuration complexity beyond the current small VM deployment.
  - Source status: Reasonable inferred alternative.

- Caddy
  - Why considered: It can simplify automatic HTTPS configuration.
  - Why not selected: Current deployment documentation is already written around Nginx and Certbot.
  - Source status: Reasonable inferred alternative.

- Traefik
  - Why considered: It is commonly used as a reverse proxy in containerized environments.
  - Why not selected: It is more useful in dynamic multi-service/container orchestration setups than the current single-backend VM model.
  - Source status: Reasonable inferred alternative.

- Managed platform TLS
  - Why considered: Platforms such as App Service or Container Apps can provide TLS at the platform edge.
  - Why not selected: The current backend hosting decision is Azure VM with Docker, so TLS is handled on the VM boundary.
  - Source status: Reasonable inferred alternative.

## Consequences
### Positive Consequences
- TLS and redirect behavior are separated from application code.
- Spring Boot can run as a simpler HTTP service behind the proxy.
- Nginx can prevent direct public exposure of the application port when VM firewall/NSG configuration is correct.
- Certbot/Let's Encrypt provides a low-cost certificate path for the current deployment.

### Negative Consequences / Trade-offs
- Nginx configuration and certificate renewal are operational responsibilities.
- The live Nginx configuration is not checked into the repository, so drift is possible.
- Certbot renewal status and certificate paths require VM access to verify.
- If port `8080` is publicly reachable, clients may bypass the intended Nginx/TLS boundary.
- Troubleshooting production API failures requires checking Nginx, Docker, and backend logs together.

### Future Considerations
- Store a sanitized Nginx configuration template in documentation or infrastructure code.
- Add Infrastructure as Code for VM, firewall/NSG, Nginx, and certificate setup.
- Add monitoring for certificate expiry, Nginx health, and backend upstream health.
- Consider binding the backend container only to localhost or a private Docker network.
- Add rate limiting or request size controls in Nginx if upload/API abuse becomes a concern.

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
