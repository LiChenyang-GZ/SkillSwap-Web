# Cloud Deployment — SkillSwap

## 1. Introduction

SkillSwap is a community platform with a decoupled frontend/backend architecture deployed across two cloud providers. The React frontend is served via Vercel's global Edge Network. The Spring Boot backend, managed PostgreSQL database, and Blob Storage are hosted on Microsoft Azure (Australia East), providing low latency for the Sydney user base. Authentication is delegated to Clerk, a managed Identity Provider. A GitHub Actions CI/CD pipeline automates the full build-and-deploy cycle on every push to `main`.

---

## 2. Architecture Overview

```
Developer
 │
 └──► git push main
           │
           ▼
     GitHub Actions (CI/CD)
           ├── 1. Gradle bootJar
           ├── 2. Docker build + push → GHCR
           └── 3. SSH → Azure VM → docker pull → restart container

User (Browser)
 │
 ├──► Vercel Edge Network (React SPA)
 │         ├── HTTPS API calls ──────────────────────────────┐
 │         └── Clerk Auth (Login / OAuth)                    │
 │                   └── JWT (RS256) ─────────────────────── ▼
 │
 └──► Nginx (Reverse Proxy + TLS Termination)   ← Azure VM
           └──► Spring Boot (Docker)
                     ├──► Azure Database for PostgreSQL
                     └──► Azure Blob Storage
```

| Layer | Service | Role |
|---|---|---|
| **Frontend** | Vercel | Static hosting, auto CI/CD, Edge Network delivery |
| **Backend** | Azure Virtual Machine (Ubuntu 24.04) | Docker-containerised Spring Boot application |
| **Database** | Azure Database for PostgreSQL Flexible Server | Managed relational database, SSL enforced |
| **Object Storage** | Azure Blob Storage | Persistent storage for user-uploaded media |
| **Authentication** | Clerk | Managed IdP — JWT issuance, Google OAuth, session management |
| **Reverse Proxy** | Nginx + Let's Encrypt | TLS termination, HTTP→HTTPS redirect |
| **CI/CD Pipeline** | GitHub Actions + GHCR | Automated build, containerisation, remote deployment |

---

## 3. Infrastructure

### 3.1 Compute — Azure Virtual Machine

| Property | Value |
|---|---|
| OS | Ubuntu 24.04 LTS |
| VM Size | Standard B2ats v2 (2 vCPUs, 1 GiB RAM) |
| Swap | 2 GiB (configured to handle deployment memory spikes) |

Nginx runs on the host and proxies all inbound HTTPS traffic to the Spring Boot container on `localhost:8080`. Port 8080 is not exposed externally — the application layer is only reachable through Nginx.

```
Ubuntu 24.04
├── Nginx  :80 → 301 HTTPS  |  :443 → proxy_pass localhost:8080
└── Docker
      └── backend-api (Spring Boot, Xmx512m)
            ├── PostgreSQL connection (sslmode=require)
            ├── Azure Blob Storage SDK
            └── Clerk JWT validation (JWKS endpoint)
```

### 3.2 Database — Azure Database for PostgreSQL Flexible Server

| Property | Value |
|---|---|
| PostgreSQL Version | 16 |
| Compute Tier | Burstable B1ms (1 vCore, 2 GiB RAM) |
| Storage | 32 GiB |
| SSL Enforcement | Enabled on all connections |

### 3.3 Object Storage — Azure Blob Storage

User-uploaded media is stored in Blob Storage rather than on the VM's local disk, decoupling binary assets from the compute layer. Media persists independently of container restarts or redeployments. The backend returns blob URLs directly to the frontend, so assets are fetched without proxying through the application server.

| Property | Value |
|---|---|
| Replication | LRS (Locally-Redundant Storage) |
| Access Level | Blob (public read, authenticated write) |

### 3.4 Network Security — NSG Inbound Rules

| Port | Protocol | Purpose |
|---|---|---|
| 22 | TCP | SSH administration |
| 80 | TCP | HTTP (redirected to HTTPS by Nginx) |
| 443 | TCP | HTTPS (all application traffic) |

Port 8080 is intentionally not exposed. All application traffic is routed exclusively through Nginx on 443.

---

## 4. Authentication — Clerk

Authentication is handled by Clerk, a managed Identity Provider, offloading JWT issuance, Google OAuth, and session management from the application layer.

```
Browser  ──► Clerk (Login/OAuth) ──► JWT (RS256, sub = Clerk user ID)
                                          │
                                          ▼
                                   Spring Boot
                                   (validates via Clerk JWKS endpoint)
                                          │
                                          ▼
                                   PostgreSQL user_account
                                   (mapped by auth_subject)
```

Separate Clerk instances are maintained for development and production, with distinct API keys and issuer URLs. Spring Boot uses environment variable placeholders with local-dev fallback values, so no environment configuration is needed to run the application locally.

Google OAuth in production uses a dedicated OAuth Client, replacing Clerk's shared development credentials.

---

## 5. CI/CD Pipeline — GitHub Actions + GHCR

Every push to `main` triggers an automated pipeline. Typical end-to-end duration is 3–4 minutes.

```
Stage 1  Checkout source
Stage 2  Set up JDK 17 (Temurin)
Stage 3  ./gradlew bootJar  →  skill-swap-backend.jar
Stage 4  docker login ghcr.io  (GITHUB_TOKEN, no manual token required)
Stage 5  docker build + push  →  ghcr.io/[owner]/skillswap-backend:latest
Stage 6  SSH → Azure VM
           ├── docker stop / rm  (free memory before pull)
           ├── docker pull latest
           ├── docker run -d (env vars injected from GitHub Secrets)
           │     --log-driver json-file --log-opt max-size=10m --log-opt max-file=3
           └── docker image prune -f
```

Container logs are capped at 30 MB (3 × 10 MB rotation) to prevent disk exhaustion on the VM.

All secrets (database credentials, Blob Storage connection string, Clerk keys) are stored in GitHub Actions Secrets and injected at runtime. Nothing sensitive is committed to source control.

---

## 6. Architecture Decisions

**Clerk over self-hosted JWT** — Password hashing, token rotation, and OAuth integration each carry meaningful attack surface. Clerk's Hobby plan (50,000 MAU free) is well above the expected user base, and moving from older auth paths to Clerk required database identity mapping rather than a full auth rewrite.

**Azure VM over managed container service** — A single VM with Docker and Nginx gives full control without the cost and operational complexity of AKS or Azure Container Instances. The manual container lifecycle overhead is eliminated by the CI/CD pipeline.

**Azure Blob Storage over VM local disk** — Media stored on VM disk is lost on container replacement and constrained by VM storage limits. Blob Storage decouples the asset layer entirely, with public read URLs served directly to the frontend without application-server proxying.

**GHCR over Docker Hub** — GHCR authenticates natively with `GITHUB_TOKEN` (auto-provisioned per run), requiring no additional account or credentials to manage. Docker Hub's free-tier pull limits, while not a practical concern at this traffic scale, are also avoided.

**Nginx over embedded Tomcat HTTPS** — Nginx provides cleaner Certbot integration, simpler HTTP→HTTPS redirect configuration, and the flexibility to host additional services on the same VM without modifying the application layer.

**2 GiB swap on a 1 GiB RAM VM** — The B2ats v2 instance has sufficient RAM for steady-state operation (~700 MB used), but docker build during a deployment creates a transient peak that can trigger OOM. Swap absorbs this spike without requiring a more expensive VM tier.
