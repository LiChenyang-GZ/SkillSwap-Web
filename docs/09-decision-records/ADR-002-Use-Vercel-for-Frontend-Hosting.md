# ADR-002: Use Vercel for Frontend Hosting

## Status
Accepted

## Date
2026-05-15

## Context
SkillSwap's frontend is a React 18, TypeScript, and Vite single-page application. It needs static hosting, SPA fallback routing, HTTPS, build-time environment variables, and simple deployment from the Git repository.

Existing cloud documentation describes the frontend as deployed through Vercel's Git integration. Repository evidence supports a Vercel SPA deployment model:

- `skill-swap-frontend/package.json` builds the frontend with `vite build`.
- `skill-swap-frontend/vite.config.ts` sets the production output directory to `build`.
- `skill-swap-frontend/vercel.json` routes unmatched paths to `/index.html` for direct SPA route refreshes.
- The frontend reads public build-time configuration through `VITE_*` variables such as `VITE_API_BASE_URL` and `VITE_CLERK_PUBLISHABLE_KEY`.

No frontend GitHub Actions deployment workflow was found in the repository, so the current frontend deployment process relies on the documented Vercel project configuration.

## Decision
We decided to use Vercel to host the SkillSwap React frontend.

Vercel serves the static SPA, provides HTTPS, handles Git-based deployments, and supports the environment variables required by the frontend build.

## Rationale
- Vercel is well suited to Vite/React static frontend hosting.
- It provides automatic HTTPS and CDN/edge delivery without operating a web server for static files.
- Git-based deployment keeps frontend releases simple for a small project.
- It separates frontend hosting from the backend VM, allowing frontend and backend deployments to move independently.
- `vercel.json` already implements SPA fallback routing required for browser refreshes on client-side routes.
- The operational model is appropriate for a portfolio/student project where minimizing infrastructure maintenance matters.

## Alternatives Considered
- Azure Static Web Apps
  - Why considered: It would keep frontend hosting in Azure alongside the backend, database, and blob storage.
  - Why not selected: The existing project is already documented around Vercel and includes Vercel-specific routing configuration. Moving would add migration work without a demonstrated project need.
  - Source status: Reasonable inferred alternative.

- Netlify
  - Why considered: It provides similar static hosting, CDN, HTTPS, and Git-based deployment for React SPAs.
  - Why not selected: The current documentation and repository configuration use Vercel. Netlify would be a lateral move rather than a simplification.
  - Source status: Reasonable inferred alternative.

- Hosting the frontend on the Azure VM
  - Why considered: Nginx already exists in the documented backend deployment and could serve static files.
  - Why not selected: It would couple frontend delivery to the backend VM, increase VM/Nginx maintenance, and remove the simplicity of managed static hosting.
  - Source status: Reasonable inferred alternative.

- S3 and CloudFront
  - Why considered: Static hosting plus CDN is a common SPA deployment pattern.
  - Why not selected: It would introduce AWS-specific configuration into a project already using Vercel and Azure.
  - Source status: Reasonable inferred alternative.

## Consequences
### Positive Consequences
- Static frontend delivery is handled by a managed platform.
- HTTPS and SPA fallback routing are simple to configure.
- Frontend deployments can be triggered through Git integration without maintaining a frontend deployment workflow in this repository.
- Frontend hosting scales separately from the Spring Boot backend.

### Negative Consequences / Trade-offs
- Live Vercel project settings, environment variables, and deployment history cannot be fully verified from the repository.
- Frontend and backend deployment environments are separate, so API base URL, CORS, and Clerk settings must remain aligned.
- `VITE_*` variables are browser-visible and must not contain backend secrets.
- Changing Vercel environment variables requires a new frontend deployment to update the built SPA.
- The repository still contains an older `npm run deploy` script that references older static deployment assumptions and should not be treated as the production path without verification.

### Future Considerations
- Add a redacted frontend `.env.example` documenting only browser-safe variables.
- Keep Vercel build command and output directory aligned with `package.json` and `vite.config.ts`.
- Add frontend build verification in CI if frontend release confidence becomes important.
- Reevaluate hosting only if the project needs a consolidated Azure-only deployment or a different frontend release workflow.

## Related Documentation
- `docs/Project-Overview.md`
- `docs/03-architecture/System-Architecture.md`
- `docs/03-architecture/Security-Design.md`
- `docs/05-development/Local-Development-Guide.md`
- `docs/06-operations/Deployment-Runbook.md`
- `docs/06-operations/Troubleshooting-Guide.md`
- `doc/cloud/SkillSwap-Cloud-Deployment.md`
- `doc/cloud/SkillSwap-README-Deployment.md`
- `skill-swap-frontend/package.json`
- `skill-swap-frontend/vite.config.ts`
- `skill-swap-frontend/vercel.json`
- `skill-swap-frontend/src/lib/api.ts`
