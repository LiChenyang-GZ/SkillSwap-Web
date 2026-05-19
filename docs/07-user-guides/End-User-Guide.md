# SkillSwap End-User Guide

Last reviewed: 2026-05-13

## Document Purpose

This guide explains how regular users interact with the SkillSwap web application. It is written for students, club members, workshop hosts, and other non-admin users.

The guide was verified against the current frontend routes, navigation, UI components, backend controllers, services, DTOs, authentication configuration, Project Overview, requirements documents, README, and deployment documentation. Workflows marked `Inferred from implementation` are based on observed code behavior rather than explicit user-facing documentation.

## Intended Audience

- Students or club members who want to browse upcoming workshops.
- Authenticated users who want to join workshops.
- Authenticated users who want to submit a workshop for review.
- Workshop hosts who want to track submitted or hosted workshops.
- Users who want to view published event memory pages.

This guide does not cover admin-only review workflows. See `docs/07-user-guides/Admin-Guide.md` for administrator operations.

## Product Overview

SkillSwap is a web platform for the Skill Swap Club. It helps users discover workshops, attend sessions, submit their own workshop ideas, receive updates, and view published memory pages from past club activities.

In plain language:

- Use `Explore` to find workshops.
- Use `Memory` to view published event memory pages.
- Sign in to join workshops, host a workshop, view your dashboard, and receive notifications.
- Submitted workshops are reviewed by admins before becoming publicly visible.

## What Users Can Do

| Capability | Status | Source |
|---|---|---|
| Browse public workshops | Supported | Code |
| Search workshops by text | Supported | Code |
| Filter workshops by category | Supported | Code |
| View workshop details | Supported, subject to visibility rules | Code |
| Sign up or sign in | Supported through Clerk | Code and existing documentation |
| Join and leave workshops | Supported for authenticated users | Code |
| Submit a workshop | Supported for authenticated users | Code |
| Track upcoming, attended, and hosted workshops | Supported through Dashboard | Code |
| Edit display name and avatar | Supported through Dashboard | Code |
| View notifications and mark them as read | Supported | Code |
| View published memory pages | Supported | Code |
| Create or edit memory pages | Admin-only | Code |
| Submit feedback/reviews | Placeholder only | Code |
| Use credits | Disabled in current implementation | Code and requirements |
| In-app messaging or matching | Not supported | Code review |

## Account Registration And Login

SkillSwap uses Clerk for account registration, login, and session management.

### Sign Up

1. Open the SkillSwap web application.
2. Select `Get Started` or `Join with Email` from the landing page.
3. Use the `Sign Up` tab in the authentication screen.
4. Complete the Clerk sign-up process.
5. After sign-up, the application loads your SkillSwap profile and redirects you into the app.

### Sign In

1. Select `Sign In` from the landing page or navigation bar.
2. Use the `Sign In` tab in the authentication screen.
3. Complete the Clerk sign-in process.
4. After sign-in, the application loads your profile and returns you to the requested page where possible.

### Authentication Options

| Option | Status | Notes |
|---|---|---|
| Clerk Sign In and Sign Up screens | Supported | The frontend uses Clerk `SignIn` and `SignUp` components. |
| Email-based account flow | Supported by UI copy | The landing page includes `Join with Email`. Exact Clerk configuration is deployment-dependent. |
| Google/OAuth sign-in | Requires verification | Code and deployment docs include Google/OAuth handling, but enabled providers depend on the configured Clerk instance. |

If Google sign-in fails with an account-linking message, use `Sign Up` once with that Google account, then return to `Sign In`.

## Main User Navigation

| Navigation Item | Who Can Access | Purpose |
|---|---|---|
| `Explore` | Public and signed-in users | Browse visible workshops. |
| `Memory` | Public and signed-in users | View published memory pages. |
| `Feedback` | Public and signed-in users | Placeholder page. Reviews are not currently implemented. |
| `Dashboard` | Signed-in users | View profile, upcoming workshops, attended workshops, and hosted workshops. |
| `Host a Workshop` | Signed-in users | Submit a workshop for review. |
| `Notifications` | Signed-in users | View workshop-related updates. |
| `Sign In` / `Sign Out` | All users as applicable | Manage account session. |

Admin-only items such as `Admin Review` and `Memory Studio` are not part of the regular user workflow.

## User Profile Management

Profile management is available from `Dashboard`.

### Edit Your Profile

1. Sign in.
2. Open the user menu.
3. Select `Dashboard`.
4. Select `Edit Profile`.
5. Update your display name if needed.
6. Choose a new avatar image if needed.
7. Select `Save`.

### Profile Fields

| Field | User Editable In Current UI | Notes |
|---|---|---|
| Display name | Yes | Required. Cannot be blank. |
| Avatar | Yes | PNG/JPG/WEBP/GIF/SVG are supported. |
| Email | No | Displayed as read-only in the profile dialog. |
| Bio | Partially supported | Backend supports bio, and the profile card can display it, but the current Dashboard dialog does not edit bio. |
| Skills | Partially supported | Backend has skills endpoints, but the current Dashboard dialog does not expose skill editing. |

## Core User Workflows

### Browse Or Discover Workshops

1. Select `Explore`.
2. Use the search field to search by workshop title, description, or facilitator name.
3. Use the category dropdown to filter by category.
4. Select a workshop card to open the detail page.
5. Review the date, time, duration, access information, location, materials, and description.

Inferred from implementation: the Explore page filters user-visible workshops to upcoming or ongoing public workshops.

### Attend A Workshop

1. Sign in.
2. Open `Explore`.
3. Select a workshop.
4. Select `Attend Workshop` if the button is available.
5. Confirm that the workshop appears in `Dashboard` under `My Upcoming`.

The `Attend Workshop` button may be unavailable when:

- The workshop is full.
- Attendance has closed.
- The workshop is ongoing or completed.
- You are the host.
- The workshop is pending, rejected, or cancelled.

### Cancel Attendance

1. Sign in.
2. Open the workshop detail page or go to `Dashboard`.
3. If the workshop is still upcoming, select `Cancel Attendance`.
4. Confirm that the workshop is removed from your upcoming attendance list.

### Submit A Workshop

1. Sign in.
2. Open the user menu.
3. Select `Host a Workshop`.
4. Complete the required fields:
   - Host name
   - Workshop name / skill taught
   - Category
   - Contact number
   - Confirmed workshop date
   - Confirmed workshop time
   - Duration in minutes
   - Online or in-person setting
   - Details confirmation checkbox
5. Add optional operational details where relevant:
   - Maximum participants
   - Materials you will provide
   - Materials required from Skill Swap Club
   - Venue requirements
   - Other important information
6. Select `Create Workshop`.
7. After successful submission, you are returned to `Dashboard`.

Submitted workshops are created as `pending` and require admin review before public discovery.

Inferred from implementation: hosts can open a pending workshop detail page and may see `Request Approval`, which sends or re-sends an approval request for a pending workshop.

### Manage Hosted Workshops

1. Sign in.
2. Open `Dashboard`.
3. Select the `Hosting` tab.
4. Select a hosted workshop to open its details.
5. If a hosted workshop is rejected or cancelled, use the remove icon in the Hosting list to hide it from your view.

Partially supported: regular users can submit and view hosted workshops, but the current user-facing UI does not provide a full edit or delete workflow for submitted workshops. Admins can update, approve, reject, cancel, and upload images through admin tools.

### View Upcoming And Attended Workshops

1. Sign in.
2. Open `Dashboard`.
3. Use `My Upcoming` to view workshops you plan to attend.
4. Use `Attended` to view completed workshops you attended.
5. Use `Hosting` to view workshops you submitted or hosted.

### Upload Images Or Media

| Upload Type | Regular User Support | Notes |
|---|---|---|
| Avatar image | Supported | Available from `Dashboard` > `Edit Profile`. |
| Workshop cover image | Not supported for regular users | Admins upload workshop cover images during review. |
| Memory page media | Admin-only | Managed through Memory Studio. |

Avatar images must be supported image formats and within the configured upload size limit.

### View Notifications

1. Sign in.
2. Open the user menu.
3. Select `Notifications`.
4. Select a notification to view details.
5. Use `Mark all read` to clear unread notifications.
6. If a notification includes a workshop action, use `View workshop` to open the related workshop.

Notification types supported by the implementation include workshop approval, rejection, cancellation, admin updates, and submission-related admin review notifications.

### View Memory Pages

1. Select `Memory`.
2. Browse published memory entries in the memory wall.
3. Select a memory entry to open it.
4. Use `Back to Memory Wall` to return.

Only published memory entries are visible to regular users. Draft and archived entries are not public.

### Feedback And Reviews

The `Feedback` navigation item currently opens a placeholder screen stating that feedback and reviews are coming soon. No complete user-facing feedback/review workflow or backend API was verified in the current repository.

## Common Validation Errors

| Message Or Situation | Likely Cause | How To Resolve |
|---|---|---|
| `Please sign in` | You are using a protected action without a valid session. | Sign in again, then retry. |
| `Host name is required` | Workshop form is missing host name. | Enter your display name for the workshop. |
| `Workshop name/skill taught is required` | Workshop title is blank. | Enter a clear workshop title. |
| `Category is required` | No category selected. | Select a category from the dropdown. |
| `Please enter a valid Australian 10-digit number` | Contact number format is invalid. | Enter a 10-digit Australian number beginning with `0`. |
| `Duration must be a positive integer in minutes` | Duration is missing, zero, negative, or not a whole number. | Enter a whole number greater than zero. |
| `Maximum participants must be a positive integer` | Optional participant limit is invalid. | Leave it blank or enter a whole number greater than zero. |
| `Please confirm that the details are accurate` | Confirmation checkbox was not selected. | Review the form and select the confirmation checkbox. |
| Workshop not found | The item may be private, pending, rejected, draft, archived, or unavailable. | Return to `Explore` or `Memory` and use visible links. |
| Workshop full or attendance closed | The registration rules prevent joining. | Choose another workshop or contact the club through normal club channels. |
| Avatar upload rejected | File type or size is unsupported. | Use a supported image format and keep the file within the upload limit. |

## Common User Troubleshooting

| Issue | Suggested Action |
|---|---|
| You see a "session expired" message and are returned to the home page. | Your session ended (long inactivity, or signed out in another tab/device). Sign in again. If this happens immediately and repeatedly right after sign-in, the session is not loading correctly. |
| Google sign-in says the account is not linked. | Use `Sign Up` once with that Google account, then return to `Sign In`. |
| A workshop you submitted is not visible in Explore. | New submissions are pending until an admin approves them. |
| You cannot join a workshop. | Check whether it is full, closed, ongoing, completed, cancelled, or hosted by you. |
| Your dashboard is empty. | Join a workshop or submit one; if you recently acted, refresh the page. |
| A memory page link does not load. | The memory may still be draft, archived, or unpublished. |
| Feedback/reviews are unavailable. | This feature is not complete in the current implementation. |

## User-Facing Limitations

- Feedback and reviews are placeholder-only.
- The credit system is disabled in the current implementation.
- Regular users cannot upload workshop cover images.
- Regular users cannot create or edit memory pages.
- Regular users do not have an in-app messaging, contact, request, matching, report, or complaint workflow.
- Regular users do not have a verified full edit/delete workflow for submitted workshops.
- Public user profile access requires verification because the backend controller comment and security configuration do not fully align.

## Frequently Asked Questions

### Can I browse workshops without signing in?

Yes. Public workshop browsing and published memory pages are available without signing in.

### Do I need an account to attend a workshop?

Yes. Joining or leaving a workshop requires a signed-in account.

### What happens after I submit a workshop?

Your workshop is created as pending and waits for admin review. If approved, it becomes visible to other users according to the workshop visibility rules.

### Can I edit my workshop after submitting it?

Partially supported. You can view hosted workshops and hide rejected or cancelled hosted items from your Dashboard. A full regular-user edit workflow was not verified. Admins can update workshop details during review.

### Can I contact other users through SkillSwap?

No in-app messaging or matching workflow was verified in the current repository.

### Can I upload images?

Regular users can upload profile avatars. Workshop cover images and memory media are admin-managed.

### Why is the Feedback page not usable?

The current frontend shows a placeholder page for feedback and reviews. No completed feedback/review backend workflow was verified.

### Why do credits show as zero or not appear?

The credit system is disabled in the current implementation.

## Verification Notes

Directly supported by code: public Explore and Memory navigation, Clerk Sign In/Sign Up integration, Dashboard tabs, profile name/avatar editing, workshop creation, joining/leaving workshops, notifications, public memory pages, upload validation, and protected API requirements.

Directly supported by existing documentation: Clerk authentication, Vercel frontend deployment, Azure-backed backend/storage deployment, and the current removal of older dev-login authentication flows.

Inferred from implementation: active-status filtering on Explore, host use of `Request Approval` for pending workshops, user expectations around pending review, and deployment-dependent availability of OAuth providers.

Weakened or marked as unsupported because support was incomplete: feedback/reviews, credits, in-app messaging/matching, regular-user workshop editing/deletion, regular-user workshop image upload, user-facing memory editing, and public user profile access.
