# ADR-009: Permanent Light-Only Visual Direction

## Status
Accepted

## Date
2026-07-31

## Context
SkillSwap previously carried a dark-mode toggle and associated theme plumbing. The brand direction settled on a single warm, cream / terracotta ("fox") light aesthetic that is core to the product's identity (including the fox mascot and the "Come curious. Leave connected." voice). The dark-mode path was removed (see the "remove dark mode" change merged as PR #5).

Maintaining two themes doubled the styling/QA surface for a small solo-maintained project and diluted a deliberately warm, consistent look.

## Decision
SkillSwap commits to a **permanent light-only** visual direction. There is no dark mode and no theme toggle. New UI is styled for the light theme only, using the existing semantic design tokens (e.g. `background`, `foreground`, `muted-foreground`, `primary`, `secondary`, `card`, `border`).

## Rationale
- The warm light aesthetic is a brand asset, not an incidental default.
- A single theme halves styling and visual-QA effort for a solo maintainer.
- Removing the toggle removes a class of theme-related visual bugs.

## Consequences
- Contributors must not introduce `dark:` variants, theme toggles, or `prefers-color-scheme` branching in app UI.
- Color choices should go through the semantic tokens so contrast stays consistent (relevant for accessibility — see small-text contrast fixes in prior PRs).
- This is a product/brand guardrail; revisiting it would be a deliberate brand decision, not a routine feature.
