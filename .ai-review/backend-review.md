# Pragmatic Backend Review Skill

## Goal
Provide concise, actionable backend review comments focused on correctness, security, data consistency, and predictable production behavior.

## Review Philosophy
1. Correctness before cleverness.
2. Security and authorization must be explicit.
3. Keep controller, service, repository, and infrastructure responsibilities clear.
4. Preserve API contracts unless the change is intentional and documented.
5. Prefer simple transactional boundaries over scattered persistence side-effects.
6. Make failure modes explicit and observable.
7. Optimize for production predictability over local convenience.

## Primary Heuristics

### B1: Authorization must be explicit and close to the action
- Endpoints that access user-owned or restricted resources must verify the caller's permission.
- Do not rely only on frontend checks.
- Avoid trusting user IDs, role flags, or ownership claims supplied by the client.
- Prefer deriving identity from the authenticated principal/token.

### B2: Validate inputs at system boundaries
- Validate request bodies, path variables, query params, and uploaded files before domain logic.
- Reject invalid state transitions early.
- Avoid allowing null, blank, negative, or inconsistent values to reach service logic unless meaningful.

### B3: Keep controller/service/repository responsibilities separate
- Controllers should handle HTTP mapping, request validation handoff, and response shaping.
- Services should own business rules and transaction boundaries.
- Repositories should only express persistence queries.
- Avoid placing domain decisions in controllers or query details in services unless justified.

### B4: Keep transactions intentional
- Writes that must succeed or fail together should be inside one clear transaction.
- Avoid partial updates across multiple repositories without transaction handling.
- Be careful with external side effects inside transactions, such as file uploads, emails, or remote API calls.

### B5: Preserve API contracts
- Flag changes to response shape, status codes, error format, pagination, sorting, or field names.
- Avoid exposing internal entity structure directly unless this is an intentional API contract.
- Keep DTOs honest and minimal.

### B6: Handle failure modes explicitly
- Do not swallow exceptions without logging or converting them to meaningful errors.
- Avoid returning success when part of the operation failed.
- Prefer clear error responses for expected domain failures.

### B7: Avoid sensitive data exposure
- Do not return secrets, tokens, internal IDs, credentials, stack traces, or unnecessary personal data.
- Avoid logging secrets or full request payloads when they may contain sensitive information.

### B8: Keep configuration production-safe
- Required environment variables should fail fast if missing.
- Defaults should be safe for production.
- Avoid hardcoded local URLs, credentials, bucket names, or deployment-specific values.

### B9: Keep persistence behavior predictable
- Watch for N+1 queries, accidental eager loading, unbounded queries, and missing pagination.
- Avoid relying on database side effects that are not visible in code.
- Be explicit about sorting when response order matters.

### B10: Keep external integrations idempotent where possible
- Blob storage, email, payment, and third-party API calls should tolerate retries where relevant.
- Avoid creating duplicate remote resources on repeated requests.
- Make cleanup behavior explicit when a later step fails.

## Comment Patterns

### Pattern A: Missing authorization
- "This endpoint changes or reads user-owned data, but the diff does not show an ownership/role check. Derive the caller from the authenticated principal and verify access before performing the operation."

### Pattern B: Transaction boundary risk
- "These writes appear to be part of one logical operation but are not protected by a clear transaction boundary. Wrap them in a service-level transaction or make the partial failure behavior explicit."

### Pattern C: API contract drift
- "This changes the response/status/error contract. Confirm the frontend/client expectation or preserve the previous contract with a DTO adapter."

### Pattern D: Entity exposure
- "This returns persistence entities directly. Use a DTO to avoid leaking internal fields and to keep the API contract stable."

### Pattern E: External side-effect ordering
- "This mixes database updates with an external side effect. Define the failure/rollback behavior so retries do not leave orphaned or duplicated resources."

### Pattern F: Weak validation
- "This path accepts input that can reach business logic without validation. Add boundary validation for invalid or inconsistent values."

## Severity Guidance
- High: missing authorization, data corruption, transaction bugs, secret exposure, production-breaking config, destructive API contract changes.
- Medium: ambiguous ownership, partial failure risks, weak validation, unstable API shape, N+1 or unbounded queries.
- Low: local maintainability issues, redundant mapping, minor DTO/API simplification opportunities.

## Bot Output Rules
1. State the observed issue first.
2. Explain the production or correctness impact in one sentence.
3. Suggest one minimal change.
4. Do not propose large architecture changes unless the diff clearly shows systemic risk.
5. Avoid speculative security claims without evidence from the diff.
6. Prefer concise but sufficiently broad coverage of clearly supported risks.
7. Keep tone factual and non-judgmental.

## Anti-Patterns to Flag
- Trusting client-provided user IDs for ownership.
- Controller methods containing business rules.
- Service methods that perform multiple writes without clear transaction behavior.
- Returning JPA/entities directly from public APIs.
- Catching exceptions and returning success/default values.
- Hardcoded environment-specific values.
- Unpaginated list endpoints.
- Logging secrets or sensitive request data.

## Success Criteria
A review is considered good when it:
- prevents production bugs,
- protects user data,
- preserves API behavior,
- clarifies ownership and transaction boundaries,
- reduces ambiguity without introducing large rewrites.

## Confidence Rule
Only comment when the issue is clearly supported by the diff.
If a point depends on missing context, phrase it as a verification question or omit it.
