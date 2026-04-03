package club.skillswap.memory.service;

import club.skillswap.common.exception.ResourceNotFoundException;
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

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MemoryServiceImpl implements MemoryService {

    private static final String STATUS_DRAFT = "draft";
    private static final String STATUS_PUBLISHED = "published";
    private static final String STATUS_ARCHIVED = "archived";
    private static final int MAX_SLUG_LENGTH = 220;
    private static final long DEFAULT_MAX_IMAGE_BYTES = 10L * 1024L * 1024L;

    private final MemoryEntryRepository memoryEntryRepository;
    private final UserService userService;

    @Value("${app.upload.base-dir:uploads}")
    private String uploadBaseDir;

    @Value("${app.upload.max-image-bytes:" + DEFAULT_MAX_IMAGE_BYTES + "}")
    private long maxImageBytes;

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

        MemoryEntry entry = memoryEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Memory not found with ID: " + id));

        applyPayload(entry, requestDto, false);
        entry.setUpdatedBy(actor);

        MemoryEntry saved = memoryEntryRepository.save(entry);
        return toResponse(saved);
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

        Path targetDirectory = Paths.get(uploadBaseDir, "memory").toAbsolutePath().normalize();
        Path targetFile = targetDirectory.resolve(fileName).normalize();

        if (!targetFile.startsWith(targetDirectory)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file path.");
        }

        try {
            Files.createDirectories(targetDirectory);
            Files.copy(file.getInputStream(), targetFile, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store image.");
        }

        return "/uploads/memory/" + fileName;
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

        if (requestDto.summary() != null || createMode) {
            entry.setSummary(trimToNull(requestDto.summary()));
        }
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

        return new MemoryEntryResponseDto(
                entry.getId() != null ? entry.getId().toString() : null,
                entry.getTitle(),
                entry.getSlug(),
                entry.getSummary(),
                entry.getCoverUrl(),
                entry.getContent(),
                mediaUrls,
                entry.getStatus(),
                entry.getPublishedAt(),
                entry.getCreatedAt(),
                entry.getUpdatedAt(),
                createdBy,
                updatedBy
        );
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
