# ADR-004: Use Azure PostgreSQL for Database

## Status
Accepted

## Date
2026-05-15

## Context
SkillSwap stores relational application data: users, external auth subject mappings, skills, workshops, participants, notifications, memory entries, memory media references, roles, and timestamps. The backend uses Spring Data JPA/Hibernate repositories and PostgreSQL JDBC drivers.

Existing deployment documentation describes Azure Database for PostgreSQL Flexible Server as the production database. Repository evidence supports PostgreSQL as the active database technology:

- `skill-swap-backend/build.gradle` includes PostgreSQL, Spring Data JPA, Hibernate, and Flyway dependencies.
- Backend properties use PostgreSQL JDBC URLs, including SSL mode for production-oriented configuration.
- The database design document identifies PostgreSQL and Azure Database for PostgreSQL as the documented production context.
- JPA entities and repositories model relational data and constraints.
- Uploaded binary media is stored outside the database; PostgreSQL stores media URL references.

Runtime Flyway execution is disabled in inspected application properties, so schema application is currently an operational concern requiring verification.

## Decision
We decided to use Azure Database for PostgreSQL as the managed relational database for SkillSwap.

The Spring Boot backend connects to PostgreSQL using datasource configuration supplied through environment variables or deployment secrets.

## Rationale
- PostgreSQL fits the relational data model and existing JPA/Hibernate implementation.
- Managed PostgreSQL avoids self-hosting the database on the backend VM.
- Azure PostgreSQL aligns with the documented Azure backend and storage deployment.
- SSL-required connection settings are documented and reflected in production-oriented configuration.
- PostgreSQL is familiar, portable, and appropriate for a small application with structured transactional data.

## Alternatives Considered
- Self-hosted PostgreSQL on the Azure VM
  - Why considered: It would keep compute and database on one server and reduce the number of managed services.
  - Why not selected: It would add backup, patching, storage, availability, and resource contention responsibilities to the VM.
  - Source status: Explicitly documented comparison.

- Supabase PostgreSQL
  - Why considered: A Supabase-oriented profile remains in backend resources, and older project history references Supabase.
  - Why not selected: Current deployment documentation identifies Azure PostgreSQL as the production database target. Supabase is retained only as historical/alternate configuration.
  - Source status: Reasonable inferred alternative based on retained Supabase profile and historical docs.

- MySQL
  - Why considered: It is a common managed relational database option.
  - Why not selected: The current code, dependencies, SQL scripts, and documentation are PostgreSQL-oriented.
  - Source status: Reasonable inferred alternative.

- MongoDB
  - Why considered: It could store flexible document-shaped data.
  - Why not selected: SkillSwap's current model is relational and uses joins, foreign keys, JPA entities, and PostgreSQL SQL/migrations.
  - Source status: Reasonable inferred alternative.

- SQLite
  - Why considered: It is simple for local development and small demos.
  - Why not selected: It is not suitable as the documented production database for a multi-user web application with the current Spring/JPA/PostgreSQL setup.
  - Source status: Reasonable inferred alternative.

## Consequences
### Positive Consequences
- The database matches the backend persistence framework and SQL assets.
- Core data persists outside the backend container and VM filesystem.
- SSL connection posture is supported by configuration and documentation.
- Managed database hosting reduces VM-level database administration.

### Negative Consequences / Trade-offs
- Azure PostgreSQL introduces cloud cost and service dependency.
- Live backup, retention, restore, firewall, HA, and performance settings require provider-side verification.
- Current docs describe a single-node database configuration; high availability should not be assumed.
- Schema migration is not fully automated in the deployment workflow; Flyway exists but runtime execution is disabled in inspected properties.
- Database credentials and connection strings must be handled through secret stores and never committed or copied into documentation.

### Future Considerations
- Standardize the production schema migration process through CI/CD, a controlled runbook step, or explicit manual workflow.
- Verify and document backup retention, restore testing, and recovery objectives.
- Consider higher database tiers or high availability only if usage, uptime needs, or portfolio goals require it.
- Add integration tests for schema, migrations, auth subject mapping, and relationship constraints.

## Related Documentation
- `docs/Project-Overview.md`
- `docs/03-architecture/System-Architecture.md`
- `docs/03-architecture/Database-Design.md`
- `docs/03-architecture/Security-Design.md`
- `docs/05-development/Local-Development-Guide.md`
- `docs/06-operations/Deployment-Runbook.md`
- `docs/06-operations/Troubleshooting-Guide.md`
- `doc/cloud/SkillSwap-Cloud-Deployment.md`
- `skill-swap-backend/build.gradle`
- `skill-swap-backend/src/main/resources/application.properties`
- `skill-swap-backend/src/main/resources/application-dev.properties`
- `skill-swap-backend/src/main/resources/db/migration`
- `doc/sql`
