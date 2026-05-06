---
name: page-refactor-playbook
description: Refactor large frontend pages into maintainable feature folders with screen, hooks, models, constants, utils, and components. Use when a page is too long, mixes rendering and business logic, or needs incremental API/service extraction without risky global rewrites.
---

# Page Refactor Playbook

Refactor one page at a time.
Preserve behavior.
Prefer incremental changes over architecture big-bang.

## Define Target Structure

Create a feature folder under `src/components/<featureName>/`:

```text
src/components/<featureName>/
  screen/
    <Feature>Screen.tsx
  hooks/
    use<Feature>Query.ts
    use<Feature>Mutations.ts
    use<Feature>Form.ts
    use<Feature>Selection.ts
  models/
    <feature>Types.ts
    <feature>FormModel.ts
    <feature>StatusModel.ts
  constants/
    <feature>Status.ts
    <feature>Filters.ts
    <feature>Ui.ts
  utils/
    <feature>Mapper.ts
    <feature>Validation.ts
    <feature>Format.ts
  components/
    <Feature>Toolbar.tsx
    <Feature>ListPanel.tsx
    <Feature>DetailPanel.tsx
```

Use this structure as a default, then trim unused files.

## Enforce Split Rules

Apply these rules strictly:

1. Keep `screen` focused on composition and rendering only.
2. Move side effects, network calls, and orchestration into hooks.
3. Keep each hook focused on one concern.
4. Keep models typed and separated by concern (form/status/view types).
5. Keep constants in `constants/` (status options, filters, labels, limits, routing keys).
6. Keep utils pure and side-effect free.
7. Add a new component when one JSX block becomes hard to scan.
8. Prefer direct imports over local barrel `index.ts` unless there is a real reuse need.
9. Do not perform global API migration during one-page refactor.
10. Extract only the API paths used by the current page into domain service files.
11. Keep each file single-responsibility; split when file grows beyond ~250 lines.
12. Prefer direct type imports from domain files (for example `types/workshop`) over type barrel files.
13. Keep barrel files only as short-lived migration shims and remove them after call sites are migrated.

## Refactor Sequence

Follow this order:

1. Freeze current behavior and collect regression risks.
2. Create feature folder and move the old page into `screen/`.
3. Extract types into `models/`.
4. Extract options/maps/static config into `constants/`.
5. Extract pure transformation and validation into `utils/`.
6. Extract data loading hook (`use...Query`).
7. Extract mutation hook (`use...Mutations`).
8. Extract local UI/form state hook (`use...Form`, `use...Selection`).
9. Split large JSX into focused components.
10. Replace barrel type imports with direct domain type imports.
11. Wire `screen` with hooks/components.
12. Run build and smoke tests.

## API/Service Extraction Policy

When touching API code during page refactor:

1. Keep shared transport primitives where they are (for example `apiCall`).
2. Create domain services under `src/shared/service/<domain>/`.
3. Move only endpoints used by the current page.
4. Avoid rewriting unrelated endpoints.
5. Keep return types honest:
   If a call throws on non-2xx, do not type it as nullable unless caught and converted.

## Definition Of Done

Consider page refactor done only when all pass:

1. Main page file is mostly render composition.
2. No hook is doing unrelated jobs.
3. No model file mixes unrelated type groups.
4. Behavior matches pre-refactor flows.
5. Build passes without new type errors.
6. Manual smoke test checklist passes.

## Manual Smoke Test Checklist

Run these checks for the refactored page:

1. Open page from navigation and deep-link entry.
2. Load list data and detail data.
3. Run primary submit/save action.
4. Run secondary actions (approve/reject/cancel/delete if available).
5. Verify error states (401/403/404/validation).
6. Verify retry and refresh behavior after idle time.
7. Verify mobile and desktop layouts.
8. Confirm notification or follow-up side effects if page depends on them.

## Output Format For Refactor Tasks

When reporting results, always include:

1. Files added/changed.
2. Why each split happened.
3. Risks and assumptions.
4. Exact test steps and what to click.
5. Remaining technical debt not handled in this round.
