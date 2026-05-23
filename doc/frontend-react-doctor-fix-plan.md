# Frontend React Doctor Fix Plan

Generated from `skill-swap-frontend/react-doctor-report.json` (react-doctor v0.2.3).  
**Total diagnostics: 479 across 51 rules.**  
Codex should read the specified file and line numbers before making any changes.

---

## Execution Order

Tasks should be completed in order: **1 → 2 → 3 → 4 → 5 → 6 → 7 → 8**.  
Complete Task 6 before Task 3's `jsx-no-constructed-context-values` note — those files are deleted in Task 6.

---

## Task 1 — Security Fix

File: `src/components/memory/components/MemoryMarkdownRenderer.tsx`

- Line **80**: `<iframe>` missing `sandbox` attribute
- Line **97**: `<iframe>` missing `sandbox` attribute

**Fix:** Add `sandbox="allow-scripts allow-same-origin"` to both iframes. Adjust sandbox permissions based on what content the iframe actually needs to render.

---

## Task 2 — Bug Fixes (Correctness)

### 2a. `exhaustive-deps` — Read the effect context before adding deps; avoid infinite loops

| File | Line | Missing dependency |
|------|------|--------------------|
| `src/components/adminReview/hooks/useAdminReviewQuery.ts` | 228 | `loadWorkshops` |
| `src/components/adminReview/hooks/useAdminReviewQuery.ts` | 233 | `loadWorkshopDetail` |
| `src/components/adminReview/hooks/useAdminReviewQuery.ts` | 270 | `pageSize` |
| `src/components/workshop/hooks/useWorkshopDetailQuery.ts` | 61 | `controllerRef.current` will have changed by cleanup time — capture the ref value in a local variable at the top of the effect |
| `src/components/workshop/hooks/useWorkshopAttendanceMembership.ts` | 73 | Same `controllerRef.current` issue as above |

### 2b. `button-has-type` — Add explicit `type` attribute (use `"button"` unless it intentionally submits a form)

| File | Line |
|------|------|
| `src/components/memory/components/MemoryWallCarousel.tsx` | 107 |
| `src/components/adminReview/components/AdminReviewListPanel.tsx` | 58 |
| `src/components/memory/components/MemoryStudioEntriesPanel.tsx` | 70 |
| ~~`src/components/ui/sidebar.tsx:286`~~ | Deleted in Task 6, skip |

### 2c. `no-array-index-as-key` — Replace `index` with a stable ID field from the data

| File | Line |
|------|------|
| `src/components/memory/components/MemoryWallCarousel.tsx` | 108 |
| `src/components/archive/HomePage.tsx` | 109 (this file is moved to `src/components/home/HomePage.tsx` in Task 6 — fix the key issue here first, then the move will carry the fix along) |
| ~~`src/components/archive/Credits.tsx:234`~~ | Deleted in Task 6, skip |
| ~~`src/components/ui/slider.tsx:55`~~ | Deleted in Task 6, skip |

---

## Task 3 — Performance

### 3a. `async-await-in-loop`

File: `src/components/memory/hooks/useMemoryStudioEditor.ts`, line **147**

`await` inside a while-loop runs calls sequentially. If the operations are independent, refactor to:
```ts
await Promise.all(items.map(async (item) => { ... }))
```

### 3b. `js-tosorted-immutable` — Replace `[...arr].sort(fn)` with `arr.toSorted(fn)`

| File | Lines |
|------|-------|
| `src/components/adminReview/hooks/useAdminReviewQuery.ts` | 60 |
| `src/components/dashboard/utils/dashboardWorkshopUtils.ts` | 99, 103 |
| `src/components/notifications/utils/notificationSort.ts` | 13 |
| `src/components/memory/utils/memorySort.ts` | 5 |

### 3c. `jsx-no-constructed-context-values`

All 5 instances are in shadcn/ui files that are deleted in Task 6 (form.tsx, chart.tsx, carousel.tsx, toggle-group.tsx). **Auto-resolved by Task 6 — no action needed here.**

---

## Task 4 — React State / Effect Anti-patterns

> These require reading the full file for context before changing anything. Do not fix line-by-line in isolation.

### 4a. `useAdminReviewFormState.ts` (highest priority in this task)

File: `src/components/adminReview/hooks/useAdminReviewFormState.ts`

- Line **43** (`no-cascading-set-state`): 10 `setState` calls inside a single `useEffect` — convert to `useReducer`
- Line **44** (`no-event-handler`): `useEffect` used as an event handler — call the logic directly in the event handler instead
- Lines **45–59** (`no-adjust-state-on-prop-change`): Multiple places adjusting state in response to prop changes inside `useEffect` — adjust state directly during render, or pass a `key` prop to reset the component

### 4b. `useAdminReviewQuery.ts` (most issues concentrated here)

File: `src/components/adminReview/hooks/useAdminReviewQuery.ts`

- Lines **52, 56, 57** (`no-event-handler`): effects used as event handlers
- Line **60** (`js-tosorted-immutable`): handled in Task 3b
- Line **206** (`no-cascading-set-state`): 5 setState calls in one `useEffect`
- Lines **208–212** (`no-adjust-state-on-prop-change`): adjusting state in response to prop changes inside `useEffect`
- Lines **217, 237, 240, 250, 256, 262, 273** (`no-event-handler` / `no-chain-state-updates`): chained state updates and effects used as event handlers
- Lines **228, 233, 270** (`exhaustive-deps`): handled in Task 2a
- Lines **245, 260, 261, 274** (`no-derived-state`): `selectedId`, `currentPage` are derived values — compute them during render (or with `useMemo`) instead of storing in state

### 4c. `useMemoryStudioSelection.ts`

File: `src/components/memory/hooks/useMemoryStudioSelection.ts`

- Lines **21, 37** (`no-event-handler`): props + effect used as event handler
- Lines **31, 38** (`no-event-handler`): state + effect used as event handler
- Lines **32, 39, 48** (`no-chain-state-updates`): chained state updates
- Line **39** (`no-adjust-state-on-prop-change`): adjusting state on prop change
- Lines **32, 48** (`no-derived-state`): `entryPage`, `selectedId` are derived — remove from state

### 4d. `useWorkshopDetailQuery.ts`

File: `src/components/workshop/hooks/useWorkshopDetailQuery.ts`

- Line **44** (`no-cascading-set-state`): 5 setState calls in one `useEffect`
- Lines **48, 55** (`no-derived-state`): `workshop` is derived — compute during render
- Lines **49, 50, 58** (`no-adjust-state-on-prop-change`): adjusting state on prop change in `useEffect`

### 4e. Remaining files

| File | Lines | Rules |
|------|-------|-------|
| `src/components/hero/hooks/useHeroMemoryCarousel.ts` | 8, 21 (`no-event-handler`); 17, 22, 27 (`no-adjust-state-on-prop-change` + `no-chain-state-updates`) | Read full file first |
| `src/components/memory/hooks/useMemoryStudioDocumentSync.ts` | 21 (`no-cascading-set-state`, 4 setState); 24 (`no-event-handler`) | — |
| `src/components/memory/hooks/useMemoryStudioQuery.ts` | 35 (`no-adjust-state-on-prop-change`) | — |
| `src/components/dashboard/hooks/useDashboardPagination.ts` | 35, 39, 43 (`no-derived-state`) | `upcomingPage`, `attendedPage`, `hostingPage` are derived |
| `src/components/dashboard/hooks/useDashboardHostingMutations.ts` | 33 (`no-derived-state`) | `hiddenHostedWorkshopIds` is derived |
| `src/components/dashboard/hooks/useDashboardProfileForm.ts` | 31 (`no-derived-state`) | `editUsername` is derived |
| `src/contexts/app/useNotificationUnreadCount.ts` | 64 (`no-event-handler`); 72 (`no-adjust-state-on-prop-change`) | — |
| `src/contexts/AppContext.tsx` | 198 (`no-chain-state-updates`) | — |
| `src/components/auth/hooks/useAuthRedirect.ts` | 12 (`no-event-handler`) | — |

---

## Task 5 — Accessibility

### 5a. `prefer-tag-over-role` — Use semantic HTML (4 instances in custom files; the other 4 are in shadcn/ui files deleted in Task 6)

| File | Line | Fix |
|------|------|-----|
| `src/components/dashboard/components/DashboardAttendedTab.tsx` | 45 | `<div role="button">` → `<button type="button">` |
| `src/components/dashboard/components/DashboardUpcomingTab.tsx` | 58 | Same |
| `src/components/dashboard/components/DashboardHostingTab.tsx` | 57 | Same |
| `src/components/notifications/components/NotificationsListItem.tsx` | 13 | Same |

### 5b. `control-has-associated-label` — Add `aria-label` or associate a `<label htmlFor>`

| File | Lines |
|------|-------|
| `src/components/memory/components/MemoryStudioEditorPanel.tsx` | 230, 237 |
| `src/components/dashboard/components/DashboardEditProfileDialog.tsx` | 73 |
| `src/components/adminReview/components/AdminReviewDetailPanel.tsx` | 163 |

---

## Task 6 — Dead Code Cleanup

### 6a. Delete 11 unused custom files

- `src/components/ThemeToggle.tsx`
- `src/components/archive/Credits.tsx`
- `src/components/memory/constants/memoryEditorOptions.ts`
- `src/components/memory/models/memoryStatusModel.ts`
- `src/components/navigation/hooks/useNavigationAuthState.ts`
- `src/components/navigation/hooks/useNavigationPageState.ts`
- `src/components/navigation/hooks/useNavigationThemeState.ts`
- `src/lib/authRedirect.ts`
- `src/shared/hooks/index.ts`
- `src/shared/utils/index.ts`
- `src/types/review.ts`

**Folder cleanup after deletions (structural):**

- `src/components/archive/` — after deleting `Credits.tsx`, only `HomePage.tsx` remains. `HomePage.tsx` is still actively used (not flagged as unused-file) but is misplaced in a folder called "archive". Move it to a proper location: create `src/components/home/` and move `HomePage.tsx` into it, then delete the now-empty `archive/` directory. Update all imports. Note: Task 2c's fix to `archive/HomePage.tsx:109` should be applied before or during this move.

- `src/lib/` — after deleting `authRedirect.ts`, only `api.ts` remains in this directory. Move `src/lib/api.ts` to `src/shared/api.ts`, update all import paths that reference `lib/api` across the codebase, then delete the now-empty `lib/` directory. This consolidates all cross-cutting infrastructure under `shared/`.

### 6b. Delete 34 unused shadcn/ui component files under `src/components/ui/`

accordion, alert-dialog, alert, aspect-ratio, breadcrumb, calendar, carousel, chart, collapsible, command, context-menu, drawer, form, google-icon, hover-card, input-otp, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, separator, sheet, sidebar, skeleton, slider, table, toggle-group, toggle, tooltip, use-mobile

After deleting these files, the following diagnostics are automatically resolved with no further action:
- All 5 `jsx-no-constructed-context-values` instances (Task 3c)
- All 10 `no-multi-comp` instances in `ui/` (except `avatar.tsx` — see Skipped section)
- 4 of 8 `prefer-tag-over-role` instances (breadcrumb, carousel ×2, input-otp)
- `button-has-type` in `sidebar.tsx:286`
- `no-array-index-as-key` in `Credits.tsx:234` and `slider.tsx:55`
- `only-export-components` in `navigation-menu.tsx:167` and `toggle.tsx:47`

### 6c. Remove 19 unused exports

| File | Line | Export to remove |
|------|------|-----------------|
| `src/components/adminReview/utils/adminReviewUtils.ts` | 52 | `parseWorkshopStart` |
| `src/components/create-workshop/constants/createWorkshopStatusConstants.ts` | 2 | `CREATE_WORKSHOP_TOAST_SUCCESS` |
| `src/components/create-workshop/constants/createWorkshopStatusConstants.ts` | 3 | `CREATE_WORKSHOP_TOAST_SIGN_IN_REQUIRED` |
| `src/components/create-workshop/constants/createWorkshopStatusConstants.ts` | 4 | `CREATE_WORKSHOP_TOAST_FAILED_PREFIX` |
| `src/components/dashboard/utils/dashboardWorkshopUtils.ts` | 11 | `parseWorkshopStartTime` |
| `src/components/dashboard/utils/dashboardWorkshopUtils.ts` | 30 | `resolveHostingDisplayStatus` |
| `src/components/dashboard/utils/dashboardWorkshopUtils.ts` | 87 | `dedupeWorkshopsById` |
| `src/components/dashboard/utils/dashboardWorkshopUtils.ts` | 93 | `getWorkshopStartMillis` |
| `src/components/dashboard/utils/dashboardWorkshopUtils.ts` | 98 | `sortByStartAsc` |
| `src/components/dashboard/utils/dashboardWorkshopUtils.ts` | 102 | `sortByStartDesc` |
| `src/components/memory/constants/memoryUiConstants.ts` | 24 | `MEMORY_MARKDOWN_REHYPE_PLUGINS` |
| `src/components/memory/utils/memoryDocument.ts` | 4 | `parseFrontMatter` |
| `src/components/memory/utils/memoryDocument.ts` | 28 | `normalizeMemoryCoverValue` |
| `src/components/memory/utils/memoryDocument.ts` | 41 | `extractMemoryMediaUrls` |
| `src/components/workshop/utils/workshopStatusLabels.ts` | 44 | `isWorkshopOpenForRegistration` |
| `src/constants/workshop.ts` | 9 | `workshopSkillLevels` |
| `src/lib/api.ts` | 206 | `userAPI` |
| `src/lib/api.ts` | 228 | `transactionAPI` |
| `src/shared/constants/uploadLimits.ts` | 20 | `IMAGE_UPLOAD_MAX_MB` |

---

## Task 7 — Tailwind CSS Mechanical Fixes (batch with script/global replace)

### 7a. `design-no-redundant-size-axes` (170 instances)

When `w-N` and `h-N` have the same value, collapse to `size-N`. The project uses Tailwind `^4.1.13` which fully supports `size-N`.

Use a regex global replace: find `w-(\S+)\s+h-\1` (where both values match) and replace with `size-$1`. Verify visually after the change — do not apply to cases where the values differ.

### 7b. `design-no-space-on-flex-children` (58 instances)

On flex or grid parent elements, replace:
- `space-y-{N}` → `gap-y-{N}`
- `space-x-{N}` → `gap-x-{N}`
- `space-{N}` → `gap-{N}`

**Important:** Confirm the element is actually a flex/grid container before replacing. Do not do a blind global replace.

---

## Task 8 — Folder Structure Cleanup

These are structural improvements independent of react-doctor. Each step requires updating all affected import paths after moving files.

### 8a. Move `figma/` component to `ui/`

`src/components/figma/ImageWithFallback.tsx` is a general-purpose UI component that has nothing to do with Figma tooling. Move it to `src/components/ui/ImageWithFallback.tsx`, update all import paths, then delete the now-empty `figma/` directory.

### 8b. Consolidate root-level `constants/` into the workshop feature

`src/constants/workshop.ts` contains workshop-specific constants but lives outside the workshop feature folder, duplicating the purpose of `src/components/workshop/constants/`. Read both files to understand the content split, then move the used exports from `src/constants/workshop.ts` into `src/components/workshop/constants/` (either an existing file or a new one). Note: `workshopSkillLevels` was already removed as an unused export in Task 6c, so check what remains. Update all imports, then delete `src/constants/workshop.ts`.

### 8c. Resolve the duplicate CSS entry point

There are two root-level CSS files: `src/index.css` and `src/styles/globals.css`. Read both files and check which one is actually imported in `src/main.tsx` and `src/App.tsx`. The unused one should be deleted. If both are imported, consolidate their contents into one file and remove the other.

### 8d. Flatten `contexts/app/` into `contexts/`

`src/contexts/AppContext.tsx` lives one level above its own supporting files in `src/contexts/app/` (appContextTypes, appRoutes, useCurrentUserProfileActions, useWorkshopState, useThemeMode, useNotificationUnreadCount). This asymmetry only makes sense if multiple contexts exist — currently there is only one. Move all files from `src/contexts/app/` up to `src/contexts/`, update imports in `AppContext.tsx` and anywhere else that imports from `contexts/app/`, then delete the now-empty `app/` subdirectory.

---

## Skipped Items (with rationale)

| Rule | Reason |
|------|--------|
| `only-export-components` in `button.tsx`, `badge.tsx` | shadcn/ui intentionally exports both the component and its variants helper (e.g. `buttonVariants`). Changing this breaks the shadcn/ui usage pattern. |
| `no-multi-comp` in `avatar.tsx` | shadcn/ui compound component design pattern — `Avatar`, `AvatarImage`, `AvatarFallback` in one file is conventional and expected. |
| `design-no-bold-heading` (14 instances) | Overly opinionated. Explicitly writing `font-bold` on a heading is a valid style intent, not a mistake. |
| `design-no-three-period-ellipsis` (7 instances) | Purely cosmetic typography. `...` vs `…` has no functional difference. Not worth the churn. |
