# SkillSwap REST API Documentation

Last reviewed: 2026-05-15

## 1. Document Purpose

This document describes the current REST API contract for the SkillSwap project. It is intended for portfolio review, technical handover, frontend integration, and future backend maintenance.

The endpoint list and API behaviour were verified directly against the Spring Boot backend controllers, route mappings, DTOs, services, security configuration, exception handlers, storage services, and frontend API service layer. Existing project, requirements, user guide, admin guide, system architecture, database design, and README documents were used only as supporting context.

Strict scope note: this document includes only endpoints that exist in the current backend source code. It does not define ideal or future REST endpoints.

## 2. API Overview

| Area | Current implementation |
|---|---|
| Backend framework | Java 17, Spring Boot 3.5.x, Spring Web, Spring Security, Spring Data JPA, Bean Validation |
| API style | REST-style HTTP endpoints returning JSON DTOs, message DTOs, arrays, or empty responses |
| Base URL pattern | `<API_BASE_URL>/api/v1/...` for application APIs; `/health` is unversioned |
| Versioning | Path prefix `/api/v1` is used for API endpoints. No header-based API versioning was found. |
| Main API domains | Users/profiles, workshops, admin workshop review, notifications, public memories, admin memory studio, media uploads, health check |
| Persistence | PostgreSQL through JPA/Hibernate |
| Authentication | JWT bearer authentication through Spring Security OAuth2 Resource Server |
| Frontend API client | `skill-swap-frontend/src/lib/api.ts` and `skill-swap-frontend/src/shared/service/**` |

### JSON Conventions

- JSON field names are camelCase in the current DTOs.
- List endpoints return raw JSON arrays, not a paginated wrapper.
- Success responses are endpoint-specific. Some endpoints return a DTO, some return `{ "message": "..." }`, and some return no body.
- Error responses from application exceptions usually use `ErrorResponseDto`.
- `WorkshopResponseDto` is annotated with `JsonInclude.NON_NULL`, so fields that are `null` may be omitted from workshop responses.
- No formal OpenAPI/Swagger specification was found in the repository.

## 3. Authentication

### Mechanism

Protected API calls use bearer JWT authentication:

```http
Authorization: Bearer <JWT_TOKEN>
```

The active security configuration is `skill-swap-backend/src/main/java/club/skillswap/common/config/WebSecurityConfiguration.java`.

The backend validates JWTs with a configured issuer and/or JWKS endpoint through Spring Security OAuth2 Resource Server. Project documentation and frontend code identify Clerk as the current identity provider. Some older comments still mention Supabase, but the active implementation is generic issuer/JWKS JWT validation and current properties support Clerk configuration.

### Local User Mapping

`JwtConverter` and `UserService` map the JWT `sub` claim to `user_account.auth_subject`, with fallback support for legacy UUID subjects. If a valid authenticated user does not yet have a local row, `UserService.findOrCreateCurrentUser(...)` may create one.

Admin authority is derived from the local database role, not from frontend state. A user is treated as admin when their local `user_account.role` normalizes to `admin` or `role_admin`, producing `ROLE_ADMIN`.

### Public Endpoints

Verified public endpoints:

- `GET /health`
- `GET /api/v1/workshops`
- `GET /api/v1/workshops/public`
- `GET /api/v1/workshops/{id}` for numeric IDs, subject to workshop visibility rules
- `GET /api/v1/memories`
- `GET /api/v1/memories/{slug}`

Security also permits `/api/v1/auth/**`, but no active controller for that route group was found. It is not documented as an implemented API.

### Protected Endpoints

Most `/api/**` routes require a valid bearer token. Some routes are additionally protected by service-level ownership or admin checks.

Important nuance: active security permits `GET /api/v1/workshops/*`, but the `/mine` and `/attending` controllers still require an authenticated `JwtAuthenticationToken`. Treat those endpoints as protected.

### Admin-Only Endpoints

Admin-only endpoints are under:

- `/api/v1/admin/**`
- `DELETE /api/v1/workshops/{id}`

The backend enforces admin access in service methods using the authenticated user's authorities. `GET /api/v1/admin/hello` additionally uses `@PreAuthorize("hasRole('ADMIN')")`.

### Unauthenticated And Unauthorized Behaviour

Application-thrown authentication/authorization failures use `ResponseStatusException` and are converted to `ErrorResponseDto` by the global exception handler. Missing or invalid JWTs rejected by Spring Security itself may return a Spring Security 401 response and may not use the same JSON error body because no custom authentication entry point was found.

## 4. Common Request Conventions

| Convention | Current behaviour |
|---|---|
| JSON body | Use `Content-Type: application/json` for request DTOs. |
| Multipart body | Use `multipart/form-data` with form field `file` for upload endpoints. |
| Authorization | Use `Authorization: Bearer <JWT_TOKEN>` for protected endpoints. |
| Path parameters | IDs are path parameters such as `<WORKSHOP_ID>`, `<USER_ID>`, `<MEMORY_ID>`, and `<NOTIFICATION_ID>`. |
| Query parameters | No backend query parameters were found for filtering, sorting, or pagination. |
| Pagination | No backend pagination convention was found. List endpoints return full arrays. |
| Sorting | Sorting is repository/service-defined where present, for example notifications by created time descending and public memories by published/created time descending. |
| Search/filtering | Frontend workshop search and category filtering appear to be client-side against loaded workshop data. No backend search endpoint was found. |
| File uploads | Upload endpoints require `multipart/form-data`; the request part name is `file`. |

## 5. Common Response Conventions

| Response type | Shape |
|---|---|
| DTO response | Endpoint-specific JSON object, for example `UserProfileDto`, `WorkshopResponseDto`, or `MemoryEntryResponseDto`. |
| List response | Raw JSON array of DTO objects. |
| Message response | `{ "message": "..." }` from `ApiMessageDto`. |
| Empty response | `204 No Content` for `GET /health`, `DELETE /api/v1/admin/memories/{id}`, and `DELETE /api/v1/admin/memories/{id}/lock`. |
| Error response | Usually `ErrorResponseDto`: `{ "timestamp", "status", "error", "message", "path" }`. |

### Date And Time Formats

Inferred from DTO types and Jackson defaults:

- `LocalDate`: ISO date, for example `"2026-05-15"`.
- `LocalTime`: ISO time, for example `"14:30:00"`.
- `LocalDateTime`: ISO date-time, for example `"2026-05-15T14:30:00"`.
- `Instant`: ISO instant, for example `"2026-05-15T04:30:00Z"`.

## 6. Endpoint Summary

| Method | Path | Purpose | Auth | Role | Request body | Response | Source |
|---|---|---|---|---|---|---|---|
| GET | `/health` | Service health check | No | None | None | `204 No Content` | `HealthController` |
| POST | `/api/v1/workshops` | Create workshop proposal | Yes | Member | `WorkshopCreateRequestDto` | `201 ApiMessageDto` | `WorkshopController` |
| GET | `/api/v1/workshops` | Public workshop list; admin list when caller is admin | Optional | Admin changes result scope | None | `WorkshopResponseDto[]` | `WorkshopController` |
| GET | `/api/v1/workshops/public` | Public approved workshop list | No | None | None | `WorkshopResponseDto[]` | `WorkshopController` |
| GET | `/api/v1/workshops/{id}` | Workshop detail for numeric ID | Optional | Visibility rules | None | `WorkshopResponseDto` | `WorkshopController` |
| GET | `/api/v1/workshops/mine` | Current user's hosted workshops | Yes | Member | None | `WorkshopResponseDto[]` | `WorkshopController` |
| GET | `/api/v1/workshops/attending` | Current user's attending workshops | Yes | Member | None | `WorkshopResponseDto[]` | `WorkshopController` |
| POST | `/api/v1/workshops/{id}/hosting/hide` | Hide own rejected/cancelled hosted workshop | Yes | Host only | None | `ApiMessageDto` | `WorkshopController` |
| POST | `/api/v1/workshops/{id}/request-approval` | Notify admins for a pending workshop | Yes | Host or admin | None | `ApiMessageDto` | `WorkshopController` |
| DELETE | `/api/v1/workshops/{id}` | Delete workshop | Yes | Admin | None | `ApiMessageDto` | `WorkshopController` |
| POST | `/api/v1/workshops/{id}/join` | Join eligible workshop | Yes | Member | None | `ApiMessageDto` | `WorkshopController` |
| POST | `/api/v1/workshops/{id}/leave` | Leave joined workshop | Yes | Member | None | `ApiMessageDto` | `WorkshopController` |
| GET | `/api/v1/admin/workshops` | Admin list all workshops | Yes | Admin | None | `WorkshopResponseDto[]` | `AdminWorkshopController` |
| GET | `/api/v1/admin/workshops/pending` | Admin list pending workshops | Yes | Admin | None | `WorkshopResponseDto[]` | `AdminWorkshopController` |
| GET | `/api/v1/admin/workshops/{id}` | Workshop detail through admin route | Yes | Admin intended; not fully enforced | None | `WorkshopResponseDto` | `AdminWorkshopController` |
| PUT | `/api/v1/admin/workshops/{id}` | Admin update editable workshop details | Yes | Admin | `WorkshopCreateRequestDto` | `WorkshopResponseDto` | `AdminWorkshopController` |
| POST | `/api/v1/admin/workshops/{id}/approve` | Approve pending workshop | Yes | Admin | None | `ApiMessageDto` | `AdminWorkshopController` |
| POST | `/api/v1/admin/workshops/{id}/reject` | Reject pending workshop | Yes | Admin | `WorkshopReviewRequestDto` optional | `ApiMessageDto` | `AdminWorkshopController` |
| POST | `/api/v1/admin/workshops/{id}/cancel` | Cancel eligible workshop | Yes | Admin | None | `ApiMessageDto` | `AdminWorkshopController` |
| POST | `/api/v1/admin/workshops/{id}/image` | Upload workshop image | Yes | Admin | multipart `file` | `WorkshopResponseDto` | `AdminWorkshopController` |
| GET | `/api/v1/admin/hello` | Admin protected check endpoint | Yes | Admin | None | Plain text | `AdminController` |
| GET | `/api/v1/users/me` | Current user profile | Yes | Member | None | `UserProfileDto` | `UserController` |
| GET | `/api/v1/users/{id}` | User profile by UUID | Yes | Member | None | `UserProfileDto` | `UserController` |
| PATCH | `/api/v1/users/me` | Update current profile | Yes | Member | `UpdateProfileRequestDto` | `UserProfileDto` | `UserController` |
| POST | `/api/v1/users/me/avatar` | Upload current user's avatar | Yes | Member | multipart `file` | `UserProfileDto` | `UserController` |
| POST | `/api/v1/users/me/skills` | Add current user's skill | Yes | Member | `SkillRequestDto` | `201 UserProfileDto` | `UserController` |
| POST | `/api/v1/users/me/skills/delete` | Remove current user's skill by name | Yes | Member | `SkillRequestDto` | `{ "message": "..." }` | `UserController` |
| GET | `/api/v1/notifications` | List current user's notifications | Yes | Member | None | `NotificationResponseDto[]` | `NotificationController` |
| GET | `/api/v1/notifications/unread-count` | Count unread notifications | Yes | Member | None | `NotificationCountDto` | `NotificationController` |
| POST | `/api/v1/notifications/{id}/read` | Mark one notification read | Yes | Recipient | None | `NotificationResponseDto` | `NotificationController` |
| POST | `/api/v1/notifications/read-all` | Mark all current user's notifications read | Yes | Member | None | `ApiMessageDto` | `NotificationController` |
| GET | `/api/v1/memories` | List published memory entries | No | None | None | `MemoryEntryResponseDto[]` | `MemoryController` |
| GET | `/api/v1/memories/{slug}` | Get published memory by slug | No | None | None | `MemoryEntryResponseDto` | `MemoryController` |
| GET | `/api/v1/admin/memories` | Admin list all memory entries | Yes | Admin | None | `MemoryEntryResponseDto[]` | `AdminMemoryController` |
| POST | `/api/v1/admin/memories` | Admin create memory entry | Yes | Admin | `MemoryEntryRequestDto` | `201 MemoryEntryResponseDto` | `AdminMemoryController` |
| PUT | `/api/v1/admin/memories/{id}` | Admin update memory entry | Yes | Admin | `MemoryEntryRequestDto` | `MemoryEntryResponseDto` | `AdminMemoryController` |
| DELETE | `/api/v1/admin/memories/{id}` | Admin delete memory entry | Yes | Admin | None | `204 No Content` | `AdminMemoryController` |
| POST | `/api/v1/admin/memories/{id}/lock` | Acquire draft edit lock | Yes | Admin | None | `MemoryEntryResponseDto` | `AdminMemoryController` |
| DELETE | `/api/v1/admin/memories/{id}/lock` | Release draft edit lock | Yes | Admin | None | `204 No Content` | `AdminMemoryController` |
| POST | `/api/v1/admin/memories/media` | Upload memory media | Yes | Admin | multipart `file` | `201 MemoryMediaUploadResponseDto` | `AdminMemoryController` |

## 7. Detailed Endpoint Documentation

The schemas referenced below are documented in Section 8.

### 7.1 Health

#### GET `/health`

- Purpose: verify that the backend HTTP service is reachable.
- Authentication: public.
- Request body: none.
- Successful response: `204 No Content`, empty body.
- Source: `HealthController`.

Example request:

```bash
curl -i "<API_BASE_URL>/health"
```

Example response:

```http
HTTP/1.1 204 No Content
```

Error cases: unexpected server errors may return `500 ErrorResponseDto`.

### 7.2 User Accounts And Profiles

#### GET `/api/v1/users/me`

- Purpose: get or create the current local SkillSwap profile from the authenticated JWT.
- Authentication: required.
- Request headers: `Authorization: Bearer <JWT_TOKEN>`.
- Request body: none.
- Successful response: `200 UserProfileDto`.
- Source: `UserController`, `UserService`; directly verified.

Example request:

```bash
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  "<API_BASE_URL>/api/v1/users/me"
```

Example response:

```json
{
  "id": "<USER_ID>",
  "username": "example_user",
  "email": "<USER_EMAIL>",
  "avatarUrl": "<IMAGE_URL>",
  "bio": "SkillSwap member",
  "role": "member",
  "skills": ["design"],
  "creditBalance": 0,
  "totalWorkshopsHosted": 1,
  "totalWorkshopsAttended": 2,
  "rating": 0.0,
  "reviewCount": 0,
  "createdAt": "2026-05-15T04:30:00Z",
  "updatedAt": "2026-05-15T04:30:00Z"
}
```

Error cases:

- `401`: missing/invalid authentication.
- `403`: email verification failure when the token explicitly indicates an unverified email.
- `500`: unexpected server error.

#### GET `/api/v1/users/{id}`

- Purpose: retrieve a user profile and profile stats by UUID.
- Authentication: required by active security configuration.
- Role requirement: authenticated member; no admin-only check.
- Path parameters: `id` as UUID.
- Request body: none.
- Successful response: `200 UserProfileDto`.
- Source: `UserController`, `UserService`; authentication behaviour verified from `WebSecurityConfiguration`.
- Requires verification: controller comments describe this endpoint as public, and frontend `userAPI.getById` calls it without a token, but active security does not permit `/api/v1/users/{id}` publicly.

Example request:

```bash
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  "<API_BASE_URL>/api/v1/users/<USER_ID>"
```

Example response:

```json
{
  "id": "<USER_ID>",
  "username": "example_user",
  "email": "<USER_EMAIL>",
  "skills": [],
  "creditBalance": 0,
  "totalWorkshopsHosted": 0,
  "totalWorkshopsAttended": 0,
  "rating": 0.0,
  "reviewCount": 0
}
```

Error cases:

- `401`: missing/invalid authentication.
- `500`: `findUserById` currently throws `RuntimeException` for missing users, which the global handler maps to `500`; this should be improved to a not-found response.

#### PATCH `/api/v1/users/me`

- Purpose: update the current user's editable profile fields.
- Authentication: required.
- Request headers: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`.
- Request body schema: `UpdateProfileRequestDto`.
- Successful response: `200 UserProfileDto`.
- Source: `UserController`, `UserService`; directly verified.
- Inferred from implementation: all request fields are optional, but blank `username` is rejected if supplied.

Example request:

```bash
curl -X PATCH "<API_BASE_URL>/api/v1/users/me" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "username": "new_name", "bio": "Learning and teaching design." }'
```

Example response:

```json
{
  "id": "<USER_ID>",
  "username": "new_name",
  "email": "<USER_EMAIL>",
  "bio": "Learning and teaching design.",
  "skills": [],
  "creditBalance": 0,
  "totalWorkshopsHosted": 0,
  "totalWorkshopsAttended": 0,
  "rating": 0.0,
  "reviewCount": 0
}
```

Error cases:

- `400`: blank username or invalid skill values in service-level validation.
- `401`: missing/invalid authentication.

#### POST `/api/v1/users/me/avatar`

- Purpose: upload and set the current user's avatar image.
- Authentication: required.
- Request headers: `Authorization: Bearer <JWT_TOKEN>`.
- Content-Type: `multipart/form-data`.
- Request body: form field `file`.
- Successful response: `200 UserProfileDto`.
- Source: `UserController`, `UserService`, `AzureBlobStorageService`; directly verified.

Example request:

```bash
curl -X POST "<API_BASE_URL>/api/v1/users/me/avatar" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -F "file=@avatar.png"
```

Example response:

```json
{
  "id": "<USER_ID>",
  "username": "example_user",
  "email": "<USER_EMAIL>",
  "avatarUrl": "<IMAGE_URL>",
  "skills": [],
  "creditBalance": 0,
  "totalWorkshopsHosted": 0,
  "totalWorkshopsAttended": 0,
  "rating": 0.0,
  "reviewCount": 0
}
```

Error cases:

- `400`: missing file or unsupported avatar format.
- `413`: image too large.
- `502`: Azure Blob upload failure.

#### POST `/api/v1/users/me/skills`

- Purpose: add a skill to the current user's profile.
- Authentication: required.
- Request headers: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`.
- Request body schema: `SkillRequestDto`.
- Successful response: `201 UserProfileDto`.
- Source: `UserController`, `SkillRequestDto`, `UserService`; directly verified.
- Inferred from implementation: skill names are normalized to lowercase and duplicate skill names are ignored.

Example request:

```bash
curl -X POST "<API_BASE_URL>/api/v1/users/me/skills" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "skillName": "Photography", "skillLevel": "Beginner" }'
```

Example response:

```json
{
  "id": "<USER_ID>",
  "username": "example_user",
  "email": "<USER_EMAIL>",
  "skills": ["photography"],
  "creditBalance": 100,
  "totalWorkshopsHosted": 0,
  "totalWorkshopsAttended": 0,
  "rating": 0.0,
  "reviewCount": 0
}
```

Note: `UserProfileDto.fromEntity(...)` sets `creditBalance` to `100`, while `UserService.getUserProfileWithStats(...)` sets it to `0`. This inconsistency is directly visible in code and should be fixed before relying on credit values.

Error cases:

- `400`: blank skill name or field length violation.
- `401`: missing/invalid authentication.

#### POST `/api/v1/users/me/skills/delete`

- Purpose: remove a skill from the current user's profile by skill name.
- Authentication: required.
- Request headers: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`.
- Request body schema: `SkillRequestDto`; only `skillName` is used by service logic.
- Successful response: `200` with `{ "message": "..." }`.
- Source: `UserController`, `UserService`; directly verified.

Example request:

```bash
curl -X POST "<API_BASE_URL>/api/v1/users/me/skills/delete" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "skillName": "photography" }'
```

Example response:

```json
{
  "message": "Skill successfully deleted."
}
```

Alternative success response when no matching skill exists:

```json
{
  "message": "Nothing to delete. Skill not found."
}
```

Error cases:

- `400`: blank skill name or field length violation.
- `401`: missing/invalid authentication.

### 7.3 Workshops

#### POST `/api/v1/workshops`

- Purpose: create a new workshop proposal.
- Authentication: required. In the `dev` profile only, `X-Mock-User` can be used by this controller path.
- Request body schema: `WorkshopCreateRequestDto`.
- Successful response: `201 ApiMessageDto`.
- Source: `WorkshopController`, `WorkshopCreateRequestDto`, `WorkshopServiceImpl`; directly verified.
- Inferred from implementation: the new workshop status is `pending`, `creditCost` and `creditReward` are set to `0`, and admins may be notified asynchronously.

Example request:

```bash
curl -X POST "<API_BASE_URL>/api/v1/workshops" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "hostName": "Example Host",
    "title": "Intro to Product Design",
    "description": "A practical design workshop.",
    "category": "Design",
    "duration": 90,
    "date": "2026-06-01",
    "time": "14:00:00",
    "attendCloseAt": "2026-05-31T14:00:00",
    "isOnline": false,
    "location": "Room TBC",
    "maxParticipants": 20,
    "contactNumber": "0412345678",
    "materialsProvided": "Slides",
    "materialsNeededFromClub": "Projector",
    "venueRequirements": "Quiet room",
    "otherImportantInfo": "Bring a laptop",
    "weekNumber": 3,
    "memberResponsible": "Example Member",
    "membersPresent": "Example Team",
    "eventSubmitted": false,
    "usuApprovalStatus": "pending",
    "detailsConfirmed": true
  }'
```

Example response:

```json
{
  "message": "Workshop created successfully."
}
```

Error cases:

- `400`: Bean Validation failure, invalid `usuApprovalStatus`, invalid user ID, or service-level business rule failure.
- `401`: missing/invalid authentication.
- `404`: facilitator user not found.

#### GET `/api/v1/workshops`

- Purpose: list workshops. Public/regular callers receive public approved workshops; authenticated admins receive all workshops.
- Authentication: optional, but an admin token changes the result scope.
- Request body: none.
- Successful response: `200 WorkshopResponseDto[]`.
- Source: `WorkshopController`, `WorkshopServiceImpl`; directly verified.

Example request:

```bash
curl "<API_BASE_URL>/api/v1/workshops"
```

Example response:

```json
[
  {
    "id": "<WORKSHOP_ID>",
    "hostName": "Example Host",
    "title": "Intro to Product Design",
    "description": "A practical design workshop.",
    "category": "Design",
    "status": "upcoming",
    "date": "2026-06-01",
    "time": "14:00:00",
    "duration": 90,
    "isOnline": false,
    "location": "Room TBC",
    "maxParticipants": 20,
    "currentParticipants": 5,
    "creditCost": 0,
    "creditReward": 0,
    "image": "<IMAGE_URL>",
    "facilitator": {
      "id": "<USER_ID>",
      "name": "example_user",
      "avatar": "<IMAGE_URL>"
    },
    "createdAt": "2026-05-15T04:30:00"
  }
]
```

Error cases:

- `500`: unexpected mapping or persistence errors.

#### GET `/api/v1/workshops/public`

- Purpose: list approved public workshops.
- Authentication: public.
- Request body: none.
- Successful response: `200 WorkshopResponseDto[]`.
- Source: `WorkshopController`, `WorkshopRepository.findAllPublicApprovedWithFacilitator`; directly verified.

Example request:

```bash
curl "<API_BASE_URL>/api/v1/workshops/public"
```

Example response: same shape as `GET /api/v1/workshops` public list.

Error cases:

- `500`: unexpected server error.

#### GET `/api/v1/workshops/{id}`

- Purpose: retrieve workshop detail by numeric workshop ID.
- Authentication: optional, but restricted workshop statuses require the caller to be admin or facilitator.
- Path parameters: `id` as numeric workshop ID.
- Request body: none.
- Successful response: `200 WorkshopResponseDto`.
- Source: `WorkshopController`, `WorkshopServiceImpl.enforceWorkshopVisibility`; directly verified.
- Inferred from implementation: pending and rejected workshops return `404` to unauthenticated/non-authorized viewers.

Example request:

```bash
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  "<API_BASE_URL>/api/v1/workshops/<WORKSHOP_ID>"
```

Example response:

```json
{
  "id": "<WORKSHOP_ID>",
  "hostName": "Example Host",
  "title": "Intro to Product Design",
  "description": "A practical design workshop.",
  "category": "Design",
  "status": "upcoming",
  "date": "2026-06-01",
  "time": "14:00:00",
  "attendCloseAt": "2026-05-31T14:00:00",
  "duration": 90,
  "isOnline": false,
  "location": "Room TBC",
  "maxParticipants": 20,
  "currentParticipants": 5,
  "creditCost": 0,
  "creditReward": 0,
  "materialsProvided": "Slides",
  "detailsConfirmed": true,
  "image": "<IMAGE_URL>",
  "facilitator": {
    "id": "<USER_ID>",
    "name": "example_user",
    "avatar": "<IMAGE_URL>"
  },
  "createdAt": "2026-05-15T04:30:00"
}
```

Sensitive fields such as `contactNumber` and `submitterEmail` are included only for admins or the workshop facilitator.

Error cases:

- `404`: workshop not found or restricted workshop hidden from viewer.
- `500`: unexpected server error.

#### GET `/api/v1/workshops/mine`

- Purpose: list workshops facilitated/hosted by the current user.
- Authentication: required.
- Request headers: `Authorization: Bearer <JWT_TOKEN>`.
- Request body: none.
- Successful response: `200 WorkshopResponseDto[]`.
- Source: `WorkshopController`, `WorkshopServiceImpl`; directly verified.

Example request:

```bash
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  "<API_BASE_URL>/api/v1/workshops/mine"
```

Example response:

```json
[
  {
    "id": "<WORKSHOP_ID>",
    "title": "Intro to Product Design",
    "status": "pending",
    "date": "2026-06-01",
    "time": "14:00:00",
    "currentParticipants": 0,
    "hiddenByHost": false
  }
]
```

Error cases:

- `400`: invalid mapped local user ID.
- `401`: missing/invalid authentication.

#### GET `/api/v1/workshops/attending`

- Purpose: list workshops the current user has joined.
- Authentication: required.
- Request headers: `Authorization: Bearer <JWT_TOKEN>`.
- Request body: none.
- Successful response: `200 WorkshopResponseDto[]`.
- Source: `WorkshopController`, `WorkshopServiceImpl`; directly verified.

Example request:

```bash
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  "<API_BASE_URL>/api/v1/workshops/attending"
```

Example response:

```json
[
  {
    "id": "<WORKSHOP_ID>",
    "title": "Intro to Product Design",
    "status": "upcoming",
    "date": "2026-06-01",
    "time": "14:00:00",
    "currentParticipants": 5
  }
]
```

Error cases:

- `400`: invalid mapped local user ID.
- `401`: missing/invalid authentication.

#### POST `/api/v1/workshops/{id}/join`

- Purpose: join an eligible upcoming workshop.
- Authentication: required.
- Path parameters: `id` as workshop ID.
- Request body: none. `JoinWorkshopRequestDto` exists in code but is not consumed by this controller.
- Successful response: `200 ApiMessageDto`.
- Source: `WorkshopController`, `WorkshopServiceImpl`; directly verified.

Example request:

```bash
curl -X POST "<API_BASE_URL>/api/v1/workshops/<WORKSHOP_ID>/join" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

Example response:

```json
{
  "message": "Successfully joined workshop"
}
```

Error cases:

- `400`: workshop not open for attendees, full, attendance closed, duplicate participant, or invalid user.
- `401`: missing/invalid authentication.
- `404`: workshop or user not found.

#### POST `/api/v1/workshops/{id}/leave`

- Purpose: leave a workshop that the current user previously joined.
- Authentication: required.
- Path parameters: `id` as workshop ID.
- Request body: none. `LeaveWorkshopRequestDto` exists in code but is not consumed by this controller.
- Successful response: `200 ApiMessageDto`.
- Source: `WorkshopController`, `WorkshopServiceImpl`; directly verified.

Example request:

```bash
curl -X POST "<API_BASE_URL>/api/v1/workshops/<WORKSHOP_ID>/leave" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

Example response:

```json
{
  "message": "Successfully left workshop"
}
```

Error cases:

- `400`: current user is not a participant.
- `401`: missing/invalid authentication.
- `404`: workshop or user not found.

#### POST `/api/v1/workshops/{id}/hosting/hide`

- Purpose: hide a rejected or cancelled hosted workshop from the current host's hosting list.
- Authentication: required.
- Role/permission: current user must be the workshop facilitator.
- Request body: none.
- Successful response: `200 ApiMessageDto`.
- Source: `WorkshopController`, `WorkshopServiceImpl`; directly verified.

Example request:

```bash
curl -X POST "<API_BASE_URL>/api/v1/workshops/<WORKSHOP_ID>/hosting/hide" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

Example response:

```json
{
  "message": "Workshop hidden from hosting list."
}
```

Error cases:

- `400`: workshop is not rejected or cancelled.
- `401`: missing/invalid authentication.
- `403`: caller is not the host.
- `404`: workshop not found.

#### POST `/api/v1/workshops/{id}/request-approval`

- Purpose: send an approval request notification for a pending workshop.
- Authentication: required.
- Role/permission: workshop facilitator or admin.
- Request body: none.
- Successful response: `200 ApiMessageDto`.
- Source: `WorkshopController`, `WorkshopServiceImpl`; directly verified.

Example request:

```bash
curl -X POST "<API_BASE_URL>/api/v1/workshops/<WORKSHOP_ID>/request-approval" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

Example response:

```json
{
  "message": "Approval request sent."
}
```

Error cases:

- `400`: only pending workshops can request approval.
- `401`: missing/invalid authentication.
- `403`: caller is neither host nor admin.
- `404`: workshop not found.

#### DELETE `/api/v1/workshops/{id}`

- Purpose: delete a workshop.
- Authentication: required.
- Role requirement: admin.
- Request body: none.
- Successful response: `200 ApiMessageDto`.
- Source: `WorkshopController`, `WorkshopServiceImpl`; directly verified.
- Operational caution: this is an admin backend endpoint; a complete admin UI delete flow was not verified.

Example request:

```bash
curl -X DELETE "<API_BASE_URL>/api/v1/workshops/<WORKSHOP_ID>" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

Example response:

```json
{
  "message": "delete success"
}
```

Error cases:

- `401`: missing/invalid authentication.
- `403`: caller is not admin.
- `404`: workshop not found.
- `409`: related records prevent deletion.

### 7.4 Admin Workshop Review

Admin workshop endpoints require `Authorization: Bearer <JWT_TOKEN>`. Most admin workshop operations also call service-level admin checks. Exception: `GET /api/v1/admin/workshops/{id}` is on an admin route but delegates to the normal workshop detail service without calling `requireAdmin`; document this endpoint as admin-intended but requiring verification.

#### GET `/api/v1/admin/workshops`

- Purpose: list all workshops for admin review.
- Request body: none.
- Successful response: `200 WorkshopResponseDto[]`.
- Source: `AdminWorkshopController`, `WorkshopServiceImpl.requireAdmin`; directly verified.

Example request:

```bash
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  "<API_BASE_URL>/api/v1/admin/workshops"
```

Example response:

```json
[
  {
    "id": "<WORKSHOP_ID>",
    "title": "Intro to Product Design",
    "status": "pending",
    "date": "2026-06-01",
    "time": "14:00:00",
    "currentParticipants": 0,
    "hiddenByHost": false
  }
]
```

Error cases: `401`, `403`, `500`.

#### GET `/api/v1/admin/workshops/pending`

- Purpose: list pending workshop proposals.
- Request body: none.
- Successful response: `200 WorkshopResponseDto[]`.
- Source: `AdminWorkshopController`, `WorkshopRepository.findAllPendingWithFacilitator`; directly verified.

Example request:

```bash
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  "<API_BASE_URL>/api/v1/admin/workshops/pending"
```

Example response: array of `WorkshopResponseDto` summaries.

Error cases: `401`, `403`, `500`.

#### GET `/api/v1/admin/workshops/{id}`

- Purpose: retrieve a workshop detail view for admin review.
- Authentication: required.
- Role requirement: Requires verification. Despite the admin route path, the current controller delegates to `workshopService.getWorkshopById(...)`, which applies normal workshop visibility rules rather than a service-level admin check.
- Path parameters: `id` as workshop ID.
- Request body: none.
- Successful response: `200 WorkshopResponseDto`.
- Source: `AdminWorkshopController`, `WorkshopServiceImpl`; directly verified.
- Inferred from implementation: admin detail includes participant details because `mapToDtoForViewer` includes participants for admin callers.

Example request:

```bash
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  "<API_BASE_URL>/api/v1/admin/workshops/<WORKSHOP_ID>"
```

Example response:

```json
{
  "id": "<WORKSHOP_ID>",
  "title": "Intro to Product Design",
  "status": "pending",
  "contactNumber": "0412345678",
  "submitterEmail": "<USER_EMAIL>",
  "participants": [
    {
      "id": "<USER_ID>",
      "username": "attendee",
      "avatarUrl": "<IMAGE_URL>",
      "email": "<USER_EMAIL>"
    }
  ]
}
```

Error cases:

- `401`: missing/invalid authentication.
- `404`: workshop not found, or restricted workshop hidden by normal visibility rules.
- `403`: not explicitly thrown by this endpoint's current service path for non-admin callers; admin-only enforcement requires verification.

#### PUT `/api/v1/admin/workshops/{id}`

- Purpose: update editable workshop details.
- Path parameters: `id` as workshop ID.
- Request body schema: `WorkshopCreateRequestDto`; the full validated payload is required.
- Successful response: `200 WorkshopResponseDto`.
- Source: `AdminWorkshopController`, `WorkshopCreateRequestDto`, `WorkshopServiceImpl`; directly verified.

Example request:

```bash
curl -X PUT "<API_BASE_URL>/api/v1/admin/workshops/<WORKSHOP_ID>" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "hostName": "Example Host",
    "title": "Updated Workshop Title",
    "category": "Design",
    "duration": 90,
    "date": "2026-06-01",
    "time": "14:00:00",
    "isOnline": false,
    "location": "Room TBC",
    "contactNumber": "0412345678",
    "detailsConfirmed": true
  }'
```

Example response: `WorkshopResponseDto` for the updated workshop.

Error cases:

- `400`: validation failure, completed/cancelled workshop, already-started workshop, invalid `usuApprovalStatus`.
- `401`: missing/invalid authentication.
- `403`: caller is not admin.
- `404`: workshop not found.

#### POST `/api/v1/admin/workshops/{id}/approve`

- Purpose: approve a pending workshop.
- Request body: none.
- Successful response: `200 ApiMessageDto`.
- Source: `AdminWorkshopController`, `WorkshopServiceImpl.approveWorkshop`; directly verified.

Example request:

```bash
curl -X POST "<API_BASE_URL>/api/v1/admin/workshops/<WORKSHOP_ID>/approve" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

Example response:

```json
{
  "message": "Workshop approved successfully."
}
```

Error cases:

- `400`: only pending workshops can be approved.
- `401`, `403`, `404`.

#### POST `/api/v1/admin/workshops/{id}/reject`

- Purpose: reject a pending workshop.
- Request body schema: optional `WorkshopReviewRequestDto`.
- Successful response: `200 ApiMessageDto`.
- Source: `AdminWorkshopController`, `WorkshopServiceImpl.rejectWorkshop`; directly verified.

Example request:

```bash
curl -X POST "<API_BASE_URL>/api/v1/admin/workshops/<WORKSHOP_ID>/reject" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "comment": "Please clarify the venue requirements." }'
```

Example response:

```json
{
  "message": "Workshop rejected successfully."
}
```

Error cases:

- `400`: only pending workshops can be rejected.
- `401`, `403`, `404`.

#### POST `/api/v1/admin/workshops/{id}/cancel`

- Purpose: cancel an eligible workshop before it starts.
- Request body: none.
- Successful response: `200 ApiMessageDto`.
- Source: `AdminWorkshopController`, `WorkshopServiceImpl.cancelWorkshop`; directly verified.

Example request:

```bash
curl -X POST "<API_BASE_URL>/api/v1/admin/workshops/<WORKSHOP_ID>/cancel" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

Example response:

```json
{
  "message": "Workshop cancelled successfully."
}
```

Error cases:

- `400`: completed/cancelled workshop or already-started workshop.
- `401`, `403`, `404`.

#### POST `/api/v1/admin/workshops/{id}/image`

- Purpose: upload and set the workshop image.
- Content-Type: `multipart/form-data`.
- Request body: form field `file`.
- Successful response: `200 WorkshopResponseDto`.
- Source: `AdminWorkshopController`, `WorkshopServiceImpl.uploadWorkshopImage`, `AzureBlobStorageService`; directly verified.

Example request:

```bash
curl -X POST "<API_BASE_URL>/api/v1/admin/workshops/<WORKSHOP_ID>/image" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -F "file=@workshop-cover.png"
```

Example response:

```json
{
  "id": "<WORKSHOP_ID>",
  "title": "Intro to Product Design",
  "image": "<IMAGE_URL>"
}
```

Error cases:

- `400`: missing file or non-image upload.
- `413`: image too large.
- `401`, `403`, `404`.
- `502`: Azure Blob access/upload failure.

#### GET `/api/v1/admin/hello`

- Purpose: small admin-only protected-resource check.
- Authentication: required.
- Role requirement: `ROLE_ADMIN` through `@PreAuthorize("hasRole('ADMIN')")`.
- Request body: none.
- Successful response: `200` plain text.
- Source: `AdminController`; directly verified.

Example request:

```bash
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  "<API_BASE_URL>/api/v1/admin/hello"
```

Example response:

```text
Hello Admin! You have successfully accessed a protected resource.
```

Error cases: `401`, `403`.

### 7.5 Notifications

All notification endpoints require authentication and operate only on the current user's notifications.

#### GET `/api/v1/notifications`

- Purpose: list current user's notifications ordered by created time descending.
- Request body: none.
- Successful response: `200 NotificationResponseDto[]`.
- Source: `NotificationController`, `NotificationServiceImpl`; directly verified.

Example request:

```bash
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  "<API_BASE_URL>/api/v1/notifications"
```

Example response:

```json
[
  {
    "id": "<NOTIFICATION_ID>",
    "userId": "<USER_ID>",
    "type": "workshop_approved",
    "title": "Workshop approved: Intro to Product Design",
    "message": "Your workshop has been approved.",
    "timestamp": "2026-05-15T04:30:00",
    "read": false,
    "workshopId": "<WORKSHOP_ID>"
  }
]
```

Error cases: `401`, `500`.

#### GET `/api/v1/notifications/unread-count`

- Purpose: count unread notifications for the current user.
- Request body: none.
- Successful response: `200 NotificationCountDto`.
- Source: `NotificationController`, `NotificationServiceImpl`; directly verified.

Example request:

```bash
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  "<API_BASE_URL>/api/v1/notifications/unread-count"
```

Example response:

```json
{
  "count": 3
}
```

Error cases: `401`, `500`.

#### POST `/api/v1/notifications/{id}/read`

- Purpose: mark one notification as read.
- Path parameters: `id` as notification ID.
- Request body: none.
- Successful response: `200 NotificationResponseDto`.
- Source: `NotificationController`, `NotificationServiceImpl`; directly verified.

Example request:

```bash
curl -X POST "<API_BASE_URL>/api/v1/notifications/<NOTIFICATION_ID>/read" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

Example response:

```json
{
  "id": "<NOTIFICATION_ID>",
  "userId": "<USER_ID>",
  "type": "workshop_approved",
  "title": "Workshop approved: Intro to Product Design",
  "message": "Your workshop has been approved.",
  "timestamp": "2026-05-15T04:30:00",
  "read": true,
  "workshopId": "<WORKSHOP_ID>"
}
```

Error cases:

- `401`: missing/invalid authentication.
- `404`: notification not found for current user.

#### POST `/api/v1/notifications/read-all`

- Purpose: mark all current user's unread notifications as read.
- Request body: none.
- Successful response: `200 ApiMessageDto`.
- Source: `NotificationController`, `NotificationServiceImpl`; directly verified.

Example request:

```bash
curl -X POST "<API_BASE_URL>/api/v1/notifications/read-all" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

Example response:

```json
{
  "message": "Marked 3 notifications as read."
}
```

Error cases: `401`, `500`.

### 7.6 Public Memories

#### GET `/api/v1/memories`

- Purpose: list published memory entries.
- Authentication: public.
- Request body: none.
- Successful response: `200 MemoryEntryResponseDto[]`.
- Source: `MemoryController`, `MemoryServiceImpl.listPublicMemories`; directly verified.

Example request:

```bash
curl "<API_BASE_URL>/api/v1/memories"
```

Example response:

```json
[
  {
    "id": "<MEMORY_ID>",
    "title": "Design Night 2026",
    "slug": "design-night-2026",
    "coverUrl": "<IMAGE_URL>",
    "content": "# Design Night 2026\n\nHighlights...",
    "mediaUrls": ["<IMAGE_URL>"],
    "status": "published",
    "publishedAt": "2026-05-15T04:30:00",
    "createdAt": "2026-05-15T04:00:00",
    "updatedAt": "2026-05-15T04:30:00",
    "createdBy": "<USER_ID>",
    "updatedBy": "<USER_ID>"
  }
]
```

Error cases: `500`.

#### GET `/api/v1/memories/{slug}`

- Purpose: retrieve one published memory entry by slug.
- Authentication: public.
- Path parameters: `slug` as normalized memory slug.
- Request body: none.
- Successful response: `200 MemoryEntryResponseDto`.
- Source: `MemoryController`, `MemoryServiceImpl.getPublicMemoryBySlug`; directly verified.

Example request:

```bash
curl "<API_BASE_URL>/api/v1/memories/<SLUG>"
```

Example response: `MemoryEntryResponseDto`.

Error cases:

- `404`: memory not found or not published.

### 7.7 Admin Memory Studio

All admin memory endpoints require `Authorization: Bearer <JWT_TOKEN>` and admin authority.

#### GET `/api/v1/admin/memories`

- Purpose: list all memory entries for admins, ordered by updated time descending.
- Request body: none.
- Successful response: `200 MemoryEntryResponseDto[]`.
- Source: `AdminMemoryController`, `MemoryServiceImpl`; directly verified.

Example request:

```bash
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  "<API_BASE_URL>/api/v1/admin/memories"
```

Example response: array of `MemoryEntryResponseDto`.

Error cases: `401`, `403`.

#### POST `/api/v1/admin/memories`

- Purpose: create a memory entry.
- Request body schema: `MemoryEntryRequestDto`.
- Successful response: `201 MemoryEntryResponseDto`.
- Source: `AdminMemoryController`, `MemoryServiceImpl.applyPayload`; directly verified.
- Inferred from implementation: `title` is required on create; if `slug` is omitted, one is generated from title; if `status` is omitted, it defaults to `draft`.

Example request:

```bash
curl -X POST "<API_BASE_URL>/api/v1/admin/memories" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Design Night 2026",
    "slug": "design-night-2026",
    "coverUrl": "<IMAGE_URL>",
    "content": "# Design Night 2026\n\nHighlights...",
    "mediaUrls": ["<IMAGE_URL>"],
    "status": "draft"
  }'
```

Example response:

```json
{
  "id": "<MEMORY_ID>",
  "title": "Design Night 2026",
  "slug": "design-night-2026",
  "coverUrl": "<IMAGE_URL>",
  "content": "# Design Night 2026\n\nHighlights...",
  "mediaUrls": ["<IMAGE_URL>"],
  "status": "draft",
  "createdAt": "2026-05-15T04:00:00",
  "updatedAt": "2026-05-15T04:00:00",
  "createdBy": "<USER_ID>",
  "updatedBy": "<USER_ID>"
}
```

Error cases:

- `400`: missing title, duplicate slug, unsupported status, missing body.
- `401`, `403`.

#### PUT `/api/v1/admin/memories/{id}`

- Purpose: update a memory entry.
- Path parameters: `id` as memory ID.
- Request body schema: `MemoryEntryRequestDto`.
- Successful response: `200 MemoryEntryResponseDto`.
- Source: `AdminMemoryController`, `MemoryServiceImpl`; directly verified.
- Important implementation behaviour: if `status` is omitted, `applyPayload` normalizes it to `draft`. Include the intended status in update requests.
- Draft update rule: if the entry is currently `draft`, the caller must hold an active edit lock.

Example request:

```bash
curl -X PUT "<API_BASE_URL>/api/v1/admin/memories/<MEMORY_ID>" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Design Night 2026",
    "slug": "design-night-2026",
    "coverUrl": "<IMAGE_URL>",
    "content": "# Updated content",
    "mediaUrls": ["<IMAGE_URL>"],
    "status": "published"
  }'
```

Example response: `MemoryEntryResponseDto` with updated fields.

Error cases:

- `400`: duplicate slug, unsupported status, missing body.
- `401`, `403`.
- `404`: memory not found.
- `423`: draft not locked by caller or locked by another admin.

#### DELETE `/api/v1/admin/memories/{id}`

- Purpose: delete a memory entry and attempt cleanup of related media URLs.
- Path parameters: `id` as memory ID.
- Request body: none.
- Successful response: `204 No Content`.
- Source: `AdminMemoryController`, `MemoryServiceImpl.deleteMemory`; directly verified.
- Draft delete rule: if the entry is `draft`, the caller must hold an active edit lock.

Example request:

```bash
curl -X DELETE "<API_BASE_URL>/api/v1/admin/memories/<MEMORY_ID>" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

Example response:

```http
HTTP/1.1 204 No Content
```

Error cases:

- `401`, `403`.
- `404`: memory not found.
- `423`: draft lock failure.

#### POST `/api/v1/admin/memories/{id}/lock`

- Purpose: acquire or renew an edit lock for a draft memory entry.
- Path parameters: `id` as memory ID.
- Request body: none.
- Successful response: `200 MemoryEntryResponseDto`.
- Source: `AdminMemoryController`, `MemoryServiceImpl.acquireEditLock`; directly verified.
- Inferred from implementation: non-draft entries return the entry without setting a lock.

Example request:

```bash
curl -X POST "<API_BASE_URL>/api/v1/admin/memories/<MEMORY_ID>/lock" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

Example response:

```json
{
  "id": "<MEMORY_ID>",
  "title": "Design Night 2026",
  "status": "draft",
  "editLockOwnerId": "<USER_ID>",
  "editLockOwnerName": "admin_user",
  "editLockExpiresAt": "2026-05-15T04:33:00"
}
```

Error cases:

- `401`, `403`.
- `404`: memory not found.
- `423`: another admin holds an active lock.

#### DELETE `/api/v1/admin/memories/{id}/lock`

- Purpose: release the caller's active edit lock.
- Path parameters: `id` as memory ID.
- Request body: none.
- Successful response: `204 No Content`.
- Source: `AdminMemoryController`, `MemoryServiceImpl.releaseEditLock`; directly verified.

Example request:

```bash
curl -X DELETE "<API_BASE_URL>/api/v1/admin/memories/<MEMORY_ID>/lock" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

Example response:

```http
HTTP/1.1 204 No Content
```

Error cases:

- `401`, `403`.
- `404`: memory not found.
- `423`: lock is owned by another admin.

#### POST `/api/v1/admin/memories/media`

- Purpose: upload image media for memory content.
- Content-Type: `multipart/form-data`.
- Request body: form field `file`.
- Successful response: `201 MemoryMediaUploadResponseDto`.
- Source: `AdminMemoryController`, `MemoryServiceImpl.uploadMemoryMedia`, `AzureBlobStorageService`; directly verified.

Example request:

```bash
curl -X POST "<API_BASE_URL>/api/v1/admin/memories/media" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -F "file=@memory-image.png"
```

Example response:

```json
{
  "url": "<IMAGE_URL>",
  "path": "<IMAGE_URL>"
}
```

Error cases:

- `400`: missing file or non-image upload.
- `413`: image too large.
- `401`, `403`.
- `502`: Azure Blob access/upload failure.

## 8. Request And Response Models

### Common Models

#### `ApiMessageDto`

| Field | Type | Required | Description | Source |
|---|---|---|---|---|
| `message` | string | Yes | Human-readable operation message. | `common/dto/ApiMessageDto.java` |

#### `ErrorResponseDto`

| Field | Type | Required | Description | Source |
|---|---|---|---|---|
| `timestamp` | instant string | Yes | Error creation time. | `ErrorResponseDto`, `GlobalExceptionHandler` |
| `status` | number | Yes | HTTP status code. | `ErrorResponseDto`, `GlobalExceptionHandler` |
| `error` | string | Yes | HTTP reason or error label. | `ErrorResponseDto`, `GlobalExceptionHandler` |
| `message` | string | Yes | Error detail message. | `ErrorResponseDto`, `GlobalExceptionHandler` |
| `path` | string | Yes | Request URI path. | `ErrorResponseDto`, `GlobalExceptionHandler` |

Example:

```json
{
  "timestamp": "2026-05-15T04:30:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Title is required.",
  "path": "/api/v1/admin/memories"
}
```

### Workshop Models

#### `WorkshopCreateRequestDto`

| Field | Type | Required | Description | Source |
|---|---|---|---|---|
| `hostName` | string | Yes | Host display name. Must not be blank. | DTO validation |
| `title` | string | Yes | Workshop title. Must not be blank. | DTO validation |
| `description` | string | No | Workshop description. | DTO |
| `category` | string | Yes | Category. Must not be blank. | DTO validation |
| `duration` | integer | Yes | Duration in minutes. Must be positive. | DTO validation |
| `date` | date | Yes | Workshop date. | DTO validation |
| `time` | time | Yes | Workshop start time. | DTO validation |
| `attendCloseAt` | date-time | No | Attendance close timestamp. Defaults to one day before start when omitted. | Service inference |
| `isOnline` | boolean | Yes | Whether the workshop is online. | DTO validation |
| `location` | string | No | Location or meeting details. | DTO |
| `maxParticipants` | integer | No | Capacity limit. Must be positive when provided. | DTO validation |
| `contactNumber` | string | Yes | Australian 10-digit number starting with `0`. | DTO validation |
| `materialsProvided` | string | No | Materials provided by host. | DTO |
| `materialsNeededFromClub` | string | No | Materials requested from club. | DTO |
| `venueRequirements` | string | No | Venue requirements. | DTO |
| `otherImportantInfo` | string | No | Additional notes. | DTO |
| `weekNumber` | integer | No | Week number. Must be positive when provided. | DTO validation |
| `memberResponsible` | string | No | Responsible member. | DTO |
| `membersPresent` | string | No | Members present. | DTO |
| `eventSubmitted` | boolean | No | Event submission flag. | DTO |
| `usuApprovalStatus` | string | No | `pending` or `approved`; defaults to `pending`. | Service validation |
| `detailsConfirmed` | boolean | Yes | Must be `true`. | DTO validation |

#### `WorkshopReviewRequestDto`

| Field | Type | Required | Description | Source |
|---|---|---|---|---|
| `comment` | string | No | Optional rejection comment stored as review comment. | DTO/service |

#### `WorkshopResponseDto`

Fields are returned from the DTO and may be omitted when `null`.

| Field | Type | Notes | Source |
|---|---|---|---|
| `id` | string | Workshop ID. | DTO/service |
| `hostName` | string | Host display name. | DTO/service |
| `title` | string | Workshop title. | DTO/service |
| `description` | string | Workshop description. | DTO/service |
| `category` | string | Category. | DTO/service |
| `status` | string | Stored or effective status: examples include `pending`, `approved`, `rejected`, `upcoming`, `ongoing`, `completed`, `cancelled`. | Service inferred |
| `date` | date | Workshop date. | DTO/service |
| `time` | time | Workshop start time. | DTO/service |
| `attendCloseAt` | date-time | Explicit or default attendance close time. | Service inferred |
| `duration` | integer | Duration in minutes. | DTO/service |
| `isOnline` | boolean | Online flag. | DTO/service |
| `location` | string | Location; public summaries may use `Online` or `To be confirmed`. | Service inferred |
| `maxParticipants` | integer | Capacity limit. | DTO/service |
| `currentParticipants` | integer | Participant count. | Service inferred |
| `creditCost` | integer | Currently set to `0` in workshop service. | Service |
| `creditReward` | integer | Currently set to `0` in workshop service. | Service |
| `contactNumber` | string | Sensitive; included for admin/facilitator only. | Service |
| `materialsProvided` | string | Materials provided. | DTO/service |
| `materialsNeededFromClub` | string | Materials requested. | DTO/service |
| `venueRequirements` | string | Venue requirements. | DTO/service |
| `otherImportantInfo` | string | Additional notes. | DTO/service |
| `detailsConfirmed` | boolean | Confirmation flag. | DTO/service |
| `submitterUsername` | string | Submitter username. | DTO/service |
| `submitterEmail` | string | Sensitive; included for admin/facilitator only. | Service |
| `image` | string | Stored workshop image URL. | DTO/service |
| `weekNumber` | integer | Week number. | DTO/service |
| `memberResponsible` | string | Responsible member. | DTO/service |
| `membersPresent` | string | Members present. | DTO/service |
| `eventSubmitted` | boolean | Event submitted flag. | DTO/service |
| `usuApprovalStatus` | string | `pending` or `approved`. | Service |
| `hiddenByHost` | boolean | Host-hidden flag for rejected/cancelled hosted workshops. | Service/entity |
| `facilitator` | `FacilitatorDto` | Facilitator summary. | DTO/service |
| `participants` | `WorkshopParticipantDto[]` | Included in admin/detail contexts when loaded. | Service inferred |
| `createdAt` | date-time | Creation timestamp. | DTO/service |

#### `FacilitatorDto`

| Field | Type | Required | Description | Source |
|---|---|---|---|---|
| `id` | string | Yes | Facilitator user ID. | DTO/service |
| `name` | string | Yes | Facilitator username. | DTO/service |
| `avatar` | string | No | Facilitator avatar URL. | DTO/service |

#### `WorkshopParticipantDto`

| Field | Type | Required | Description | Source |
|---|---|---|---|---|
| `id` | string | Yes | Participant user ID. | DTO/service |
| `username` | string | Yes | Participant username. | DTO/service |
| `avatarUrl` | string | No | Participant avatar URL. | DTO/service |
| `email` | string | No | Participant email. Included when participant DTOs are returned. | DTO/service |

Unused active-code DTOs: `JoinWorkshopRequestDto`, `LeaveWorkshopRequestDto`, and `WorkshopStatusUpdateResponseDto` exist, but no current controller endpoint consumes or returns them.

### User Models

#### `UpdateProfileRequestDto`

| Field | Type | Required | Description | Source |
|---|---|---|---|---|
| `username` | string | No | New username. Blank values rejected if supplied. | Service validation |
| `avatarUrl` | string | No | Direct avatar URL update. | DTO/service |
| `bio` | string | No | Profile bio. | DTO/service |
| `skills` | string[] | No | Replaces the current skill collection when supplied. | Service inferred |

#### `SkillRequestDto`

| Field | Type | Required | Description | Source |
|---|---|---|---|---|
| `skillName` | string | Yes | Skill name, non-blank, max length 100. | DTO validation |
| `skillLevel` | string | No | Skill level, max length 50. Currently stored only when a `UserSkill` is directly created with level; add-skill service does not set it. | DTO/service inferred |

#### `UserProfileDto`

| Field | Type | Notes | Source |
|---|---|---|---|
| `id` | UUID string | Internal local user ID. | DTO/entity |
| `username` | string | Display username. | DTO/entity |
| `email` | string | Email from local user/JWT when available. | DTO/entity |
| `avatarUrl` | string | Avatar URL. | DTO/entity |
| `bio` | string | Profile bio. | DTO/entity |
| `role` | string | Local role such as `member` or `admin`. | DTO/entity |
| `skills` | string[] | Skill names. | DTO/service |
| `creditBalance` | integer | Current profile service returns `0`; add-skill response path may return `100`. | Code inconsistency |
| `totalWorkshopsHosted` | integer | Count from workshop repository. | Service |
| `totalWorkshopsAttended` | integer | Count from participant repository. | Service |
| `rating` | number | Currently defaults to `0.0`; review module not implemented. | Service |
| `reviewCount` | integer | Currently defaults to `0`. | Service |
| `createdAt` | instant string | User creation timestamp. | Entity |
| `updatedAt` | instant string | User update timestamp. | Entity |

### Notification Models

#### `NotificationResponseDto`

| Field | Type | Description | Source |
|---|---|---|---|
| `id` | string | Notification ID. | DTO/service |
| `userId` | string | Recipient user ID. | DTO/service |
| `type` | string | Notification type, for example `workshop_approved`. | Service inferred |
| `title` | string | Notification title. | DTO/service |
| `message` | string | Notification body. | DTO/service |
| `timestamp` | date-time | Creation timestamp. | DTO/service |
| `read` | boolean | Read flag. | DTO/service |
| `workshopId` | string | Optional related workshop ID. | DTO/service |

#### `NotificationCountDto`

| Field | Type | Description | Source |
|---|---|---|---|
| `count` | integer | Unread notification count. | DTO/service |

### Memory Models

#### `MemoryEntryRequestDto`

| Field | Type | Required | Description | Source |
|---|---|---|---|---|
| `title` | string | Required on create | Memory title. | Service validation |
| `slug` | string | No | Slug candidate; normalized and capped at 220 characters. Generated from title when omitted. | Service |
| `coverUrl` | string | No | Cover image URL. | DTO/service |
| `content` | string | No | Markdown/content body. | DTO/service |
| `mediaUrls` | string[] | No | Replaces stored media URL list when supplied. | Service |
| `status` | string | No | `draft`, `published`, or `archived`; defaults to `draft`. | Service |
| `publishedAt` | date-time | No | Publication time; set automatically when publishing without a supplied value. | Service |

Important update behaviour: when updating, omitted `status` is treated as `draft` by the current service implementation.

#### `MemoryEntryResponseDto`

| Field | Type | Description | Source |
|---|---|---|---|
| `id` | string | Memory entry ID. | DTO/service |
| `title` | string | Title. | DTO/service |
| `slug` | string | Public slug. | DTO/service |
| `coverUrl` | string | Cover URL. | DTO/service |
| `content` | string | Content body. | DTO/service |
| `mediaUrls` | string[] | Ordered media URLs. | DTO/service |
| `status` | string | `draft`, `published`, or `archived`. | Service |
| `publishedAt` | date-time | Publication time. | DTO/service |
| `createdAt` | date-time | Creation timestamp. | Entity/service |
| `updatedAt` | date-time | Update timestamp. | Entity/service |
| `createdBy` | string | Creator user ID. | Service |
| `updatedBy` | string | Last updater user ID. | Service |
| `editLockOwnerId` | string | Active lock owner user ID when lock is active. | Service |
| `editLockOwnerName` | string | Active lock owner username when lock is active. | Service |
| `editLockExpiresAt` | date-time | Active lock expiry time. | Service |

#### `MemoryMediaUploadResponseDto`

| Field | Type | Description | Source |
|---|---|---|---|
| `url` | string | Uploaded media URL. | Controller/service |
| `path` | string | Currently the same uploaded media URL. | Controller |

## 9. Error Handling

Global application error handling is implemented in `GlobalExceptionHandler`.

| Error source | Status | Error body |
|---|---|---|
| `ResourceNotFoundException` | `404` | `ErrorResponseDto` |
| `AccessDeniedException` | `403` | `ErrorResponseDto` |
| `DomainException` | `400` | `ErrorResponseDto` |
| Bean Validation `MethodArgumentNotValidException` | `400` | `ErrorResponseDto` with first validation message |
| `ResponseStatusException` | Status from exception | `ErrorResponseDto` |
| Multipart upload too large | `413` | `ErrorResponseDto` |
| Invalid multipart request | `400` | `ErrorResponseDto` |
| Data integrity violation | `409` | `ErrorResponseDto` |
| Missing static resource | `404` | `ErrorResponseDto` |
| Unhandled exception | `500` | `ErrorResponseDto` |

Security caveat: missing/invalid JWT failures handled directly by Spring Security may not follow `ErrorResponseDto`, because no custom authentication entry point was found.

Known status codes used by service/controller logic:

- `200 OK`: most successful reads and updates.
- `201 Created`: workshop creation, skill add, memory create, memory media upload.
- `204 No Content`: health check, memory delete, memory lock release.
- `400 Bad Request`: validation and business rule failures.
- `401 Unauthorized`: missing login for protected controller/service actions.
- `403 Forbidden`: admin/ownership/email verification failures.
- `404 Not Found`: missing resources or restricted workshop details.
- `409 Conflict`: data integrity violation.
- `413 Payload Too Large`: oversized upload.
- `423 Locked`: memory edit lock conflict.
- `502 Bad Gateway`: storage provider access/upload/delete failures.

## 10. Validation Rules

### Backend Bean Validation

| DTO | Rules |
|---|---|
| `WorkshopCreateRequestDto` | `hostName`, `title`, `category`, `contactNumber` non-blank; `duration`, `date`, `time`, `isOnline`, `detailsConfirmed` required; `duration`, `maxParticipants`, `weekNumber` positive when provided; `contactNumber` must match `^0\d{9}$`; `detailsConfirmed` must be true. |
| `SkillRequestDto` | `skillName` non-blank and max 100 chars; `skillLevel` max 50 chars. |

### Backend Service-Level Validation

| Area | Rules |
|---|---|
| Workshop creation/update | `usuApprovalStatus` must be `pending` or `approved`; attendance close defaults to one day before start if omitted. |
| Workshop visibility | `pending` and `rejected` details are visible only to admin or facilitator. |
| Workshop admin update | Completed/cancelled/started workshops cannot be edited. |
| Workshop approval/rejection | Only `pending` workshops can be approved or rejected. |
| Workshop cancellation | Completed/cancelled/started workshops cannot be cancelled. |
| Workshop attendance | Join requires effective status `upcoming`, capacity availability, attendance still open, and no duplicate participation. |
| Host hide | Only host can hide, and only rejected/cancelled workshops can be hidden. |
| Profile update | Blank supplied username is rejected. Skills are normalized and blank skill names are rejected. |
| Avatar upload | File required; content type must be one of PNG/JPG/JPEG/WEBP/GIF/SVG; size must be within configured max. |
| Workshop image upload | File required; content type must start with `image/`; size must be within configured max. |
| Memory create/update | Request body required; title required on create; slug is normalized and must be unique; status must be `draft`, `published`, or `archived`. |
| Memory edit locks | Draft update/delete requires active lock ownership; lock conflicts return `423 Locked`. |
| Memory media upload | File required; content type must start with `image/`; size must be within configured max. |

Frontend validation also exists for create workshop, admin review, profile, and memory flows, but backend validation is the source of truth for API consumers.

## 11. File Upload And Media API Behaviour

Verified upload endpoints:

| Endpoint | Auth | Role | Format | Field | Storage path pattern | Response |
|---|---|---|---|---|---|---|
| `POST /api/v1/users/me/avatar` | Required | Current user | `multipart/form-data` | `file` | `avatars/<USER_ID>/<generated-file>` | `UserProfileDto` |
| `POST /api/v1/admin/workshops/{id}/image` | Required | Admin | `multipart/form-data` | `file` | `workshops/<WORKSHOP_ID>/<generated-file>` | `WorkshopResponseDto` |
| `POST /api/v1/admin/memories/media` | Required | Admin | `multipart/form-data` | `file` | `memory/<generated-file>` | `MemoryMediaUploadResponseDto` |

Storage behaviour:

- Active uploads use `AzureBlobStorageService.uploadImage(...)`.
- The storage service creates the configured container if needed.
- The returned URL may be a plain blob URL or a read-only SAS URL depending on configuration.
- Avatar and workshop image uploads attempt to delete the previous Azure/Supabase URL after successful replacement.
- Memory deletion attempts to clean up cover, media list, and image URLs found in content.
- `SupabaseStorageService` remains in code for cleanup compatibility with older URLs.

Restrictions:

- Default application-level image limit is 10 MB through `app.upload.max-image-bytes`.
- Servlet multipart limits are configured separately.
- Avatar upload accepts only explicit image content types: PNG, JPG/JPEG, WEBP, GIF, SVG.
- Workshop and memory media upload accept content types that start with `image/`.
- No image dimension validation, malware scanning, or content moderation was found.

## 12. Admin API Behaviour

Admin access is enforced by backend authority checks. The frontend may hide admin navigation, but backend checks are authoritative.

Admin authority source:

1. JWT is validated by Spring Security.
2. `JwtConverter` looks up the local user by JWT subject.
3. Local `user_account.role` is normalized.
4. `admin` or `role_admin` maps to `ROLE_ADMIN`.

Admin workshop operations:

- List all workshops and pending workshops.
- View detailed workshop data and participant details when called as an admin. Admin enforcement on `GET /api/v1/admin/workshops/{id}` requires verification because the current service path does not call `requireAdmin`.
- Update editable workshop fields.
- Approve or reject pending workshops.
- Cancel eligible workshops before start.
- Upload workshop images.
- Delete workshops through a backend endpoint.

Admin memory operations:

- List all memory entries.
- Create, update, publish, archive, or move entries to draft through the `status` field.
- Delete entries.
- Acquire/release draft edit locks.
- Upload memory media.

Requires verification:

- No admin user-management API or UI was found.
- No admin role provisioning API was found.
- No admin audit log API was found.
- Workshop delete exists in the backend but a complete admin UI workflow was not verified.

## 13. Frontend Integration Notes

The frontend uses:

- `VITE_API_BASE_URL` as the API base URL.
- `apiCall<T>()` in `skill-swap-frontend/src/lib/api.ts` for most requests.
- `Authorization: Bearer <JWT_TOKEN>` when a Clerk token is available.
- JSON `Content-Type` for non-`FormData` requests.
- `FormData` without forcing JSON headers for uploads.
- Feature service modules under `skill-swap-frontend/src/shared/service/**`.

Frontend endpoints cross-checked against backend:

| Frontend service usage | Backend status |
|---|---|
| Workshop public/list/detail/create/join/leave/hide/request approval | Implemented |
| Admin workshop list/detail/update/upload/approve/reject/cancel | Implemented |
| Current profile/profile update/avatar upload | Implemented |
| User by ID without token | Endpoint implemented, but frontend auth usage requires verification because backend security requires authentication. |
| Notifications list/count/read/read-all | Implemented |
| Public memory list/detail | Implemented |
| Admin memory CRUD/lock/media upload | Implemented |
| Transaction API | Frontend throws not implemented; no backend transaction endpoints found. |
| Feedback/reviews | No backend API found. |

Do not hard-code production API URLs in client code or documentation. Use `<API_BASE_URL>` and environment variables.

## 14. Security Considerations

Verified controls:

- JWT bearer authentication for protected APIs.
- Stateless Spring Security session policy.
- Role-based admin authority derived from local database role mapping.
- Service-level ownership checks for host-only workshop actions and notification recipient scoping.
- Sensitive workshop fields are omitted unless caller is admin or facilitator.
- CORS configuration uses explicit allowed origins, allows `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, and `OPTIONS`, allows credentials, accepts all request headers, and exposes `Authorization` and `Content-Type`.
- File upload endpoints validate file presence, content type, and size before storage.
- Global exception handler avoids returning stack traces for unhandled production-style errors.

Security caveats:

- No custom Spring Security JSON error body was found for authentication failures.
- No rate limiting was found.
- No CSRF protection is enabled; this is consistent with stateless bearer-token APIs, but clients should still handle tokens carefully.
- No file scanning or image dimension validation was found.
- CORS origins include local development and configured deployed frontend origins in code; this document intentionally does not list real deployed URLs.
- HTTPS/TLS is an operational deployment assumption from documentation, not enforced by controller code.

## 15. Known Limitations And Future Improvements

Current implementation limitations:

- No formal OpenAPI/Swagger specification was found.
- No backend pagination/filtering/sorting query convention was found for list endpoints.
- Frontend search/filtering appears to be client-side.
- Error format is mostly consistent for application exceptions, but Spring Security authentication failures may differ.
- `GET /api/v1/users/{id}` has a controller comment/frontend usage mismatch with active security rules.
- `GET /api/v1/admin/workshops/{id}` is admin-intended by path/frontend usage but does not currently enforce `requireAdmin` in the service path.
- `UserProfileDto.fromEntity(...)` and `UserService.getUserProfileWithStats(...)` return inconsistent `creditBalance` defaults.
- Memory update defaults omitted `status` to `draft`, which can surprise API consumers.
- Workshop delete is implemented but operational/UI usage requires verification.
- No admin user management, audit log, feedback/review, or transaction endpoints were found.
- File upload validation is limited to content type and size.
- API versioning exists only as `/api/v1`; no deprecation or compatibility policy was found.

Recommended future improvements:

- Generate and maintain an OpenAPI spec from controllers/DTOs.
- Add API contract/integration tests for security, admin workflows, uploads, memory locks, and error bodies.
- Add pagination/filtering to large list endpoints.
- Standardize all success and error response envelopes where useful.
- Resolve the public/private contract for `GET /api/v1/users/{id}`.
- Add explicit admin enforcement to `GET /api/v1/admin/workshops/{id}` or move clients to the normal detail endpoint if that behaviour is intentional.
- Fix the inconsistent profile credit balance mapping or remove credit fields if disabled.
- Consider a safer HTTP method/body design for skill deletion if API compatibility allows it.
- Document admin provisioning and role-remapping as an operational process.

## 16. Verification Notes

Directly verified from backend controllers:

- All endpoint paths, HTTP methods, request body bindings, upload `consumes` values, and explicit success statuses.

Directly verified from DTOs:

- Request and response field names for workshops, users, notifications, memories, common messages, upload responses, and error responses.
- Bean Validation annotations for workshop create/update and skill requests.

Directly verified from services:

- Admin checks, host checks, notification scoping, workshop lifecycle rules, participant rules, memory statuses, edit lock behaviour, upload validation, Azure Blob upload paths, and sensitive workshop field omission.

Directly verified from security/config:

- Public route allowlist, protected `/api/**` rule, stateless session policy, JWT decoder configuration, CORS configuration, and admin authority mapping from local roles.

Directly verified from frontend service layer:

- Actual frontend calls to workshop, admin workshop, user, notification, memory, admin memory, and upload endpoints.
- `VITE_API_BASE_URL` usage and bearer token/header handling.
- Frontend transaction API is intentionally not implemented.

Inferred from implementation:

- Date/time JSON formatting based on Java time DTO types and Jackson defaults.
- Effective workshop status behaviour derived from service logic.
- Notification type examples derived from service-created notification types.
- Media URL public/private access depends on Azure Blob/SAS configuration.

Requires further verification:

- Live production API base URL and currently deployed configuration.
- Exact active identity provider settings and enabled Clerk sign-in methods.
- Exact production CORS origin list and storage container binding.
- Active database schema and migration application status.
- Whether `GET /api/v1/users/{id}` should be public or protected.
- Whether `GET /api/v1/admin/workshops/{id}` should enforce admin-only access.
- Whether workshop deletion should be exposed in admin UI or restricted to technical maintenance.
