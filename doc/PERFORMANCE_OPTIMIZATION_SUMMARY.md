# Performance Optimization Summary

## Scope
This document summarizes the access-speed optimizations implemented during this conversation for both frontend and backend.

## Primary Goals
- Reduce unnecessary network requests per page.
- Avoid blocking UI feedback on secondary requests.
- Shrink payload size for list APIs.
- Reduce slow paths for workshop create/review/detail flows.
- Improve perceived performance when navigating from notifications.

## Frontend Optimizations

### 1) Page-based data loading strategy
Changed app-level data fetching to load only what each page needs.

- `home`, `explore` -> `refreshData('public')`
- `dashboard`, `create` -> `refreshData('mine')`
- `pastWorkshops` -> `refreshData('public')`

Why it helps:
- Prevents full preload on each page switch.
- Removes extra `mine`/`public` requests where not needed.

Files:
- `skill-swap-frontend/src/App.tsx`
- `skill-swap-frontend/src/contexts/AppContext.tsx`

### 2) In-flight deduplication for workshop detail requests
Added request deduplication so repeated calls for the same workshop detail share one promise.

Why it helps:
- Prevents duplicate `GET /api/v1/workshops/{id}` requests during fast UI transitions.

File:
- `skill-swap-frontend/src/lib/api.ts`

### 3) Non-blocking refresh after user actions
For join/leave/admin actions, UI success feedback is shown first, then refresh runs in background (`setTimeout(..., 0)`).

Why it helps:
- Faster perceived response after clicks.
- Avoids waiting on follow-up list refresh before showing success state.

Files:
- `skill-swap-frontend/src/contexts/AppContext.tsx`
- `skill-swap-frontend/src/components/AdminReview.tsx`

### 4) Notifications page request decoupling
Adjusted unread-count behavior:
- Do not fetch unread count when current page is `notifications`.
- Fetch unread count in background only on non-notification pages.
- On mark-read/mark-all-read, trigger unread-count refresh without awaiting it.

Why it helps:
- Prevents `unread-count` from slowing notification page render.
- Keeps badge updates without blocking interaction.

Files:
- `skill-swap-frontend/src/contexts/AppContext.tsx`
- `skill-swap-frontend/src/components/Notifications.tsx`

### 5) Notification -> workshop detail prefetch
When opening a workshop from notification actions:
- Start background detail fetch.
- Upsert fetched detail into app cache.
- Navigate immediately.

Why it helps:
- Improves perceived speed for notification-driven navigation.

File:
- `skill-swap-frontend/src/components/Notifications.tsx`

### 6) Workshop details: snapshot-first rendering
If a local workshop snapshot exists, avoid forcing a full-page loading state while refreshing latest detail in background.

Why it helps:
- Faster first paint for detail page.
- Still updates with latest backend data.

File:
- `skill-swap-frontend/src/components/WorkshopDetails.tsx`

### 7) Admin review target-focused loading and dedupe
Optimized admin-review flow from notification deep-link:
- Read `adminReviewTargetId` early.
- Prioritize target ID as selected item when pending list arrives.
- Remove eager duplicate detail fetch on list load.
- Add per-item in-flight guard for detail fetches.

Why it helps:
- Avoids sequence like: fetch pending -> fetch default item detail -> fetch target item detail.
- Reduces redundant admin detail requests.

File:
- `skill-swap-frontend/src/components/AdminReview.tsx`

### 8) Past workshops backfill safeguard
Past page now has a fallback:
- If authenticated user has no archived items in current public dataset, trigger one background `refreshData('full')` backfill.

Why it helps:
- Prevents the "past workshops disappeared" experience when public-only data is insufficient.

File:
- `skill-swap-frontend/src/components/PastWorkshops.tsx`

### 9) Route-level code splitting (large bundle reduction)
Converted page imports in `App.tsx` to `React.lazy` + `Suspense`.

Why it helps:
- Smaller initial JS payload.
- Faster initial parse and execute on first load.

File:
- `skill-swap-frontend/src/App.tsx`

Observed build effect:
- Main bundle reduced from ~572 KB to ~445 KB (build artifact size).

## Backend Optimizations

### 1) Create/admin status APIs return success message only
Simplified response contracts:
- Create workshop returns `{ message }`.
- Admin `approve/reject/cancel` return `{ message }` only.

Why it helps:
- Removes unnecessary DTO assembly and payload transfer on write actions.

Files:
- `skill-swap-backend/src/main/java/club/skillswap/workshop/controller/WorkshopController.java`
- `skill-swap-backend/src/main/java/club/skillswap/admin/controller/AdminWorkshopController.java`
- `skill-swap-backend/src/main/java/club/skillswap/workshop/service/WorkshopService.java`
- `skill-swap-backend/src/main/java/club/skillswap/workshop/service/WorkshopServiceImpl.java`

### 2) Asynchronous notification writes (all createNotification paths)
Enabled async notifications and moved write logic to separate transactions:
- `@EnableAsync` in application bootstrap.
- `createNotification(...)` methods in notification service are `@Async` with `REQUIRES_NEW`.
- Async write resolves recipient/workshop by IDs before save.

Why it helps:
- Notification persistence no longer blocks main request response path.

Files:
- `skill-swap-backend/src/main/java/club/skillswap/SkillSwapBackendApplication.java`
- `skill-swap-backend/src/main/java/club/skillswap/notification/service/NotificationServiceImpl.java`

### 3) Workshop list payload slimming via summary mapping
List endpoints map to summary DTO shape (minimal fields) instead of full detail shape.

Why it helps:
- Smaller payloads for public/mine/pending/admin lists.
- Reduces serialization and network transfer cost.

File:
- `skill-swap-backend/src/main/java/club/skillswap/workshop/service/WorkshopServiceImpl.java`

### 4) Detail query join simplification
`findByIdWithDetails` was reduced to fetch facilitator only (instead of multiple collection fetch joins).

Why it helps:
- Avoids heavy join expansion in detail endpoint query.

File:
- `skill-swap-backend/src/main/java/club/skillswap/workshop/repository/WorkshopRepository.java`

## Validation Completed
- Frontend builds completed successfully after each optimization batch.
- Backend Java compilation succeeded after API/async notification changes.

## Known Trade-offs and Current Behavior
- Workshop detail still refreshes from backend even when local snapshot exists (to keep data fresh), but UI no longer hard-blocks if snapshot is present.
- Past workshops default to public-only for speed; one-time full backfill is now used as fallback for authenticated users when archive appears empty.

## Suggested Next Steps (Optional)
- Add backend pagination for notifications (`/notifications?limit=&cursor=`) to cap notification page latency.
- Add `updatedAt`-aware client cache policy for workshop detail (skip immediate refresh within a short TTL unless explicitly invalidated).
- Add lightweight endpoint timing logs (or tracing) for pending/admin detail paths to verify improvements with concrete p95 metrics.
