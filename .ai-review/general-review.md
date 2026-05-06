## Repository Context

This repository contains:
- Frontend: React / TypeScript application under `skill-swap-frontend/`
- Backend: Spring Boot / Java 17 application under `skill-swap-backend/`
- Backend deployment: Gradle build, Docker image, GHCR, Azure VM
- Auth: Clerk / JWT-based authentication
- Storage: Azure Blob Storage

Main review surfaces:
- Frontend state/effects/components
- Backend authorization, business logic, API contracts, persistence, and deployment configuration

## Validation Awareness

When reviewing, prefer comments that can be validated by:
- TypeScript build or lint for frontend changes
- Gradle build or backend tests for Spring Boot changes
- API contract checks between frontend calls and backend responses
- Manual UI behavior checks for loading, error, empty, and permission states

Flag changes where expected validation is unclear, missing, or likely to fail.

## PR Rejection Risks

Prioritize issues that could cause:
- CI/build/test failure
- broken local development setup
- frontend/backend contract mismatch
- authentication or permission regression
- user-visible behavior changes hidden inside refactors
- production misbehavior after deployment

## Instruction Priority

Use these review rules as the primary review policy.
Do not override them with generic code review preferences.
If the diff does not provide enough evidence for an issue, omit the comment or phrase it as a verification question.

## Fullstack Review Policy

When frontend and backend files are changed together, check whether:
- frontend request/response assumptions still match backend DTOs
- status codes and error formats still match frontend handling
- auth requirements changed but frontend routing/session logic did not
- backend config/dependency changes affect local development or deployment
- refactors hide user-visible behavior changes

## PR Context First

Before generating inline comments, first build a concise PR context that includes:
- Pull request overview
- Changes
- Review scope detected
- Suggested review focus

Use this context to prioritize the most important and highest-impact issues.
Avoid low-value comments when context suggests larger correctness or contract risks.

## Anti-Loop Decision Order (Fixed)

Always evaluate in this exact order:
1. Correctness
2. User-visible behavior
3. Availability
4. Performance
5. Maintainability
6. Style

Never downgrade a higher-priority concern to optimize a lower-priority one.

## Allowed Trade-off Whitelist

Allowed default trade-offs for this project:
- stale data vs fail-closed: prefer keeping last known good data on transient fetch failure unless data correctness/security would be violated.
- abort/cancel vs dedupe: prefer dedupe/shared in-flight requests first; add cancellation only for proven stale-write/race scenarios.
- hook dependency stability vs forced freshness: prefer stable dependencies + explicit refresh triggers over broad dependency expansion.

## No Re-Challenge Rule

If a trade-off is already chosen in this PR iteration, do not challenge it again unless at least one trigger is present:
- New evidence of correctness bug with reproducible steps.
- New user-visible regression introduced by latest commit.
- API contract change invalidates previous decision.
- Security/privacy risk newly introduced.
- Performance regression exceeds agreed threshold (latency/memory/load).

Without one of these triggers, the reviewer must not re-open the same trade-off.

## Comment Quality Gate

A comment is allowed only if all fields are present:
- Repro path
- User impact
- Severity
- Minimal fix
- Acceptance criteria

If any field is missing, omit the comment.

## Root-Cause Dedup Rule

Only one comment per root cause is allowed.
If multiple symptoms share one root cause, merge them into a single comment and reference the same root-cause id.

## Stop Condition

PR can be approved when:
- Must fix: all correctness/security/user-visible regressions are resolved.
- Can defer: performance/maintainability improvements tracked as follow-up.
- Non-blocking: style-only or preference-only points are not blockers.
