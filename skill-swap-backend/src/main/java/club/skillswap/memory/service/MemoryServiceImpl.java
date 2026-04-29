package club.skillswap.memory.service;

import club.skillswap.common.exception.ResourceNotFoundException;
import club.skillswap.common.storage.AzureBlobStorageService;
import club.skillswap.common.storage.SupabaseStorageService;
import club.skillswap.memory.dto.MemoryEntryRequestDto;
import club.skillswap.memory.dto.MemoryEntryResponseDto;
import club.skillswap.memory.entity.MemoryEntry;
import club.skillswap.memory.entity.MemoryMedia;
import club.skillswap.memory.repository.MemoryEntryRepository;
import club.skillswap.user.entity.UserAccount;
import club.skillswap.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class MemoryServiceImpl implements MemoryService {

    private static final String STATUS_DRAFT = "draft";
    private static final String STATUS_PUBLISHED = "published";
    private static final String STATUS_ARCHIVED = "archived";
    private static final int MAX_SLUG_LENGTH = 220;
    private static final long DEFAULT_MAX_IMAGE_BYTES = 10L * 1024L * 1024L;
    private static final long DEFAULT_EDIT_LOCK_SECONDS = 180L;
    private static final Pattern MARKDOWN_IMAGE_PATTERN = Pattern.compile("!\\[[^\\]]*\\]\\(([^)]+)\\)");
    private static final Pattern RAW_URL_PATTERN = Pattern.compile("https?://[^\\s)]+", Pattern.CASE_INSENSITIVE);
    private static final Pattern MEDIA_FILE_PATTERN = Pattern.compile(".*\\.(png|jpg|jpeg|gif|webp|svg|mp4|mov|webm)(\\?.*)?$", Pattern.CASE_INSENSITIVE);

    private final MemoryEntryRepository memoryEntryRepository;
    private final UserService userService;
    private final AzureBlobStorageService azureBlobStorageService;
    private final SupabaseStorageService supabaseStorageService;

    @Value("${app.upload.max-image-bytes:" + DEFAULT_MAX_IMAGE_BYTES + "}")
    private long maxImageBytes;

    @Value("${app.memory.edit-lock-seconds:" + DEFAULT_EDIT_LOCK_SECONDS + "}")
    private long editLockSeconds;

    @Override
    @Transactional(readOnly = true)
    public List<MemoryEntryResponseDto> listPublicMemories() {
        return memoryEntryRepository.findByStatusOrderByPublishedAtDescCreatedAtDesc(STATUS_PUBLISHED)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public MemoryEntryResponseDto getPublicMemoryBySlug(String slug) {
        String normalizedSlug = normalizeSlug(slug);
        MemoryEntry entry = memoryEntryRepository.findBySlugAndStatus(normalizedSlug, STATUS_PUBLISHED)
                .orElseThrow(() -> new ResourceNotFoundException("Memory not found."));
        return toResponse(entry);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MemoryEntryResponseDto> listAdminMemories(Authentication authentication) {
        requireAdmin(authentication);
        return memoryEntryRepository.findAllByOrderByUpdatedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public MemoryEntryResponseDto createMemory(MemoryEntryRequestDto requestDto, Authentication authentication) {
        UserAccount actor = requireAdminAndResolveActor(authentication);

        MemoryEntry entry = new MemoryEntry();
        applyPayload(entry, requestDto, true);
        entry.setCreatedBy(actor);
        entry.setUpdatedBy(actor);

        MemoryEntry saved = memoryEntryRepository.save(entry);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public MemoryEntryResponseDto updateMemory(Long id, MemoryEntryRequestDto requestDto, Authentication authentication) {
        UserAccount actor = requireAdminAndResolveActor(authentication);

        MemoryEntry entry = memoryEntryRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Memory not found with ID: " + id));

        if (STATUS_DRAFT.equals(entry.getStatus())) {
            requireActiveEditLockOwner(entry, actor, true);
        }

        applyPayload(entry, requestDto, false);
        entry.setUpdatedBy(actor);

        if (!STATUS_DRAFT.equals(entry.getStatus())) {
            clearEditLock(entry);
        }

        MemoryEntry saved = memoryEntryRepository.save(entry);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void deleteMemory(Long id, Authentication authentication) {
        UserAccount actor = requireAdminAndResolveActor(authentication);

        MemoryEntry entry = memoryEntryRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Memory not found with ID: " + id));

        if (STATUS_DRAFT.equals(entry.getStatus())) {
            requireActiveEditLockOwner(entry, actor, false);
        }

        Set<String> mediaUrlsToDelete = collectMediaUrlsForCleanup(entry);
        memoryEntryRepository.delete(entry);
        deleteStorageObjects(mediaUrlsToDelete);
    }

    @Override
    @Transactional
    public MemoryEntryResponseDto acquireEditLock(Long id, Authentication authentication) {
        UserAccount actor = requireAdminAndResolveActor(authentication);
        MemoryEntry entry = memoryEntryRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Memory not found with ID: " + id));

        if (!STATUS_DRAFT.equals(entry.getStatus())) {
            return toResponse(entry);
        }

        LocalDateTime now = LocalDateTime.now();
        if (isLockActive(entry, now) && !isLockOwnedBy(entry, actor)) {
            String owner = resolveLockOwnerLabel(entry);
            throw new ResponseStatusException(
                    HttpStatus.LOCKED,
                    "This memory is currently being edited by " + owner + "."
            );
        }

        setLock(entry, actor, now);
        MemoryEntry saved = memoryEntryRepository.save(entry);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void releaseEditLock(Long id, Authentication authentication) {
        UserAccount actor = requireAdminAndResolveActor(authentication);
        MemoryEntry entry = memoryEntryRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Memory not found with ID: " + id));

        LocalDateTime now = LocalDateTime.now();
        if (!isLockActive(entry, now)) {
            clearEditLock(entry);
            memoryEntryRepository.save(entry);
            return;
        }

        if (!isLockOwnedBy(entry, actor)) {
            String owner = resolveLockOwnerLabel(entry);
            throw new ResponseStatusException(
                    HttpStatus.LOCKED,
                    "This memory lock is owned by " + owner + "."
            );
        }

        clearEditLock(entry);
        memoryEntryRepository.save(entry);
    }

    @Override
    public String uploadMemoryMedia(MultipartFile file, Authentication authentication) {
        requireAdmin(authentication);

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image file is required.");
        }

        String contentType = trimToNull(file.getContentType());
        if (contentType == null || !contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only image uploads are supported.");
        }

        if (file.getSize() > maxImageBytes) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Image is too large.");
        }

        String extension = resolveFileExtension(file.getOriginalFilename(), contentType);
        String fileName = UUID.randomUUID() + extension;
        String objectPath = "memory/" + fileName;
        return azureBlobStorageService.uploadImage(file, objectPath);
    }

    private void applyPayload(MemoryEntry entry, MemoryEntryRequestDto requestDto, boolean createMode) {
        if (requestDto == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required.");
        }

        String title = trimToNull(requestDto.title());
        if (createMode && title == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title is required.");
        }
        if (title != null) {
            entry.setTitle(title);
        }

        String candidateSlug = trimToNull(requestDto.slug());
        if (candidateSlug != null) {
            candidateSlug = slugify(candidateSlug);
        }
        if (candidateSlug == null) {
            candidateSlug = slugify(createMode ? title : Objects.requireNonNullElse(entry.getTitle(), title));
        }
        if (candidateSlug == null || candidateSlug.isBlank()) {
            candidateSlug = "memory-" + System.currentTimeMillis();
        }
        candidateSlug = normalizeSlug(candidateSlug);

        if (createMode) {
            if (memoryEntryRepository.existsBySlug(candidateSlug)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Slug already exists.");
            }
        } else if (memoryEntryRepository.existsBySlugAndIdNot(candidateSlug, entry.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Slug already exists.");
        }
        entry.setSlug(candidateSlug);

        if (requestDto.coverUrl() != null || createMode) {
            entry.setCoverUrl(trimToNull(requestDto.coverUrl()));
        }
        if (requestDto.content() != null || createMode) {
            entry.setContent(trimToNull(requestDto.content()));
        }

        if (requestDto.mediaUrls() != null) {
            replaceMedia(entry, requestDto.mediaUrls());
        }

        String normalizedStatus = normalizeStatus(requestDto.status());
        entry.setStatus(normalizedStatus);

        if (STATUS_PUBLISHED.equals(normalizedStatus)) {
            if (requestDto.publishedAt() != null) {
                entry.setPublishedAt(requestDto.publishedAt());
            } else if (entry.getPublishedAt() == null) {
                entry.setPublishedAt(LocalDateTime.now());
            }
        }
    }

    private void replaceMedia(MemoryEntry entry, List<String> urls) {
        entry.getMedia().clear();
        if (urls == null || urls.isEmpty()) {
            return;
        }

        List<String> sanitized = urls.stream()
                .map(this::trimToNull)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        for (int i = 0; i < sanitized.size(); i++) {
            MemoryMedia media = new MemoryMedia();
            media.setEntry(entry);
            media.setMediaUrl(sanitized.get(i));
            media.setSortOrder(i);
            entry.getMedia().add(media);
        }
    }

    private String normalizeStatus(String status) {
        String normalized = trimToNull(status);
        if (normalized == null) {
            return STATUS_DRAFT;
        }

        String lower = normalized.toLowerCase(Locale.ROOT);
        if (!STATUS_DRAFT.equals(lower) && !STATUS_PUBLISHED.equals(lower) && !STATUS_ARCHIVED.equals(lower)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported status: " + status);
        }
        return lower;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeSlug(String value) {
        if (value == null) {
            return "";
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        if (normalized.length() > MAX_SLUG_LENGTH) {
            normalized = normalized.substring(0, MAX_SLUG_LENGTH);
        }
        normalized = normalized.replaceAll("(^-|-$)", "");
        return normalized;
    }

    private String slugify(String input) {
        if (input == null || input.isBlank()) {
            return null;
        }
        String slug = input.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        return slug.isBlank() ? null : slug;
    }

    private String resolveFileExtension(String originalFilename, String contentType) {
        String fallback = switch (contentType.toLowerCase(Locale.ROOT)) {
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            case "image/gif" -> ".gif";
            case "image/webp" -> ".webp";
            case "image/svg+xml" -> ".svg";
            default -> ".bin";
        };

        String fileName = trimToNull(originalFilename);
        if (fileName == null) {
            return fallback;
        }

        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == fileName.length() - 1) {
            return fallback;
        }

        String extension = fileName.substring(dotIndex).toLowerCase(Locale.ROOT);
        if (!extension.matches("\\.[a-z0-9]{1,10}")) {
            return fallback;
        }
        return extension;
    }

    private MemoryEntryResponseDto toResponse(MemoryEntry entry) {
        List<String> mediaUrls = new ArrayList<>();
        if (entry.getMedia() != null && !entry.getMedia().isEmpty()) {
            entry.getMedia().stream()
                    .sorted((a, b) -> Integer.compare(
                            Objects.requireNonNullElse(a.getSortOrder(), 0),
                            Objects.requireNonNullElse(b.getSortOrder(), 0)
                    ))
                    .forEach(media -> mediaUrls.add(media.getMediaUrl()));
        }

        String createdBy = entry.getCreatedBy() != null && entry.getCreatedBy().getId() != null
                ? entry.getCreatedBy().getId().toString()
                : null;
        String updatedBy = entry.getUpdatedBy() != null && entry.getUpdatedBy().getId() != null
                ? entry.getUpdatedBy().getId().toString()
                : null;

        LocalDateTime now = LocalDateTime.now();
        UserAccount activeLockOwner = isLockActive(entry, now) ? entry.getEditLockOwner() : null;
        String editLockOwnerId = activeLockOwner != null && activeLockOwner.getId() != null
            ? activeLockOwner.getId().toString()
            : null;
        String editLockOwnerName = activeLockOwner != null
            ? trimToNull(activeLockOwner.getUsername())
            : null;
        LocalDateTime editLockExpiresAt = isLockActive(entry, now)
            ? entry.getEditLockExpiresAt()
            : null;

        return new MemoryEntryResponseDto(
                entry.getId() != null ? entry.getId().toString() : null,
                entry.getTitle(),
                entry.getSlug(),
                entry.getCoverUrl(),
                entry.getContent(),
                mediaUrls,
                entry.getStatus(),
                entry.getPublishedAt(),
                entry.getCreatedAt(),
                entry.getUpdatedAt(),
                createdBy,
                updatedBy,
                editLockOwnerId,
                editLockOwnerName,
                editLockExpiresAt
        );
    }

    private Set<String> collectMediaUrlsForCleanup(MemoryEntry entry) {
        Set<String> urls = new LinkedHashSet<>();
        String coverUrl = trimToNull(entry.getCoverUrl());
        if (coverUrl != null) {
            urls.add(coverUrl);
        }

        if (entry.getMedia() != null) {
            for (MemoryMedia media : entry.getMedia()) {
                if (media == null) {
                    continue;
                }
                String mediaUrl = trimToNull(media.getMediaUrl());
                if (mediaUrl != null) {
                    urls.add(mediaUrl);
                }
            }
        }

        collectImageUrlsFromContent(entry.getContent(), urls);
        return urls;
    }

    private void collectImageUrlsFromContent(String content, Set<String> urls) {
        String normalizedContent = trimToNull(content);
        if (normalizedContent == null) {
            return;
        }

        Matcher markdownMatcher = MARKDOWN_IMAGE_PATTERN.matcher(normalizedContent);
        while (markdownMatcher.find()) {
            String url = trimToNull(markdownMatcher.group(1));
            if (url != null) {
                urls.add(url);
            }
        }

        Matcher rawUrlMatcher = RAW_URL_PATTERN.matcher(normalizedContent);
        while (rawUrlMatcher.find()) {
            String url = trimToNull(rawUrlMatcher.group());
            if (url != null && MEDIA_FILE_PATTERN.matcher(url).matches()) {
                urls.add(url);
            }
        }
    }

    private void deleteStorageObjects(Set<String> urls) {
        if (urls == null || urls.isEmpty()) {
            return;
        }

        for (String url : urls) {
            azureBlobStorageService.deleteByUrlQuietly(url);
            supabaseStorageService.deleteByPublicUrlQuietly(url);
        }
    }

    private void requireActiveEditLockOwner(MemoryEntry entry, UserAccount actor, boolean touchExpiry) {
        LocalDateTime now = LocalDateTime.now();
        if (!isLockActive(entry, now)) {
            clearEditLock(entry);
            throw new ResponseStatusException(
                    HttpStatus.LOCKED,
                    "This memory is not locked for your session. Re-open it to acquire the edit lock."
            );
        }

        if (!isLockOwnedBy(entry, actor)) {
            String owner = resolveLockOwnerLabel(entry);
            throw new ResponseStatusException(
                    HttpStatus.LOCKED,
                    "This memory is currently being edited by " + owner + "."
            );
        }

        if (touchExpiry) {
            setLock(entry, actor, now);
        }
    }

    private boolean isLockActive(MemoryEntry entry, LocalDateTime now) {
        if (entry.getEditLockOwner() == null) {
            return false;
        }
        LocalDateTime expiresAt = entry.getEditLockExpiresAt();
        return expiresAt != null && expiresAt.isAfter(now);
    }

    private boolean isLockOwnedBy(MemoryEntry entry, UserAccount actor) {
        if (entry.getEditLockOwner() == null || entry.getEditLockOwner().getId() == null || actor == null || actor.getId() == null) {
            return false;
        }
        return entry.getEditLockOwner().getId().equals(actor.getId());
    }

    private String resolveLockOwnerLabel(MemoryEntry entry) {
        if (entry.getEditLockOwner() == null) {
            return "another admin";
        }
        String username = trimToNull(entry.getEditLockOwner().getUsername());
        if (username != null) {
            return username;
        }
        if (entry.getEditLockOwner().getId() != null) {
            return entry.getEditLockOwner().getId().toString();
        }
        return "another admin";
    }

    private void setLock(MemoryEntry entry, UserAccount actor, LocalDateTime now) {
        long seconds = editLockSeconds > 0 ? editLockSeconds : DEFAULT_EDIT_LOCK_SECONDS;
        entry.setEditLockOwner(actor);
        entry.setEditLockAcquiredAt(now);
        entry.setEditLockExpiresAt(now.plusSeconds(seconds));
    }

    private void clearEditLock(MemoryEntry entry) {
        entry.setEditLockOwner(null);
        entry.setEditLockAcquiredAt(null);
        entry.setEditLockExpiresAt(null);
    }

    private UserAccount requireAdminAndResolveActor(Authentication authentication) {
        requireAdmin(authentication);
        return userService.findUserByStringId(extractUserId(authentication));
    }

    private void requireAdmin(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please login.");
        }
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ADMIN".equals(a.getAuthority()));
        if (!isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required.");
        }
    }

    private String extractUserId(Authentication authentication) {
        if (authentication instanceof JwtAuthenticationToken jwtAuth) {
            return jwtAuth.getToken().getSubject();
        }
        if (authentication != null && authentication.getName() != null && !authentication.getName().isBlank()) {
            return authentication.getName();
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please login.");
    }
}
