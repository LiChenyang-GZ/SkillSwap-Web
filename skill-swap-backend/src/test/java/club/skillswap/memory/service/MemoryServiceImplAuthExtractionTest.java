package club.skillswap.memory.service;

import club.skillswap.common.storage.AzureBlobStorageService;
import club.skillswap.memory.dto.MemoryEntryRequestDto;
import club.skillswap.memory.entity.MemoryEntry;
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
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MemoryServiceImplAuthExtractionTest {

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
    }

    @Test
    @DisplayName("Public memory list remains anonymous and does not resolve a user.")
    void shouldListPublicMemoriesWithoutAuthentication() {
        MemoryEntry memory = publishedMemory(1L, "public-memory");
        when(memoryEntryRepository.findByStatusOrderByPublishedAtDescCreatedAtDesc("published"))
                .thenReturn(List.of(memory));

        var result = memoryService.listPublicMemories();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).slug()).isEqualTo("public-memory");
        verify(memoryEntryRepository).findByStatusOrderByPublishedAtDescCreatedAtDesc("published");
        verifyNoInteractions(userService);
    }

    @Test
    @DisplayName("Public memory detail remains anonymous and does not resolve a user.")
    void shouldGetPublicMemoryBySlugWithoutAuthentication() {
        MemoryEntry memory = publishedMemory(2L, "public-detail");
        when(memoryEntryRepository.findBySlugAndStatus("public-detail", "published"))
                .thenReturn(Optional.of(memory));

        var result = memoryService.getPublicMemoryBySlug("public-detail");

        assertThat(result.slug()).isEqualTo("public-detail");
        verify(memoryEntryRepository).findBySlugAndStatus("public-detail", "published");
        verifyNoInteractions(userService);
    }

    @Test
    @DisplayName("Admin memory create resolves actor through JwtAuthenticationToken.")
    void shouldCreateMemoryWithJwtAdminActor() {
        Jwt jwt = jwt("admin_memory_create");
        UserAccount admin = adminUser(jwt.getSubject());
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(admin);
        when(memoryEntryRepository.existsBySlug("new-memory")).thenReturn(false);
        when(memoryEntryRepository.save(any(MemoryEntry.class))).thenAnswer(invocation -> {
            MemoryEntry saved = invocation.getArgument(0);
            saved.setId(10L);
            return saved;
        });

        var result = memoryService.createMemory(
                request("New Memory", null, "published"),
                jwtAdminAuthentication(jwt)
        );

        assertThat(result.id()).isEqualTo("10");
        verify(userService).findOrCreateCurrentUser(jwt);
        verify(userService, never()).findUserByStringId(anyString());
        ArgumentCaptor<MemoryEntry> entryCaptor = ArgumentCaptor.forClass(MemoryEntry.class);
        verify(memoryEntryRepository).save(entryCaptor.capture());
        assertThat(entryCaptor.getValue().getCreatedBy()).isSameAs(admin);
        assertThat(entryCaptor.getValue().getUpdatedBy()).isSameAs(admin);
    }

    @Test
    @DisplayName("Admin memory update resolves actor through JwtAuthenticationToken.")
    void shouldUpdateMemoryWithJwtAdminActor() {
        Jwt jwt = jwt("admin_memory_update");
        UserAccount admin = adminUser(jwt.getSubject());
        MemoryEntry entry = publishedMemory(11L, "old-memory");
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(admin);
        when(memoryEntryRepository.findByIdForUpdate(11L)).thenReturn(Optional.of(entry));
        when(memoryEntryRepository.existsBySlugAndIdNot("updated-memory", 11L)).thenReturn(false);
        when(memoryEntryRepository.save(any(MemoryEntry.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = memoryService.updateMemory(
                11L,
                request("Updated Memory", null, "published"),
                jwtAdminAuthentication(jwt)
        );

        assertThat(result.title()).isEqualTo("Updated Memory");
        verify(userService).findOrCreateCurrentUser(jwt);
        verify(userService, never()).findUserByStringId(anyString());
        assertThat(entry.getUpdatedBy()).isSameAs(admin);
    }

    @Test
    @DisplayName("Admin memory delete resolves actor through JwtAuthenticationToken.")
    void shouldDeleteMemoryWithJwtAdminActor() {
        Jwt jwt = jwt("admin_memory_delete");
        UserAccount admin = adminUser(jwt.getSubject());
        MemoryEntry entry = publishedMemory(12L, "delete-memory");
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(admin);
        when(memoryEntryRepository.findByIdForUpdate(12L)).thenReturn(Optional.of(entry));

        memoryService.deleteMemory(12L, jwtAdminAuthentication(jwt));

        verify(userService).findOrCreateCurrentUser(jwt);
        verify(userService, never()).findUserByStringId(anyString());
        verify(memoryEntryRepository).delete(entry);
    }

    @Test
    @DisplayName("Admin memory lock resolves actor through JwtAuthenticationToken.")
    void shouldAcquireEditLockWithJwtAdminActor() {
        Jwt jwt = jwt("admin_memory_lock");
        UserAccount admin = adminUser(jwt.getSubject());
        MemoryEntry entry = draftMemory(13L, "lock-memory");
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(admin);
        when(memoryEntryRepository.findByIdForUpdate(13L)).thenReturn(Optional.of(entry));
        when(memoryEntryRepository.save(any(MemoryEntry.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = memoryService.acquireEditLock(13L, jwtAdminAuthentication(jwt));

        assertThat(result.editLockOwnerId()).isEqualTo(admin.getId().toString());
        verify(userService).findOrCreateCurrentUser(jwt);
        verify(userService, never()).findUserByStringId(anyString());
        assertThat(entry.getEditLockOwner()).isSameAs(admin);
    }

    @Test
    @DisplayName("Admin memory lock release resolves actor through JwtAuthenticationToken.")
    void shouldReleaseEditLockWithJwtAdminActor() {
        Jwt jwt = jwt("admin_memory_release");
        UserAccount admin = adminUser(jwt.getSubject());
        MemoryEntry entry = draftMemory(14L, "release-memory");
        entry.setEditLockOwner(admin);
        entry.setEditLockAcquiredAt(LocalDateTime.now());
        entry.setEditLockExpiresAt(LocalDateTime.now().plusMinutes(5));
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(admin);
        when(memoryEntryRepository.findByIdForUpdate(14L)).thenReturn(Optional.of(entry));

        memoryService.releaseEditLock(14L, jwtAdminAuthentication(jwt));

        verify(userService).findOrCreateCurrentUser(jwt);
        verify(userService, never()).findUserByStringId(anyString());
        verify(memoryEntryRepository).save(entry);
        assertThat(entry.getEditLockOwner()).isNull();
    }

    @Test
    @DisplayName("Admin memory list allows JwtAuthenticationToken with admin authority.")
    void shouldListAdminMemoriesWithJwtAdmin() {
        Jwt jwt = jwt("admin_memory_list");
        when(memoryEntryRepository.findAllByOrderByUpdatedAtDesc()).thenReturn(List.of());

        var result = memoryService.listAdminMemories(jwtAdminAuthentication(jwt));

        assertThat(result).isEmpty();
        verify(memoryEntryRepository).findAllByOrderByUpdatedAtDesc();
        verifyNoInteractions(userService);
    }

    @Test
    @DisplayName("Admin memory upload allows JwtAuthenticationToken with admin authority.")
    void shouldUploadMemoryMediaWithJwtAdmin() {
        Jwt jwt = jwt("admin_memory_upload");
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "memory.gif",
                "image/gif",
                validGif()
        );
        when(azureBlobStorageService.uploadImage(any(), anyString(), eq("image/gif")))
                .thenReturn("https://example.blob.core.windows.net/media/memory.gif");

        String url = memoryService.uploadMemoryMedia(file, jwtAdminAuthentication(jwt));

        assertThat(url).isEqualTo("https://example.blob.core.windows.net/media/memory.gif");
        verify(azureBlobStorageService).uploadImage(any(), anyString(), eq("image/gif"));
        verifyNoInteractions(userService);
    }

    @Test
    @DisplayName("Admin memory list rejects AnonymousAuthenticationToken.")
    void shouldRejectAnonymousAuthenticationForAdminList() {
        assertLoginRequired(() -> memoryService.listAdminMemories(anonymousAuthentication()));

        verify(memoryEntryRepository, never()).findAllByOrderByUpdatedAtDesc();
        verifyNoInteractions(userService);
    }

    @Test
    @DisplayName("Admin memory list rejects non-JWT ROLE_ADMIN.")
    void shouldRejectNonJwtRoleAdminForAdminList() {
        assertUnsupportedAuthentication(() -> memoryService.listAdminMemories(nonJwtAdminAuthentication()));

        verify(memoryEntryRepository, never()).findAllByOrderByUpdatedAtDesc();
        verifyNoInteractions(userService);
    }

    @Test
    @DisplayName("Admin memory create rejects non-JWT ROLE_ADMIN.")
    void shouldRejectNonJwtRoleAdminForCreateMemory() {
        assertUnsupportedAuthentication(() ->
                memoryService.createMemory(request("Legacy Admin", null, "draft"), nonJwtAdminAuthentication()));

        verify(userService, never()).findOrCreateCurrentUser(any());
        verify(userService, never()).findUserByStringId(anyString());
        verify(memoryEntryRepository, never()).save(any());
    }

    @Test
    @DisplayName("Admin memory create rejects UUID-shaped non-JWT authentication name without legacy lookup.")
    void shouldRejectUuidNamedNonJwtForCreateMemoryWithoutLegacyLookup() {
        UUID authenticationName = UUID.fromString("22222222-2222-2222-2222-222222222222");

        assertUnsupportedAuthentication(() ->
                memoryService.createMemory(
                        request("UUID Named Admin", null, "draft"),
                        namedAuthentication(authenticationName.toString())
                ));

        verify(userService, never()).findOrCreateCurrentUser(any());
        verify(userService, never()).findUserByStringId(anyString());
        verify(memoryEntryRepository, never()).save(any());
    }

    @Test
    @DisplayName("Admin memory create rejects UserDetails principal with ROLE_ADMIN.")
    void shouldRejectUserDetailsPrincipalForCreateMemory() {
        assertUnsupportedAuthentication(() ->
                memoryService.createMemory(
                        request("UserDetails Admin", null, "draft"),
                        userDetailsAdminAuthentication(UUID.randomUUID().toString())
                ));

        verify(userService, never()).findOrCreateCurrentUser(any());
        verify(userService, never()).findUserByStringId(anyString());
        verify(memoryEntryRepository, never()).save(any());
    }

    @Test
    @DisplayName("Admin memory create rejects DefaultOAuth2User principal with ROLE_ADMIN.")
    void shouldRejectDefaultOAuth2UserPrincipalForCreateMemory() {
        assertUnsupportedAuthentication(() ->
                memoryService.createMemory(
                        request("OAuth Admin", null, "draft"),
                        defaultOAuth2AdminAuthentication(UUID.randomUUID().toString())
                ));

        verify(userService, never()).findOrCreateCurrentUser(any());
        verify(userService, never()).findUserByStringId(anyString());
        verify(memoryEntryRepository, never()).save(any());
    }

    @Test
    @DisplayName("Admin memory list forbids JwtAuthenticationToken without admin authority.")
    void shouldForbidJwtWithoutAdminAuthorityForAdminList() {
        Jwt jwt = jwt("member_memory_list");

        assertThatThrownBy(() -> memoryService.listAdminMemories(jwtAuthentication(jwt)))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(ex.getReason()).isEqualTo("Admin access required.");
                });

        verify(memoryEntryRepository, never()).findAllByOrderByUpdatedAtDesc();
        verifyNoInteractions(userService);
    }

    private void assertLoginRequired(Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(ex.getReason()).isEqualTo("Please login.");
                });
    }

    private void assertUnsupportedAuthentication(Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(ex.getReason()).isEqualTo("Unsupported authentication type.");
                });
    }

    private MemoryEntryRequestDto request(String title, String slug, String status) {
        return new MemoryEntryRequestDto(title, slug, null, "Memory content", List.of(), status, null);
    }

    private MemoryEntry publishedMemory(Long id, String slug) {
        MemoryEntry entry = new MemoryEntry();
        entry.setId(id);
        entry.setTitle("Published memory");
        entry.setSlug(slug);
        entry.setStatus("published");
        entry.setPublishedAt(LocalDateTime.now().minusDays(1));
        return entry;
    }

    private MemoryEntry draftMemory(Long id, String slug) {
        MemoryEntry entry = new MemoryEntry();
        entry.setId(id);
        entry.setTitle("Draft memory");
        entry.setSlug(slug);
        entry.setStatus("draft");
        return entry;
    }

    private UserAccount adminUser(String subject) {
        return TestFixtures.userAccount()
                .id(UUID.randomUUID())
                .authSubject(subject)
                .role("admin")
                .build();
    }

    private Authentication jwtAuthentication(Jwt jwt) {
        return new JwtAuthenticationToken(jwt, List.of(), jwt.getSubject());
    }

    private Authentication jwtAdminAuthentication(Jwt jwt) {
        return new JwtAuthenticationToken(
                jwt,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")),
                jwt.getSubject()
        );
    }

    private Authentication anonymousAuthentication() {
        return new AnonymousAuthenticationToken(
                "test-anonymous-key",
                "anonymous",
                List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))
        );
    }

    private Authentication nonJwtAdminAuthentication() {
        return new UsernamePasswordAuthenticationToken(
                "legacy-admin",
                "ignored",
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
        );
    }

    private Authentication namedAuthentication(String name) {
        return new UsernamePasswordAuthenticationToken(
                name,
                "ignored",
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
        );
    }

    private Authentication userDetailsAdminAuthentication(String username) {
        UserDetails userDetails = User.withUsername(username)
                .password("ignored")
                .authorities("ROLE_ADMIN")
                .build();
        return new UsernamePasswordAuthenticationToken(userDetails, "ignored", userDetails.getAuthorities());
    }

    private Authentication defaultOAuth2AdminAuthentication(String subject) {
        DefaultOAuth2User principal = new DefaultOAuth2User(
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")),
                Map.of("sub", subject, "id", subject),
                "sub"
        );
        return new UsernamePasswordAuthenticationToken(principal, "ignored", principal.getAuthorities());
    }

    private Jwt jwt(String subject) {
        return Jwt.withTokenValue("token-" + subject)
                .header("alg", "none")
                .subject(subject)
                .build();
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
