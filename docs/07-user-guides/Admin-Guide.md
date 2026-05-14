# SkillSwap Admin Guide

Last reviewed: 2026-05-13

## Document Purpose

This guide documents administrator workflows for operating SkillSwap. It is intended for project maintainers, club administrators, and technical handover reviewers who need to understand what admin users can do in the current implementation.

The guide was verified against the Project Overview, requirements documents, README, frontend admin screens, backend controllers, services, entities, DTOs, authentication/security configuration, and deployment documentation. Workflows marked `Inferred from implementation`, `Partially supported`, or `Requires verification` should not be treated as stronger than the repository evidence supports.

## Intended Audience

- Skill Swap Club administrators who review and moderate workshop submissions.
- Admin users who maintain public memory pages.
- Technical maintainers responsible for authentication, deployment, storage, and troubleshooting.
- Portfolio or handover reviewers assessing the operational design of the project.

## Admin Role Overview

Admin users can perform privileged actions that regular users cannot perform.

| Area | Admin Capability | Status |
|---|---|---|
| Workshop review | View all/pending submissions, edit details, approve, reject, cancel, upload cover images | Supported |
| Participant operations | View participant counts/details where returned and export participant lists from admin UI | Supported, subject to API detail availability |
| Memory management | Create, edit, publish, archive, delete memory entries, and upload memory media | Supported |
| Notifications | Receive workshop submission notifications and open review actions | Supported |
| User management | No admin user-management dashboard found | Not supported |
| Reports/flags/complaints | No workflow found | Not supported |
| Audit/activity logs | No admin activity log screen found | Not supported |

## Admin Access Prerequisites

To use admin features, an account must satisfy both authentication and authorization requirements:

1. The user must sign in through Clerk.
2. The backend must validate the Clerk session token through JWKS/JWT configuration.
3. The authenticated identity must map to a local `user_account` record.
4. The local user role must normalize to `admin` or `role_admin`.
5. The backend must grant `ROLE_ADMIN` for privileged endpoints.

Requires verification: the repository does not include an admin self-service provisioning screen. Assigning or correcting admin role records is a technical maintainer task and should be performed through an approved database or operational process outside the application UI.

## Admin Authentication And Authorization Model

| Layer | Behavior | Source |
|---|---|---|
| Frontend authentication | Clerk handles sign-in, sign-up, session persistence, and token retrieval. | Code and docs |
| Backend authentication | Spring Security validates bearer JWTs using issuer/JWKS configuration. | Code |
| Admin role mapping | `JwtConverter` looks up the local user and grants `ROLE_ADMIN` when the stored role matches admin semantics. | Code |
| Frontend admin navigation | Admin-only menu items are shown when the loaded profile role is admin. | Code |
| Backend enforcement | Admin services reject unauthorized requests with `401` or `403`. | Code |

Operational note: frontend navigation is a convenience layer only. The backend enforces admin permissions and should be treated as the source of truth.

## Admin Navigation

Admin users see additional menu items after signing in:

| Menu Item | Route | Purpose |
|---|---|---|
| `Admin Review` | `/admin/workshops` | Review and manage workshop submissions. |
| `Memory Studio` | `/admin/memory` | Create and maintain public memory entries. |

If an admin route is opened without the correct permissions, the user may see a sign-in prompt, an admin-access message, or an API error such as `Admin access required`.

## Workshop Administration

The `Admin Review` screen is the main moderation workflow for user-submitted workshops.

### Workflow: Open Workshop Administration

1. Sign in with an admin account.
2. Open the user menu.
3. Select `Admin Review`.
4. Confirm the page title is `Workshop Administration`.
5. Use the status filter to switch between `Pending`, `All statuses`, `Approved`, `Rejected`, `Cancelled`, and `Completed`.
6. Select a workshop from the list to load `Submission Details`.

### Workflow: Review A Pending Workshop

1. Open `Admin Review`.
2. Keep the status filter on `Pending` or select a pending workshop from `All statuses`.
3. Select the workshop from the left-side list.
4. Review the submitted details:
   - Host name
   - Workshop name / skill taught
   - Category
   - Contact number
   - Duration
   - Maximum participants
   - Date and time
   - Attend close time
   - Online/in-person setting and location
   - Materials and venue requirements
   - Details confirmation
5. Correct details if required.
6. Add a workshop cover image if appropriate.
7. Select `Save Changes` if edits were made.
8. Select `Approve` to approve the workshop, or `Reject` to reject it.
9. If rejecting, use `Rejection Note` where a host-facing explanation is needed.

Business rule: only pending workshops can be approved or rejected.

### Workflow: Edit Workshop Details

1. Open `Admin Review`.
2. Select a workshop.
3. Update editable fields in `Submission Details`.
4. Select `Save Changes`.
5. Confirm the success notification.

Editing constraints verified in code:

- Completed workshops cannot be edited.
- Cancelled workshops cannot be edited.
- Workshops cannot be edited after they have started.
- The frontend disables save until the form is dirty.
- Form validation requires core fields such as host name, title, category, contact number, date, time, and duration.

### Workflow: Upload A Workshop Cover Image

1. Open `Admin Review`.
2. Select a workshop that can still be edited.
3. Select `Upload Cover Image`.
4. Choose an image file.
5. Confirm the preview appears.
6. Select `Save Changes` to apply the image.

Important: the UI states that the image is applied only after `Save Changes`.

Upload constraints:

| Constraint | Status |
|---|---|
| Image-only upload | Enforced by backend |
| Upload size limit | Enforced by backend configuration |
| Storage target | Azure Blob Storage implementation verified |
| Regular user workshop image upload | Not supported |

### Workflow: Approve A Workshop

1. Select a pending workshop.
2. Review or correct the details.
3. Select `Approve`.
4. Confirm the workshop status updates.

Expected outcome:

- The workshop status becomes approved.
- The host receives a notification.
- The workshop becomes eligible for public discovery according to visibility and date/status rules.

### Workflow: Reject A Workshop

1. Select a pending workshop.
2. Add an optional `Rejection Note`.
3. Select `Reject`.
4. Confirm the workshop status updates.

Expected outcome:

- The workshop status becomes rejected.
- The host receives a notification.
- The rejected workshop is not publicly visible to regular users.
- The host can still view their restricted workshop details.

### Workflow: Cancel A Workshop

1. Select an approved or upcoming workshop that has not started.
2. Select `Cancel Workshop`.
3. Confirm the cancellation succeeds.

Cancellation constraints verified in code:

- Completed workshops cannot be cancelled.
- Already-cancelled workshops cannot be cancelled again.
- Workshops cannot be cancelled after they start.
- Cancellation triggers notifications to the host and participants where applicable.

### Workflow: View And Export Participants

1. Open `Admin Review`.
2. Select an approved or completed workshop.
3. Review the `Participants` section when available.
4. Select `Export Excel` to export a participant list.

Partially supported: the frontend can export participant data returned by the API. If only a participant count is available and participant details are missing, the exported file includes a note that detailed participant records were not available from the current API response.

### Backend-Only Workshop Delete

Partially supported: a backend `DELETE /api/v1/workshops/{id}` endpoint exists and requires admin access, but no current `Admin Review` delete button was verified. Treat workshop deletion as a technical-maintainer action that requires a defined support process, data-impact review, and verification before use.

## Memory Studio Administration

`Memory Studio` is the admin content-management workflow for public memory pages.

### Memory Statuses

| Status | Public Visibility | Admin Behavior |
|---|---|---|
| `draft` | Not public | Editable when the admin holds the edit lock. |
| `published` | Public | Read-only in the editor until moved back to draft. |
| `archived` | Not public | Read-only in the editor until moved back to draft. |

### Workflow: Open Memory Studio

1. Sign in with an admin account.
2. Open the user menu.
3. Select `Memory Studio`.
4. Confirm the page title is `Memory Studio`.
5. Use `Open Public Memory Wall` to view the public memory page if needed.
6. Use `Refresh` to reload admin memory entries.

### Workflow: Create A Memory Entry

1. Open `Memory Studio`.
2. Select `Create New`.
3. In the Markdown editor, provide front matter with at least a title:

```markdown
---
title: Example Memory Title
cover:
---

# Example Memory Title

Write the memory story here.
```

4. Add body content using Markdown.
5. Use `Write`, `Preview`, or `Split` mode to review the content.
6. Select `Save Draft`.
7. After saving, use the entry actions menu and select `Publish` when the entry is ready for public viewing.

Business rule: a memory title is required. If no slug is provided, the backend generates one from the title.

### Workflow: Edit A Draft Memory Entry

1. Open `Memory Studio`.
2. Select a draft entry.
3. Confirm the editor indicates that you hold the edit lock.
4. Make content changes.
5. Select `Save Draft`.
6. Publish or keep as draft depending on readiness.

Concurrency rule: draft memory entries use edit locks. If another admin holds the lock, the entry becomes view-only until the lock is released or expires.

### Workflow: Edit A Published Or Archived Memory Entry

1. Open the entry actions menu.
2. Select `Move to Draft`.
3. Select the draft entry.
4. Acquire the edit lock.
5. Edit and save the draft.
6. Publish again when ready.

Published and archived entries are read-only in the editor until moved to draft.

### Workflow: Upload Memory Images

1. Open a draft memory entry where you hold the edit lock.
2. Use the image upload toolbar button, or paste an image into the editor.
3. Wait for the upload to complete.
4. Confirm that a Markdown image link is inserted into the document.
5. Select `Save Draft`.

Upload constraints:

- Only image files are supported.
- Files must fit within the configured upload size limit.
- Images are stored through the backend media upload service.

### Workflow: Publish, Archive, Or Move Memory Entries

1. Open `Memory Studio`.
2. Locate the entry in the `Entries` panel.
3. Open the entry actions menu.
4. Select the appropriate action:
   - `Publish` for a draft entry.
   - `Hide (Archive)` for a published entry.
   - `Move to Draft` for a published or archived entry.

Published entries appear on the public Memory page. Draft and archived entries do not.

### Workflow: Delete A Memory Entry

1. Open `Memory Studio`.
2. Locate the entry in the `Entries` panel.
3. Open the entry actions menu.
4. Select `Delete`.
5. Review the confirmation dialog.
6. Select `Delete` to confirm.

Caution: the delete dialog states that deletion cannot be undone. The backend also attempts cleanup of related stored media URLs.

## Notifications For Admins

Admins can receive workshop submission notifications.

### Workflow: Review A Submission From A Notification

1. Sign in as an admin.
2. Open `Notifications`.
3. Select a workshop submission notification.
4. Select `Review workshop`.
5. Confirm that `Admin Review` opens and highlights or selects the related workshop where possible.

Inferred from implementation: the frontend stores a target workshop ID in session storage so `Admin Review` can focus the relevant submission.

## Viewing And Managing Users

No admin-facing user list or user management dashboard was found in the current frontend or backend controllers.

| Task | Status |
|---|---|
| View all users | Not supported in admin UI |
| Edit user profiles as admin | Not supported in admin UI |
| Promote or demote admins | Requires technical process outside UI |
| Delete users | Not supported in admin UI |
| View user activity logs | Not supported |

Requires verification: admin role provisioning and correction should be documented separately as an operational database or identity-management procedure.

## Reports, Flags, Complaints, And Audit Logs

| Workflow | Status |
|---|---|
| User reports or flags | Not supported |
| Complaint handling | Not supported |
| Admin audit log review | Not supported |
| Moderation queue outside workshop review | Not supported |

The current moderation workflow is limited to workshop review and memory content management.

## Data Correction And Support Requests

Admins can correct some data through existing screens:

| Support Request Type | Current Handling |
|---|---|
| Workshop detail correction | Use `Admin Review` if the workshop is editable. |
| Workshop cancellation | Use `Cancel Workshop` if business rules allow it. |
| Workshop approval/rejection clarification | Use approval/rejection workflow and optional rejection note. |
| Memory content correction | Move the entry to draft, edit, save, and publish again. |
| User profile correction | Not supported through admin UI. User can edit display name/avatar from Dashboard. |
| Role/access correction | Technical maintainer process required. |

## Permission Boundaries

| Boundary | Behavior |
|---|---|
| Admin-only API access | Backend checks authenticated admin authority. |
| Regular user workshop visibility | Pending and rejected workshops are restricted to admins or the facilitator. |
| Sensitive workshop fields | Contact number and submitter email are returned only to admins or the facilitator. |
| Memory drafts | Draft and archived entries are not public. |
| Memory editing | Draft editing requires an active edit lock owned by the admin. |
| Workshop participant details | Available to admins when included in the detail response. |

## Operational Cautions

- Do not expose secrets, tokens, database passwords, private URLs, or infrastructure credentials in documentation or support messages.
- Admin permissions depend on correct Clerk identity mapping and local database role values.
- The repository does not provide a user-facing admin role management screen.
- Workshop approval, rejection, cancellation, and admin updates can trigger user notifications.
- Workshop cover images and memory media depend on object storage configuration.
- Existing deployment documentation describes the intended cloud setup, but live infrastructure status was not inspected as part of this guide.
- Deployment docs and backend properties use different Azure Blob container environment variable names; align this before relying on a deployment change.
- SQL migrations exist, but current application profiles disable Flyway runtime execution; schema-change procedures require maintainer verification.
- Current deployment documentation describes a single backend VM rather than a high-availability architecture.

## Common Admin Errors And Troubleshooting

| Error Or Symptom | Likely Cause | Suggested Action |
|---|---|---|
| `Please sign in` or `401` | Missing or expired session token. | Sign in again and retry. |
| `Admin access required` or `403` | Account is not mapped to admin role. | Ask a maintainer to verify Clerk subject mapping and local role value. |
| Admin menu not visible | Loaded profile does not indicate admin role. | Refresh after role correction; verify backend profile response. |
| Workshop details fail to load | API error, stale ID, or permission issue. | Use `Refresh`; if repeated, check backend logs. |
| `Only pending workshops can be approved/rejected` | Admin action attempted on a non-pending workshop. | Re-check status and use another action if supported. |
| `Completed or cancelled workshops cannot be edited` | Business rule prevents editing. | Do not edit through UI; document any correction request for technical review. |
| `Workshops cannot be cancelled after they start` | Cancellation attempted too late. | Escalate if a data correction is still required. |
| Image upload rejected | File is missing, too large, or not an image. | Use a valid image within the configured limit. |
| Memory locked by another admin | Another admin holds the draft edit lock. | Wait for release/expiry or coordinate with that admin. |
| Memory slug/title conflict | Generated slug already exists. | Change the title and save again. |
| No participants exported | No participant details are available. | Confirm participant count and reload details; export only when data is available. |

## Escalation Notes For Technical Issues

Escalate to a technical maintainer when:

- Admin access is missing for an expected admin user.
- Authentication succeeds but backend profile loading fails.
- Workshop or memory API calls repeatedly return server errors.
- Blob/image uploads fail after file type and size are confirmed valid.
- A role, user mapping, or database record needs correction.
- A schema change or migration is required.
- Deployment, DNS, TLS, or backend container behavior affects admin workflows.

For technical escalation, include:

- The page where the issue occurred.
- The action attempted.
- The visible error message.
- Approximate time of occurrence.
- Whether the user was signed in as a regular member or admin.

Do not include passwords, API keys, private tokens, database credentials, or raw session tokens.

## Admin-Facing Limitations

- No admin user-management dashboard was verified.
- No reports, flags, complaint workflow, or general moderation queue was verified.
- No admin audit log or activity-log viewer was verified.
- Workshop deletion exists as a backend admin endpoint but is not exposed as a verified admin UI workflow.
- Feedback/reviews are not implemented beyond a placeholder page.
- Credit-related workflows are disabled.
- Live deployment status was not independently checked; deployment claims are based on repository documentation and workflow configuration.
- Memory concurrency uses edit locks, not active version-based optimistic locking.

## Verification Notes

Directly supported by code: admin workshop listing, pending filtering, detail loading, editing, cover image upload, approval, rejection, cancellation, participant export from returned data, admin memory listing, creation, update, delete, publish/archive/draft status changes, media upload, draft edit locks, Clerk-based frontend authentication, backend JWT validation, and database-backed admin role mapping.

Directly supported by existing documentation: Clerk authentication, Vercel frontend deployment, Azure VM backend deployment, Azure PostgreSQL, Azure Blob Storage, Nginx/TLS, GitHub Actions/GHCR deployment, and secret-based environment configuration.

Inferred from implementation: notification-driven navigation into Admin Review, expected host/participant notification behavior after admin actions, and operational meaning of admin role provisioning.

Marked partial or unsupported: admin user management, reports/flags/complaints, audit logs, workshop delete UI, feedback/reviews, credit workflows, automated schema migration behavior, high availability, and live deployment state.
