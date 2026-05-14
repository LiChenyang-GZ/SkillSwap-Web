# Functional Requirements

## Document Purpose

This document defines the functional requirements for the SkillSwap platform in a consulting-style format suitable for portfolio review, stakeholder alignment, and technical handover.

The requirements were drafted from the current repository, including the Project Overview, frontend route/page structure, backend controllers, services, entities, DTOs, security configuration, admin code, and deployment documentation. Requirements marked `Inferred from implementation` are derived from observed code behavior rather than explicit product documentation.

## System Scope

| Area | In Scope | Evidence |
|---|---|---|
| Public browsing | Public workshop discovery, workshop detail viewing subject to visibility rules, public memory pages | Frontend routes, workshop/memory controllers |
| Authenticated member workflows | Sign-in, user profile, workshop submission, dashboard, joining/leaving workshops, notifications | Clerk integration, user/workshop/notification services |
| Admin workflows | Workshop review, workshop edits, approval/rejection/cancellation, image upload, memory management | Admin controllers and frontend admin screens |
| Content management | Markdown-based memory entries, public memory wall/detail pages, admin memory studio | Memory controller/service and frontend memory components |
| Media handling | Avatar, workshop image, and memory media uploads with image validation | Storage services and upload endpoints |
| Operational workflows | Deployment and environment behavior are referenced only where they affect product operation | Existing deployment docs and workflows |

| Area | Out Of Scope Or Requires Verification | Evidence |
|---|---|---|
| Feedback/reviews | Frontend contains a placeholder page, but no complete feedback/review backend flow was found | `App.tsx` placeholder |
| Credit economy | Credit fields remain in models, but code comments show the credit system is disabled and values default to zero | Workshop/user service comments |
| Version-based memory locking | Historical migrations added a version column, but a later migration removes it and current DTOs/entities do not expose it | Memory migrations and entity |
| Public user profile by ID | Controller comments imply public access, but current security configuration requires authentication for `/api/v1/users/{id}` | User controller and security config |
| Current standalone API reference | Earlier API documentation files appear absent from the active working tree; current contracts are verifiable from controllers/DTOs | Working tree and source |

## User Roles And Permissions

| Role | Description | Supported Permissions | Source |
|---|---|---|---|
| Public visitor | User who is not authenticated | View public workshop listings/details when visible; view published memory pages; access auth UI | Code |
| Authenticated member | Clerk-authenticated user mapped to a local `user_account` record | Manage own profile; submit workshops; view own hosted/attending workshops; join/leave workshops; view notifications; request workshop approval; hide own rejected/cancelled hosted workshops | Code |
| Admin user | Authenticated user whose database role maps to `ROLE_ADMIN` | Access admin workshop review APIs; view all/pending workshops; update, approve, reject, cancel, and upload workshop images; manage memory entries and media | Code |
| Technical maintainer | Maintainer responsible for deployment and environment setup | Operate CI/CD, runtime configuration, deployment runbooks, and troubleshooting docs | Existing documentation |

## Key User Journeys

| Journey ID | Journey | Outcome | Source |
|---|---|---|---|
| J-001 | Public visitor browses workshops | Visitor can view public workshop cards and details for visible workshops | Code |
| J-002 | Member signs in and profile is mapped | Clerk session token is accepted by backend; local profile is found or created | Code and existing documentation |
| J-003 | Member submits a workshop | Workshop is created as `pending`; admins are notified | Code |
| J-004 | Admin reviews a workshop | Admin can edit, approve, reject with optional comment, cancel where allowed, or upload an image | Code |
| J-005 | Member joins or leaves a workshop | Participation record is created or removed subject to business rules | Code |
| J-006 | Member reviews notifications | Member can list, count, and mark notifications as read | Code |
| J-007 | Admin publishes a memory page | Admin creates/updates memory content and publishes it for public viewing | Code |
| J-008 | Admin safely edits draft memory content | Draft edit lock prevents another admin from editing the same draft concurrently | Code |

## Business/User-Facing Functional Requirements

### Authentication And User Accounts

| ID | Requirement | Priority | Source | Acceptance Criteria |
|---|---|---|---|---|
| FR-001 | The system must allow unauthenticated users to access public workshop and public memory content. | Must | Code | Public GET requests for public workshop and memory endpoints do not require a bearer token. |
| FR-002 | The system must authenticate users through Clerk on the frontend and send a bearer token to protected backend APIs. | Must | Code and existing documentation | A signed-in user can call protected `/api/**` endpoints with `Authorization: Bearer <token>`. |
| FR-003 | The backend must validate JWTs using configured issuer/JWKS settings through Spring Security OAuth2 Resource Server. | Must | Code and existing documentation | Requests without valid authentication are rejected for protected API paths. |
| FR-004 | The system must map authenticated external identities to local user accounts using `auth_subject` and `auth_provider`. | Must | Code | A valid new JWT subject can result in a local user record being created or updated. |
| FR-005 | The system must map local admin users to `ROLE_ADMIN` based on database role values. | Must | Code | A user with an admin-equivalent role can access admin APIs; non-admin users receive a forbidden response. |

### User Profile Management

| ID | Requirement | Priority | Source | Acceptance Criteria |
|---|---|---|---|---|
| FR-006 | Authenticated users must be able to retrieve their current profile. | Must | Code | `/api/v1/users/me` returns profile data for a valid authenticated user. |
| FR-007 | Authenticated users should be able to update profile fields supported by the backend, including username, avatar URL, bio, and skills. | Should | Code | PATCH updates persist to the local user account and response reflects the changed profile. |
| FR-008 | Authenticated users should be able to upload an avatar image. | Should | Code | Avatar upload accepts supported image types, stores the image, updates the profile avatar URL, and rejects invalid/oversized files. |
| FR-009 | Authenticated users should be able to add or remove skills from their profile. | Should | Code | Skill add/delete endpoints update the current user's skill collection. |
| FR-010 | User profile stats should include hosted and attended workshop counts. Rating and review count are partially supported with default values. | Should | Code | Profile response includes hosted and attended counts; rating/review count should be treated as placeholder until a review module exists. |

### Workshop Discovery, Submission, And Participation

| ID | Requirement | Priority | Source | Acceptance Criteria |
|---|---|---|---|---|
| FR-011 | Public users must be able to browse approved workshops. | Must | Code | Public workshop API returns approved workshops with summary data. |
| FR-012 | Users should be able to search and filter workshops in the frontend by query and category. | Should | Inferred from implementation | Explore page filters loaded workshops by title, description, facilitator name, and selected category. |
| FR-013 | The frontend should show only active user-visible workshop statuses in the explore experience. | Should | Inferred from implementation | Explore filtering keeps upcoming/ongoing user-visible workshops and excludes restricted statuses. |
| FR-014 | Users must be able to view workshop details when visibility rules allow it. | Must | Code | Public users can view unrestricted workshop details; pending/rejected workshops are visible only to admins or the facilitator. |
| FR-015 | Sensitive workshop information must be limited to admins and the workshop facilitator. | Must | Code | Contact number and submitter email are omitted for viewers who are neither admin nor facilitator. |
| FR-016 | Authenticated users must be able to submit workshop proposals. | Must | Code | Valid create requests persist a workshop with `pending` status and create admin notifications. |
| FR-017 | The workshop creation flow must validate required workshop details before submission. | Must | Code | Missing host name, title, category, date, time, duration, contact number, or confirmation causes validation failure. |
| FR-018 | Authenticated users must be able to view workshops they host and workshops they are attending. | Must | Code | `/mine` and `/attending` endpoints return the authenticated user's hosted and attended workshop lists. |
| FR-019 | Authenticated users must be able to join eligible workshops. | Must | Code | Join succeeds only when the workshop is upcoming, capacity is available, attendance has not closed, and the user is not already a participant. |
| FR-020 | Authenticated users must be able to leave workshops they have joined. | Must | Code | Leave removes existing participation and rejects requests where the user is not a participant. |
| FR-021 | Hosts should be able to hide their own rejected or cancelled workshops from their hosting list. | Should | Code | Hide succeeds only for the facilitator and only for rejected/cancelled workshops. |
| FR-022 | Hosts or admins should be able to request review/approval for a pending workshop. | Should | Code | Approval request on a pending workshop notifies admins; non-host non-admin users are rejected. |

### Notifications

| ID | Requirement | Priority | Source | Acceptance Criteria |
|---|---|---|---|---|
| FR-023 | Authenticated users must be able to view their notifications. | Must | Code | Notification list returns records for the authenticated recipient only. |
| FR-024 | Authenticated users must be able to view unread notification count. | Must | Code | Unread-count endpoint returns the number of unread notifications for the authenticated user. |
| FR-025 | Authenticated users must be able to mark one or all notifications as read. | Should | Code | Read operations update `is_read` and read timestamp where applicable. |
| FR-026 | The system must create notifications for workshop submission, approval/rejection, admin updates, and cancellation events. | Must | Code | Relevant service actions call notification creation for admins, facilitators, and/or participants according to event type. |

### Core Content And Memory Features

| ID | Requirement | Priority | Source | Acceptance Criteria |
|---|---|---|---|---|
| FR-027 | Public users must be able to view published memory entries. | Must | Code | Public memory list and detail endpoints return only entries with `published` status. |
| FR-028 | Admin users must be able to list, create, update, delete, publish, and archive memory entries. | Must | Code | Admin memory APIs support CRUD operations and statuses `draft`, `published`, and `archived`. |
| FR-029 | Memory entries must support Markdown content, title, slug, cover URL, media URLs, status, and publish metadata. | Must | Code | Memory DTO/entity persist and return the supported content fields. |
| FR-030 | Draft memory editing must use edit locks to reduce concurrent admin edit conflicts. | Must | Code | Draft update/delete requires an active lock owned by the acting admin; another active owner receives a locked response. |
| FR-031 | Public memory rendering should sanitize Markdown output while supporting common rich content patterns. | Should | Code | Markdown rendering uses sanitization and supports images plus recognized YouTube/Instagram embeds. |

### Image And Media Upload Features

| ID | Requirement | Priority | Source | Acceptance Criteria |
|---|---|---|---|---|
| FR-032 | Admin users must be able to upload workshop images. | Must | Code | Admin image upload validates file presence/type/size, stores the image, updates workshop image URL, and removes prior known image URLs where possible. |
| FR-033 | Admin users must be able to upload memory media. | Must | Code | Admin memory media upload validates image content, stores the image, and returns a usable media URL. |
| FR-034 | Authenticated users should be able to upload profile avatars. | Should | Code | Avatar upload validates supported image type/size and updates the current user profile. |
| FR-035 | The system must reject non-image uploads and oversized uploads for supported image workflows. | Must | Code | Upload APIs return validation or payload-too-large errors for invalid content type or size. |

### Admin Workflows

| ID | Requirement | Priority | Source | Acceptance Criteria |
|---|---|---|---|---|
| FR-036 | Admin users must be able to view all workshops and pending workshops. | Must | Code | Admin workshop list endpoints require admin access and return requested workshop sets. |
| FR-037 | Admin users must be able to update workshop details before the workshop starts, except where status rules prohibit changes. | Must | Code | Update rejects completed/cancelled workshops and workshops that have already started. |
| FR-038 | Admin users must be able to approve pending workshops. | Must | Code | Approving a pending workshop sets approved status, review metadata, approval timestamp, and notifies the facilitator. |
| FR-039 | Admin users must be able to reject pending workshops with an optional comment. | Must | Code | Rejecting a pending workshop sets rejected status, review metadata, comment, and notifies the facilitator. |
| FR-040 | Admin users must be able to cancel eligible workshops before they start. | Must | Code | Cancellation rejects completed/cancelled/started workshops and notifies facilitator and relevant participants. |
| FR-041 | Admin users can delete workshops through a backend endpoint, but a complete admin UI delete flow was not verified. | Could | Code | Backend deletion requires admin authentication; frontend admin delete capability requires verification. |
| FR-042 | Admin users must be able to access memory studio only when authenticated as admin. | Must | Code | Memory admin APIs reject unauthenticated or non-admin requests. |

## Technical/System Functional Requirements

| ID | Requirement | Priority | Source | Acceptance Criteria |
|---|---|---|---|---|
| FR-043 | The frontend must support SPA navigation for major product pages. | Must | Code | Routes map to explore, create, dashboard, memory, memory detail, admin workshop review, admin memory studio, notifications, auth, and workshop detail pages. |
| FR-044 | The frontend must include fallback routing for deployed SPA refresh/navigation. | Must | Code | Vercel routing config falls back unmatched paths to the SPA entry point. |
| FR-045 | The backend must expose a health endpoint for basic service availability checks. | Should | Code | `/health` returns a successful response when the backend is running. |
| FR-046 | Protected backend API calls must require authentication unless explicitly permitted as public routes. | Must | Code | Security configuration permits health/public workshop/public memory paths and authenticates `/api/**` otherwise. |
| FR-047 | API errors should return structured error responses with timestamp, status, error, message, and path. | Should | Code | Global exception handler maps common failures to `ErrorResponseDto`. |

## Business Rules

| Rule ID | Business Rule | Source |
|---|---|---|
| BR-001 | New workshops are created with `pending` status. | Code |
| BR-002 | Public workshop browsing is based on approved workshops; the frontend further focuses discovery on active user-visible statuses. | Code and inferred from implementation |
| BR-003 | Pending and rejected workshops are restricted to admins and the facilitator. | Code |
| BR-004 | Contact number must be an Australian 10-digit number beginning with `0`. | Code |
| BR-005 | Workshop duration, max participants, and week number must be positive when provided. | Code |
| BR-006 | Workshop details confirmation is required before submission. | Code |
| BR-007 | If attendance close time is not supplied, the backend defaults it to one day before the workshop date/time. | Code |
| BR-008 | Users cannot join full workshops, non-upcoming workshops, duplicate participation records, or workshops after attendance closes. | Code |
| BR-009 | Credit cost/reward values are currently set to zero and credit transaction logic is disabled. | Code |
| BR-010 | Admin approval/rejection is allowed only for pending workshops. | Code |
| BR-011 | Admin cancellation is disallowed after a workshop starts or when already completed/cancelled. | Code |
| BR-012 | USU approval status is limited to `pending` or `approved`. | Code |
| BR-013 | Public memory pages include only `published` entries. | Code |
| BR-014 | Memory entry statuses are limited to `draft`, `published`, and `archived`. | Code |
| BR-015 | Memory slugs are normalized, unique, and capped by implementation-defined length. | Code |
| BR-016 | Draft memory updates/deletion require an active edit lock owned by the acting admin. | Code |
| BR-017 | Image uploads are limited to image content and configured maximum size. | Code |
| BR-018 | Admin authority is derived from database role mapping, not from arbitrary frontend state. | Code |

## Acceptance Criteria Summary

| Area | Acceptance Criteria Summary |
|---|---|
| Authentication | Public endpoints remain public; protected endpoints reject unauthenticated requests; valid Clerk-backed JWTs map to local users. |
| Workshop management | Workshop creation, browsing, joining/leaving, host dashboard, approval, rejection, cancellation, and notifications follow the business rules above. |
| Admin review | Admin-only endpoints reject non-admin users and enforce status/timing constraints. |
| Memory management | Public memory pages expose only published content; admin draft editing respects edit locks. |
| Media upload | Upload workflows accept valid image files and reject invalid or oversized files. |
| Error handling | Validation, not found, forbidden, conflict, locked, payload-too-large, and server errors return structured responses. |

## Out-Of-Scope Or Unsupported Features

| Feature | Status | Notes |
|---|---|---|
| Feedback and workshop reviews | Partially supported | Frontend placeholder exists; complete backend workflow was not found. |
| Credit economy | Unsupported in current implementation | Credit fields remain, but service logic is disabled and values default to zero. |
| Version-based optimistic locking for memory content | Unsupported in current implementation | Current implementation uses edit locks; version column was removed by migration. |
| Standalone current API reference | Requires verification | API contracts are visible in controllers/DTOs, but current standalone API docs are not present in active files reviewed. |
| Automated acceptance test suite | Requires verification | Only a basic backend context-load test was found. |
| Public user profile lookup | Requires verification | Controller comment and security configuration appear inconsistent. |

## Assumptions And Inferred Requirements

| ID | Assumption Or Inference | Source |
|---|---|---|
| A-001 | The platform is intended to reduce manual club operations around workshop coordination. | Inferred from implementation and overview |
| A-002 | Search/filter behavior is client-side against the loaded workshop list, not a backend search endpoint. | Inferred from implementation |
| A-003 | Technical maintainers are a handover audience, not an application role with UI permissions. | Existing documentation |
| A-004 | Deployment status in requirements is based on repository documentation and workflows, not live environment verification. | Existing documentation |

## Verification Notes

Directly supported by code: frontend routes/pages, Clerk provider setup, backend controllers, service business logic, entities, DTOs, security rules, admin access checks, upload validation, notification creation, memory edit locks, and structured error handling.

Directly supported by existing documentation: Clerk-based authentication guidance, cloud deployment architecture, backend CI/CD workflow, environment-variable based configuration, and operational runbook material.

Inferred from implementation: business problem framing, frontend search/filter intent, user-facing active workshop discovery behavior, and maintainer handover audience.

Weakened or excluded because support was incomplete: feedback/reviews, credit economy, version-based optimistic locking, broad automated testing, public user profile lookup, and live deployment verification.
