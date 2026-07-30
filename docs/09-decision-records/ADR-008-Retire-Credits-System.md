# ADR-008: Retire the Credits / Points System

## Status
Accepted

## Date
2026-07-31

## Context
Earlier iterations of SkillSwap included a credits/points concept: a `creditBalance` on the user, a `CreditTransaction` type, a `/credits` page, and a `transactions` list threaded through the frontend app context.

By mid-2026 the feature was inert:

- The `/credits` route resolved to the Dashboard via a fallthrough `case`.
- The `Credits` page component lived under `src/components/archive/` and was not imported anywhere.
- `transactions` was always set to an empty array — no endpoint ever populated it.
- `creditBalance` had no live UI reader; it was only mapped from the backend and consumed by the dead `Credits` page.

Keeping inert scaffolding around created misleading surface area (a route and a user field that appear meaningful but do nothing) and a maintenance tax on the shared app context.

## Decision
The credits/points system is retired on the frontend. The dead `Credits` page, the `creditTransaction` type, the `/credits` route entries, the `transactions` plumbing, and the `creditBalance` field + its mapping were removed (see the "Remove disabled credits scaffolding" change).

The backend still returns `creditBalance` in its user DTO; the frontend simply stops typing and mapping it. Removing it server-side is deferred to a separate backend decision.

## Rationale
- Removing inert code eliminates misleading routes/fields and reduces the shared-context surface.
- No user-facing behaviour changes, because everything removed was dead or always-empty.
- The product direction does not include a credits economy; there is no near-term plan to revive it.

## Consequences
- If a points/credits model is reintroduced later, it should be designed fresh against current requirements rather than resurrecting the archived scaffolding.
- The backend `creditBalance` column/DTO field remains until a backend cleanup addresses it; this is intentionally out of scope for the frontend change.
