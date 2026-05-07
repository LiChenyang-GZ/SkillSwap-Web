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

---

## Focus Supplement: Async Error Presentation for `signOut` and Notifications

This section supplements the existing plan and prioritizes two paths that are currently spread across `AppContext` + notifications hooks:

1. `signOut` async failure handling and user-facing fallback.
2. Notification read paths:
   - notifications list loading (`getAll`);
   - unread count background refresh (`getUnreadCount`);
   - mark read / mark all read mutations.

### Current Behavior Snapshot (Baseline to Preserve Unless Explicitly Changed)

#### A) `signOut` (`src/contexts/AppContext.tsx`)

Current flow:

1. `await clerkSignOut()`
2. Clear local auth/workshop/admin state
3. Navigate to `hero`
4. Show success toast: `"Signed out successfully"`

Current risk:

1. No `try/catch` boundary around `clerkSignOut()`.
2. If upstream sign-out throws, UI fallback is not explicitly controlled.

#### B) Notifications list load (`useNotificationsQuery`)

Current flow:

1. If unauthenticated: render auth state (no error).
2. If authenticated but no token: show `NOTIFICATIONS_SESSION_EXPIRED_MESSAGE`.
3. Load via `notificationQueryService.getAll`.
4. On failure: map status `401/403` to domain copy, otherwise generic load-failed copy.

Current semantics:

1. Error is inline/list-state error, not toast.
2. Retry is explicit (`Retry` button), via `reloadNonce`.

#### C) Notifications unread count (`refreshNotificationsUnreadCount` in `AppContext`)

Current flow:

1. Background refresh when not on notifications page.
2. If no token: set count to `0`.
3. On request failure: `console.warn`, no user-facing interruption.

Current semantics:

1. Silent failure (badge may stay stale).
2. No blocking of current page rendering.

### Target Error Contract for These Flows

Use shared `AppError` model from this plan and keep existing UX semantics.

#### Suggested `source` values

1. `auth.signout`
2. `notifications.query.list`
3. `notifications.query.unread_count`
4. `notifications.mutation.mark_read`
5. `notifications.mutation.mark_all_read`

#### Suggested UI policy matrix

1. `signOut`
   - `unauthorized/forbidden`: still clear local session state when safe, keep navigation semantics, show stable guidance toast.
   - `network/server/unknown`: keep user on current page, show non-destructive failure toast, allow retry.
2. Notifications list load:
   - Preserve current inline error copy and retry button behavior.
   - Keep `401/403` mapping semantics exactly as current product copy.
3. Unread count refresh:
   - Preserve silent non-blocking behavior by default.
   - Add structured logging/telemetry metadata from `AppError` (no new user-visible error by default).
4. Mark read / mark all read:
   - Preserve optimistic/local update strategy and non-blocking unread refresh.
   - Add normalized error classification for observability and future selective toasts.

### Implementation Add-on Plan (Small PR slices)

#### Slice S1: Shared mapper readiness for auth/notification sources

Files:

1. `src/shared/error/models/appErrorModel.ts`
2. `src/shared/error/utils/mapToAppError.ts`
3. (optional) `src/shared/error/utils/errorMessageResolver.ts`

Tasks:

1. Ensure mapper supports `status` from `apiCall`-style errors.
2. Add source tagging helper to avoid repeating literals.

#### Slice S2: `signOut` controlled failure presentation

Primary file:

1. `src/contexts/AppContext.tsx`

Tasks:

1. Wrap sign-out path with normalized error mapping.
2. Preserve success path semantics exactly.
3. Define explicit failure branch UX:
   - toast copy policy
   - whether to keep page or soft-redirect
4. Do not refactor unrelated auth bootstrap code in same PR.

#### Slice S3: Notifications query/mutation normalization

Primary files:

1. `src/shared/service/notification/notificationQueryService.ts`
2. `src/shared/service/notification/notificationMutationService.ts`
3. `src/components/notifications/hooks/useNotificationsQuery.ts`
4. `src/components/notifications/hooks/useNotificationsMutations.ts`

Tasks:

1. Services throw `AppError` (with `source`) instead of ad-hoc `Error`.
2. `useNotificationsQuery` branches on `AppError.kind` (not raw `status` cast).
3. Preserve `notificationMessages.ts` wording and retry behavior unchanged.
4. Keep mutation failures non-blocking unless product explicitly changes.

#### Slice S4: Unread count refresh path hardening

Primary file:

1. `src/contexts/AppContext.tsx`

Tasks:

1. Normalize errors from `getUnreadCount`.
2. Keep silent background behavior as default.
3. Add a throttled diagnostic hook/log point for repeated failures (no UX change).

### Product-Semantics Guardrails (Important)

1. Do not change existing copy text in:
   - `NOTIFICATIONS_SESSION_EXPIRED_MESSAGE`
   - `NOTIFICATIONS_FORBIDDEN_MESSAGE`
   - `NOTIFICATIONS_LOAD_FAILED_MESSAGE`
2. Do not change notification retry entry point (`Retry` button contract).
3. Do not change unread count request timing in this phase.
4. Do not batch this with navigation or dashboard UI refactors.

### Verification Checklist for This Supplement

#### `signOut`

1. Success path: state cleared, route behavior unchanged, success toast unchanged.
2. Simulated sign-out failure: user sees stable failure feedback, no partial broken state.
3. Re-click sign-out after failure still works.

#### Notifications list

1. 200 success: list renders, sorting unaffected.
2. 401: session-expired copy unchanged.
3. 403: forbidden copy unchanged.
4. 5xx/network: generic load-failed copy unchanged.
5. Retry button still reloads and recovers.

#### Unread count

1. Non-notification pages still trigger background refresh.
2. Failure remains non-blocking (no new intrusive UI by default).
3. Badge update works after recovery or after mark-read actions.

### Relationship to Existing `memory-error-handling-plan.md`

This supplement follows the same normalization direction already documented for memory:

1. Distinguish business-empty states from real failures.
2. Move from raw error parsing to normalized domain error kind checks.
3. Migrate progressively by domain with behavior parity as top priority.
