# SkillSwap Testing Strategy

## 1. Document Purpose

This document describes the current testing strategy for SkillSwap. It is intended for technical handover, contributor onboarding, and portfolio review.

The current automated test suite focuses on Spring Boot backend validation. Frontend CI currently provides TypeScript typecheck and production build gates, but frontend automated tests and full browser end-to-end tests are outside the current automated test scope and are listed as future improvements.

This document is based on:

- `docs/TEST_PLAN.md`
- `.codex/skills/test-skill/SKILL.md`
- backend test source under `skill-swap-backend/src/test/java`
- backend test configuration under `skill-swap-backend/src/test/resources/application-test.properties`
- backend Gradle configuration and GitHub Actions workflow configuration
- frontend package scripts and GitHub Actions workflow configuration
- backend controllers, services, repositories, security configuration, entity/model classes, Azure Blob Storage integration, and Clerk/JWT-related configuration
- supporting architecture, API, database, security, requirements, overview, and operations documentation

No secrets, production tokens, private keys, or real credential values are included in this document.

## 2. Testing Scope

| Area | Current status | Testing approach | Notes |
| --- | --- | --- | --- |
| Backend service unit tests | Implemented | Mockito/JUnit service tests | Covers user, notification, memory, and workshop service behaviours. |
| Backend controller / API contract tests | Implemented for selected backend flows | Full-context `@SpringBootTest` + `@AutoConfigureMockMvc` | Covers selected user, workshop, notification, memory lock, and security API contracts. |
| Security regression tests | Implemented | Full-context MockMvc tests with Spring Security filter chain | Covers admin endpoint protection, upload validation, memory cover URL validation, and selected authorization rules. |
| Authentication/JWT tests | Implemented | MockMvc `jwt().authorities(...)` for request tests; dedicated `JwtConverterTest` for authority mapping | Real Clerk/JWKS is not called in tests. |
| Repository/database integration tests | Partially implemented | Full-context tests use real Spring Data repositories with PostgreSQL Testcontainers | No dedicated `@DataJpaTest` repository-only suites are currently present. |
| Azure Blob Storage integration behaviour | Implemented through mocks/stubs and focused unit tests | `AzureBlobStorageService` is mocked in Spring context tests; service tests mock storage; one focused storage unit test covers SAS failure behaviour | Tests avoid real Azure calls. |
| CI backend test execution | Implemented | GitHub Actions runs `./gradlew test` in `skill-swap-backend` | Workflow uploads Gradle test reports and result XML files. |
| CI frontend typecheck/build execution | Implemented | GitHub Actions runs `npm run typecheck` and `npm run build` in `skill-swap-frontend` | Workflow uses `npm ci`; no artifact upload is configured. |
| Frontend automated tests | Not currently implemented | Future improvement | `skill-swap-frontend/package.json` has no test script or frontend test framework configuration. |
| End-to-end browser tests | Not currently implemented | Future improvement | No Playwright/Cypress E2E suite was found. |
| Performance/load tests | Not currently implemented | Future improvement | No load test tooling or CI job was found. |

## 3. Testing Principles

The project testing approach follows these principles:

- Test backend business logic close to the source of truth.
- Prefer service-layer unit tests for core business rules.
- Use controller/API tests to lock endpoint contracts where API behaviour matters.
- Preserve current behaviour first; record behavioural inconsistencies separately instead of silently changing product behaviour.
- Avoid real external service calls in tests.
- Keep tests focused on observable behaviour rather than incidental implementation details.
- Prefer deterministic tests over broad flaky flows.
- Avoid low-value tests that only verify framework behaviour, trivial DTO mapping, simple delegation, or generated code.
- Use Given / When / Then structure where appropriate.

## 4. Backend Test Infrastructure

### Test Command

From the backend module:

```bash
./gradlew test
```

On Windows:

```powershell
.\gradlew.bat test
```

### Gradle Test Profile

Verified from `skill-swap-backend/build.gradle`: the Gradle `test` task runs JUnit Platform and sets:

```groovy
systemProperty "spring.profiles.active", "test"
```

`SkillSwapBackendApplicationTests.shouldHaveTestProfileActive()` verifies that the `test` profile is active during the backend test task.

### Test Profile Configuration

Verified from `skill-swap-backend/src/test/resources/application-test.properties`:

- uses PostgreSQL Testcontainers through the JDBC URL pattern `jdbc:tc:postgresql:16-alpine:///...`
- uses `org.testcontainers.jdbc.ContainerDatabaseDriver`
- uses Hibernate `ddl-auto=create-drop`
- disables Flyway during tests with `spring.flyway.enabled=false`
- configures dummy or disabled external URLs for JWT/JWKS and storage-related properties
- sets dummy Clerk and storage values so Spring property binding succeeds without real credentials

The checked-in repository contains Flyway dependencies, a Gradle Flyway plugin, and migration files. However, the current test profile disables Flyway and creates the test schema through Hibernate.

### External Service Isolation

Tests avoid production external services:

- Azure Blob Storage is mocked in full-context MockMvc tests with `@MockitoBean`.
- Service-layer storage behaviour uses Mockito mocks.
- Clerk/JWKS is avoided by MockMvc request post-processors and a test `JwtDecoder` override in the context-load test.
- Production PostgreSQL is replaced by PostgreSQL Testcontainers.
- Production backend/frontend endpoints are not called.

### Test Fixtures and Helpers

`skill-swap-backend/src/test/java/club/skillswap/testsupport/TestFixtures.java` provides valid-by-default user fixtures. Several API contract tests also create test data directly through repositories within `@Transactional` test methods.

### Production Code Change for Test Safety

Verified from `SkillSwapBackendApplication`: the startup database smoke check bean is annotated with `@Profile("!test")`. This prevents the test profile from running the production-style startup smoke check while preserving the bean outside tests.

## 5. Test Types Used

### A. Unit Tests

Implemented unit tests include:

- service-layer Mockito tests for `UserService`, `NotificationServiceImpl`, `MemoryServiceImpl`, and `WorkshopServiceImpl`
- authentication/authority mapping tests in `JwtConverterTest`
- focused configuration and validation tests for CORS, required JWT configuration, Azure Blob URL validation, image upload validation, and Azure Blob SAS failure behaviour

These tests generally avoid Spring context startup and mock repositories, storage, notification collaborators, and user lookup dependencies.

### B. API / Controller Tests

Implemented API contract tests use full Spring context MockMvc rather than `@WebMvcTest`:

- `UserProfileApiContractTests`
- `WorkshopApiContractTests`
- `NotificationApiContractTests`
- `MemoryLockApiContractTests`
- `SecurityRegressionTests`

These tests verify selected endpoint status codes, response bodies, validation errors, authorization outcomes, and observable API contracts.

### C. Integration-Style Tests

Implemented integration-style tests use:

- `@SpringBootTest`
- `@AutoConfigureMockMvc`
- real controllers, services, repositories, JPA mappings, and security filter chain
- PostgreSQL Testcontainers through the test datasource
- `@Transactional` rollback for selected API contract tests

Not currently implemented: dedicated repository-only `@DataJpaTest` suites.

### D. Security Regression Tests

`SecurityRegressionTests` covers:

- admin endpoint access for admins
- denial for member and anonymous users on admin endpoints
- denial of non-admin workshop deletion
- profile patch behaviour ignoring submitted `avatarUrl`
- Azure Blob URL validation for memory cover URLs
- upload validation for SVG/fake image payloads across avatar, workshop, and memory upload paths

`JwtConverterTest`, `MemoryServiceImplAuthExtractionTest`, and `WorkshopServiceImplAuthExtractionTest` also cover JWT authority handling and supported/unsupported authentication principal types.

### E. Storage-Related Tests

Storage-related testing covers:

- mocked Azure Blob uploads for avatar, workshop image, and memory media paths
- upload object path assertions in service tests
- previous-media cleanup behaviour for avatar, workshop image, and memory deletion paths where implemented
- Azure Blob URL validation for memory URLs
- SAS generation failure handling in `AzureBlobStorageServiceTest`

Real Azure Blob calls are not used.

### F. CI Test Execution

The backend CI workflow is implemented in `.github/workflows/backend-tests.yml`.

Verified workflow characteristics:

- triggers on pull requests affecting `skill-swap-backend/**` or the workflow file
- triggers on pushes to `main` affecting `skill-swap-backend/**` or the workflow file
- runs on `ubuntu-latest`
- uses Temurin JDK 17
- runs `./gradlew test` from `skill-swap-backend`
- sets a 15 minute job timeout
- uploads `skill-swap-backend/build/reports/tests/` and `skill-swap-backend/build/test-results/` as a `test-results` artifact retained for 7 days

Inferred from implementation: Docker availability on the GitHub-hosted runner is required because the test datasource uses Testcontainers PostgreSQL.

The GitHub Action is testing infrastructure and a backend quality gate; it is not itself a business test case.

## 6. Module Coverage Summary

| Module | Test files | Main behaviours covered | Test style | Deferred coverage |
| --- | --- | --- | --- | --- |
| Test infrastructure | `SkillSwapBackendApplicationTests`, `application-test.properties`, Gradle test task | Spring context loads, active `test` profile, test-safe JWT decoder override | `@SpringBootTest`, `@TestBean` | More explicit infra diagnostics if needed |
| User | `UserServiceTest`, `UserProfileApiContractTests`, `SecurityRegressionTests` | JWT-based user creation, existing user lookup, email verification rules, profile updates, skill validation, avatar validation/upload cleanup, profile API contract | Mockito unit, full-context MockMvc | More public-profile/stat edge cases and repository-specific tests |
| Notification | `NotificationServiceImplTest`, `NotificationApiContractTests` | recipient-scoped listing/counts, read transitions, create-notification guards, API scoping, not-found contract | Mockito unit, full-context MockMvc | True async integration tests, fuller read-all/order API contracts |
| Memory | `MemoryServiceImplTest`, `MemoryServiceImplAuthExtractionTest`, `MemoryLockApiContractTests`, `SecurityRegressionTests` | public/admin auth extraction, slug/status rules, edit locks, draft lock conflict, media upload path, media cleanup, memory URL validation | Mockito unit, full-context MockMvc | Broader memory CRUD/list contracts, concurrent lock testing, more media parsing edge cases |
| Workshop | `WorkshopServiceImplTest`, `WorkshopServiceImplAuthExtractionTest`, `WorkshopApiContractTests`, `SecurityRegressionTests` | submission/admin notification behaviour, join capacity/duplicate/cutoff/status rules, no facilitator notification on join, approve/reject, image upload cleanup, visibility, lifecycle status, selected public/join API contracts | Mockito unit, full-context MockMvc | Full lifecycle/admin update/cancel/leave/hide/request-approval API matrices |
| Admin | `SecurityRegressionTests`, `MemoryLockApiContractTests`, workshop auth extraction tests | admin route protection, admin memory lock route, admin workshop access checks | full-context MockMvc and Mockito auth extraction | Full admin workflow API matrices |
| Health | none dedicated | Not currently implemented as a direct health endpoint test | Not currently implemented | Add direct `/health` contract test if useful |
| Security regression | `SecurityRegressionTests`, `JwtConverterTest`, auth extraction tests | admin/member/anonymous access, JWT role mapping, unsupported principal rejection, upload security regression checks | full-context MockMvc and Mockito unit | More route matrix breadth and external Clerk dashboard verification |
| API contract tests | `UserProfileApiContractTests`, `WorkshopApiContractTests`, `NotificationApiContractTests`, `MemoryLockApiContractTests` | selected request/response contracts and error contracts | full-context MockMvc with real repositories | Exhaustive API matrices remain deferred |

## 7. Backend Test Coverage Table

| Module | Test file(s) | Behaviour covered | Test level | External dependencies used? | Current gaps |
| --- | --- | --- | --- | --- | --- |
| Infrastructure | `SkillSwapBackendApplicationTests` | context startup, active test profile | Spring context | Testcontainers PostgreSQL; test `JwtDecoder` override | No separate database migration test |
| Security config | `WebSecurityConfigurationTest`, `CorsConfigTest`, `JwtConverterTest` | required JWT config validation, CORS header policy, DB-backed admin authority mapping | unit | repositories mocked where needed | Live Clerk/JWKS config requires external verification |
| User service/API | `UserServiceTest`, `UserProfileApiContractTests` | local user creation from JWT, email verification, skill validation, avatar upload validation/cleanup, profile API response | Mockito unit, MockMvc integration-style | Azure mocked; Testcontainers DB in API tests | More public profile/stat cases |
| Notification | `NotificationServiceImplTest`, `NotificationApiContractTests` | recipient scoping, unread counts, mark read/all read, notification creation guards, API not-found contract | Mockito unit, MockMvc integration-style | Testcontainers DB in API tests | Async proxy/executor integration not covered |
| Memory | `MemoryServiceImplTest`, `MemoryServiceImplAuthExtractionTest`, `MemoryLockApiContractTests` | admin actor resolution, anonymous public reads, slug/status rules, edit locks, media cleanup/upload | Mockito unit, MockMvc integration-style | Azure mocked; Testcontainers DB in API tests | More CRUD/list contracts and concurrency testing |
| Workshop | `WorkshopServiceImplTest`, `WorkshopServiceImplAuthExtractionTest`, `WorkshopApiContractTests` | join rules, approval/rejection, visibility, lifecycle status, image upload cleanup, selected public/join APIs | Mockito unit, MockMvc integration-style | Azure/notification mocked where appropriate; Testcontainers DB in API tests | Broader lifecycle/admin workflow coverage |
| Admin/security route matrix | `SecurityRegressionTests` | admin endpoint denial/allowance, upload validation, memory URL validation | full-context MockMvc | Azure mocked; Testcontainers DB | Full admin happy-path matrix not implemented |
| Storage validation | `AzureBlobStorageServiceTest`, `AzureBlobUrlValidatorTest`, `ImageUploadValidatorTest` | SAS failure, Azure URL account validation, image signature/container validation | unit | Azure SDK clients mocked for focused storage unit test | Real Azure integration not implemented |
| Frontend | none | Not currently implemented | Not currently implemented | Not applicable | Component/API-client/E2E tests are future work |

No coverage percentages are reported because no coverage reporting tool or generated coverage report is configured in the inspected backend build.

## 8. Authentication and Authorization Testing

JWT-authenticated MockMvc requests are tested with Spring Security test support:

```java
jwt().jwt(jwt -> jwt.subject("<subject>").claim("email", "<email>").claim("email_verified", true))
     .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))
```

For member requests, tests generally provide no admin authorities. For admin requests, tests explicitly provide `ROLE_ADMIN`.

This follows the project decision in `docs/TEST_PLAN.md`: MockMvc tests bypass the real `JwtConverter` with `jwt().authorities(...)`, while `JwtConverterTest` separately verifies DB-backed authority mapping from `UserAccount.role`.

Reasons verified from implementation:

- `JwtConverter` queries `UserRepository` by JWT `sub` / `auth_subject`.
- Including the real converter in every controller test would couple request-contract tests to role lookup setup.
- Full-context request tests still exercise Spring Security route and method-security behaviour.

Covered behaviours include:

- admin endpoints allow admin JWTs where seeded data permits the request
- admin endpoints reject member JWTs with 403
- admin endpoints reject anonymous requests with 401
- service auth extraction accepts `JwtAuthenticationToken`
- selected services reject anonymous, `UserDetails`, `DefaultOAuth2User`, and UUID-shaped non-JWT identity fallbacks
- `JwtConverter` grants admin authority for stored admin roles and returns empty authorities for non-admin or missing users

Development/production Clerk dependency is avoided in tests through:

- `jwt()` request post-processors in MockMvc tests
- dummy disabled JWKS properties in the test profile
- `@TestBean` `JwtDecoder` replacement in the Spring context-load test

Requires external verification: live Clerk dashboard settings, claim templates, enabled providers, and real JWKS issuer configuration are not versioned as executable tests in this repository.

## 9. Database Testing Approach

Verified from implementation:

- PostgreSQL Testcontainers is used through the test datasource URL.
- Test dependencies include Testcontainers JUnit Jupiter, PostgreSQL, and JDBC modules.
- The test schema is created with Hibernate `ddl-auto=create-drop`.
- Flyway is disabled in `application-test.properties`.
- Selected API contract tests use `@Transactional` for rollback isolation.

Documented rationale from `docs/TEST_PLAN.md`: PostgreSQL Testcontainers is preferred over H2 because production uses PostgreSQL and dialect differences can create false-green tests.

Important limitation: migration SQL files exist in the repository, but the current test profile does not run Flyway migrations. Therefore, the automated tests validate the JPA/Hibernate-generated test schema rather than the migration-applied schema.

Not currently implemented: dedicated repository-only integration tests or migration validation tests.

## 10. External Service Isolation

The backend automated test suite is designed to be safe, deterministic, and independent of production services.

| External service | Isolation approach |
| --- | --- |
| Azure Blob Storage | Mocked with Mockito in service and full-context tests; focused storage unit test uses mocked SDK client behaviour. |
| Clerk JWKS/auth provider | Avoided through Spring Security test JWTs, dummy disabled test properties, and test decoder override where needed. |
| Production PostgreSQL | Replaced by PostgreSQL Testcontainers. |
| Production backend/frontend endpoints | Not called by backend tests. |

No real cloud credentials are required to run the backend tests.

## 11. CI Workflows

### Backend Tests

Workflow path: `.github/workflows/backend-tests.yml`

| Setting | Current value |
| --- | --- |
| Workflow name | Backend Tests |
| Trigger conditions | Pull requests and pushes to `main` when `skill-swap-backend/**` or the workflow file changes |
| Runner | `ubuntu-latest` |
| Java version | Temurin JDK 17 |
| Working directory | `skill-swap-backend` |
| Test command | `./gradlew test` |
| Timeout | 15 minutes |
| Artifacts | `skill-swap-backend/build/reports/tests/` and `skill-swap-backend/build/test-results/` |
| Artifact retention | 7 days |
| Docker/Testcontainers | Inferred from implementation: Docker must be available for PostgreSQL Testcontainers |

This workflow acts as a backend quality gate for changed backend code and test infrastructure. It does not test frontend behaviour.

### Frontend Typecheck and Build

Workflow path: `.github/workflows/frontend-ci.yml`

| Setting | Current value |
| --- | --- |
| Workflow name | Frontend CI |
| Trigger conditions | Pull requests and pushes to `main` when `skill-swap-frontend/**` or the workflow file changes |
| Runner | `ubuntu-latest` |
| Node version | 20 |
| Package manager | npm, using `npm ci` |
| Working directory | `skill-swap-frontend` |
| Typecheck command | `npm run typecheck` (`tsc --noEmit`) |
| Build command | `npm run build` (`tsc && vite build`) |
| Timeout | 10 minutes |
| Artifacts | None |

This workflow acts as a frontend quality gate for TypeScript correctness and production build viability. ESLint is not currently wired into CI because no ESLint package or config is present in the frontend project.

## 12. AI-Assisted Testing Workflow

`.codex/skills/test-skill/SKILL.md` is a reusable testing convention, contributor guideline, and quality-control mechanism for AI-assisted backend test development. It is not a test suite and does not replace human review.

The convention was formalised from prior testing discussions and project decisions, then codified into a reusable guideline for future backend test work.

The SkillSwap-specific testing roadmap is maintained in `docs/TEST_PLAN.md`. The Codex testing skill contains reusable methodology and collaboration rules.

The testing convention covers:

- judging whether a test is necessary before implementation
- avoiding low-value tests that only verify framework behaviour, DTO mapping, generated code, or trivial delegation
- writing Given / When / Then case specifications before code is written
- testing observable behaviour rather than internal implementation details
- handling failing tests honestly instead of disabling or weakening them
- keeping one PR to one cohesive testing slice
- updating project testing documentation append-only as decisions and findings accumulate
- reviewing AI-assisted test output rather than accepting it blindly

This workflow supports engineering judgment; it does not automate judgment away.

## 13. Behavioural Inconsistencies Discovered by Tests

The following items are documented in `docs/TEST_PLAN.md` and are preserved or flagged rather than silently changed.

| Behaviour | Current test posture | Status |
| --- | --- | --- |
| `UserProfileDto.fromEntity()` sets `creditBalance=100` while `UserService` returns `0`. | API contract tests preserve current `/api/v1/users/me` response value of `0`; the DTO inconsistency remains documented. | Flagged for review / future refactor. |
| `GET /api/v1/users/{id}` is commented as public, but current security config requires authentication. | Documentation and security notes preserve the current active security configuration. | Flagged for review. |
| `UserService.findOrCreateCurrentUser()` rejects `email_verified=false`, while missing `email` and missing `email_verified` remain lenient. | Unit and API tests cover the current behaviour. | Preserved; live Clerk claim configuration requires external verification. |
| `MemoryServiceImpl.updateMemory()` requires an active edit lock only when the current entry is `draft`; non-draft entries can skip the lock guard and `status == null` can normalize to `draft`. | Memory service tests preserve current reachable behaviour and document the inconsistency. | Flagged for review / future refactor. |

Documented product decision, not an inconsistency: `joinWorkshop` does not notify the facilitator. The current test suite includes a dedicated absence test for this decision.

## 14. Current Limitations

- Frontend automated tests are not currently implemented.
- Frontend linting is not currently implemented because ESLint is not configured.
- Full browser E2E tests are not currently implemented.
- Performance/load tests are not currently implemented.
- Security scanning is not currently implemented in the inspected test workflow.
- Coverage percentage is not reported because no coverage tool/report is configured in the inspected backend build.
- Dedicated repository-only integration tests are not currently implemented.
- Migration validation is not currently implemented; the test profile disables Flyway and uses Hibernate schema creation.
- Some async notification behaviours require additional integration testing with controlled executor and transaction handling.
- Some API matrices remain deferred, including broader workshop lifecycle/admin workflows, notification ordering/read-all contracts, and expanded memory CRUD/list contracts.
- Some cloud dashboard assumptions, including Clerk claim configuration, require external verification because they are not versioned as executable fixtures in the repository.

## 15. Future Testing Improvements

Future work may include:

- Add selected frontend component tests.
- Add frontend API-client tests or MSW-based integration tests.
- Add an ESLint dependency/configuration decision before introducing a frontend lint CI gate.
- Add a small number of Playwright E2E tests for critical flows after backend/API contracts are stable.
- Add coverage reporting if desired.
- Add more repository/database integration tests where persistence behaviour is business-critical.
- Add migration validation if Flyway becomes the standard schema lifecycle path.
- Add async notification integration tests with controlled executor configuration.
- Add more upload validation and media edge cases.
- Add versioned test fixtures for Clerk/JWT claim maps if useful.
- Expand selected API contract matrices for workshop, memory, notification, and admin workflows.

## 16. How to Run Tests

### Local Backend Tests

Prerequisites:

- Java 17
- Docker available and healthy for Testcontainers PostgreSQL
- network access may be needed the first time Docker pulls the PostgreSQL Testcontainers image

Run from the backend directory:

```bash
cd skill-swap-backend
./gradlew test
```

On Windows:

```powershell
cd skill-swap-backend
.\gradlew.bat test
```

### CI Execution Path

GitHub Actions runs the backend test command from `.github/workflows/backend-tests.yml` when backend files or the workflow change on pull requests and pushes to `main`.

GitHub Actions runs the frontend typecheck and build commands from `.github/workflows/frontend-ci.yml` when frontend files or the workflow change on pull requests and pushes to `main`.

### Test Results

Local Gradle test outputs:

- `skill-swap-backend/build/reports/tests/test/index.html`
- `skill-swap-backend/build/test-results/test/`

CI uploads:

- `skill-swap-backend/build/reports/tests/`
- `skill-swap-backend/build/test-results/`

The frontend CI workflow does not upload artifacts.

### Common Failure Causes

- Docker is not running or cannot start Testcontainers PostgreSQL.
- The PostgreSQL Testcontainers image cannot be pulled on a new machine.
- Tests are run without the Gradle `test` task, so the `test` profile is not active.
- A full-context test loads a real external-service bean instead of a mock or test override.
- A new API contract test depends on async `@Async` / `REQUIRES_NEW` notification behaviour without controlled isolation.
- Frontend dependencies are out of sync with `package-lock.json`, causing `npm ci` to fail.
- TypeScript errors prevent `npm run typecheck` or `npm run build` from passing.

## 17. Verification Notes

Directly verified from code/configuration:

- Gradle test task activates the `test` profile.
- Test dependencies include JUnit/Spring Boot test, Spring Security test, and Testcontainers modules.
- `application-test.properties` uses PostgreSQL Testcontainers, `ddl-auto=create-drop`, disabled/dummy external URLs, and disabled Flyway.
- `SkillSwapBackendApplicationTests` verifies context load and active test profile.
- Full-context MockMvc API/security tests exist for selected backend flows.
- Service-layer Mockito tests exist for user, notification, memory, and workshop services.
- Azure Blob Storage is mocked in full-context tests that need the Spring context.
- The backend GitHub Actions workflow runs `./gradlew test` with Java 17 and uploads test reports.
- The frontend GitHub Actions workflow runs `npm ci`, `npm run typecheck`, and `npm run build` with Node 20.

Based on `docs/TEST_PLAN.md`:

- module ordering rationale
- decision to use PostgreSQL Testcontainers over H2
- decision to bypass the real `JwtConverter` in MockMvc tests and test it separately
- behaviour preservation rules and documented behavioural inconsistencies
- documented deferred coverage areas

Based on `.codex/skills/test-skill/SKILL.md`:

- reusable testing methodology
- Given / When / Then convention
- low-value test avoidance rules
- failure-handling expectations
- append-only project documentation discipline
- AI-assisted testing collaboration rules

Inferred from implementation:

- Docker is required for local and CI test execution because the datasource uses Testcontainers JDBC.
- Full-context API contract tests exercise real JPA repositories and mappings even though dedicated repository-only tests are not present.
- Frontend automated tests are not currently implemented because no frontend test script or frontend test framework configuration was found.

Requires further verification:

- live Clerk dashboard claim configuration and issuer/JWKS settings
- production Azure Blob container access level and SAS/public URL behaviour
- production database migration process, because runtime Flyway execution is disabled in inspected application profiles
- any manual QA or external testing processes that may exist outside this repository
