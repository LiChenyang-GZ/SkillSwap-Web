# ADR-001: Use Clerk for Authentication

## Status
Accepted

## Date
2026-05-15

## Context
SkillSwap needs authentication for member workflows, profile management, workshop participation, admin review, notifications, and media uploads. The frontend is a React/Vite SPA and the backend is a Spring Boot REST API, so the system needs browser-side session handling and backend-side bearer token validation.

The project is a small-scale portfolio/student project, so implementing and operating a complete password, OAuth, token, and session system would add significant security and maintenance burden. Existing documentation also states that older local `/dev` login and local HS256 JWT flows have been removed.

Current implementation evidence:

- The frontend initializes `ClerkProvider` and requires `VITE_CLERK_PUBLISHABLE_KEY`.
- The frontend retrieves Clerk tokens and sends `Authorization: Bearer <JWT_TOKEN>` to protected APIs.
- The backend uses Spring Security OAuth2 Resource Server with issuer/JWKS JWT validation.
- Current backend properties use Clerk issuer/JWKS placeholders and RS256.
- The backend maps JWT `sub` values to local `user_account.auth_subject` records and derives admin authority from local database roles.

## Decision
We decided to use Clerk as the managed authentication provider for SkillSwap.

Clerk handles user sign-in, sign-up, OAuth-related flows, browser session management, and JWT issuance. The Spring Boot backend validates Clerk-issued JWTs using issuer/JWKS configuration and keeps application authorization decisions in the local database.

## Rationale
- Clerk reduces the security implementation burden for password storage, session handling, OAuth integration, and token issuance.
- The Clerk React SDK fits the existing React/Vite frontend.
- JWT/JWKS validation fits the existing Spring Security OAuth2 Resource Server setup.
- Stateless bearer-token API authentication aligns with the decoupled frontend/backend architecture.
- Local database role mapping keeps SkillSwap-specific admin authorization under backend control rather than relying only on frontend state.
- Managed authentication is appropriate for the current project scale and avoids spending portfolio time on high-risk custom identity infrastructure.

## Alternatives Considered
- Self-hosted JWT/password authentication
  - Why considered: It would give full control over users, password storage, token generation, refresh flows, and session policy.
  - Why not selected: It would require implementing and maintaining password hashing, OAuth, token rotation, account recovery, and security hardening. Existing docs explicitly deprecate local/dev JWT auth flows.
  - Source status: Explicitly documented comparison and deprecated historical implementation.

- Supabase Auth
  - Why considered: Supabase-related profiles and older auth/storage references remain in the repository, and Supabase can provide managed auth and PostgreSQL integration.
  - Why not selected: Current documentation and implementation identify Clerk as the active auth provider. Supabase remains only as a historical/compatibility context in the inspected code and docs.
  - Source status: Reasonable inferred alternative based on repository history and retained Supabase-related code/configuration.

- Firebase Auth
  - Why considered: Managed authentication with common OAuth support and frontend SDKs.
  - Why not selected: It would introduce another platform and token verification model without clear benefit over the already integrated Clerk/JWKS flow.
  - Source status: Reasonable inferred alternative.

- Auth0
  - Why considered: Mature managed identity provider with OAuth/OIDC features.
  - Why not selected: It would add configuration and possible cost/complexity that is not needed for the current project scale.
  - Source status: Reasonable inferred alternative.

## Consequences
### Positive Consequences
- Authentication, OAuth, JWT issuance, and session management are delegated to a managed provider.
- The backend can validate tokens without storing web sessions.
- Frontend sign-in integration is simpler than building custom auth screens and flows.
- Application-specific roles remain in PostgreSQL and are enforced by the backend.

### Negative Consequences / Trade-offs
- SkillSwap depends on Clerk availability, configuration, and pricing.
- Development and production Clerk instances can issue different user IDs, so `auth_subject` mappings may need operational care.
- The frontend token template and enabled OAuth providers are configured outside the repository and require dashboard verification.
- Production must explicitly configure matching Clerk frontend and backend values; falling back to development issuer/JWKS values would be unsafe.
- `CLERK_SECRET_KEY` is present in deployment configuration, but direct backend service usage was not identified during the repository review.

### Future Considerations
- Add startup validation that fails production startup if Clerk issuer/JWKS values are missing or point to development settings.
- Document admin provisioning and `auth_subject` remapping as an operational process.
- Add integration tests for Clerk JWT validation and protected API access.
- Revisit provider choice only if product, compliance, pricing, or user-management needs outgrow Clerk.

## Related Documentation
- `docs/Project-Overview.md`
- `docs/03-architecture/System-Architecture.md`
- `docs/03-architecture/Security-Design.md`
- `docs/03-architecture/Database-Design.md`
- `docs/04-api/API-Documentation.md`
- `docs/05-development/Local-Development-Guide.md`
- `docs/06-operations/Deployment-Runbook.md`
- `docs/06-operations/Troubleshooting-Guide.md`
- `doc/cloud/SkillSwap-Cloud-Deployment.md`
- `doc/DEV_AUTH_IMPLEMENTATION.md`
- `doc/DEV_LOGIN_IMPLEMENTATION.md`
- `skill-swap-frontend/src/main.tsx`
- `skill-swap-frontend/src/contexts/AppContext.tsx`
- `skill-swap-backend/src/main/java/club/skillswap/common/config/WebSecurityConfiguration.java`
- `skill-swap-backend/src/main/java/club/skillswap/common/config/JwtConverter.java`
- `skill-swap-backend/src/main/resources/application.properties`
