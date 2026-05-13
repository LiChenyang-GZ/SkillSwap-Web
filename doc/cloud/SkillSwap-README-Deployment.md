## Cloud Deployment

SkillSwap is deployed across two cloud providers with a fully automated CI/CD pipeline.

### Architecture

```
Vercel (React SPA)  ──HTTPS──►  Nginx  ──►  Spring Boot (Docker)
                                                ├──► Azure PostgreSQL
                                                └──► Azure Blob Storage

git push main  ──►  GitHub Actions  ──►  GHCR  ──►  Azure VM (auto-deploy)
```

| Layer | Service |
|---|---|
| Frontend | Vercel (Edge Network, auto CI/CD) |
| Backend | Azure VM — Docker + Nginx + Let's Encrypt |
| Database | Azure Database for PostgreSQL Flexible Server |
| Object Storage | Azure Blob Storage |
| Authentication | Clerk (JWT/RS256, Google OAuth) |
| CI/CD | GitHub Actions + GitHub Container Registry |

### How deployment works

Every push to `main` triggers the GitHub Actions pipeline:
1. Gradle builds the JAR (`skill-swap-backend.jar`)
2. Docker image is built and pushed to GHCR
3. Pipeline SSHs into the Azure VM, pulls the new image, and restarts the container

Frontend deployments on Vercel are triggered automatically in parallel.

### Environment variables

All secrets are injected at runtime and never committed to source control. Configure the following in GitHub Actions Secrets (backend) and Vercel project settings (frontend):

**Backend (GitHub Secrets)**

| Variable | Description |
|---|---|
| `AZURE_VM_IP` | VM public IP |
| `AZURE_VM_USER` | SSH username |
| `SSH_PRIVATE_KEY` | OpenSSH private key |
| `DB_URL` | PostgreSQL JDBC URL |
| `DB_USERNAME` | Database username |
| `DB_PASSWORD` | Database password |
| `AZURE_STORAGE_CONNECTION_STRING` | Blob Storage connection string |
| `CLERK_ISSUER_URI` | Clerk production issuer URL |
| `CLERK_JWKS_URI` | Clerk JWKS endpoint |
| `CLERK_SECRET_KEY` | Clerk backend secret key |

**Frontend (Vercel)**

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend API base URL |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |

### Local development

The application falls back to Clerk's development instance automatically when `CLERK_ISSUER_URI` is not set, so no additional environment configuration is required to run locally.
