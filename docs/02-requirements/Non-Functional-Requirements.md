# Non-Functional Requirements

## Document Purpose

This document defines the non-functional requirements for the SkillSwap platform, including performance, security, privacy, reliability, maintainability, scalability, usability, compatibility, deployment, observability, and recovery considerations.

The requirements were verified against the current repository and existing documentation. Requirements marked `Inferred from implementation` are derived from observed code/configuration behavior rather than explicit product documentation. No live infrastructure inspection was performed.

## Performance Requirements

| ID | Requirement | Priority | Source | Acceptance Criteria |
|---|---|---|---|---|
| NFR-001 | Public workshop browsing should use lightweight summary data where possible. | Should | Code | Public workshop list responses omit sensitive fields and use summary DTO mapping. |
| NFR-002 | The frontend should avoid unnecessary personal-data requests when users browse public pages. | Should | Code | Public page refresh logic requests public workshop data without requiring authenticated dashboard data. |
| NFR-003 | The frontend should lazy-load major page screens to reduce initial load cost. | Should | Code | Major screens are loaded through `React.lazy` boundaries. |
| NFR-004 | Backend database access should use configurable connection pooling appropriate to environment capacity. | Should | Code | Hikari pool settings are configurable in application profiles. |
| NFR-005 | The backend runtime should use memory-conscious container settings for the documented VM footprint. | Should | Code and existing documentation | Docker runtime starts the Java process with bounded heap settings; deployment docs discuss VM memory constraints. |
| NFR-006 | Quantified response-time SLAs require future measurement. | Could | Inferred from implementation | No unverified numeric response-time target is presented as a current requirement. |

## Security Requirements

| ID | Requirement | Priority | Source | Acceptance Criteria |
|---|---|---|---|---|
| NFR-007 | Protected APIs must require validated JWT bearer authentication. | Must | Code and existing documentation | Security config validates JWTs through OAuth2 Resource Server and rejects invalid protected API calls. |
| NFR-008 | The backend must run API authentication as a stateless security model. | Must | Code | Spring Security session creation policy is stateless. |
| NFR-009 | Public API access must be explicitly limited to health, public workshop reads, public memory reads, and auth-related paths. | Must | Code | Security configuration permits only known public paths and authenticates `/api/**` otherwise. |
| NFR-010 | Admin capabilities must be protected by role-based authorization. | Must | Code | Admin services check for `ROLE_ADMIN` or equivalent authority before executing privileged actions. |
| NFR-011 | CORS must be restricted to configured frontend origins rather than permitting all origins. | Must | Code | CORS configuration lists explicit allowed origins and allowed methods. |
| NFR-012 | Sensitive runtime configuration must be injected through environment variables or secret stores rather than documented as plain secrets. | Must | Existing documentation and code | Deployment docs describe GitHub Actions/Vercel secret injection; requirements docs do not include secret values. |
| NFR-013 | File uploads must validate type and size before storage. | Must | Code | Upload endpoints reject missing files, non-image content where applicable, and oversized files. |
| NFR-014 | Public Markdown rendering must sanitize raw HTML content. | Must | Code | Memory Markdown renderer uses `rehype-sanitize` with a configured schema. |
| NFR-015 | Legacy local development JWT/dev-login flows must remain disabled unless deliberately reintroduced. | Must | Existing documentation | Auth docs state `/dev` login and local HS256 JWT flows are removed. |

## Authentication And Authorization Requirements

| ID | Requirement | Priority | Source | Acceptance Criteria |
|---|---|---|---|---|
| NFR-016 | Authentication must be delegated to Clerk for current frontend sign-in/session management. | Must | Code and existing documentation | Frontend initializes Clerk provider and requires a publishable key. |
| NFR-017 | Backend authorization must derive admin access from local database role mapping. | Must | Code | JWT converter looks up the local user and grants admin authority only when the stored role matches admin semantics. |
| NFR-018 | The system must support non-UUID external identity subjects. | Must | Code and existing documentation | User account model includes `auth_subject` and `auth_provider` and maps external subjects to local UUIDs. |
| NFR-019 | Public/private access rules must be enforced on the backend, not only hidden in the frontend. | Must | Code | Protected controller/service methods reject unauthenticated or unauthorized calls. |
| NFR-020 | Token/session failures should guide users back to sign-in or retry flows. | Should | Code and existing documentation | Frontend detects Clerk auth errors and protected API failures show user-facing messages. |

## Data Privacy And Data Protection Requirements

| ID | Requirement | Priority | Source | Acceptance Criteria |
|---|---|---|---|---|
| NFR-021 | Sensitive workshop contact information should not be exposed to public users. | Must | Code | Contact number and submitter email are returned only for admins or the facilitator. |
| NFR-022 | Notifications must be scoped to the authenticated recipient. | Must | Code | Notification queries filter by recipient user ID. |
| NFR-023 | Uploaded media should be stored outside the application container filesystem. | Must | Code and existing documentation | Upload services store media in object storage; deployment docs describe Blob Storage persistence. |
| NFR-024 | Secrets and credentials must not be included in portfolio-facing requirements documents. | Must | Existing documentation | This document references variable names and controls only, not secret values or private endpoints. |
| NFR-025 | HTTPS/TLS should protect production traffic between users and deployed services. | Must | Existing documentation | Deployment docs describe Vercel HTTPS and Nginx/Let's Encrypt TLS for backend traffic. |
| NFR-026 | Development and production identity configuration should be separated. | Should | Existing documentation | Auth/deployment docs describe separate Clerk environments and environment-driven backend issuer/JWKS settings. |

## Availability And Reliability Requirements

| ID | Requirement | Priority | Source | Acceptance Criteria |
|---|---|---|---|---|
| NFR-027 | The backend should expose a health endpoint for availability checks. | Should | Code | `/health` is available without authentication. |
| NFR-028 | The backend container should restart automatically after process or host restarts where configured. | Should | Existing documentation and workflow | Deployment workflow starts the container with a restart policy. |
| NFR-029 | Deployment should avoid manual artifact transfer for the standard backend release path. | Should | Existing documentation and workflow | Push to `main` triggers build, image push, and remote redeploy. |
| NFR-030 | Container logs should be bounded to reduce disk exhaustion risk. | Should | Existing documentation and workflow | Deployment workflow configures Docker log size and file count limits. |
| NFR-031 | Static frontend routing should tolerate direct URL refreshes. | Should | Code | Vercel config routes unmatched paths to the SPA entry point. |
| NFR-032 | High availability is not currently evidenced and should not be assumed. | Must | Existing documentation | Documentation describes a single VM and no high-availability database configuration. |

## Maintainability Requirements

| ID | Requirement | Priority | Source | Acceptance Criteria |
|---|---|---|---|---|
| NFR-033 | The repository should maintain a decoupled frontend/backend structure. | Must | Code | Frontend and backend remain separate top-level modules with independent build tooling. |
| NFR-034 | Backend logic should remain separated across controller, service, repository, entity, and DTO layers. | Should | Code | New backend functionality follows existing layered package structure. |
| NFR-035 | Frontend feature work should follow feature-oriented component, hook, service, model, constants, and utility organization where present. | Should | Code | New frontend feature changes fit the existing feature-folder structure. |
| NFR-036 | Requirements and operational documents should clearly identify inferred, partial, or unsupported claims. | Must | Existing documentation and project overview | Documentation avoids overstating features not verified in code/docs. |
| NFR-037 | AI-assisted PR review should remain human-in-the-loop and not replace manual merge judgment. | Should | Existing documentation and workflow | AI review is comment-triggered and posts comments/summaries rather than merging code. |
| NFR-038 | API contract drift should be reduced through generated or maintained current API documentation. | Could | Inferred from implementation | Future API reference should match controllers/DTOs; current standalone API docs require verification. |

## Scalability Requirements

| ID | Requirement | Priority | Source | Acceptance Criteria |
|---|---|---|---|---|
| NFR-039 | Frontend static assets should be served through the documented static hosting/CDN platform. | Should | Existing documentation | Deployment docs describe Vercel hosting for the React SPA. |
| NFR-040 | Binary media should scale independently from the backend VM by using object storage. | Should | Code and existing documentation | Uploaded media is stored in Blob Storage rather than container local disk. |
| NFR-041 | Database capacity should be managed through a managed PostgreSQL service and connection pooling. | Should | Code and existing documentation | Application uses PostgreSQL and Hikari configuration; deployment docs describe managed PostgreSQL. |
| NFR-042 | Backend compute scaling is constrained by the current single-VM deployment model. | Must | Existing documentation | Requirements do not assume horizontal autoscaling or managed container orchestration. |
| NFR-043 | Large future workloads should consider managed container hosting or autoscaling. | Could | Inferred from implementation | Scaling plan is documented as future improvement, not current capability. |

## Usability Requirements

| ID | Requirement | Priority | Source | Acceptance Criteria |
|---|---|---|---|---|
| NFR-044 | The frontend should provide navigable flows for public users, members, and admins. | Must | Code | Navigation and page switcher expose explore, memory, create, dashboard, notifications, auth, and admin pages where authorized. |
| NFR-045 | Validation errors should be displayed before or after submission in user-facing flows. | Should | Code | Create workshop and admin/profile flows surface validation or toast messages. |
| NFR-046 | Authentication failures should present actionable user-facing messages. | Should | Code | Clerk OAuth error cases map to sign-in/sign-up guidance where detected. |
| NFR-047 | Markdown memory content should render readable rich content without exposing unsafe raw HTML. | Should | Code | Markdown renderer supports images and known embeds while applying sanitization. |
| NFR-048 | Feedback/review UX should be presented as incomplete until implemented. | Must | Code | Placeholder feedback page is not represented as a completed capability. |

## Compatibility Requirements

| ID | Requirement | Priority | Source | Acceptance Criteria |
|---|---|---|---|---|
| NFR-049 | Backend development and deployment must target Java 17. | Must | Code and README | Gradle toolchain and README reference Java 17. |
| NFR-050 | Frontend development must target the Vite/React/TypeScript stack currently configured. | Must | Code | Frontend build uses Vite, React SWC plugin, and TypeScript config. |
| NFR-051 | Browser-facing configuration must use `VITE_` environment variables for frontend values. | Must | Code | Frontend reads `VITE_API_BASE_URL` and `VITE_CLERK_PUBLISHABLE_KEY`. |
| NFR-052 | Backend runtime configuration must be environment-driven for database, auth, and storage settings. | Must | Code and existing documentation | Backend properties use placeholders and deployment workflow injects runtime variables. |
| NFR-053 | SPA deployment must be compatible with direct route navigation. | Should | Code | `vercel.json` config provides fallback to `index.html`. |

## Deployment And Environment Requirements

| ID | Requirement | Priority | Source | Acceptance Criteria |
|---|---|---|---|---|
| NFR-054 | Backend deployment should be automated from the main branch. | Should | Existing documentation and workflow | Workflow builds JAR, builds/pushes Docker image, and redeploys remotely on push to `main`. |
| NFR-055 | Backend deployment artifacts should be containerized. | Must | Code and workflow | Dockerfile copies the built backend JAR into a Java runtime image. |
| NFR-056 | Runtime secrets must be configured outside source control. | Must | Existing documentation | Deployment docs identify secret variables by name only; no values are required in repository docs. |
| NFR-057 | Frontend deployment should be handled through static hosting integration. | Should | Existing documentation | Deployment docs describe Vercel build/deploy behavior. |
| NFR-058 | Deployment configuration naming should be consistent across backend properties, workflow, and documentation. | Must | Code and existing documentation | Known mismatch between Azure Blob container variable names is tracked as a constraint requiring alignment. |
| NFR-059 | Database migration execution strategy should be clarified. | Should | Code | SQL migrations and Flyway configuration exist, while current application profiles disable Flyway at runtime. |

## Observability, Logging, And Troubleshooting Requirements

| ID | Requirement | Priority | Source | Acceptance Criteria |
|---|---|---|---|---|
| NFR-060 | API errors should use a consistent error response shape for troubleshooting. | Should | Code | Global exception handler returns structured error DTOs for common failure classes. |
| NFR-061 | Backend should log unexpected server errors without exposing stack traces to clients in production-oriented responses. | Should | Code | Global exception handler logs unhandled errors and returns a generic server error message. |
| NFR-062 | Security and application logging levels should be configurable. | Should | Code | Application properties include logging level configuration. |
| NFR-063 | Operational troubleshooting should be documented for deployment and AI review workflows. | Should | Existing documentation | Cloud deployment and AI review docs include runbook/troubleshooting content. |
| NFR-064 | Centralized metrics, tracing, and alerting require verification and should not be assumed. | Must | Inferred from implementation | No metrics/tracing/alerting stack was found in the reviewed repository. |

## Backup, Recovery, And Data Persistence Requirements

| ID | Requirement | Priority | Source | Acceptance Criteria |
|---|---|---|---|---|
| NFR-065 | Core relational data must persist in PostgreSQL rather than in application memory. | Must | Code | Entities and repositories persist users, workshops, participants, notifications, and memories in PostgreSQL-backed tables. |
| NFR-066 | Uploaded media should persist independently of backend container redeployments. | Must | Code and existing documentation | Media upload services store blobs in object storage. |
| NFR-067 | Manual database export/import procedures should be available for migration or recovery support. | Should | Existing documentation | Deployment docs include `pg_dump`/`psql` style database migration instructions without secret values. |
| NFR-068 | Automated backup and point-in-time recovery requirements require verification. | Must | Existing documentation | Documentation references managed database operation but does not prove configured automated backup policy in this repository. |
| NFR-069 | Fallback manual backend deployment should be documented for emergency use. | Could | Existing documentation | Cloud deployment docs include manual deployment fallback steps. |

## Known Constraints

| Constraint ID | Constraint | Impact |
|---|---|---|
| KC-001 | Current deployment documentation describes a single backend VM. | Do not assume horizontal scaling or high availability. |
| KC-002 | High availability is documented as not enabled for the database. | Availability expectations should match current project scale. |
| KC-003 | Backend test coverage appears limited to a context-load test. | Non-functional quality gates should be strengthened before production-critical use. |
| KC-004 | Frontend test/lint CI checks were not verified in workflow files reviewed. | Client-side regressions may not be automatically caught in CI. |
| KC-005 | Flyway migrations exist but application profiles currently disable Flyway. | Migration process needs clarification before handover. |
| KC-006 | Azure Blob container variable names differ between code and workflow/docs. | Storage deployment configuration should be aligned. |
| KC-007 | Feedback/reviews and credit economy are incomplete or disabled. | These should not be presented as completed capabilities. |
| KC-008 | Version-based memory optimistic locking is not active in current code. | Concurrency claims should refer to edit locks only. |
| KC-009 | Public user profile access is unclear due to controller comment/security config mismatch. | Access expectation should be verified before documenting as public. |
| KC-010 | Live deployment state was not inspected. | Deployment claims are based on repository evidence only. |

## Assumptions And Inferred Requirements

| ID | Assumption Or Inference | Source |
|---|---|---|
| A-001 | The current architecture is appropriate for a club-scale workload rather than high-traffic enterprise scale. | Inferred from implementation and deployment docs |
| A-002 | Public workshop filtering is optimized for user relevance by filtering active statuses in the frontend. | Inferred from implementation |
| A-003 | Blob Storage is intended to reduce VM disk dependency and preserve media across redeployments. | Existing documentation and implementation |
| A-004 | AI review workflows are quality-assistance tooling, not formal approval gates. | Existing documentation and workflow behavior |
| A-005 | Production security depends on correct external secret configuration in GitHub Actions, Vercel, and deployed runtime environments. | Existing documentation |

## Verification Notes

Directly supported by code: JWT/JWKS security, stateless session policy, CORS configuration, role-based admin checks, structured error handling, upload validation, Markdown sanitization, health endpoint, frontend lazy loading, SPA fallback routing, storage service integration, and PostgreSQL-backed persistence.

Directly supported by existing documentation: Vercel hosting, Azure VM backend deployment, Azure PostgreSQL, Azure Blob Storage, Nginx/TLS, GitHub Actions/GHCR deployment, secret injection practices, VM memory/log constraints, manual deployment fallback, and database export/import runbook guidance.

Inferred from implementation: suitability for club-scale workloads, frontend active-status discovery behavior, maintainability implications of feature folders/layered backend packages, and the role of AI review as quality assistance.

Weakened or marked for verification because support was incomplete: quantified performance SLAs, automated backups, centralized monitoring/alerting, high availability, frontend test CI, public user profile access, Flyway runtime migration execution, and live deployment state.
