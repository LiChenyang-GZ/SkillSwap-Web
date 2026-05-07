# Memory Error Handling Plan

## Background

Current `memoryQueryService.getBySlug` returns `null` for **all** errors:

- expected `404` (memory not found)
- network offline / timeout
- backend `5xx`
- auth/permission errors

This makes UI unable to distinguish:

- true "not found" business state
- real failure states that should support retry/observability

## Goal

Introduce a domain-level error handling model for memory (and later other domains),
so screens can render different UI for:

1. not found
2. unauthorized/forbidden
3. transient network/server failure
4. unknown failure

## Design Proposal

### 1) Add a normalized error shape

Create a shared error model:

```ts
type DomainErrorCode =
  | "not_found"
  | "unauthorized"
  | "forbidden"
  | "validation"
  | "conflict"
  | "network"
  | "server"
  | "unknown";

interface DomainError {
  code: DomainErrorCode;
  status?: number;
  message: string;
  cause?: unknown;
}
```

### 2) Add error mapper utility

Create mapper utility from `unknown` -> `DomainError`, based on:

- `status` (if API error)
- message content
- fetch/network failure patterns

### 3) Service return strategy

For query methods like `getBySlug`:

- only map `404` to business empty state (`null`)
- throw normalized `DomainError` for others

Pseudo:

```ts
try {
  ...
} catch (error) {
  const mapped = mapDomainError(error);
  if (mapped.code === "not_found") return null;
  throw mapped;
}
```

### 4) Hook-level handling

In `useMemoryDetailQuery`:

- keep `entry: MemoryEntry | null`
- add `error: DomainError | null`
- add `errorKind` helper for UI branching

### 5) Screen/UI behavior

`MemoryDetailScreen`:

- `entry === null && !error` => Not Found view
- `error?.code in ["network", "server"]` => Failure view + Retry button
- `error?.code in ["unauthorized", "forbidden"]` => Permission/session guidance

## Rollout Steps

1. Add shared error model + mapper (no behavior change yet)
2. Migrate memory query service only
3. Update memory detail hook + screen
4. Manual verify 404/500/offline paths
5. Reuse same pattern in notification/workshop domain

## Non-goals for this phase

- global i18n of all error messages
- replacing all old `toast.error("Failed ...")` in one PR
- introducing third-party error libraries
