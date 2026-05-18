# SkillSwap Documentation Index

> This file is the index of all documents under `docs/`. Use it to quickly locate which document and which section to open when changing a specific topic.
>
> Guidance for an AI assistant: first check **"Find by Topic"** below to locate the relevant document and section (line numbers included), then open that section directly to edit it instead of reading the whole document.
>
> Note: `docs/TEST_PLAN.md` is intentionally excluded from this index. Line numbers are a snapshot taken when this index was created and may drift after large edits — treat section titles as the source of truth.

---

## Document List

| # | Document | Path | Main Content |
|---|---|---|---|
| 1 | Project Overview | [docs/01-Project-Overview.md](docs/01-Project-Overview.md) | What the project is, the problem it solves, tech stack, high-level architecture, contributions and limitations |
| 2 | Functional Requirements | [docs/02-requirements/Functional-Requirements.md](docs/02-requirements/Functional-Requirements.md) | FR-xxx functional requirements, user roles, user journeys, business rules BR-xxx |
| 3 | Non-Functional Requirements | [docs/02-requirements/Non-Functional-Requirements.md](docs/02-requirements/Non-Functional-Requirements.md) | NFR-xxx: performance / security / availability / maintainability / scalability / deployment / observability / recovery |
| 4 | System Architecture | [docs/03-architecture/System-Architecture.md](docs/03-architecture/System-Architecture.md) | Frontend/backend architecture, routing, data architecture, auth, media storage, sequence diagrams |
| 5 | Database Design | [docs/03-architecture/Database-Design.md](docs/03-architecture/Database-Design.md) | ER diagram, table fields, relationships, constraints, indexes, data lifecycle |
| 6 | Security Design | [docs/03-architecture/Security-Design.md](docs/03-architecture/Security-Design.md) | Authentication / authorization / API security / secrets / network / TLS / storage security / risks and improvements |
| 7 | API Documentation | [docs/04-api/API-Documentation.md](docs/04-api/API-Documentation.md) | All REST endpoints, request/response models, error handling, validation rules |
| 8 | Local Development Guide | [docs/05-development/Local-Development-Guide.md](docs/05-development/Local-Development-Guide.md) | Local frontend/backend startup, database, Clerk, environment variables, running tests |
| 9 | Deployment Runbook | [docs/06-operations/Deployment-Runbook.md](docs/06-operations/Deployment-Runbook.md) | Backend/frontend deployment, secrets list, manual fallback, rollback, migration |
| 10 | Troubleshooting Guide | [docs/06-operations/Troubleshooting-Guide.md](docs/06-operations/Troubleshooting-Guide.md) | Symptom-based troubleshooting: frontend / backend / API / DB / storage / Docker / Nginx / CI |
| 11 | Admin Guide | [docs/07-user-guides/Admin-Guide.md](docs/07-user-guides/Admin-Guide.md) | Admin workflows: workshop review, Memory Studio, permission boundaries |
| 12 | End-User Guide | [docs/07-user-guides/End-User-Guide.md](docs/07-user-guides/End-User-Guide.md) | Regular user actions: sign up/in, attend, submit workshops, notifications, FAQ |
| 13 | Decision Records (ADR) | [docs/09-decision-records/](docs/09-decision-records/) | ADR-001~007: rationale for Clerk / Vercel / Azure VM / PostgreSQL / Blob / CI / Nginx choices |

---

## Find by Topic

> When changing one of the categories below, jump straight to the matching document section.

### Authentication / Login / Clerk / JWT
- Architecture: [System-Architecture.md §7 Authentication and Authorization Architecture](docs/03-architecture/System-Architecture.md#L308), [§4 Frontend Auth Integration](docs/03-architecture/System-Architecture.md#L133)
- Security detail: [Security-Design.md §4 Authentication](docs/03-architecture/Security-Design.md#L84), [§5 JWT Validation](docs/03-architecture/Security-Design.md#L122), [§6 RBAC](docs/03-architecture/Security-Design.md#L171)
- Requirements: [Functional-Requirements.md → Authentication And User Accounts (FR-001~005)](docs/02-requirements/Functional-Requirements.md#L52)
- Local config: [Local-Development-Guide.md §8 Authentication Setup](docs/05-development/Local-Development-Guide.md#L363)
- Decision rationale: [ADR-001 Use Clerk for Authentication](docs/09-decision-records/ADR-001-Use-Clerk-for-Authentication.md)
- Troubleshooting: [Troubleshooting-Guide.md §9 Authentication and Authorization Issues](docs/06-operations/Troubleshooting-Guide.md#L708)

### Workshops (discovery / submission / attendance / review)
- Requirements: [Functional-Requirements.md → Workshop Discovery/Submission/Participation (FR-011~022)](docs/02-requirements/Functional-Requirements.md#L72), [Admin Workflows (FR-036~042)](docs/02-requirements/Functional-Requirements.md#L117)
- Architecture sequences: [System-Architecture.md §9.2 Creating a Workshop](docs/03-architecture/System-Architecture.md#L433), [§9.3 Join/Leave](docs/03-architecture/System-Architecture.md#L456), [§9.4 Admin Review](docs/03-architecture/System-Architecture.md#L474)
- API: [API-Documentation.md §7.3 Workshops](docs/04-api/API-Documentation.md#L440), [§7.4 Admin Workshop Review](docs/04-api/API-Documentation.md#L849)
- Tables: [Database-Design.md §5.3 workshops](docs/03-architecture/Database-Design.md#L234), [§5.4 workshop_participants](docs/03-architecture/Database-Design.md#L247)
- Business rules: [Functional-Requirements.md → Business Rules (BR-001~012)](docs/02-requirements/Functional-Requirements.md#L139)
- Admin actions: [Admin-Guide.md → Workshop Administration](docs/07-user-guides/Admin-Guide.md#L67)
- User actions: [End-User-Guide.md → Core User Workflows](docs/07-user-guides/End-User-Guide.md#L119)

### Memory Pages / Memory Studio / Edit Locks
- Requirements: [Functional-Requirements.md → Core Content And Memory Features (FR-027~031)](docs/02-requirements/Functional-Requirements.md#L98)
- Architecture sequence: [System-Architecture.md §9.6 Admin Memory Editing with Locks](docs/03-architecture/System-Architecture.md#L520)
- API: [API-Documentation.md §7.6 Public Memories](docs/04-api/API-Documentation.md#L1244), [§7.7 Admin Memory Studio](docs/04-api/API-Documentation.md#L1304)
- Tables: [Database-Design.md §5.6 memory_entries](docs/03-architecture/Database-Design.md#L273), [§5.7 memory_media](docs/03-architecture/Database-Design.md#L286)
- Admin actions: [Admin-Guide.md → Memory Studio Administration](docs/07-user-guides/Admin-Guide.md#L194)
- Note: version-based optimistic locking is not active; the current model is edit locks (stated across multiple documents)

### Notifications
- Requirements: [Functional-Requirements.md → Notifications (FR-023~026)](docs/02-requirements/Functional-Requirements.md#L89)
- API: [API-Documentation.md §7.5 Notifications](docs/04-api/API-Documentation.md#L1124)
- Table: [Database-Design.md §5.5 notifications](docs/03-architecture/Database-Design.md#L260)

### User Profile / Skills / Avatar
- Requirements: [Functional-Requirements.md → User Profile Management (FR-006~010)](docs/02-requirements/Functional-Requirements.md#L62)
- API: [API-Documentation.md §7.2 User Accounts And Profiles](docs/04-api/API-Documentation.md#L193)
- Tables: [Database-Design.md §5.1 user_account](docs/03-architecture/Database-Design.md#L208), [§5.2 user_skill](docs/03-architecture/Database-Design.md#L221)
- User actions: [End-User-Guide.md → User Profile Management](docs/07-user-guides/End-User-Guide.md#L95)

### Media / File Upload (avatar / workshop image / memory media)
- Architecture: [System-Architecture.md §8 Media / File Storage Architecture](docs/03-architecture/System-Architecture.md#L366)
- Database references: [Database-Design.md §8 Media and File Reference Storage](docs/03-architecture/Database-Design.md#L330)
- API behaviour: [API-Documentation.md §11 File Upload And Media API Behaviour](docs/04-api/API-Documentation.md#L1820)
- Security: [Security-Design.md §13 Azure Blob Storage Security](docs/03-architecture/Security-Design.md#L435)
- Local config: [Local-Development-Guide.md §9 Media / File Upload Setup](docs/05-development/Local-Development-Guide.md#L382)
- Decision: [ADR-005 Use Azure Blob Storage for Media](docs/09-decision-records/ADR-005-Use-Azure-Blob-Storage-for-Media.md)
- Known pitfall: container variable name mismatch `AZURE_STORAGE_MEDIA_CONTAINER` vs `AZURE_STORAGE_MEMORIES_CONTAINER` (mentioned across multiple documents)

### Database Tables / Fields / Relationships / Indexes / Migrations
- All in [Database-Design.md](docs/03-architecture/Database-Design.md): ER diagram [§4](docs/03-architecture/Database-Design.md#L76), table catalogue [§5](docs/03-architecture/Database-Design.md#L206), relationships [§6](docs/03-architecture/Database-Design.md#L299), indexes [§12](docs/03-architecture/Database-Design.md#L429), migration/recovery [§14](docs/03-architecture/Database-Design.md#L469)
- Decision: [ADR-004 Use Azure PostgreSQL for Database](docs/09-decision-records/ADR-004-Use-Azure-PostgreSQL-for-Database.md)

### REST API Endpoints (add/modify an endpoint)
- Check the endpoint summary first: [API-Documentation.md §6 Endpoint Summary](docs/04-api/API-Documentation.md#L120)
- Detailed by domain: Health [§7.1](docs/04-api/API-Documentation.md#L169), User [§7.2](docs/04-api/API-Documentation.md#L193), Workshops [§7.3](docs/04-api/API-Documentation.md#L440), Admin Workshop [§7.4](docs/04-api/API-Documentation.md#L849), Notifications [§7.5](docs/04-api/API-Documentation.md#L1124), Public Memories [§7.6](docs/04-api/API-Documentation.md#L1244), Admin Memory [§7.7](docs/04-api/API-Documentation.md#L1304)
- Request/response models: [§8 Request And Response Models](docs/04-api/API-Documentation.md#L1530)
- Validation rules: [§10 Validation Rules](docs/04-api/API-Documentation.md#L1791)

### Deployment / CI/CD / Environment Variables / Rollback
- Process and commands: [Deployment-Runbook.md](docs/06-operations/Deployment-Runbook.md) — backend auto-deploy [§7](docs/06-operations/Deployment-Runbook.md#L135), frontend [§8](docs/06-operations/Deployment-Runbook.md#L222), manual fallback [§9](docs/06-operations/Deployment-Runbook.md#L263), rollback [§13](docs/06-operations/Deployment-Runbook.md#L442)
- Secrets/env var lists: [Deployment-Runbook.md §6](docs/06-operations/Deployment-Runbook.md#L77), [Local-Development-Guide.md §10](docs/05-development/Local-Development-Guide.md#L415)
- Decisions: [ADR-002 Vercel](docs/09-decision-records/ADR-002-Use-Vercel-for-Frontend-Hosting.md), [ADR-003 Azure VM](docs/09-decision-records/ADR-003-Use-Azure-VM-for-Backend-Hosting.md), [ADR-006 GitHub Actions+GHCR](docs/09-decision-records/ADR-006-Use-GitHub-Actions-and-GHCR-for-CICD.md), [ADR-007 Nginx](docs/09-decision-records/ADR-007-Use-Nginx-for-Reverse-Proxy-and-TLS-Termination.md)

### Security (CORS / secret management / network / TLS / risks)
- All in [Security-Design.md](docs/03-architecture/Security-Design.md): API security incl. CORS [§7](docs/03-architecture/Security-Design.md#L215), secrets [§9](docs/03-architecture/Security-Design.md#L307), network [§10](docs/03-architecture/Security-Design.md#L347), TLS [§11](docs/03-architecture/Security-Design.md#L378), risks and mitigations [§17](docs/03-architecture/Security-Design.md#L595), recommended improvements [§20](docs/03-architecture/Security-Design.md#L651)

### Run Locally / Debug Local Issues
- Startup: [Local-Development-Guide.md](docs/05-development/Local-Development-Guide.md) (frontend §5, backend §6, database §7, full run §11)
- Local errors: [Local-Development-Guide.md §14 Troubleshooting Local Setup](docs/05-development/Local-Development-Guide.md#L595) or [Troubleshooting-Guide.md §6/§7](docs/06-operations/Troubleshooting-Guide.md#L232)

### Production / Live Environment Issues
- [Troubleshooting-Guide.md §15 Production Runtime Issues](docs/06-operations/Troubleshooting-Guide.md#L1349); look up by HTTP status code in [§8 API Issues](docs/06-operations/Troubleshooting-Guide.md#L535)

---

## Per-Document Table of Contents

> The number after each section is the line number in that document, for direct navigation.

### 1. [docs/01-Project-Overview.md](docs/01-Project-Overview.md)
- 1. Project Summary — L3
- 2. Business Problem / User Need — L16
- 3. Target Users — L30
- 4. Core Features (Workshop / Submission / Auth / Notifications / Memory / Media / Eng Ops) — L38
- 5. Technical Stack — L88
- 6. High-Level Architecture — L100
- 7. My Contribution — L139
- 8. Documentation And Operational Work Completed — L155
- 9. Current Deployment Status — L176
- 10. Limitations And Future Improvements — L190
- Professional Relevance — L204
- Evidence Reviewed — L222

### 2. [docs/02-requirements/Functional-Requirements.md](docs/02-requirements/Functional-Requirements.md)
- Document Purpose — L3
- System Scope — L9
- User Roles And Permissions — L28
- Key User Journeys — L37
- Business/User-Facing Functional Requirements — L50
  - Authentication And User Accounts (FR-001~005) — L52
  - User Profile Management (FR-006~010) — L62
  - Workshop Discovery, Submission, And Participation (FR-011~022) — L72
  - Notifications (FR-023~026) — L89
  - Core Content And Memory Features (FR-027~031) — L98
  - Image And Media Upload Features (FR-032~035) — L108
  - Admin Workflows (FR-036~042) — L117
- Technical/System Functional Requirements (FR-043~047) — L129
- Business Rules (BR-001~018) — L139
- Acceptance Criteria Summary — L162
- Out-Of-Scope Or Unsupported Features — L173
- Assumptions And Inferred Requirements — L184
- Verification Notes — L193

### 3. [docs/02-requirements/Non-Functional-Requirements.md](docs/02-requirements/Non-Functional-Requirements.md)
- Document Purpose — L3
- Performance Requirements (NFR-001~006) — L9
- Security Requirements (NFR-007~015) — L20
- Authentication And Authorization Requirements (NFR-016~020) — L34
- Data Privacy And Data Protection (NFR-021~026) — L44
- Availability And Reliability (NFR-027~032) — L55
- Maintainability (NFR-033~038) — L66
- Scalability (NFR-039~043) — L77
- Usability (NFR-044~048) — L87
- Compatibility (NFR-049~053) — L97
- Deployment And Environment (NFR-054~059) — L107
- Observability, Logging, Troubleshooting (NFR-060~064) — L118
- Backup, Recovery, Data Persistence (NFR-065~069) — L128
- Known Constraints (KC-001~010) — L138
- Assumptions And Inferred Requirements — L153
- Verification Notes — L163

### 4. [docs/03-architecture/System-Architecture.md](docs/03-architecture/System-Architecture.md)
- 1. Document Purpose — L5
- 2. Architecture Summary — L11
- 3. High-Level System Architecture (with mermaid diagram) — L27
- 4. Frontend Architecture (Structure / Routing / Feature Areas / API Pattern / Auth / State / Styling) — L68
- 5. Backend Architecture (Runtime / Layered / Modules / Request Lifecycle / Auth Enforcement) — L149
- 6. Data Architecture (DB Tech / Entities / Relationships / Ownership / Clerk Mapping) — L244
- 7. Authentication and Authorization Architecture — L308
- 8. Media / File Storage Architecture — L366
- 9. Core Request and Data Flows (9.1 Login / 9.2 Create Workshop / 9.3 Join-Leave / 9.4 Review / 9.5 Upload / 9.6 Memory Lock) — L405
- 10. External Integrations — L545
- 11. Deployment Context Summary — L561
- 12. Key Architecture Decisions — L577
- 13. Scalability, Reliability, Maintainability — L595
- 14. Known Limitations and Assumptions — L637
- 15. Verification Notes — L653

### 5. [docs/03-architecture/Database-Design.md](docs/03-architecture/Database-Design.md)
- 1. Document Purpose — L5
- 2. Database Overview (incl. Schema Management Status) — L22
- 3. Persistence Architecture — L50
- 4. Entity Relationship Diagram (ER mermaid diagram + fields) — L76
- 5. Table / Entity Catalogue — L206
  - 5.1 user_account — L208 / 5.2 user_skill — L221 / 5.3 workshops — L234 / 5.4 workshop_participants — L247 / 5.5 notifications — L260 / 5.6 memory_entries — L273 / 5.7 memory_media — L286
- 6. Relationship Documentation — L299
- 7. User Identity and Authentication Mapping — L314
- 8. Media and File Reference Storage — L330
- 9. Data Lifecycle (Users/Skills, Workshops/Attendance, Notifications, Memories) — L344
- 10. Database Configuration — L383
- 11. Data Integrity and Validation — L401
- 12. Indexes and Performance Considerations — L429
- 13. Seed Data and Admin Records — L457
- 14. Backup, Migration, and Recovery — L469
- 15. Known Limitations and Future Improvements — L482
- 16. Verification Notes — L510

### 6. [docs/03-architecture/Security-Design.md](docs/03-architecture/Security-Design.md)
- 1. Document Purpose — L3
- 2. Security Scope — L11
- 3. Security Architecture Summary — L37
- 4. Authentication Design — L84
- 5. JWT Validation — L122
- 6. Authorization and Role-Based Access Control — L171
- 7. API Security (incl. Public/Protected Routes, Input Validation, Error Handling, CORS) — L215
- 8. Frontend Security Considerations — L275
- 9. Secret Management — L307
- 10. Network Security — L347
- 11. HTTPS / TLS Design — L378
- 12. Database Security — L404
- 13. Azure Blob Storage Security and Access Model — L435
- 14. CI/CD and Deployment Security — L483
- 15. Container and VM Security — L520
- 16. Data Protection and Privacy — L553
- 17. Threats, Risks, and Mitigations (risk table) — L595
- 18. Security Assumptions — L613
- 19. Known Limitations — L631
- 20. Recommended Future Improvements — L651
- 21. Verification Notes — L673

### 7. [docs/04-api/API-Documentation.md](docs/04-api/API-Documentation.md)
- 1. Document Purpose — L5
- 2. API Overview (incl. JSON Conventions) — L13
- 3. Authentication (Mechanism / Local User Mapping / Public / Protected / Admin-Only) — L35
- 4. Common Request Conventions — L87
- 5. Common Response Conventions (incl. Date/Time formats) — L101
- 6. Endpoint Summary (endpoint master table — check here first) — L120
- 7. Detailed Endpoint Documentation — L165
  - 7.1 Health — L169
  - 7.2 User Accounts And Profiles (me / {id} / PATCH / avatar / skills) — L193
  - 7.3 Workshops (create / list / public / {id} / mine / attending / join / leave / hide / request-approval / delete) — L440
  - 7.4 Admin Workshop Review (list / pending / {id} / PUT / approve / reject / cancel / image / hello) — L849
  - 7.5 Notifications (list / unread-count / read / read-all) — L1124
  - 7.6 Public Memories (list / {slug}) — L1244
  - 7.7 Admin Memory Studio (list / create / PUT / delete / lock / unlock / media) — L1304
- 8. Request And Response Models (Common / Workshop / User / Notification / Memory models) — L1530
- 9. Error Handling — L1758
- 10. Validation Rules (Bean Validation / Service-Level) — L1791
- 11. File Upload And Media API Behaviour — L1820
- 12. Admin API Behaviour — L1847
- 13. Frontend Integration Notes — L1883
- 14. Security Considerations — L1910
- 15. Known Limitations And Future Improvements — L1932
- 16. Verification Notes — L1961

### 8. [docs/05-development/Local-Development-Guide.md](docs/05-development/Local-Development-Guide.md)
- 1. Document Purpose — L5
- 2. Prerequisites — L13
- 3. Repository Structure — L27
- 4. Initial Setup — L40
- 5. Frontend Local Setup (Directory / Install / Dev Server / Env File / Connect to Backend / Common Issues) — L90
- 6. Backend Local Setup (Directory / Build / Run / Local Profile / Env File / Clerk Fallback / Common Issues) — L171
- 7. Database Local Setup — L302
- 8. Authentication Setup — L363
- 9. Media / File Upload Setup — L382
- 10. Environment Variables (Frontend / Backend / Production-only) — L415
- 11. Running the Full Application Locally — L471
- 12. Running Tests (no frontend tests / backend context-load) — L530
- 13. Code Quality and Build Commands — L568
- 14. Troubleshooting Local Setup — L595
- 15. Local vs Production Differences — L612
- 16. Verification Checklist — L626
- 17. Known Limitations and Assumptions — L644
- 18. Verification Notes — L677

### 9. [docs/06-operations/Deployment-Runbook.md](docs/06-operations/Deployment-Runbook.md)
- 1. Document Purpose — L5
- 2. Deployment Scope — L18
- 3. Deployment Overview — L37
- 4. Deployment Environments — L52
- 5. Pre-Deployment Checklist — L61
- 6. Required Secrets and Environment Variables (A. GitHub Actions / B. Backend Runtime / C. Frontend) — L77
- 7. Automated Backend Deployment (Trigger / Pipeline / Build / VM Redeploy) — L135
- 8. Automated Frontend Deployment — L222
- 9. Manual Backend Deployment Fallback (Fallback A / B / Artifact Transfer) — L263
- 10. Database Migration or Setup During Deployment — L362
- 11. Post-Deployment Verification Checklist — L390
- 12. Basic Verification Commands — L408
- 13. Rollback Notes — L442
- 14. Known Deployment Limitations — L458
- 15. Verification Notes — L471

### 10. [docs/06-operations/Troubleshooting-Guide.md](docs/06-operations/Troubleshooting-Guide.md)
- 1. Document Purpose — L5
- 2. Troubleshooting Scope — L18
- 3. Quick Diagnostic Checklist — L42
- 4. Common Diagnostic Commands (Frontend / Backend / API / VM-Docker / Nginx / CI) — L59
- 5. Troubleshooting Format — L215
- 6. Frontend Issues (6.1~6.7: startup / build / blank page / reach backend / env vars / auth UI / CORS) — L232
- 7. Backend Local Development Issues (7.1~7.7) — L386
- 8. API Issues (by status code 400/401/403/404/409/413/423/500/502) — L535
- 9. Authentication and Authorization Issues (9.1~9.5) — L708
- 10. Database Issues (10.1~10.7) — L804
- 11. Azure Blob Storage / Media Upload Issues (11.1~11.3) — L937
- 12. Docker and Backend Container Issues (12.1~12.5) — L1002
- 13. Nginx / HTTPS / Reverse Proxy Issues (13.1~13.5) — L1102
- 14. CI/CD and Deployment Pipeline Issues (14.1~14.8) — L1198
- 15. Production Runtime Issues (15.1~15.6) — L1349
- 16. Log Locations and Useful Evidence — L1469
- 17. Escalation and Recovery Notes — L1506
- 18. Known Troubleshooting Limitations — L1537
- 19. Verification Notes — L1552

### 11. [docs/07-user-guides/Admin-Guide.md](docs/07-user-guides/Admin-Guide.md)
- Document Purpose — L5
- Intended Audience — L11
- Admin Role Overview — L18
- Admin Access Prerequisites — L32
- Admin Authentication And Authorization Model — L44
- Admin Navigation — L56
- Workshop Administration (open / review / edit / upload cover / approve / reject / cancel / participant export / backend delete) — L67
- Memory Studio Administration (statuses / open / create / edit draft / edit published / upload images / publish-archive / delete) — L194
- Notifications For Admins — L298
- Viewing And Managing Users — L312
- Reports, Flags, Complaints, And Audit Logs — L326
- Data Correction And Support Requests — L337
- Permission Boundaries — L350
- Operational Cautions — L361
- Common Admin Errors And Troubleshooting — L373
- Escalation Notes For Technical Issues — L389
- Admin-Facing Limitations — L411
- Verification Notes — L422

### 12. [docs/07-user-guides/End-User-Guide.md](docs/07-user-guides/End-User-Guide.md)
- Document Purpose — L5
- Intended Audience — L11
- Product Overview — L21
- What Users Can Do — L32
- Account Registration And Login (Sign Up / Sign In / Auth Options) — L52
- Main User Navigation — L81
- User Profile Management (Edit / Fields) — L95
- Core User Workflows (browse / attend / cancel / submit workshop / manage hosted / view attended / upload / notifications / memory / feedback) — L119
- Common Validation Errors — L234
- Common User Troubleshooting — L250
- User-Facing Limitations — L262
- Frequently Asked Questions — L272
- Verification Notes — L306

### 13. Decision Records (ADR) — [docs/09-decision-records/](docs/09-decision-records/)
> All 7 ADRs share the same structure: Status / Date / Context / Decision / Rationale / Alternatives Considered / Consequences (Positive, Negative, Future) / Related Documentation.

| ADR | Topic | File |
|---|---|---|
| ADR-001 | Use Clerk for authentication | [ADR-001-Use-Clerk-for-Authentication.md](docs/09-decision-records/ADR-001-Use-Clerk-for-Authentication.md) |
| ADR-002 | Use Vercel for frontend hosting | [ADR-002-Use-Vercel-for-Frontend-Hosting.md](docs/09-decision-records/ADR-002-Use-Vercel-for-Frontend-Hosting.md) |
| ADR-003 | Use Azure VM for backend hosting | [ADR-003-Use-Azure-VM-for-Backend-Hosting.md](docs/09-decision-records/ADR-003-Use-Azure-VM-for-Backend-Hosting.md) |
| ADR-004 | Use Azure PostgreSQL for the database | [ADR-004-Use-Azure-PostgreSQL-for-Database.md](docs/09-decision-records/ADR-004-Use-Azure-PostgreSQL-for-Database.md) |
| ADR-005 | Use Azure Blob Storage for media | [ADR-005-Use-Azure-Blob-Storage-for-Media.md](docs/09-decision-records/ADR-005-Use-Azure-Blob-Storage-for-Media.md) |
| ADR-006 | Use GitHub Actions + GHCR for CI/CD | [ADR-006-Use-GitHub-Actions-and-GHCR-for-CICD.md](docs/09-decision-records/ADR-006-Use-GitHub-Actions-and-GHCR-for-CICD.md) |
| ADR-007 | Use Nginx for reverse proxy and TLS termination | [ADR-007-Use-Nginx-for-Reverse-Proxy-and-TLS-Termination.md](docs/09-decision-records/ADR-007-Use-Nginx-for-Reverse-Proxy-and-TLS-Termination.md) |

---

## Maintenance Note

Line numbers in this index go stale after document structure changes. Either update the affected line numbers manually, or have the AI locate sections by section title rather than relying on line numbers. When adding a new document, remember to add it to the **Document List** and **Per-Document Table of Contents** above.
