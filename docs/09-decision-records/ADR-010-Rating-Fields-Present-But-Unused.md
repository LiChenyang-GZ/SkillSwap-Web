# ADR-010: Rating / Review Fields Present But Unused (Deferred)

## Status
Accepted (interim)

## Date
2026-07-31

## Context
The user model carries `rating` and `reviewCount` fields (mapped from the backend `UserProfileDto`), but there is no feature that produces, displays, or aggregates ratings. No host-review flow exists. The fields are effectively placeholders with default values (`0`).

This mirrors the situation that led to retiring credits (ADR-008): fields that look meaningful but do nothing invite confusion. Unlike credits, however, a host-rating/review feature is a plausible near-future product direction, so outright removal is not obviously correct.

## Decision
Keep `rating` / `reviewCount` in the data model for now, but treat them as **unused placeholders**: do not surface them in UI and do not add logic that depends on them until a host-review feature is actually designed. This ADR records their status so they are not mistaken for working functionality.

The enable-vs-remove decision is explicitly deferred to when the product roadmap reaches a host evaluation/review feature (tracked as a product-growth item).

## Rationale
- Removing them now would be churn if a review feature lands soon; keeping them exposed as if functional would be misleading.
- Recording the "present but unused" status prevents future contributors from assuming ratings work.

## Consequences
- Public-facing profiles and cards must not display `rating`/`reviewCount` while they are placeholders.
- When a review feature is planned, revisit this ADR to either (a) build the feature and populate the fields, or (b) remove them if the direction changes.
