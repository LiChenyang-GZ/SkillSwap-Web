# Cloud Deployment Documentation — SkillSwap

## 1. Introduction

SkillSwap is a community platform with a decoupled frontend/backend architecture deployed across two cloud providers. The React frontend is served via Vercel's global Edge Network for zero-configuration CDN and CI/CD. The Spring Boot backend, managed PostgreSQL database, and Blob Storage are hosted on Microsoft Azure in the **Australia East** region, providing low latency for the target user base in Sydney. TLS termination and reverse proxying are handled at the VM boundary by Nginx and Certbot. Authentication is delegated to **Clerk**, a managed Identity Provider, which handles JWT issuance, OAuth flows, and session management without requiring a self-hosted auth server.

A GitHub Actions CI/CD pipeline automates the full build-and-deploy cycle on every push to `main`, eliminating manual artifact transfer and container management.

---

## 2. Architecture Overview

```
Developer
 │
 └──► git push main
           │
           ▼
     GitHub Actions (CI/CD)
           │
           ├── 1. Gradle bootJar
           ├── 2. Docker build + push → GHCR
           └── 3. SSH → Azure VM → docker pull → restart container

User (Browser)
 │
 ├──► Vercel Edge Network (React SPA)
 │         │
 │         ├── HTTPS API calls ──────────────────────────────────┐
 │         │                                                      │
 │         └── Clerk Auth (Login / OAuth)                        │
 │                   │                                           │
 │                   └── JWT (RS256) ─────────────────────────── ▼
 │
 └──► Nginx (Reverse Proxy + TLS Termination)   ← Azure VM: 20.248.207.99
           │
           └──► Spring Boot (Docker, port 8080)
                     │
                     ├──► Azure Database for PostgreSQL Flexible Server
                     │         skillswap-db-server.postgres.database.azure.com
                     │
                     └──► Azure Blob Storage
                               skillswapstorage / container: memories
```

| Layer | Service | Role |
|---|---|---|
| **Frontend** | Vercel | Static asset hosting, auto CI/CD, Edge Network delivery |
| **Backend** | Azure Virtual Machine (Ubuntu 24.04) | Docker-containerised Spring Boot application |
| **Database** | Azure Database for PostgreSQL Flexible Server | Managed relational database with SSL enforced |
| **Object Storage** | Azure Blob Storage | Persistent storage for user-uploaded media (memories, avatars) |
| **Authentication** | Clerk | Managed Identity Provider — JWT issuance, OAuth, session management |
| **Reverse Proxy** | Nginx | SSL termination, HTTP→HTTPS redirect, upstream proxying |
| **TLS/HTTPS** | Let's Encrypt via Certbot | Automated certificate issuance and renewal |
| **DNS** | Spaceship | A record and CNAME record management |
| **CI/CD Pipeline** | GitHub Actions + GHCR | Automated build, containerisation, and remote deployment |

---

## 3. Azure Infrastructure

### 3.1 Resource Group

All Azure resources are co-located in a single resource group for unified lifecycle management and cost tracking.

| Property | Value |
|---|---|
| Resource Group | `SkillSwap_RG` |
| Region | Australia East |
| Subscription | Azure for Students |

---

### 3.2 Compute — Azure Virtual Machine

The backend application runs inside a Docker container on a Linux VM. Docker provides environment isolation and makes the deployment artifact (image) reproducible across environments. Nginx runs as the host-level process, receiving all inbound traffic and proxying it to the containerised Spring Boot service on port 8080.

| Property | Value |
|---|---|
| VM Name | `SkillSwap-backend` |
| Operating System | Ubuntu 24.04 LTS |
| VM Size | Standard B2ats v2 (2 vCPUs, 1 GiB RAM) |
| Public IP | `20.248.207.99` (IPv4) |
| Private IP | `10.0.0.4` |
| Virtual Network | `SkillSwap-backend-vnet/default` |

**Application process layout on the VM:**

```
Ubuntu 24.04
├── Nginx (host process)
│     ├── Listens on :80  → 301 redirect to HTTPS
│     └── Listens on :443 → proxy_pass to localhost:8080
└── Docker
      └── backend-api container (port 8080)
            ├── Spring Boot application
            ├── PostgreSQL connection (SSL)
            ├── Azure Blob Storage client
            └── Clerk JWT validation (via JWKS endpoint)
```

---

### 3.3 Database — Azure Database for PostgreSQL Flexible Server

A fully managed PostgreSQL instance is used in place of a self-hosted database. This removes the operational overhead of backups, patching, and replication management, and provides native SSL enforcement at the server level.

| Property | Value |
|---|---|
| Server Name | `skillswap-db-server` |
| Endpoint | `skillswap-db-server.postgres.database.azure.com` |
| PostgreSQL Version | 16.13 |
| Compute Tier | Burstable — B1ms (1 vCore, 2 GiB RAM) |
| Storage | 32 GiB |
| SSL Enforcement | Enabled (required on all connections) |
| Availability Zone | 1 |
| High Availability | Not enabled (single-node; appropriate for current traffic scale) |

The Spring Boot application connects to the database over the Azure internal network using a JDBC URL with `sslmode=require`, ensuring all data in transit is encrypted.

---

### 3.4 Object Storage — Azure Blob Storage

User-uploaded media (memory images, avatars) is stored in Azure Blob Storage rather than on the VM's local disk. This decouples binary asset storage from the compute layer, ensuring that media persists independently of container restarts or VM replacements, and that the VM disk is not exhausted by user uploads.

| Property | Value |
|---|---|
| Storage Account | `skillswapstorage` |
| Performance Tier | Standard |
| Replication | LRS (Locally-Redundant Storage) |
| Container | `memories` |
| Access Level | Blob (public read, authenticated write) |

The Spring Boot backend connects to Blob Storage via the Azure Storage SDK, using a connection string injected at container startup. The backend returns blob URLs directly to the frontend, so static media is served from Azure CDN endpoints without proxying through the application server.

---

### 3.5 Network Security — Network Security Group

The VM is protected by a Network Security Group (`SkillSwap-backend-nsg`) with the principle of minimal exposure: only ports required for application operation and administration are open.

**Inbound Security Rules**

| Priority | Rule Name | Port | Protocol | Source | Action |
|---|---|---|---|---|---|
| 300 | SSH | 22 | TCP | Any | Allow |
| 320 | HTTP | 80 | TCP | Any | Allow |
| 340 | Allow_HTTPS_443 | 443 | TCP | Any | Allow |
| 65500 | DenyAllInBound | Any | Any | Any | Deny |

**Outbound Security Rules**

| Priority | Rule Name | Destination | Action |
|---|---|---|---|
| 65000 | AllowVnetOutBound | VirtualNetwork | Allow |
| 65001 | AllowInternetOutBound | Internet | Allow |
| 65500 | DenyAllOutBound | Any | Deny |

> Port 8080 is intentionally not exposed at the NSG level. All external traffic is routed exclusively through Nginx on port 443, which proxies internally to the Spring Boot container on `localhost:8080`. This ensures the application layer is never directly reachable from the public internet.

---

## 4. Authentication — Clerk

SkillSwap delegates authentication to **Clerk**, a managed Identity Provider. This offloads JWT issuance, OAuth flows, password storage, and session management to a purpose-built service, significantly reducing the attack surface of the Azure VM compared to a self-hosted auth server.

### 4.1 Authentication Flow

```
User (Browser)        Clerk (IdP)               Backend (Azure VM)
  │                      │                            │
  ├─── 1. Login/OAuth ──►│                            │
  │                      │                            │
  │◄── 2. JWT (RS256) ───┤                            │
  │       (sub = Clerk user ID)                       │
  │                      │                            │
  ├─── 3. API Request + Authorization: Bearer <JWT> ─►│
  │                      │                            │
  │                      │◄─ 4. Verify JWT via JWKS ──┤
  │                      │    (public key fetch)      │
  │                      │                            │
  │◄─────────────────── 5. Protected Response ────────┤
```

| Component | Responsibility |
|---|---|
| **Clerk Frontend SDK** | Handles login UI, OAuth redirects, session persistence, and JWT retrieval |
| **JWT (RS256)** | Signed token containing the user's unique Clerk ID (`sub`) |
| **Spring Security** | Validates JWT signature and claims using Clerk's JWKS endpoint |
| **User Mapping** | Maps the Clerk `sub` ID to `user_account.auth_subject` in PostgreSQL |

### 4.2 Environment Isolation — Development vs Production

Clerk provides separate application instances for development and production, with distinct API keys and issuer URLs. This prevents development traffic from touching production user data.

| Property | Development | Production |
|---|---|---|
| Issuer URI | `https://glorious-crab-64.clerk.accounts.dev` | `https://clerk.<domain>` |
| JWKS URI | `https://glorious-crab-64.clerk.accounts.dev/.well-known/jwks.json` | `https://clerk.<domain>/.well-known/jwks.json` |
| Frontend Key | `pk_test_...` | `pk_live_...` |
| Backend Key | `sk_test_...` | `sk_live_...` |

Spring Boot uses environment variable placeholders with fallback values so the application runs locally without any additional configuration:

```properties
# Falls back to the Dev instance if CLERK_ISSUER_URI is not set in the environment
spring.security.oauth2.resourceserver.jwt.issuer-uri=\
  ${CLERK_ISSUER_URI:https://glorious-crab-64.clerk.accounts.dev}
spring.security.oauth2.resourceserver.jwt.jwk-set-uri=\
  ${CLERK_JWKS_URI:https://glorious-crab-64.clerk.accounts.dev/.well-known/jwks.json}
clerk.secret-key=${CLERK_SECRET_KEY:sk_test_...}
```

### 4.3 Production DNS Configuration — Clerk + Spaceship

Transitioning to a Clerk Production Instance requires five CNAME records to be added in Spaceship DNS to route authentication traffic and satisfy email deliverability requirements.

| Record Type | Host | Points To | Purpose |
|---|---|---|---|
| CNAME | `clerk` | `frontend-api.clerk.services` | Core Frontend API |
| CNAME | `accounts` | `accounts.clerk.services` | Managed auth pages |
| CNAME | `clkmail` | `mail.<clerk-id>.clerk.services` | Transactional emails |
| CNAME | `clk._domainkey` | `dkim1.<clerk-id>.clerk.services` | DKIM email signing |
| CNAME | `clk2._domainkey` | `dkim2.<clerk-id>.clerk.services` | DKIM backup signing |

### 4.4 Google OAuth — Production Configuration

Production Clerk instances require a custom Google OAuth Client to replace Clerk's shared development credentials.

| Property | Value |
|---|---|
| Google Cloud Project | `skillswap-production` |
| Application Type | Web Application |
| Authorised Redirect URI | `https://clerk.<domain>/v1/oauth_callback` |
| User Type | External (any Google Account) |

### 4.5 Identity Migration — Development to Production

Clerk User IDs (`sub`) differ between Development and Production instances. When cutting over to the Production instance, any seeded admin records in PostgreSQL must be re-mapped to the new Production User ID to preserve role integrity.

```sql
-- Re-map the admin account to the Production Clerk User ID
UPDATE user_account
SET auth_subject  = 'user_2p5A...',           -- New Production Clerk ID
    auth_provider = 'https://clerk.<domain>',  -- Production issuer
    updated_at    = NOW()
WHERE email = 'admin@example.com';
```

---

## 5. Frontend Deployment — Vercel

The React application is built and deployed via Vercel's Git integration. On every push to the `main` branch, Vercel automatically runs the build pipeline and distributes the static output to its global Edge Network.

| Property | Value |
|---|---|
| Platform | Vercel |
| Build Command | `npm run build` |
| Output Directory | `dist` / `build` |
| CDN | Vercel Edge Network (global PoPs including Sydney) |
| CI/CD | Automatic on push to `main` |
| HTTPS | Provisioned automatically by Vercel |

Environment variables are configured in the Vercel project dashboard and injected at build time, keeping all sensitive configuration out of the source repository.

---

## 6. TLS / HTTPS — Nginx + Let's Encrypt

Nginx handles TLS termination at the VM boundary. Certbot provisions a free, publicly-trusted certificate and installs a systemd renewal timer automatically.

**Nginx configuration summary:**

```nginx
server {
    listen 80;
    server_name <domain>;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name <domain>;

    ssl_certificate     /etc/letsencrypt/live/<domain>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<domain>/privkey.pem;

    location / {
        proxy_pass         http://localhost:8080;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

Let's Encrypt certificates expire after 90 days. Certbot renews them automatically at the 60-day mark via a systemd timer, requiring no manual intervention.

---

## 7. DNS Configuration — Spaceship

The domain is registered and managed through Spaceship. In addition to the five Clerk CNAME records documented in Section 4.3, the following records route application traffic:

| Record Type | Name | Value | Purpose |
|---|---|---|---|
| A | `api.<domain>` | `20.248.207.99` | Routes backend API traffic to the Azure VM |
| CNAME | `www.<domain>` | `cname.vercel-dns.com` | Routes frontend traffic to Vercel |

---

## 8. CI/CD Pipeline — GitHub Actions + GHCR

Backend deployments are fully automated via a GitHub Actions workflow. On every push to `main`, the pipeline builds the JAR, constructs a Docker image, pushes it to GitHub Container Registry (GHCR), and remotely restarts the container on the Azure VM — all without manual intervention.

### 8.1 Pipeline Stages

```
git push main
     │
     ▼
GitHub Actions Runner (ubuntu-latest)
     │
     ├── Stage 1: Checkout source code
     ├── Stage 2: Set up JDK 17 (Temurin)
     ├── Stage 3: ./gradlew bootJar  →  skill-swap-backend-0.0.1-SNAPSHOT.jar
     ├── Stage 4: docker login ghcr.io  (GITHUB_TOKEN)
     ├── Stage 5: docker build + push  →  ghcr.io/lichenyang-gz/skillswap-backend:latest
     └── Stage 6: SSH → Azure VM
                    ├── docker pull ghcr.io/lichenyang-gz/skillswap-backend:latest
                    ├── docker stop backend-api
                    ├── docker rm backend-api
                    ├── docker run -d (with all env vars injected)
                    └── docker image prune -f
```

**Typical pipeline duration: ~3–4 minutes end-to-end.**

### 8.2 Workflow Configuration (`.github/workflows/deploy.yml`)

```yaml
name: Build and Deploy Backend

on:
  push:
    branches:
      - main

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: lichenyang-gz/skillswap-backend

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Build JAR with Gradle
        working-directory: ./skill-swap-backend
        run: ./gradlew bootJar --no-daemon

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: ./skill-swap-backend
          push: true
          tags: ghcr.io/${{ env.IMAGE_NAME }}:latest

      - name: Deploy to Azure VM
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.AZURE_VM_IP }}
          username: ${{ secrets.AZURE_VM_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
            docker stop backend-api || true
            docker rm backend-api || true
            docker pull ghcr.io/${{ env.IMAGE_NAME }}:latest
            docker run -d \
              --name backend-api \
              --restart unless-stopped \
              --log-driver json-file \
              --log-opt max-size=10m \
              --log-opt max-file=3 \
              -p 8080:8080 \
              -e SPRING_DATASOURCE_URL="${{ secrets.DB_URL }}" \
              -e SPRING_DATASOURCE_USERNAME="${{ secrets.DB_USERNAME }}" \
              -e SPRING_DATASOURCE_PASSWORD="${{ secrets.DB_PASSWORD }}" \
              -e AZURE_STORAGE_CONNECTION_STRING="${{ secrets.AZURE_STORAGE_CONNECTION_STRING }}" \
              -e AZURE_STORAGE_MEMORIES_CONTAINER="memories" \
              -e CLERK_ISSUER_URI="${{ secrets.CLERK_ISSUER_URI }}" \
              -e CLERK_JWKS_URI="${{ secrets.CLERK_JWKS_URI }}" \
              -e CLERK_SECRET_KEY="${{ secrets.CLERK_SECRET_KEY }}" \
              ghcr.io/${{ env.IMAGE_NAME }}:latest
            docker image prune -f
```

### 8.3 GitHub Actions Secrets

The following secrets must be configured in the repository under **Settings → Secrets and variables → Actions**:

| Secret | Description |
|---|---|
| `AZURE_VM_IP` | Public IP of the Azure VM (`20.248.207.99`) |
| `AZURE_VM_USER` | SSH username (`azureuser`) |
| `SSH_PRIVATE_KEY` | Full content of the OpenSSH private key (`.pem` file) |
| `DB_URL` | PostgreSQL JDBC URL with `sslmode=require` |
| `DB_USERNAME` | Database administrator login |
| `DB_PASSWORD` | Database password |
| `AZURE_STORAGE_CONNECTION_STRING` | Blob Storage master connection string |
| `CLERK_ISSUER_URI` | Clerk Production issuer URL |
| `CLERK_JWKS_URI` | Clerk Production JWKS endpoint URL |
| `CLERK_SECRET_KEY` | Clerk Production backend secret key (`sk_live_...`) |

> `GITHUB_TOKEN` is provisioned automatically by GitHub Actions for each run and does not need to be added manually.

### 8.4 Dockerfile

The CI runner builds the image using the `./skill-swap-backend` directory as the Docker build context. The Dockerfile copies the Gradle output JAR directly:

```dockerfile
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY build/libs/skill-swap-backend.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
```

> The JAR filename is fixed to `skill-swap-backend.jar` via the `bootJar.archiveFileName` setting in `build.gradle`, eliminating the version-suffix from the default Gradle output. The Dockerfile `COPY` path reflects this fixed name and does not need to be updated when the project version changes.

---

## 9. Deployment Runbook

### 9.1 Automated Deployment (Primary)

The standard deployment path requires no manual steps beyond pushing code:

```bash
git push origin main
# GitHub Actions triggers automatically.
# Monitor progress at: github.com/<repo>/actions
```

### 9.2 Manual Deployment (Fallback / Emergency)

> **Deprecated as the standard process.** Use this procedure only if the CI/CD pipeline is unavailable (e.g., GitHub Actions outage) or for an emergency hotfix that cannot wait for the pipeline.

**Phase 1 — Build JAR locally (Windows)**

```bash
cd skill-swap-backend
./gradlew bootJar
# Output: build/libs/skill-swap-backend-0.0.1-SNAPSHOT.jar
```

**Phase 2 — Transfer artifact to VM via SCP**

```bash
scp -i C:\Users\Lenovo\.ssh\SkillSwap-backend_key.pem \
  build/libs/skill-swap-backend-0.0.1-SNAPSHOT.jar \
  azureuser@20.248.207.99:/home/azureuser/app.jar
```

**Phase 3 — Build image and run container on the VM**

```bash
ssh -i C:\Users\Lenovo\.ssh\SkillSwap-backend_key.pem azureuser@20.248.207.99

docker stop backend-api && docker rm backend-api
docker build --no-cache -t skillswap-backend .
docker run -d \
  --name backend-api \
  --restart unless-stopped \
  -p 8080:8080 \
  -e SPRING_DATASOURCE_URL="jdbc:postgresql://skillswap-db-server.postgres.database.azure.com:5432/postgres?sslmode=require" \
  -e SPRING_DATASOURCE_USERNAME=dbadmin \
  -e SPRING_DATASOURCE_PASSWORD=<password> \
  -e AZURE_STORAGE_CONNECTION_STRING=<connection_string> \
  -e AZURE_STORAGE_MEMORIES_CONTAINER=memories \
  -e CLERK_ISSUER_URI=<clerk_issuer_uri> \
  -e CLERK_JWKS_URI=<clerk_jwks_uri> \
  -e CLERK_SECRET_KEY=<clerk_secret_key> \
  skillswap-backend

docker ps
docker logs backend-api --tail 50
```

### 9.3 Database Migration

```bash
# Export from source database (e.g. Supabase)
pg_dump "postgresql://<source_connection_string>" > backup.sql

# Import into Azure PostgreSQL
psql "postgresql://dbadmin:<password>@skillswap-db-server.postgres.database.azure.com:5432/postgres?sslmode=require" < backup.sql
```

### 9.4 Frontend Deployment (Vercel)

Frontend deployments are fully automated via Vercel's GitHub integration. No manual steps are required.

```bash
git push origin main
# Vercel detects the push, runs the build, and deploys to the Edge Network automatically.
```

---

## 10. VM Resource Management

### 10.1 Swap Configuration

The Standard B2ats v2 VM has 1 GiB of RAM. During a deployment, the peak memory demand — Docker daemon, image pull, container startup, and the running Spring Boot process — can exceed physical memory and cause the VM to OOM-kill the container or crash the Docker daemon. A 2 GiB swap file is configured on the OS to absorb these transient spikes.

```bash
# Create and enable a 2 GiB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Persist across reboots
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify
free -h
```

With swap enabled, the steady-state memory budget is as follows:

| Process | Approximate Usage |
|---|---|
| OS + system processes | ~200 MB |
| Nginx | ~20 MB |
| Docker daemon | ~50 MB |
| Spring Boot (`-Xmx512m`) | ~400–500 MB |
| **Total** | ~700 MB physical, with 2 GB swap headroom |

### 10.2 Container Log Limits

Without log rotation, Docker's `json-file` log driver will write unbounded logs to the VM's OS disk, which can exhaust disk space over time. All containers are started with explicit log limits:

```
--log-driver json-file
--log-opt max-size=10m
--log-opt max-file=3
```

This caps container log storage at **30 MB** (3 files × 10 MB), after which the oldest log file is rotated out automatically. These flags are included in the `docker run` command within the CI/CD pipeline so the policy is enforced consistently on every deployment.

---

## 11. Environment Variables

Sensitive configuration is never committed to source control. All secrets are injected at runtime via GitHub Actions (backend) or the Vercel project dashboard (frontend).

**Backend — injected into the Docker container by the CI/CD pipeline:**

| Variable | Description |
|---|---|
| `SPRING_DATASOURCE_URL` | PostgreSQL JDBC connection string with `sslmode=require` |
| `SPRING_DATASOURCE_USERNAME` | Database administrator login |
| `SPRING_DATASOURCE_PASSWORD` | Database password |
| `AZURE_STORAGE_CONNECTION_STRING` | Blob Storage master connection string |
| `AZURE_STORAGE_MEMORIES_CONTAINER` | Target Blob container name (`memories`) |
| `CLERK_ISSUER_URI` | Clerk Production JWT issuer URL |
| `CLERK_JWKS_URI` | Clerk Production public key endpoint for JWT verification |
| `CLERK_SECRET_KEY` | Clerk Production backend secret key (`sk_live_...`) |

**Frontend — injected at build time via Vercel project settings:**

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL of the backend API (`https://api.<domain>`) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk Production frontend key (`pk_live_...`) |

---

## 12. Architecture Decisions

**Why Clerk instead of self-hosted JWT?** Implementing authentication from scratch introduces significant security risk and development overhead — password hashing, token rotation, and OAuth integration each carry their own attack surface. Clerk's free tier (Hobby plan) supports up to 50,000 monthly retained users, well above the expected user base, and the Supabase Auth migration was reduced to a database re-mapping rather than a full auth system rewrite.

**Why Vercel for the frontend?** Vercel provides a zero-config CDN with automatic HTTPS, Git-based CI/CD, and a generous free tier. For a React SPA, it eliminates the need to manage static file hosting infrastructure entirely.

**Why Azure VM instead of a managed container service?** For a small-scale project, a single VM with Docker and Nginx gives full control over the deployment without the additional cost and complexity of Azure Container Instances or AKS. The trade-off of manual container lifecycle management is fully offset by the GitHub Actions pipeline.

**Why Azure Blob Storage instead of VM local disk?** Storing user-uploaded media on the VM's local disk creates two problems: media is lost if the container is replaced during a deployment, and disk capacity is constrained by the VM size. Blob Storage decouples the storage layer entirely, providing durable object storage with public read access so the frontend retrieves media directly without proxying through the application server.

**Why GitHub Actions + GHCR instead of Docker Hub?** GHCR is natively integrated with GitHub repositories and authenticates using the automatically provisioned `GITHUB_TOKEN`, requiring no additional account or token management. For a low-frequency deployment schedule, Docker Hub's free-tier pull rate limits would not be a practical concern, but GHCR eliminates that dependency entirely.

**Why Nginx in front of Spring Boot?** Spring Boot's embedded Tomcat can serve HTTPS directly, but Nginx as a reverse proxy provides cleaner certificate management via Certbot, a simpler HTTP→HTTPS redirect configuration, and the flexibility to serve additional services from the same VM in future without modifying the application layer.
