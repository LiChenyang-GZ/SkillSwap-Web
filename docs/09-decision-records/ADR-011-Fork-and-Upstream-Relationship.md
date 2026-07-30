# ADR-011: Fork ↔ Upstream Relationship and Solo Workflow

## Status
Accepted

## Date
2026-07-31

## Context
SkillSwap is developed across two GitHub repositories:

- **upstream** (`LiChenyang-GZ/SkillSwap-Web`) — where backend work primarily lands.
- **fork** (`eggy1011/SkillSwap-Web`) — where the current maintainer does frontend-led development and integration.

Responsibilities are split: the maintainer owns the **frontend**; a collaborator owns the **backend**. Small, low-risk backend changes may be made by the maintainer, but only after coordinating.

Because the production backend runs with `ddl-auto=validate` and Flyway disabled, entity/schema changes require a matching production DDL to be executed manually before deploy — so backend-entity changes are not purely a code concern.

## Decision
Adopt the following working model:

- **Frontend**: maintainer works on the fork via feature branch → PR → self-review + AI review → merge on GitHub.
- **Small backend changes** (e.g. a DTO tightening, a one-line security config, a comment fix): the maintainer may do them, but must `git fetch upstream` first to avoid colliding with in-flight backend work, and notify the collaborator afterward (ideally opening an upstream PR or sharing the diff).
- **Large backend changes** (entity/schema, deployment, cloud config): owned by the collaborator, or done only after explicit coordination — especially anything touching production schema, since prod migrations are manual.
- **Upstream sync**: before development, `git fetch upstream` and integrate new backend commits first; shared files (e.g. `App.tsx`, DTOs, services) must have conflicts resolved by combining both intents.
- **Single source of truth**: `origin/main` on the fork; avoid long-lived divergent feature forks. When the same feature exists in two places, reconcile to one canonical implementation before merging.

## Rationale
- The frontend/backend ownership split matches who has context and platform access.
- Manual production migrations make backend-entity changes high-consequence, warranting coordination.
- Recording the model prevents accidental divergence and merge conflicts across the two repos.

## Consequences
- Every development session begins with an upstream fetch/integration check.
- Backend PRs that change entities must carry the DDL and a production-execution note (a schema-change runbook practice).
- Feature work should reconcile any duplicate implementations to a single canonical version before merge, rather than merging both.
