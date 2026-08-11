package club.skillswap.memory.service;

import club.skillswap.common.storage.AzureBlobStorageService;
import club.skillswap.memory.dto.MemoryEntryRequestDto;
import club.skillswap.memory.entity.MemoryEntry;
import club.skillswap.memory.entity.MemoryMedia;
import club.skillswap.memory.repository.MemoryEntryRepository;
import club.skillswap.testsupport.TestFixtures;
import club.skillswap.user.entity.UserAccount;
import club.skillswap.user.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MemoryServiceImplTest {

    private static final String AZURE_CONNECTION_STRING =
            "DefaultEndpointsProtocol=https;AccountName=skillswaptest;AccountKey=fake;EndpointSuffix=core.windows.net";
    private static final String AZURE_BASE_URL = "https://skillswaptest.blob.core.windows.net/media";
    private static final long EDIT_LOCK_SECONDS = 60L;
    private static final UUID ADMIN_ID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static final UUID OTHER_ADMIN_ID = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    private static final LocalDateTime PUBLISHED_AT = LocalDateTime.of(2025, 1, 10, 9, 30);

    @Mock
    private MemoryEntryRepository memoryEntryRepository;

    @Mock
    private UserService userService;

    @Mock
    private AzureBlobStorageService azureBlobStorageService;

    @InjectMocks
    private MemoryServiceImpl memoryService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(memoryService, "maxImageBytes", 10L * 1024L * 1024L);
        ReflectionTestUtils.setField(memoryService, "editLockSeconds", EDIT_LOCK_SECONDS);
        ReflectionTestUtils.setField(memoryService, "azureBlobConnectionString", AZURE_CONNECTION_STRING);
    }

    @Test
    @DisplayName("Creates a draft memory with a slug derived from the title.")
    void shouldCreateDraftMemoryFromTitleWhenSlugMissing() {
        Jwt jwt = jwt("admin-create-draft");
        UserAccount admin = adminUser();
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(admin);
        when(memoryEntryRepository.existsBySlug("campus-launch-day")).thenReturn(false);
        when(memoryEntryRepository.save(any(MemoryEntry.class))).thenAnswer(invocation -> {
            MemoryEntry saved = invocation.getArgument(0);
            saved.setId(10L);
            return saved;
        });

        var result = memoryService.createMemory(
                request(" Campus Launch Day ", null, null, "Launch recap", null, "draft", null),
                adminAuthentication(jwt)
        );

        assertThat(result.id()).isEqualTo("10");
        assertThat(result.slug()).isEqualTo("campus-launch-day");
        ArgumentCaptor<MemoryEntry> entryCaptor = ArgumentCaptor.forClass(MemoryEntry.class);
        verify(memoryEntryRepository).save(entryCaptor.capture());
        MemoryEntry saved = entryCaptor.getValue();
        assertThat(saved.getTitle()).isEqualTo("Campus Launch Day");
        assertThat(saved.getSlug()).isEqualTo("campus-launch-day");
        assertThat(saved.getStatus()).isEqualTo("draft");
        assertThat(saved.getCreatedBy()).isSameAs(admin);
        assertThat(saved.getUpdatedBy()).isSameAs(admin);
    }

    @Test
    @DisplayName("Rejects a duplicate slug when creating a memory.")
    void shouldRejectDuplicateSlugWhenCreatingMemory() {
        Jwt jwt = jwt("admin-duplicate-slug");
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(adminUser());
        when(memoryEntryRepository.existsBySlug("campus-launch-day")).thenReturn(true);

        assertThatThrownBy(() -> memoryService.createMemory(
                request("Campus Launch Day", null, null, "Launch recap", null, "draft", null),
                adminAuthentication(jwt)
        )).isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
            assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(ex.getReason()).isEqualTo("Slug already exists.");
        });

        verify(memoryEntryRepository, never()).save(any(MemoryEntry.class));
    }

    @Test
    @DisplayName("Sets a publish timestamp when publishing without one.")
    void shouldPublishMemoryWithCurrentTimestampWhenPublishedAtMissing() {
        Jwt jwt = jwt("admin-publish-now");
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(adminUser());
        when(memoryEntryRepository.existsBySlug("publish-now")).thenReturn(false);
        when(memoryEntryRepository.save(any(MemoryEntry.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = memoryService.createMemory(
                request("Publish Now", null, null, "Publishing recap", null, "published", null),
                adminAuthentication(jwt)
        );

        assertThat(result.status()).isEqualTo("published");
        assertThat(result.publishedAt()).isNotNull();
        ArgumentCaptor<MemoryEntry> entryCaptor = ArgumentCaptor.forClass(MemoryEntry.class);
        verify(memoryEntryRepository).save(entryCaptor.capture());
        assertThat(entryCaptor.getValue().getPublishedAt()).isNotNull();
    }

    @Test
    @DisplayName("Rejects an unsupported memory status without saving.")
    void shouldRejectUnsupportedStatusWithoutSaving() {
        Jwt jwt = jwt("admin-unsupported-status");
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(adminUser());
        when(memoryEntryRepository.existsBySlug("unsupported-status")).thenReturn(false);

        assertThatThrownBy(() -> memoryService.createMemory(
                request("Unsupported Status", null, null, "Status recap", null, "ready", null),
                adminAuthentication(jwt)
        )).isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
            assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(ex.getReason()).isEqualTo("Unsupported status: ready");
        });

        verify(memoryEntryRepository, never()).save(any(MemoryEntry.class));
    }

    @Test
    @DisplayName("Rejects an invalid cover URL without saving.")
    void shouldRejectInvalidCoverUrlWithoutSaving() {
        Jwt jwt = jwt("admin-invalid-cover");
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(adminUser());
        when(memoryEntryRepository.existsBySlug("invalid-cover")).thenReturn(false);

        assertThatThrownBy(() -> memoryService.createMemory(
                request(
                        "Invalid Cover",
                        null,
                        "https://malicious.example.test/media/cover.jpg",
                        "Cover recap",
                        null,
                        "draft",
                        null
                ),
                adminAuthentication(jwt)
        )).isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
            assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(ex.getReason()).isEqualTo("coverUrl must be an Azure Blob HTTPS URL.");
        });

        verify(memoryEntryRepository, never()).save(any(MemoryEntry.class));
    }

    @Test
    @DisplayName("Resets a published memory to draft when update status is null.")
    void shouldResetStatusToDraftWhenUpdateStatusIsNull() {
        Jwt jwt = jwt("admin-null-status-update");
        UserAccount admin = adminUser();
        MemoryEntry entry = publishedMemory(20L, "Published Memory", "published-memory");
        entry.setCoverUrl(azureUrl("cover.jpg"));
        entry.setContent("Existing content");
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(admin);
        when(memoryEntryRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(entry));
        when(memoryEntryRepository.existsBySlugAndIdNot("published-memory", 20L)).thenReturn(false);
        when(memoryEntryRepository.save(any(MemoryEntry.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = memoryService.updateMemory(
                20L,
                request(null, null, null, null, null, null, null),
                adminAuthentication(jwt)
        );

        // FIXME: updateMemory only enforces edit locks for draft memories, so published entries
        // reach applyPayload without a lock and null status is normalized to draft.
        assertThat(result.status()).isEqualTo("draft");
        assertThat(entry.getStatus()).isEqualTo("draft");
        assertThat(entry.getTitle()).isEqualTo("Published Memory");
        assertThat(entry.getCoverUrl()).isEqualTo(azureUrl("cover.jpg"));
        assertThat(entry.getContent()).isEqualTo("Existing content");
        assertThat(entry.getUpdatedBy()).isSameAs(admin);
        verify(memoryEntryRepository).save(entry);
    }

    @Test
    @DisplayName("Clears an owned draft edit lock when publishing the memory.")
    void shouldClearEditLockWhenPublishingOwnedDraft() {
        Jwt jwt = jwt("admin-publish-draft");
        UserAccount admin = adminUser();
        MemoryEntry entry = draftMemory(21L, "Draft Memory", "draft-memory");
        lock(entry, admin, farFuture());
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(admin);
        when(memoryEntryRepository.findByIdForUpdate(21L)).thenReturn(Optional.of(entry));
        when(memoryEntryRepository.existsBySlugAndIdNot("draft-memory", 21L)).thenReturn(false);
        when(memoryEntryRepository.save(any(MemoryEntry.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = memoryService.updateMemory(
                21L,
                request(null, null, null, null, null, "published", null),
                adminAuthentication(jwt)
        );

        assertThat(result.status()).isEqualTo("published");
        assertThat(result.publishedAt()).isNotNull();
        assertThat(entry.getEditLockOwner()).isNull();
        assertThat(entry.getEditLockAcquiredAt()).isNull();
        assertThat(entry.getEditLockExpiresAt()).isNull();
        verify(memoryEntryRepository).save(entry);
    }

    @Test
    @DisplayName("Rejects a draft update when the edit lock is expired.")
    void shouldRejectDraftUpdateWhenEditLockExpired() {
        Jwt jwt = jwt("admin-expired-update");
        UserAccount admin = adminUser();
        MemoryEntry entry = draftMemory(22L, "Expired Draft", "expired-draft");
        lock(entry, admin, farPast());
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(admin);
        when(memoryEntryRepository.findByIdForUpdate(22L)).thenReturn(Optional.of(entry));

        assertThatThrownBy(() -> memoryService.updateMemory(
                22L,
                request(null, null, null, "Updated content", null, "draft", null),
                adminAuthentication(jwt)
        )).isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
            assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.LOCKED);
            assertThat(ex.getReason()).isEqualTo(
                    "This memory is not locked for your session. Re-open it to acquire the edit lock."
            );
        });

        assertThat(entry.getEditLockOwner()).isNull();
        assertThat(entry.getEditLockAcquiredAt()).isNull();
        assertThat(entry.getEditLockExpiresAt()).isNull();
        verify(memoryEntryRepository, never()).save(any(MemoryEntry.class));
    }

    @Test
    @DisplayName("Replaces an expired draft edit lock when acquiring it.")
    void shouldAcquireDraftLockWhenExistingLockExpired() {
        Jwt jwt = jwt("admin-acquire-expired");
        UserAccount admin = adminUser();
        UserAccount otherAdmin = otherAdminUser();
        MemoryEntry entry = draftMemory(23L, "Expired Lock", "expired-lock");
        lock(entry, otherAdmin, farPast());
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(admin);
        when(memoryEntryRepository.findByIdForUpdate(23L)).thenReturn(Optional.of(entry));
        when(memoryEntryRepository.save(any(MemoryEntry.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = memoryService.acquireEditLock(23L, adminAuthentication(jwt));

        assertThat(result.editLockOwnerId()).isEqualTo(ADMIN_ID.toString());
        assertThat(entry.getEditLockOwner()).isSameAs(admin);
        assertThat(entry.getEditLockAcquiredAt()).isNotNull();
        assertThat(entry.getEditLockExpiresAt()).isNotNull();
        verify(memoryEntryRepository).save(entry);
    }

    @Test
    @DisplayName("Rejects draft lock acquisition when another admin owns an active lock.")
    void shouldRejectAcquireDraftLockWhenActiveLockOwnedByOtherAdmin() {
        Jwt jwt = jwt("admin-acquire-owned");
        UserAccount otherAdmin = otherAdminUser();
        MemoryEntry entry = draftMemory(24L, "Owned Lock", "owned-lock");
        lock(entry, otherAdmin, farFuture());
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(adminUser());
        when(memoryEntryRepository.findByIdForUpdate(24L)).thenReturn(Optional.of(entry));

        assertThatThrownBy(() -> memoryService.acquireEditLock(24L, adminAuthentication(jwt)))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.LOCKED);
                    assertThat(ex.getReason()).isEqualTo("This memory is currently being edited by Other Admin.");
                });

        assertThat(entry.getEditLockOwner()).isSameAs(otherAdmin);
        verify(memoryEntryRepository, never()).save(any(MemoryEntry.class));
    }

    @Test
    @DisplayName("Returns a non-draft memory without saving when acquiring an edit lock.")
    void shouldReturnNonDraftMemoryWithoutSavingWhenAcquiringLock() {
        Jwt jwt = jwt("admin-acquire-published");
        MemoryEntry entry = publishedMemory(25L, "Published Lock", "published-lock");
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(adminUser());
        when(memoryEntryRepository.findByIdForUpdate(25L)).thenReturn(Optional.of(entry));

        var result = memoryService.acquireEditLock(25L, adminAuthentication(jwt));

        assertThat(result.status()).isEqualTo("published");
        assertThat(entry.getEditLockOwner()).isNull();
        verify(memoryEntryRepository, never()).save(any(MemoryEntry.class));
    }

    @Test
    @DisplayName("Omits expired edit lock fields from memory responses.")
    void shouldHideExpiredLockFieldsInResponse() {
        Jwt jwt = jwt("admin-expired-response");
        MemoryEntry entry = publishedMemory(30L, "Expired Response Lock", "expired-response-lock");
        lock(entry, otherAdminUser(), farPast());
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(adminUser());
        when(memoryEntryRepository.findByIdForUpdate(30L)).thenReturn(Optional.of(entry));

        var result = memoryService.acquireEditLock(30L, adminAuthentication(jwt));

        assertThat(result.editLockOwnerId()).isNull();
        assertThat(result.editLockOwnerName()).isNull();
        assertThat(result.editLockExpiresAt()).isNull();
        verify(memoryEntryRepository, never()).save(any(MemoryEntry.class));
    }

    @Test
    @DisplayName("Clears and saves an expired edit lock when releasing it.")
    void shouldReleaseExpiredLockByClearingAndSaving() {
        Jwt jwt = jwt("admin-release-expired");
        UserAccount admin = adminUser();
        MemoryEntry entry = draftMemory(26L, "Release Expired", "release-expired");
        lock(entry, admin, farPast());
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(admin);
        when(memoryEntryRepository.findByIdForUpdate(26L)).thenReturn(Optional.of(entry));

        memoryService.releaseEditLock(26L, adminAuthentication(jwt));

        assertThat(entry.getEditLockOwner()).isNull();
        assertThat(entry.getEditLockAcquiredAt()).isNull();
        assertThat(entry.getEditLockExpiresAt()).isNull();
        verify(memoryEntryRepository).save(entry);
    }

    @Test
    @DisplayName("Rejects edit lock release when another admin owns the active lock.")
    void shouldRejectReleaseLockOwnedByOtherAdmin() {
        Jwt jwt = jwt("admin-release-owned");
        UserAccount otherAdmin = otherAdminUser();
        MemoryEntry entry = draftMemory(27L, "Release Owned", "release-owned");
        lock(entry, otherAdmin, farFuture());
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(adminUser());
        when(memoryEntryRepository.findByIdForUpdate(27L)).thenReturn(Optional.of(entry));

        assertThatThrownBy(() -> memoryService.releaseEditLock(27L, adminAuthentication(jwt)))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.LOCKED);
                    assertThat(ex.getReason()).isEqualTo("This memory lock is owned by Other Admin.");
                });

        assertThat(entry.getEditLockOwner()).isSameAs(otherAdmin);
        verify(memoryEntryRepository, never()).save(any(MemoryEntry.class));
    }

    @Test
    @DisplayName("Deletes a memory and cleans up collected media URLs.")
    void shouldDeleteMemoryAndCleanCollectedMediaUrls() {
        Jwt jwt = jwt("admin-delete-media");
        MemoryEntry entry = publishedMemory(28L, "Delete Media", "delete-media");
        entry.setCoverUrl(azureUrl("cover.jpg"));
        addMedia(entry, azureUrl("gallery-1.png"), 0);
        addMedia(entry, azureUrl("gallery-2.webp"), 1);
        entry.setContent("""
                ![inline](https://skillswaptest.blob.core.windows.net/media/inline.png)
                raw https://skillswaptest.blob.core.windows.net/media/raw.webp
                page https://skillswaptest.blob.core.windows.net/media/not-media
                """);
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(adminUser());
        when(memoryEntryRepository.findByIdForUpdate(28L)).thenReturn(Optional.of(entry));

        memoryService.deleteMemory(28L, adminAuthentication(jwt));

        verify(memoryEntryRepository).delete(entry);
        ArgumentCaptor<String> urlCaptor = ArgumentCaptor.forClass(String.class);
        verify(azureBlobStorageService, times(5)).deleteByUrlQuietly(urlCaptor.capture());
        assertThat(urlCaptor.getAllValues()).containsExactlyInAnyOrder(
                azureUrl("cover.jpg"),
                azureUrl("gallery-1.png"),
                azureUrl("gallery-2.webp"),
                azureUrl("inline.png"),
                azureUrl("raw.webp")
        );
    }

    @Test
    @DisplayName("Cleans up HTML image URLs embedded in memory content.")
    void shouldCleanUpHtmlImageUrlsFromContent() {
        Jwt jwt = jwt("admin-delete-html-media");
        MemoryEntry entry = publishedMemory(30L, "Delete Html Media", "delete-html-media");
        // The Memory Studio editor writes body images as HTML so they can carry a width.
        entry.setContent("""
                <div align="center">
                  <img src="https://skillswaptest.blob.core.windows.net/media/body-1.png" alt="one" width="250" />
                </div>

                <div align="center">
                  <img src="https://skillswaptest.blob.core.windows.net/media/body-2.jpg" alt="two" width="100%" />
                </div>
                """);
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(adminUser());
        when(memoryEntryRepository.findByIdForUpdate(30L)).thenReturn(Optional.of(entry));

        memoryService.deleteMemory(30L, adminAuthentication(jwt));

        verify(memoryEntryRepository).delete(entry);
        ArgumentCaptor<String> urlCaptor = ArgumentCaptor.forClass(String.class);
        verify(azureBlobStorageService, times(2)).deleteByUrlQuietly(urlCaptor.capture());
        assertThat(urlCaptor.getAllValues()).containsExactlyInAnyOrder(
                azureUrl("body-1.png"),
                azureUrl("body-2.jpg")
        );
    }

    @Test
    @DisplayName("Deletes a memory without storage cleanup when no media URLs are present.")
    void shouldDeleteMemoryWithoutStorageCleanupWhenNoUrls() {
        Jwt jwt = jwt("admin-delete-no-media");
        MemoryEntry entry = publishedMemory(29L, "Delete No Media", "delete-no-media");
        entry.setContent("Read more at https://skillswaptest.blob.core.windows.net/media/not-media");
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(adminUser());
        when(memoryEntryRepository.findByIdForUpdate(29L)).thenReturn(Optional.of(entry));

        memoryService.deleteMemory(29L, adminAuthentication(jwt));

        verify(memoryEntryRepository).delete(entry);
        verify(azureBlobStorageService, never()).deleteByUrlQuietly(anyString());
    }

    @Test
    @DisplayName("Uploads memory media under the memory object path with detected content type.")
    void shouldUploadMemoryMediaWithMemoryObjectPathAndDetectedContentType() {
        Jwt jwt = jwt("admin-upload-media");
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "memory.gif",
                "image/gif",
                validGif()
        );
        when(azureBlobStorageService.uploadImage(any(MultipartFile.class), anyString(), eq("image/gif")))
                .thenReturn(azureUrl("memory.gif"));

        String result = memoryService.uploadMemoryMedia(file, adminAuthentication(jwt));

        assertThat(result).isEqualTo(azureUrl("memory.gif"));
        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(azureBlobStorageService).uploadImage(same(file), pathCaptor.capture(), eq("image/gif"));
        assertThat(pathCaptor.getValue()).matches("memory/[0-9a-fA-F-]{36}\\.gif");
    }

    private MemoryEntryRequestDto request(
            String title,
            String slug,
            String coverUrl,
            String content,
            List<String> mediaUrls,
            String status,
            LocalDateTime publishedAt
    ) {
        return new MemoryEntryRequestDto(title, slug, coverUrl, content, mediaUrls, status, publishedAt);
    }

    private MemoryEntry publishedMemory(Long id, String title, String slug) {
        MemoryEntry entry = memory(id, title, slug, "published");
        entry.setPublishedAt(PUBLISHED_AT);
        return entry;
    }

    private MemoryEntry draftMemory(Long id, String title, String slug) {
        return memory(id, title, slug, "draft");
    }

    private MemoryEntry memory(Long id, String title, String slug, String status) {
        MemoryEntry entry = new MemoryEntry();
        entry.setId(id);
        entry.setTitle(title);
        entry.setSlug(slug);
        entry.setStatus(status);
        return entry;
    }

    private void lock(MemoryEntry entry, UserAccount owner, LocalDateTime expiresAt) {
        entry.setEditLockOwner(owner);
        entry.setEditLockAcquiredAt(LocalDateTime.of(2025, 1, 1, 9, 0));
        entry.setEditLockExpiresAt(expiresAt);
    }

    private void addMedia(MemoryEntry entry, String url, int sortOrder) {
        MemoryMedia media = new MemoryMedia();
        media.setEntry(entry);
        media.setMediaUrl(url);
        media.setSortOrder(sortOrder);
        entry.getMedia().add(media);
    }

    private UserAccount adminUser() {
        return TestFixtures.userAccount()
                .id(ADMIN_ID)
                .authSubject("admin-memory")
                .username("Admin Editor")
                .role("admin")
                .build();
    }

    private UserAccount otherAdminUser() {
        return TestFixtures.userAccount()
                .id(OTHER_ADMIN_ID)
                .authSubject("other-admin-memory")
                .username("Other Admin")
                .role("admin")
                .build();
    }

    private Authentication adminAuthentication(Jwt jwt) {
        return new JwtAuthenticationToken(
                jwt,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")),
                jwt.getSubject()
        );
    }

    private Jwt jwt(String subject) {
        return Jwt.withTokenValue("token-" + subject)
                .header("alg", "none")
                .subject(subject)
                .build();
    }

    private String azureUrl(String fileName) {
        return AZURE_BASE_URL + "/" + fileName;
    }

    private LocalDateTime farPast() {
        return LocalDateTime.now().minusYears(5);
    }

    private LocalDateTime farFuture() {
        return LocalDateTime.now().plusYears(5);
    }

    private byte[] validGif() {
        return new byte[] {
                0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
                0x01, 0x00, 0x01, 0x00, (byte) 0x80, 0x00, 0x00,
                0x00, 0x00, 0x00, (byte) 0xff, (byte) 0xff, (byte) 0xff,
                0x21, (byte) 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00,
                0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
                0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b
        };
    }
}
