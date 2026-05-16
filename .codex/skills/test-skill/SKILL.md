| name        | writing-tests                                                 |
| description | Use before writing, adding, or modifying any test in a code  |
|             | repository. Covers test necessity judgment, structure, naming, |
|             | mocking discipline, and AI collaboration workflow.            |

# Writing Tests

## Step 1 — Is this test necessary?

Make your own judgment first: does this code contain non-obvious
logic that could break silently, and does the test bring real
value to the project — or is it unnecessary?

- **If yes**, proceed.
- **If no**, do not refuse outright. Share your reasoning and let
  the developer respond. Write the test only if their response
  genuinely changes your judgment; then proceed.

The case list provided is a proposal, not a mandate. Professional
judgment on necessity is welcome and expected.

### Tests that are usually NOT worth writing

- Simple getters/setters and DTO mapping
- Lombok-generated code, framework lifecycle methods that just
  delegate
- Trivial controller methods that forward to a single service call
  with no transformation (service test already covers behavior)
- Tests of framework behavior (JPA's `findById`, Spring's DI,
  validator annotations alone)
- Reproductions of third-party library behavior

### Tests that are usually high-value

- Core business logic with multiple branches (state machines,
  pricing, permissions)
- Complex pure functions, edge cases, boundary conditions
- Regression tests for previously-fixed bugs
- Critical user paths (login, payment, data ownership)
- Public APIs that other systems depend on

## Step 2 — Test what is observable, not how it is implemented

- Assert observable outcomes (return values, exceptions, persisted
  state, dependency interactions that are part of the contract).
- Do not assert internal call ordering unless the ordering itself
  is the behavior under test. Tests that lock implementation order
  block harmless future refactors.
- `ArgumentCaptor` (or equivalent) asserts behavior-relevant fields
  only. Do not assert every field on a captured entity.
- Use targeted negative verifications (`verify(x, never()).foo()`),
  not blanket `verifyNoMoreInteractions(...)`. Blanket negative
  assertions break when harmless internal calls are added later.

## Step 3 — Specify each case before implementing

Every test case must be expanded to a Given / When / Then before
code is written:

- **Given**: preconditions (input data, mock return values,
  relevant system state)
- **When**: the exact method call under test with arguments
- **Then**: expected outcomes — return value or thrown exception
  (type and message substring), side effects on each dependency
  (specific verify calls), and explicit absences where relevant

One-line case names are insufficient. The Given/When/Then
expansion is the contract between the human reviewer and the
implementer. When working with an AI coding agent, this expansion
happens in plan mode before implementation begins.

## Step 4 — Naming and structure conventions

- **Method name**: camelCase `shouldXxxWhenYyy`, kept under
  ~50 chars where possible. Used as test ID by tooling.
- **`@DisplayName`** (or equivalent): full English sentence
  describing the scenario. Used in test reports. The method name
  and `@DisplayName` do not need to mirror word-for-word.
- **Structure**: Arrange / Act / Assert with clear visual
  separation (comments or blank lines). Each test does one thing.
- **Assertions**: prefer fluent libraries (AssertJ in Java) for
  readability. Always include a `because:` / `as:` clause for
  non-obvious assertions — it documents the rule.

## Step 4.5 — Test file organization

- **One test file per class under test.** UserService.java →
  UserServiceTest.java, not "one file per test scenario".
- **Multiple @Test methods per test file**, one per scenario.
- **Mirror the production package structure under src/test/**
  (Java) or place .test.tsx next to the component (TypeScript).
- **Test files only split by functional area when they exceed
  ~500 lines.** Don't pre-split.
- **Integration tests** testing multi-class flows are named
  after the flow (WorkshopJoinFlowTest), not a single class.
- **One PR may touch multiple test files** if the PR's scope
  naturally includes multiple classes under test. The rule
  "one PR = one cohesive slice" doesn't mean "one PR = one
  test file".

## Step 5 — Behavior preservation

Tests must reflect ACTUAL current behavior, not assumed or
intended behavior.

If actual behavior contradicts comments, docs, naming, or
intuition:

- Do NOT "fix" the production code to match expectations.
- Do NOT skip the test or hide the contradiction.
- DO write the test against actual behavior, add a FIXME comment
  referencing the contradiction, and log the inconsistency in the
  project's test plan / tracker for human product decision.

Never decide product intent unilaterally. When uncertain whether
something is a product decision or a technical decision, ask
before acting.

## Step 6 — Failure handling

When tests fail or behave unexpectedly during a change:

- Do NOT disable failing tests or wrap them in `@Disabled` / `skip`.
- Do NOT modify production code to make tests pass without
  explicit approval.
- Do NOT remove the failing case from the PR.
- DO stop, report the failure with stack trace and root-cause
  hypothesis, and wait for direction.

Test failures are signals, not obstacles.

## Step 7 — Scope discipline

- One PR = one cohesive slice (e.g. one module's service-layer
  tests). Do not bundle multiple test layers (service + controller
  + repository) into one PR.
- Within a PR, multiple commits are encouraged: one per fixture,
  one per logical group of cases, one for config.
- The final commit must leave the test suite green; intermediate
  WIP commits may be in progress.
- Do not add testing dependencies unrelated to the PR's scope,
  even if "might be useful later."
- Production code changes inside a test PR require explicit
  approval and a proposed diff before implementation.

## Step 8 — AI collaboration workflow (when applicable)

When a coding agent is implementing tests:

1. **One conversation = one PR.** Long conversations degrade
   context quality; each new conversation starts fresh by reading
   the relevant project plan document.
2. **Plan mode first.** Discuss scope, case list, Given/When/Then,
   risks. Get human approval before switching to implementation.
3. **Implementation mode is narrow.** Only the approved scope.
   Do not "helpfully" expand into adjacent work.
4. **Stop after submission.** Do not start the next PR in the
   current conversation, regardless of how easy it appears.
5. **Update the project plan inside the PR**: tick completed
   items, append findings, log new decisions.

## Step 9 — What to mock vs. what to keep real

- **Mock**: external services (cloud storage, third-party APIs,
  payment providers), auth issuers / JWKS endpoints, anything
  that requires network or credentials.
- **Real (via Testcontainers or equivalent)**: production-grade
  databases for repository and integration tests. Prefer matching
  the production engine (Postgres against Postgres, not H2)
  because dialect differences cause false-green tests.
- **Real (no fixture)**: pure functions, in-memory data
  transformations, value objects.

When mocking, the goal is isolating the unit, not replicating the
real system. Resist over-mocking — if a test needs to mock 8
collaborators, the code under test is probably doing too much, and
that's a design signal worth raising (but don't refactor inside
the test PR).

## Step 10 — Test data

- Use builders / factories (e.g. `TestFixtures.userAccount()`) for
  test data. Do not hand-roll the same entity in every test.
- Builders should produce valid-by-default objects; each test
  overrides only the fields relevant to its scenario.
- Avoid magic literals scattered across tests. Constants belong
  in shared fixtures or test-local `static final` declarations
  with meaningful names.
- Do not depend on existing database state; seed fresh state per
  test (via fixtures, `@BeforeEach`, or a `DataSeeder`-style
  helper).