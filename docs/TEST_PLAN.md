# SkillSwap Backend Test Plan

This document is the SkillSwap-specific testing roadmap.
For general testing methodology -- necessity judgment, naming conventions, case specification standard, AI workflow, failure handling, scope discipline, mocking principles, and behavior preservation -- see `.codex/skills/test-skill/SKILL.md`.

This document covers only what is specific to SkillSwap:
- Module order and dependency analysis
- Per-PR progress tracking
- Behavioral inconsistencies found in SkillSwap code
- Product decisions specific to SkillSwap
- SkillSwap-specific implementation choices
- Future refactors deferred from test PRs
- Dated decisions log
- Open questions for the current in-flight PR

## SkillSwap-Specific Conventions

- Build/test command: `./gradlew test`
- Test profile activation: Gradle test task system property:
  `tasks.named('test') { systemProperty "spring.profiles.active", "test" }`
- Test config file location: `src/test/resources/application-test.properties`
- `application-test.properties` uses dummy/disabled values, never real endpoints. Prefer RFC 2606 reserved domains for unreachable URLs, e.g. `https://disabled.test.invalid`, over localhost or example.com. Property keys are present so Spring binding succeeds; values are intentionally non-functional.
- SkillSwap external services in tests: Azure Blob, Clerk JWKS, and production Postgres are never real; always mocked, stubbed, or replaced by Testcontainers.
- SkillSwap chooses to bypass the real `JwtConverter` in MockMvc tests via `jwt().authorities(...)`. `JwtConverter` gets its own dedicated unit test. Rationale: SkillSwap's `JwtConverter` performs DB-backed user/role lookup, so including it in `@WebMvcTest` would couple controller tests to the database. Other valid options, including mocking `JwtConverter` as a bean or providing a test `JwtDecoder`, were considered and not chosen.

## Product Decisions

- `joinWorkshop` does NOT notify the facilitator. By design.
  Reason: facilitators see participant count on the detail page; admins see and export the full list from the admin panel. Per-join notifications would create noise.

  Verification approach:
  - The workshop module includes ONE dedicated test case asserting this absence: `shouldNotNotifyFacilitatorWhenUserJoinsWorkshop`
  - Other `joinWorkshop` tests focus on their own primary behavior, such as capacity, duplicate, or attendance window, and do NOT re-assert the notification absence. One test locks the product decision; others stay focused.

## Module Order

1. Test infrastructure
   - Depends on no business module.
   - Establishes the test profile, safe Spring context startup, baseline fixtures, and this roadmap.

2. User
   - Depends on `UserRepository`, `WorkshopRepository`, `WorkshopParticipantRepository`, `AzureBlobStorageService`, and Spring Security `Jwt`.
   - No internal service dependency.
   - Complexity: moderate; around ten public service methods, JWT/user creation branches, skill normalization, avatar storage branch, no `@Async`.
   - Reason for early placement: `UserAccount` and JWT helpers are reused by notification, memory, workshop, security, and integration tests.
   - Module note: `UserService` aggregates workshop-side data for facilitator and participant views. This cross-module read coupling is intentional and reflects the domain model where users can have both roles.

3. Notification
   - Depends on `NotificationRepository`, `UserRepository`, `UserService`, and `WorkshopRepository`.
   - Complexity: low to moderate; six public methods, recipient scoping, read/unread transitions, two `@Async` creation methods, no external network calls.
   - Benefits from user fixtures. Establishes notification side-effect patterns before workshop tests lock notification absence/presence.

4. Memory
   - Depends on `MemoryEntryRepository`, `UserService`, and `AzureBlobStorageService`.
   - Complexity: moderate to high; public/admin visibility, slug/status rules, edit locks, time-based expiry, media URL cleanup, storage mocking.
   - Benefits from user/security helpers and storage mocking conventions.

5. Workshop
   - Depends on `WorkshopRepository`, `WorkshopParticipantRepository`, `UserService`, `NotificationService`, and `AzureBlobStorageService`.
   - Complexity: high; many public methods, lifecycle/status rules, capacity, attendance cutoff, admin authorization, visibility rules, uploads, notifications, time branches.
   - Benefits from user fixtures, notification test patterns, and storage mocking patterns established earlier.

6. Admin + Health + cross-module integration + security matrix
   - Depends on controllers, `WebSecurityConfiguration`, `JwtConverter`, and multiple service contracts.
   - Complexity: high at the integration level; route matrix, MockMvc JWT behavior, Spring context safety, and cross-module workflows.
   - Best left until module-level behavior is locked.

## Progress

### PR #0 -- docs/TEST_PLAN.md
- [x] Create this roadmap

### PR #1 -- Test infrastructure
- [x] Gradle test profile activation
- [x] `application-test.properties` with no real external URLs
- [x] dbSmokeTest mitigation: proposed approach is `@Profile("!test")` on the existing bean in `SkillSwapBackendApplication`. This production code change requires explicit approval before PR #1 implementation begins. Codex must propose the exact diff in plan mode first and wait for approval before modifying production code.
- [x] If full Spring context startup creates a `JwtDecoder` bean from `WebSecurityConfiguration`, provide a test-only `@TestConfiguration` that supplies a stub `JwtDecoder`. The test-only `JwtDecoder` configuration must be explicitly loaded -- either as a static nested `@TestConfiguration` on the test class that needs it, or imported via `@Import(TestJwtConfig.class)`. A standalone `@TestConfiguration` class in test sources is NOT auto-loaded by Spring; if not imported, `contextLoads` will still try to use the production `JwtDecoder`.
- [x] `TestFixtures` skeleton with `UserAccount` builder only
- [x] `gradle-test.log` handled
- [x] `contextLoads` remains green and makes no real calls
- Exit: `./gradlew test` green; `spring.profiles.active=test` verified by an assertion in a test method, e.g. inject `Environment` and assert `getActiveProfiles()` contains `test`. Log inspection alone is insufficient.

**Implementation notes (added on completion):**
- Gradle test profile activation: applied via `tasks.named('test') { systemProperty "spring.profiles.active", "test" }`
- `application-test.properties`: created with Testcontainers PostgreSQL datasource, `.invalid` TLD external URLs, `ddl-auto=create-drop`, dummy credentials
- dbSmokeTest mitigation: applied `@Profile("!test")` to the existing bean in `SkillSwapBackendApplication` (one import + one annotation, no other production changes)
- JwtDecoder replacement: used Spring 6.2 `@TestBean(name = "jwtDecoder", methodName = "testJwtDecoder", enforceOverride = true)` instead of `@TestConfiguration` loading -- this was the chosen path because the project resolved to Spring Boot 3.5.6 / `spring-test` 6.2.11
- TestFixtures: created with `UserAccount` valid-by-default builder only
- `gradle-test.log`: confirmed already covered by existing `*.log` ignore rules in both root and backend `.gitignore`
- Local verification: `./gradlew test` BUILD SUCCESSFUL in 49s on Docker Desktop 4.43.1 (Windows)

### PR #2 -- user service unit tests, round 1
- [x] creates current user from a new JWT with default member role and verified email
- [x] returns existing user by auth subject without creating a duplicate
- [x] rejects JWT when email verification signal is explicitly false
- [x] updates current profile and replaces normalized skills
- [x] rejects blank skill when adding a skill
- Deferred: avatar upload/storage cleanup, user controller tests, repository tests, `JwtConverter` tests

**Implementation notes (added on completion):**
- Added Mockito-only unit tests in `skill-swap-backend/src/test/java/club/skillswap/user/service/UserServiceTest.java`.
- Covered current Clerk-path behavior for new-user creation, existing auth-subject lookup, explicit unverified-email rejection, profile skill replacement, and blank skill rejection.
- Local tests intentionally not run for PR #2; CI is the verification path because Docker is unavailable in the agent environment.

**Round 2 implementation notes (added on completion):**
- [x] Extended the existing Mockito-only `skill-swap-backend/src/test/java/club/skillswap/common/config/JwtConverterTest.java` rather than creating a second JwtConverter test file; the existing file was already present on main from commit `b623a93`.
- [x] Added JwtConverter branch coverage for `admin` role mapping, non-admin/null/blank/unknown role values, auth-subject not found, and null JWT rejection. Kept the existing UUID-shaped-subject no-ID-fallback test as the single legacy-fallback assertion.
- [x] Appended avatar upload/storage cleanup coverage to the existing `skill-swap-backend/src/test/java/club/skillswap/user/service/UserServiceTest.java`; no second UserService test file was created.
- [x] Avatar tests mock `AzureBlobStorageService` and assert observable behavior only: uploaded object path, detected content type, returned avatar URL, persisted `avatarUrl`, previous-avatar cleanup on replacement, and targeted `never()` cleanup/upload/save checks on non-cleanup paths.
- [x] Avatar happy-path DTO return stubs only the `getUserProfileWithStats` collaborators exercised by the source path: `UserRepository.findById`, `WorkshopRepository.countByFacilitatorId`, and `WorkshopParticipantRepository.countByUserId`.
- [x] Avatar assertions intentionally stay avatar-focused. The returned `UserProfileDto` passes through the already recorded `creditBalance` inconsistency (`UserProfileDto.fromEntity()` uses 100 while `UserService` returns 0); the avatar path itself introduced no NEW inconsistency, and `creditBalance` is left as-is.
- Deferred after round 2: user controller tests and user repository tests remain out of scope for this PR.
- Local tests intentionally not run for PR #2 round 2; CI/human verification is the verification path for this conversation.

### PR #3 -- notification module
- [x] to be detailed when PR #2 merges
- [x] Preserve existing JWT-only notification auth extraction tests from the legacy-branch-removal work
- [x] Add Mockito-only `NotificationServiceImpl` service tests for recipient-scoped listing/counting
- [x] Add read/unread transition tests for `markRead` and `markAllRead`
- [x] Add synchronous observable-behavior tests for both `createNotification` overloads, including null/missing recipient guards and nullable workshop behavior
- Deferred: notification controller tests, notification repository tests, true async dispatch/integration tests, and end-to-end notification API contract tests

**Implementation notes (added on completion):**
- Extended existing Mockito-only tests in `skill-swap-backend/src/test/java/club/skillswap/notification/service/NotificationServiceImplTest.java`.
- Covered current JWT-only recipient resolution via `UserService.findOrCreateCurrentUser(jwt)`, recipient-scoped notification listing/counting, read/unread transitions, missing-notification behavior, and both notification creation overloads.
- `@Async` creation methods were tested through the direct Mockito-instantiated service, so no Spring async proxy is active; observable persistence behavior is asserted synchronously on the test thread.
- Local tests intentionally not run for PR #3; CI/human verification is the verification path because Docker is unavailable in the agent environment.

### PR #4 -- memory module
- [x] Added `MemoryServiceImplAuthExtractionTest` covering anonymous public memory reads, JWT-only admin memory actor resolution, and rejection of anonymous/non-JWT admin principals.
- [x] Removed legacy `authentication.getName()` identity fallback from Memory admin paths; public Memory reads remain anonymous/public.
- [x] Added Mockito-only `MemoryServiceImplTest` for non-auth service behavior: slug/status rules, draft edit-lock expiry, published/non-draft lock behavior, delete-time media cleanup, and memory media upload object paths.
- Deferred: memory controller tests, memory repository tests, memory integration/API contract tests, exhaustive slug fallback/truncation cases, exhaustive content media parsing edge cases, direct `AzureBlobStorageService` tests/refactor, static validator branch tests beyond the service boundary, and true concurrent transaction/locking behavior.

**Implementation notes (added on completion):**
- Kept `MemoryServiceImplAuthExtractionTest` unchanged; the new tests live in `skill-swap-backend/src/test/java/club/skillswap/memory/service/MemoryServiceImplTest.java`.
- `MemoryEntryRepository`, `UserService`, and `AzureBlobStorageService` are Mockito mocks; no Spring context and no real Azure clients are used.
- Time-sensitive branches use far-past/far-future input data, explicit `editLockSeconds` test configuration, and `isNotNull` timestamp assertions only.
- Local tests intentionally not run for PR #4; CI/human verification is the verification path because this conversation is constrained from running local tests.

### PR #5 -- workshop module
- [x] to be detailed when previous module merges
- [x] Added Mockito-only `WorkshopServiceImplTest` for round-1 non-auth service behavior.
- [x] Covered workshop submission persistence and admin notification dispatch, including the actual branch that skips a facilitator who also appears in admin candidates.
- [x] Covered focused `joinWorkshop` behavior: effective-status rejection, capacity enforcement, duplicate-join handling, attendance cutoff, participant persistence, and exactly one dedicated facilitator-notification absence test (`shouldNotNotifyFacilitatorWhenUserJoinsWorkshop`).
- [x] Covered approve/reject status transitions with non-flaky timestamp assertions and mocked notification dispatch to the facilitator.
- [x] Covered workshop image upload through mocked `AzureBlobStorageService`, including object path capture and previous-image cleanup.
- Deferred: workshop controller tests, workshop repository tests, workshop integration/API contract tests, full lifecycle/status matrix beyond round-1 approve/reject/join-not-upcoming coverage, cancel notification fanout, admin-update notification fanout, request-approval authorization and admin notification branches, full visibility matrix for pending/rejected/admin/facilitator/public viewers, host hide rules, list/query summary mapping edge cases, upload validation failure branches, delete/leave behavior beyond existing auth extraction coverage, and production refactors such as `Clock` injection or `AzureBlobStorageService` changes.

**Implementation notes (added on completion):**
- Kept `WorkshopServiceImplAuthExtractionTest` unchanged; round-1 non-auth behavior lives in `skill-swap-backend/src/test/java/club/skillswap/workshop/service/WorkshopServiceImplTest.java`.
- `WorkshopRepository`, `WorkshopParticipantRepository`, `UserService`, `NotificationService`, and `AzureBlobStorageService` are Mockito mocks; no Spring context, real Azure client, or async notification proxy is used.
- `NotificationService` is mocked, so notification dispatch assertions are synchronous Mockito verifications. `ArgumentCaptor` assertions are limited to behavior-relevant recipient and type fields.
- The `joinWorkshop` product decision remains locked by exactly one dedicated absence test. Other join tests focus on their primary branch behavior and do not re-assert facilitator-notification absence.
- Current source behavior has `joinWorkshop` fully silent; round 1 intentionally locks only the facilitator absence while preserving branch-focused join tests.
- Time-sensitive setup uses far-past/far-future input data. Timestamps written with `LocalDateTime.now()` are asserted with `isNotNull()` only.
- Local tests intentionally not run for PR #5; CI/human verification is the verification path for this conversation.

**Round 2 implementation notes (added on completion):**
- [x] Added Mockito-only `WorkshopServiceImplTest` coverage for restricted workshop visibility through `getWorkshopById`: admin, owning facilitator, different member, and anonymous viewer paths.
- [x] Added lifecycle effective-status coverage through non-admin `getWorkshopById` DTO mapping: `null` status, all four short-circuit statuses, upcoming, ongoing, completed, null duration, and zero duration.
- [x] Kept lifecycle tests on member/non-admin authentication so `mapToDtoForViewer` resolves effective status instead of returning raw admin status.
- [x] Covered the combined visibility-plus-status behavior after a restricted workshop detail passes facilitator visibility checks.
- Deferred: workshop controller tests, workshop repository tests, workshop integration/API contract tests, lifecycle `date == null` branch, cancel notification fanout, admin-update notification fanout, request-approval authorization and admin notification branches, host hide rules, list/query summary mapping edge cases, upload validation failure branches, delete/leave behavior beyond existing auth extraction coverage, and production refactors such as `Clock` injection or `AzureBlobStorageService` changes.
- Local tests intentionally not run for PR #5 round 2; CI/human verification is the verification path for this conversation.

### PR #6 -- admin + Health + integration + security route matrix
- [x] Added `SecurityRegressionTests` covering admin endpoint denial for members/anonymous users, admin workshop detail protection, non-admin workshop delete denial, avatar URL PATCH ignoring, Azure Blob URL validation for memory cover URLs, and SVG/fake image rejection for avatar/workshop/memory uploads.
- [x] Added focused tests for CORS allowed headers/origins, JWT config startup validation, Azure Blob returned URL/SAS failure behaviour, Azure Blob URL validation, and image upload validation.
- [ ] Add remaining end-to-end API contract tests for non-security workshop, notification, memory lock, and user profile edge cases.

## Behavioral Inconsistencies Found

Behavioral inconsistencies are handled according to the behavior preservation rule in `.codex/skills/test-skill/SKILL.md`: tests reflect actual behavior first; product intent is logged below for human review.

- `UserProfileDto.fromEntity()` sets `creditBalance=100` while `UserService` returns `0`.
- `GET /api/v1/users/{id}` is commented as public, but current security config requires authentication.
- `UserService.findOrCreateCurrentUser()` rejects `email_verified=false`, while missing `email` and missing `email_verified` remain lenient. This source-backed behavior is documented in `docs/03-architecture/Security-Design.md` and covered by unit tests, but the live Clerk dashboard `signupTemplate` contents are not versioned in this repository.
- `MemoryServiceImpl.updateMemory()` requires an active edit lock only when the current entry status is `draft` (`MemoryServiceImpl.java:114-116`). Non-draft entries such as published memories skip that guard and reach `applyPayload(...)` with no lock requirement, so published memories can be edited concurrently without lock protection. On that reachable path, `applyPayload(...)` normalizes `status == null` to `draft` (`MemoryServiceImpl.java:253-254`) while other null payload fields preserve existing values.

## Future Refactors

- Consider Clock injection if time-sensitive tests proliferate.
- Consider extracting helpers from large `WorkshopServiceImpl` / `MemoryServiceImpl` if test setup becomes repetitive.
- Review `AzureBlobStorageService` for testability; it currently creates clients internally.
- Consider centralizing authenticated user ID resolution, currently repeated across services/controllers.
- Consider synchronous async executor test configuration when notification integration tests begin.
- Continue broadening backend test coverage beyond the current security regression and infrastructure tests.
- Removed the UUID-subject fallback in `UserService.findOrCreateCurrentUser()` and `JwtConverter`; the supported identity model is now `auth_subject` (external JWT `sub`) -> internal `UserAccount.id`.
- Removed legacy non-JWT auth extraction branches in notification/workshop services (`UserDetails` and `DefaultOAuth2User`); the supported web auth path is `JwtAuthenticationToken`, while anonymous workshop public reads remain no-viewer access.
- Documented and tested the current Clerk/JWT claim contract in `docs/03-architecture/Security-Design.md`; follow-up is to version a redacted Clerk `signupTemplate` export or decoded claim-map fixture so live dashboard assumptions can be verified from source.

## Decisions Log

- 2026-05-16: `TEST_PLAN.md` narrowed to SkillSwap-specific roadmap content and references `.codex/skills/test-skill/SKILL.md` for general testing methodology. Reason: avoid duplicating cross-project methodology.
- 2026-05-16: Skill file path chosen as `.codex/skills/test-skill/SKILL.md` (Codex's convention directory). Reason: SkillSwap currently uses Codex as its primary coding agent. If other AI tools are adopted later, the skill content can be copied to their respective convention directories (`.claude/skills/`, etc.).
- 2026-05-16: Backend test plan placed at `docs/TEST_PLAN.md`. Reason: keep the SkillSwap-specific backend testing roadmap discoverable at a stable top-level docs path for every future test PR.
- 2026-05-16: Test profile activated via Gradle system property rather than `@ActiveProfiles` on every test class. Reason: one-time configuration, impossible to forget on future tests.
- 2026-05-16: Proposed dbSmokeTest mitigation: `@Profile("!test")` on the existing bean. Production code change pending PR #1 approval. Reason: smallest likely behavior-preserving change; production and dev would keep the smoke check.
- 2026-05-16: PR #1 must explicitly load a test-only `JwtDecoder` configuration if full Spring context startup creates the production bean. Reason: test startup must not depend on Clerk JWKS URLs.
- 2026-05-16: SkillSwap MockMvc tests bypass real `JwtConverter` via `jwt().authorities(...)`; `JwtConverter` gets a dedicated unit test. Reason: `@WebMvcTest` must not depend on DB role lookup.
- 2026-05-16: PostgreSQL Testcontainers chosen over H2 for repository/integration tests. Reason: production uses Postgres; H2 dialect differences risk false-green tests.
- 2026-05-16: `joinWorkshop` no-facilitator-notification behavior recorded as a product decision, not an inconsistency. Reason: per-join notifications would create low-signal noise.
- 2026-05-16: Module order proposed as user, notification, memory, workshop, then admin/Health/integration/security. Reason: start with low internal dependencies and reusable fixtures, then move toward modules with higher branching, storage, async, and cross-module coupling.
- 2026-05-16: `UserService` workshop-side read coupling recorded as intentional domain design. Reason: users can be both facilitators and participants, so user-facing profile/stat views naturally aggregate workshop data.
- 2026-05-16: PR #1 introduces PostgreSQL Testcontainers during infrastructure setup, before repository tests originally scheduled for PR #4. Reasons: Production uses PostgreSQL on Azure; H2 dialect substitution risks false-green tests. Local PostgreSQL would require per-developer setup and suffers from state drift between machines. Testcontainers provides reproducible, isolated, production-equivalent test datasource for both local and CI runs. Project target is industrial production quality; the Docker dependency cost is justified by reproducibility.
- 2026-05-16: Test schema generated via Hibernate `ddl-auto=create-drop` because no Flyway/Liquibase migrations exist on main. If repository tests in PR #4 reveal entity-to-schema discrepancies (`jsonb` columns, custom `@Type`, etc.), revisit by adding migration files or explicit `columnDefinition` declarations.
- 2026-05-16: Added backend test CI via GitHub Actions (.github/workflows/backend-tests.yml). Resolves the "backend test CI workflow gap" Future Refactor item. Trigger: PR or push to main affecting skill-swap-backend/** or the workflow file itself. Java 17 matches project toolchain. Runner: ubuntu-latest (Docker expected to be available for Testcontainers; if removed from future runner images, a docker-setup step will need to be added). Test results uploaded as artifact (retention 7 days) for offline review when CI fails. Job timeout 15 minutes to prevent stuck runs from consuming the 6-hour default.

## Open Questions / Pending Decisions

(This section is empty between PRs. At the start of each PR's planning phase, populate with questions that must be answered before implementation. Clear when the PR is submitted.)
