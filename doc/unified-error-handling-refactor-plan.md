# Unified Error Handling Refactor Plan

## Context

This plan is for a dedicated follow-up branch (separate from the Dashboard refactor branch).
Goal: unify frontend error handling patterns without changing current product behavior.

## Scope

In scope:

1. Introduce shared error model and mapper.
2. Standardize service-layer error output.
3. Standardize hook/screen-level error consumption.
4. Keep existing user-visible semantics (messages, retry affordance, navigation behavior).

Out of scope (this phase):

1. Full i18n rewrite of all messages.
2. Rewriting all modules in one PR.
3. Replacing transport stack (`fetch` vs `apiCall`) globally.

## Open Decision: `fetch` vs `apiCall` in domain services

Background:

- Some newer domain services (for example `userProfileService`) currently use direct `fetch`.
- Existing shared modules still rely on `apiCall` from `src/lib/api.ts`.

Decision policy for the refactor branch:

1. Do not force immediate global migration in one PR.
2. For each migrated domain, choose one style and keep it internally consistent.
3. If a domain stays on direct `fetch`, it must still:
   - normalize errors through the shared error mapper;
   - preserve existing behavior for empty body / JSON parsing edge cases;
   - preserve status-derived message semantics.
4. If a domain migrates to `apiCall`, verify no behavior drift in:
   - fallback message text;
   - status handling (`401/403/404/413/5xx`);
   - body parsing behavior.

Acceptance for this decision:

1. No user-visible behavior regression from transport abstraction choice.
2. Service-layer error shape remains unified (`AppError`) regardless of transport.

## Principles

1. Progressive migration by domain, not big-bang.
2. Service layer throws structured domain errors.
3. Screen layer decides UI state from error kind, not raw text parsing.
4. Preserve existing product copy/interaction semantics unless explicitly approved.

## Target Architecture

### 1) Shared error model

Create:

- `src/shared/error/models/appErrorModel.ts`

Suggested shape:

```ts
export type AppErrorKind =
  | "not_found"
  | "unauthorized"
  | "forbidden"
  | "validation"
  | "conflict"
  | "rate_limited"
  | "network"
  | "server"
  | "unknown";

export interface AppError {
  kind: AppErrorKind;
  status?: number;
  message: string;
  source?: string; // e.g. "dashboard.profile.update"
  cause?: unknown;
}
```

### 2) Shared mapper

Create:

- `src/shared/error/utils/mapToAppError.ts`

Responsibilities:

1. Map `unknown` to `AppError`.
2. Prefer HTTP status when available.
3. Fallback to message heuristics for network/runtime failures.
4. Keep original `cause` for logs.

### 3) Optional message helpers

Create:

- `src/shared/error/utils/errorMessageResolver.ts`

Responsibilities:

1. Map `AppError` to stable UI message by domain/action.
2. Preserve current wording where already product-decided.

## Rollout Plan (By Domain)

### Phase 1: Dashboard profile path (smallest high-impact slice)

Target files:

- `src/shared/service/user/userProfileService.ts`
- `src/components/dashboard/hooks/useDashboardProfileForm.ts`
- `src/contexts/AppContext.tsx` (minimal touch only if needed)

Tasks:

1. Make `userProfileService` throw `AppError` instead of raw `Error`.
2. In profile hook, consume `AppError.kind` for branching (keep existing copy).
3. Verify avatar `413` and unauthorized paths still produce current semantics.

### Phase 2: Notifications

Target files:

- `src/components/notifications/hooks/useNotificationsQuery.ts`
- `src/components/notifications/hooks/useNotificationsMutations.ts`
- `src/shared/service/notification/*`

Tasks:

1. Replace ad-hoc status checks with shared mapper.
2. Keep list error states and retry behavior unchanged.

### Phase 3: Workshop (explore/detail/dashboard attendance paths)

Target files:

- `src/shared/service/workshop/*`
- `src/components/workshop/hooks/*`
- `src/components/dashboard/hooks/useDashboardHostingMutations.ts`

Tasks:

1. Standardize workshop service errors.
2. Preserve join/leave/hide side-effect timing and toast semantics.

### Phase 4: Memory + Admin Review convergence

Target files:

- `src/shared/service/memory/*` (or existing memory service files)
- `src/components/memory/hooks/*`
- `src/components/adminReview/hooks/*`

Tasks:

1. Align with existing memory error plan.
2. Remove duplicate local mappers where possible.

## AppContext Decomposition Plan (Error-handling related)

Current `AppContext.tsx` is large and mixes orchestration + transport concerns.
Decompose gradually:

1. Keep `AppContext` as state orchestration and page flow coordinator.
2. Move API details into `src/shared/service/*`.
3. Move long pure helper blocks into `src/shared/utils/*` (only when reused).

Recommended extraction order:

1. `user profile` (already started)
2. `workshop refresh/fetch mode logic`
3. `auth bootstrap profile fetch`
4. `notification unread refresh`

## Acceptance Criteria

1. `npm run build` passes after each phase.
2. No change to user-visible behavior for existing flows.
3. Service errors are structured (`AppError`) in migrated domains.
4. Hooks/screens no longer rely on fragile raw-text parsing in migrated domains.
5. Manual smoke tests pass for each migrated domain.

## Manual Verification Checklist

For each migrated phase:

1. Normal success path.
2. 401/403 path.
3. 404 path (if relevant for resource lookup).
4. 413 path (file upload related).
5. 5xx / network interruption path.
6. Retry path behavior.
7. Toast and inline error copy semantics unchanged.

## Risk & Mitigation

Risk 1: Hidden behavior drift in message wording.

- Mitigation: snapshot key messages and compare after each phase.

Risk 2: Inconsistent error shape while mixed old/new code coexists.

- Mitigation: migrate one domain end-to-end per phase.

Risk 3: Over-touching AppContext.

- Mitigation: keep AppContext edits minimal and only when contract requires it.

## Suggested Branch/PR Strategy

1. One phase per PR.
2. PR title format: `refactor(error): phase-X <domain>`.
3. Include before/after behavior checklist in PR template.
4. Do not combine unrelated UI refactors in these PRs.
