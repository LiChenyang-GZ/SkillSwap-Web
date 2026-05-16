# ADR-005: Use Azure Blob Storage for Media

## Status
Accepted

## Date
2026-05-15

## Context
SkillSwap supports uploaded media for user avatars, workshop images, and memory media. These uploads should persist across backend container restarts and redeployments, and they should not consume the limited VM disk used for application runtime.

Repository and documentation evidence:

- `AzureBlobStorageService` is the active upload implementation.
- User avatar, admin workshop image, and admin memory media flows call Azure Blob Storage upload methods.
- PostgreSQL stores media URL references rather than binary file contents.
- The backend can return plain blob URLs or read-only SAS URLs depending on configuration.
- `SupabaseStorageService` remains in the codebase for cleanup compatibility with older URLs.
- Existing docs note a mismatch: deployment docs/workflow mention `AZURE_STORAGE_MEMORIES_CONTAINER`, while backend properties read `AZURE_STORAGE_MEDIA_CONTAINER`.

## Decision
We decided to use Azure Blob Storage for uploaded SkillSwap media.

The backend uploads media to Blob Storage, stores returned URLs in PostgreSQL, and returns those URLs to the frontend for display.

## Rationale
- Object storage separates uploaded media from the backend VM and container filesystem.
- Media can persist across application redeployments and container replacement.
- Azure Blob Storage aligns with the existing Azure deployment architecture.
- The Azure Storage SDK is already integrated in the Spring Boot backend.
- Direct media URLs avoid proxying every image through the application server.
- The approach is suitable for current project scale and avoids building a custom file server.

## Alternatives Considered
- VM local disk
  - Why considered: It is simple to write files to the server where the backend runs.
  - Why not selected: Files could be lost or orphaned during container replacement, VM changes, or disk cleanup, and uploads could exhaust limited VM storage.
  - Source status: Explicitly documented comparison.

- Database BLOB storage
  - Why considered: It would keep media and metadata in one persistence system.
  - Why not selected: It would bloat the relational database, complicate backups, and make media delivery less efficient than object storage.
  - Source status: Reasonable inferred alternative.

- Supabase Storage
  - Why considered: Supabase storage code remains for compatibility and cleanup of older public URLs.
  - Why not selected: Current documentation and active upload code identify Azure Blob Storage as the media target.
  - Source status: Reasonable inferred alternative based on repository history and retained compatibility service.

- AWS S3
  - Why considered: It is a common object storage service.
  - Why not selected: It would introduce another cloud provider into an architecture already using Azure for backend resources.
  - Source status: Reasonable inferred alternative.

- Firebase Storage or Cloudinary
  - Why considered: Both can handle hosted media storage and delivery.
  - Why not selected: They would add another vendor and configuration model without clear benefit for the current deployment.
  - Source status: Reasonable inferred alternative.

## Consequences
### Positive Consequences
- Uploaded media is not tied to the application container lifecycle.
- The backend can create the configured container if needed and upload through the Azure SDK.
- Database records only need to store URLs/references.
- Media can be served directly from storage URLs when the access model permits it.

### Negative Consequences / Trade-offs
- Storage credentials must be protected and injected through environment variables or secret stores.
- Public-read blob access, if enabled, means anyone with a media URL can read the object.
- The active public/private access model and SAS usage require live environment verification.
- The container environment variable mismatch can cause uploads to target an unexpected default or container if not corrected.
- No malware scanning, content moderation, lifecycle policy, or formal media retention process was found.

### Future Considerations
- Align `AZURE_STORAGE_MEDIA_CONTAINER` and `AZURE_STORAGE_MEMORIES_CONTAINER` across code, workflow, and docs.
- Use private containers and short-lived signed URLs for non-public media.
- Add stronger upload validation, MIME detection, file extension normalization, and malware scanning if uploads become broader.
- Document media retention, cleanup, and orphaned-object handling.
- Consider a CDN only if media volume or latency needs justify it.

## Related Documentation
- `docs/Project-Overview.md`
- `docs/03-architecture/System-Architecture.md`
- `docs/03-architecture/Database-Design.md`
- `docs/03-architecture/Security-Design.md`
- `docs/04-api/API-Documentation.md`
- `docs/05-development/Local-Development-Guide.md`
- `docs/06-operations/Deployment-Runbook.md`
- `docs/06-operations/Troubleshooting-Guide.md`
- `doc/cloud/SkillSwap-Cloud-Deployment.md`
- `.github/workflows/deploy.yml`
- `skill-swap-backend/src/main/java/club/skillswap/common/storage/AzureBlobStorageService.java`
- `skill-swap-backend/src/main/java/club/skillswap/common/storage/SupabaseStorageService.java`
- `skill-swap-backend/src/main/resources/application.properties`
