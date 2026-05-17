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

### How to share reasoning when proposing to skip a test

When you believe a proposed test is not worth writing, your
explanation must include:

1. **What the proposed test would actually verify** (specific
   behavior, not "this method")
2. **Why that verification has low value** (citing specific
   reasons from "Tests usually NOT worth writing" or comparable
   reasoning)
3. **What would change your judgment** (e.g. "if this code has
   had bugs before, then a regression test is worth writing
   even if the logic looks simple")

A vague "this seems unnecessary" is not professional judgment.
A specific "this test would only verify that Lombok-generated
getter returns the assigned value, which is testing the
framework, not our logic" is.

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
  assertions break when harmless internal calls are added later. Examples: harmless additions like logging calls, caching reads, existsById checks, or metrics emissions should not break tests that asserted business behavior. If a test breaks because of one of these, the test was over-specifying.

## Step 3 — Specify each case before implementing

Every test case must be expanded to a Given / When / Then before
code is written:

- **Given**: preconditions (input data, mock return values,
  relevant system state)
- **When**: the exact method call under test with arguments
- **Then**: expected outcomes — return value or thrown exception
  (type and message substring), side effects on each dependency
  (specific verify calls), and explicit absences where relevant
- **Constraint**: every claim in "Then" must be MECHANICALLY
VERIFIABLE by the test method itself. Properties like "no
real network calls happened" or "no production bean was
created" are not observable from inside a test method — they
are STRUCTURAL properties enforced by configuration, not
runtime assertions. If a "Then" claim cannot be expressed as
an assertion, move it to a "Structural property" note
separate from the Then.

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
- DO:
  - Write the test against actual behavior so it runs
  - Add a FIXME comment in the test referencing the contradiction
  - Append the inconsistency to the "Behavioral Inconsistencies
  Found" section of the project plan document (append, do not
  modify existing entries)
  - List the inconsistency in the PR description so the reviewer
  sees it without having to diff the plan document

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
  approval. The approval workflow:
  1. In plan mode, propose the EXACT diff (file path, exact
     lines being added/modified/removed, no implementation
     details elided)
  2. Wait for human explicit approval in the conversation
     ("APPROVED: <description>"). Do NOT treat plan-document
     mentions or earlier discussion as approval.
  3. Apply only that diff. If implementation requires anything
     beyond the approved diff, stop and request additional
     approval — do not "extend" the approval silently.
- Document the approval in the PR description: link to or
  paste the approval text, and confirm the diff applied matches
  the diff approved.

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
6. **Verification before submission.** Before committing or
   opening a PR, the test suite must run green on a real machine
   (local or CI). If the agent cannot run tests in its own
   environment (e.g. due to sandbox restrictions, missing
   Docker, missing services), it stops after writing code and
   asks the human to verify. The agent does not commit
   unverified work.
7. **Honest reporting.** When implementation hits an obstacle
   (failing test, missing dependency, ambiguous requirement,
   inability to access an environment), stop and report. Do
   not work around with relaxed configuration, real
   credentials, disabled tests, or "I'll fix it in the next
   PR" deferrals.

## Step 9 — Project documentation discipline (append-only)

Project planning documents (such as TEST_PLAN.md) evolve across
many PRs and are read by humans and AI agents months after the
fact. They must accumulate decisions, not overwrite them.

### Append-only rules

Within any single PR, allowed updates to the project plan
document:

- **Tick** completed checkboxes (`[ ]` → `[x]`)
- **Append** new entries to "Decisions Log"
- **Append** new entries to "Behavioral Inconsistencies Found"
- **Append** new entries to "Future Refactors"
- **Append** an "Implementation notes" subsection under the
  current PR section, capturing what was actually done (file
  paths, approaches chosen, deviations from the plan)
- **Clear** the "Open Questions / Pending Decisions" section
  when the PR submits

Not allowed within a PR:

- Rewriting or shortening existing checklist descriptions
  (pre-implementation wording is historical record showing how
  the project enforced its rules at planning time)
- Modifying existing Decisions Log entries
- Modifying sections like Module Order, Product Decisions,
  Conventions, Roles, or Behavior Preservation Rule without
  explicit human approval in plan mode
- Removing Behavioral Inconsistencies entries when resolved —
  the resolution is APPENDED, not the original deleted

### Core principle

When in doubt, append; don't rewrite.

Project documentation derives its value from being an
append-only ledger of decisions and findings, not from looking
"always up-to-date". The pre-implementation wording of a
checklist item is data: it records that a production change
required approval at the time, that a fallback strategy was
discussed, that a risk was anticipated. Rewriting that wording
into post-fact description deletes those signals.

This rule applies whenever the project document evolves across
multiple PRs over time.

## Step 10 — What to mock vs. what to keep real

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

## Step 11 — Test data

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