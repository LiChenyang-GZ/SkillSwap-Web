package club.skillswap.user.service;

import club.skillswap.common.exception.DomainException;
import club.skillswap.common.storage.AzureBlobStorageService;
import club.skillswap.testsupport.TestFixtures;
import club.skillswap.user.dto.SkillRequestDto;
import club.skillswap.user.dto.UpdateProfileRequestDto;
import club.skillswap.user.entity.UserAccount;
import club.skillswap.user.entity.UserSkill;
import club.skillswap.user.repository.UserRepository;
import club.skillswap.workshop.repository.WorkshopParticipantRepository;
import club.skillswap.workshop.repository.WorkshopRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    private static final String CLERK_ISSUER = "https://clerk.test.invalid";
    private static final String OLD_AVATAR_URL = "https://skillswaptest.blob.core.windows.net/media/avatars/old.png";
    private static final String NEW_AVATAR_URL = "https://skillswaptest.blob.core.windows.net/media/avatars/new.png";

    @Mock
    private UserRepository userRepository;

    @Mock
    private WorkshopRepository workshopRepository;

    @Mock
    private WorkshopParticipantRepository participantRepository;

    @Mock
    private AzureBlobStorageService azureBlobStorageService;

    @InjectMocks
    private UserService userService;

    @Test
    @DisplayName("Creates a member user when the Clerk JWT subject is new.")
    void shouldCreateMemberWhenClerkJwtIsNew() {
        String subject = "user_clerk_new";
        Jwt jwt = jwt(subject, "member@example.test", true);
        when(userRepository.findByAuthSubject(subject)).thenReturn(Optional.empty());
        when(userRepository.save(any(UserAccount.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserAccount result = userService.findOrCreateCurrentUser(jwt);

        ArgumentCaptor<UserAccount> userCaptor = ArgumentCaptor.forClass(UserAccount.class);
        verify(userRepository).save(userCaptor.capture());
        UserAccount savedUser = userCaptor.getValue();
        assertThat(result).isSameAs(savedUser);
        assertThat(savedUser.getId()).isNotNull();
        assertThat(savedUser.getAuthSubject()).isEqualTo(subject);
        assertThat(savedUser.getAuthProvider()).isEqualTo(CLERK_ISSUER);
        assertThat(savedUser.getEmail()).isEqualTo("member@example.test");
        assertThat(savedUser.getUsername()).isEqualTo("member");
        assertThat(savedUser.getRole()).isEqualTo("member");
        verify(userRepository).findByAuthSubject(subject);
        verify(userRepository, never()).findById(any());
    }

    @Test
    @DisplayName("Returns the existing user for a Clerk auth subject without saving a duplicate.")
    void shouldReturnExistingUserWhenAuthSubjectExists() {
        String subject = "user_clerk_existing";
        UserAccount existingUser = TestFixtures.userAccount().authSubject(subject).build();
        Jwt jwt = jwt(subject, "ignored@example.test", true);
        when(userRepository.findByAuthSubject(subject)).thenReturn(Optional.of(existingUser));

        UserAccount result = userService.findOrCreateCurrentUser(jwt);

        assertThat(result).isSameAs(existingUser);
        verify(userRepository).findByAuthSubject(subject);
        verify(userRepository, never()).findById(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Returns an existing user for a UUID-shaped auth subject without ID fallback.")
    void shouldReturnExistingUserWhenUuidShapedAuthSubjectExists() {
        String subject = "22222222-2222-2222-2222-222222222222";
        UserAccount existingUser = TestFixtures.userAccount().authSubject(subject).build();
        Jwt jwt = jwt(subject, "ignored@example.test", true);
        when(userRepository.findByAuthSubject(subject)).thenReturn(Optional.of(existingUser));

        UserAccount result = userService.findOrCreateCurrentUser(jwt);

        assertThat(result).isSameAs(existingUser);
        verify(userRepository).findByAuthSubject(subject);
        verify(userRepository, never()).findById(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Treats a UUID-shaped JWT subject as an auth subject, not an internal user ID.")
    void shouldCreateGeneratedInternalIdForUuidShapedSubjectWithoutAuthSubjectMatch() {
        UUID subjectUuid = UUID.fromString("22222222-2222-2222-2222-222222222222");
        String subject = subjectUuid.toString();
        Jwt jwt = jwt(subject, "uuid-subject@example.test", true);
        when(userRepository.findByAuthSubject(subject)).thenReturn(Optional.empty());
        when(userRepository.save(any(UserAccount.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserAccount result = userService.findOrCreateCurrentUser(jwt);

        ArgumentCaptor<UserAccount> userCaptor = ArgumentCaptor.forClass(UserAccount.class);
        verify(userRepository).save(userCaptor.capture());
        UserAccount savedUser = userCaptor.getValue();
        assertThat(result).isSameAs(savedUser);
        assertThat(savedUser.getId()).isNotNull();
        assertThat(savedUser.getId()).isNotEqualTo(subjectUuid);
        assertThat(savedUser.getAuthSubject()).isEqualTo(subject);
        assertThat(savedUser.getAuthProvider()).isEqualTo(CLERK_ISSUER);
        assertThat(savedUser.getEmail()).isEqualTo("uuid-subject@example.test");
        assertThat(savedUser.getRole()).isEqualTo("member");
        verify(userRepository).findByAuthSubject(subject);
        verify(userRepository, never()).findById(any());
    }

    @Test
    @DisplayName("Rejects a JWT with no subject before user lookup or creation.")
    void shouldRejectNullJwtSubjectBeforeLookup() {
        Jwt jwt = jwtWithoutSubject("null-subject@example.test", true);

        assertThatThrownBy(() -> userService.findOrCreateCurrentUser(jwt))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(ex.getReason()).isEqualTo("Please login.");
                });
        verifyNoInteractions(userRepository);
    }

    @Test
    @DisplayName("Rejects a blank JWT subject before user lookup or creation.")
    void shouldRejectBlankJwtSubjectBeforeLookup() {
        Jwt jwt = jwt("   ", "blank-subject@example.test", true);

        assertThatThrownBy(() -> userService.findOrCreateCurrentUser(jwt))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(ex.getReason()).isEqualTo("Please login.");
                });
        verifyNoInteractions(userRepository);
    }

    @Test
    @DisplayName("Rejects a new current user when the JWT explicitly marks the email unverified.")
    void shouldRejectUnverifiedEmailWhenClaimIsFalse() {
        String subject = "user_unverified_email";
        Jwt jwt = jwt(subject, "unverified@example.test", false);
        when(userRepository.findByAuthSubject(subject)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.findOrCreateCurrentUser(jwt))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(ex.getReason()).contains("Please verify your email before accessing profile.");
                });
        verify(userRepository).findByAuthSubject(subject);
        verify(userRepository, never()).findById(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Uses email_address as the fallback email claim when email is absent.")
    void shouldUseEmailAddressFallbackWhenEmailClaimIsMissing() {
        String subject = "user_email_address_fallback";
        Jwt jwt = jwtWithClaims(subject, builder -> builder
                .claim("email_address", "fallback@example.test")
                .claim("email_verified", true));
        when(userRepository.findByAuthSubject(subject)).thenReturn(Optional.empty());
        when(userRepository.save(any(UserAccount.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserAccount result = userService.findOrCreateCurrentUser(jwt);

        ArgumentCaptor<UserAccount> userCaptor = ArgumentCaptor.forClass(UserAccount.class);
        verify(userRepository).save(userCaptor.capture());
        UserAccount savedUser = userCaptor.getValue();
        assertThat(result).isSameAs(savedUser);
        assertThat(savedUser.getEmail()).isEqualTo("fallback@example.test");
        assertThat(savedUser.getUsername()).isEqualTo("fallback");
        assertThat(savedUser.getAuthSubject()).isEqualTo(subject);
        assertThat(savedUser.getAuthProvider()).isEqualTo(CLERK_ISSUER);
        verify(userRepository).findByAuthSubject(subject);
        verify(userRepository, never()).findById(any());
    }

    @Test
    @DisplayName("Rejects email_address fallback when email_verified is explicitly false.")
    void shouldRejectUnverifiedEmailAddressFallbackWhenClaimIsFalse() {
        String subject = "user_unverified_email_address";
        Jwt jwt = jwtWithClaims(subject, builder -> builder
                .claim("email_address", "unverified-fallback@example.test")
                .claim("email_verified", false));
        when(userRepository.findByAuthSubject(subject)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.findOrCreateCurrentUser(jwt))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(ex.getReason()).contains("Please verify your email before accessing profile.");
                });
        verify(userRepository).findByAuthSubject(subject);
        verify(userRepository, never()).findById(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Allows user creation when email_verified is missing.")
    void shouldAllowCreationWhenEmailVerifiedClaimIsMissing() {
        String subject = "user_missing_email_verified";
        Jwt jwt = jwtWithClaims(subject, builder -> builder.claim("email", "missing-verified@example.test"));
        when(userRepository.findByAuthSubject(subject)).thenReturn(Optional.empty());
        when(userRepository.save(any(UserAccount.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserAccount result = userService.findOrCreateCurrentUser(jwt);

        ArgumentCaptor<UserAccount> userCaptor = ArgumentCaptor.forClass(UserAccount.class);
        verify(userRepository).save(userCaptor.capture());
        UserAccount savedUser = userCaptor.getValue();
        assertThat(result).isSameAs(savedUser);
        assertThat(savedUser.getEmail()).isEqualTo("missing-verified@example.test");
        assertThat(savedUser.getAuthSubject()).isEqualTo(subject);
        assertThat(savedUser.getAuthProvider()).isEqualTo(CLERK_ISSUER);
        verify(userRepository).findByAuthSubject(subject);
        verify(userRepository, never()).findById(any());
    }

    @Test
    @DisplayName("Allows user creation when email and email_verified claims are both missing.")
    void shouldAllowCreationWhenEmailAndVerificationClaimsAreMissing() {
        String subject = "user_missing_email";
        Jwt jwt = jwtWithClaims(subject, builder -> { });
        when(userRepository.findByAuthSubject(subject)).thenReturn(Optional.empty());
        when(userRepository.save(any(UserAccount.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserAccount result = userService.findOrCreateCurrentUser(jwt);

        ArgumentCaptor<UserAccount> userCaptor = ArgumentCaptor.forClass(UserAccount.class);
        verify(userRepository).save(userCaptor.capture());
        UserAccount savedUser = userCaptor.getValue();
        assertThat(result).isSameAs(savedUser);
        assertThat(savedUser.getEmail()).isNull();
        assertThat(savedUser.getUsername()).isEqualTo("user_user_missing_email");
        assertThat(savedUser.getAuthSubject()).isEqualTo(subject);
        assertThat(savedUser.getAuthProvider()).isEqualTo(CLERK_ISSUER);
        verify(userRepository).findByAuthSubject(subject);
        verify(userRepository, never()).findById(any());
    }

    @ParameterizedTest
    @CsvSource({
            "preferred_username,preferred-user,preferred-user",
            "username,username-user,username-user",
            "name,Display Name,Display Name",
            "given_name,Given Name,Given Name"
    })
    @DisplayName("Derives username from optional name claims when email is absent.")
    void shouldDeriveUsernameFromOptionalNameClaimsWhenEmailIsMissing(
            String claimName,
            String claimValue,
            String expectedUsername
    ) {
        String subject = "user_optional_" + claimName;
        Jwt jwt = jwtWithClaims(subject, builder -> builder
                .claim(claimName, claimValue)
                .claim("email_verified", true));
        when(userRepository.findByAuthSubject(subject)).thenReturn(Optional.empty());
        when(userRepository.save(any(UserAccount.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserAccount result = userService.findOrCreateCurrentUser(jwt);

        ArgumentCaptor<UserAccount> userCaptor = ArgumentCaptor.forClass(UserAccount.class);
        verify(userRepository).save(userCaptor.capture());
        UserAccount savedUser = userCaptor.getValue();
        assertThat(result).isSameAs(savedUser);
        assertThat(savedUser.getEmail()).isNull();
        assertThat(savedUser.getUsername()).isEqualTo(expectedUsername);
        assertThat(savedUser.getAuthSubject()).isEqualTo(subject);
        assertThat(savedUser.getAuthProvider()).isEqualTo(CLERK_ISSUER);
        verify(userRepository).findByAuthSubject(subject);
        verify(userRepository, never()).findById(any());
    }

    @Test
    @DisplayName("Updates the current profile and replaces skills with normalized values.")
    void shouldReplaceSkillsWhenUpdatingProfile() {
        String subject = "test-user";
        UserAccount existingUser = TestFixtures.userAccount().build();
        existingUser.getSkills().add(skill("java", existingUser));
        UpdateProfileRequestDto updateRequest = new UpdateProfileRequestDto();
        updateRequest.setUsername(" Updated User ");
        updateRequest.setBio("New bio");
        updateRequest.setSkills(List.of(" React ", "SPRING BOOT"));
        Jwt jwt = jwt(subject, "ignored@example.test", true);
        when(userRepository.findByAuthSubject(subject)).thenReturn(Optional.of(existingUser));
        when(userRepository.save(existingUser)).thenReturn(existingUser);

        UserAccount result = userService.updateCurrentUserProfile(jwt, updateRequest);

        assertThat(result).isSameAs(existingUser);
        assertThat(existingUser.getUsername()).isEqualTo("Updated User");
        assertThat(existingUser.getBio()).isEqualTo("New bio");
        assertThat(existingUser.getSkills())
                .extracting(UserSkill::getSkillName)
                .containsExactly("react", "spring boot");
        assertThat(existingUser.getSkills())
                .allSatisfy(skill -> assertThat(skill.getUser()).isSameAs(existingUser));
        verify(userRepository).findByAuthSubject(subject);
        verify(userRepository, never()).findById(any());
        verify(userRepository).save(existingUser);
    }

    @Test
    @DisplayName("Normalizes and stores the university name.")
    void shouldUpdateUniversityWithNormalizedName() {
        String subject = "university-user";
        UserAccount existingUser = TestFixtures.userAccount().build();
        UpdateProfileRequestDto updateRequest = new UpdateProfileRequestDto();
        updateRequest.setUniversity("  Macquarie   University  ");
        Jwt jwt = jwt(subject, "ignored@example.test", true);
        when(userRepository.findByAuthSubject(subject)).thenReturn(Optional.of(existingUser));
        when(userRepository.save(existingUser)).thenReturn(existingUser);

        userService.updateCurrentUserProfile(jwt, updateRequest);

        assertThat(existingUser.getUniversity()).isEqualTo("Macquarie University");
        verify(userRepository).save(existingUser);
    }

    @Test
    @DisplayName("Rejects a blank or too-short university name.")
    void shouldRejectTooShortUniversity() {
        String subject = "university-too-short";
        UserAccount existingUser = TestFixtures.userAccount().build();
        UpdateProfileRequestDto updateRequest = new UpdateProfileRequestDto();
        updateRequest.setUniversity(" ");
        Jwt jwt = jwt(subject, "ignored@example.test", true);
        when(userRepository.findByAuthSubject(subject)).thenReturn(Optional.of(existingUser));

        assertThatThrownBy(() -> userService.updateCurrentUserProfile(jwt, updateRequest))
                .isInstanceOf(DomainException.class)
                .hasMessage("University name must be at least 2 characters.");
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Rejects a blank skill name when adding a skill to the current user.")
    void shouldRejectBlankSkillWhenAddingSkill() {
        String subject = "test-user";
        UserAccount existingUser = TestFixtures.userAccount().build();
        SkillRequestDto skillRequest = new SkillRequestDto();
        skillRequest.setSkillName("   ");
        Jwt jwt = jwt(subject, "ignored@example.test", true);
        when(userRepository.findByAuthSubject(subject)).thenReturn(Optional.of(existingUser));

        assertThatThrownBy(() -> userService.addSkillToCurrentUser(jwt, skillRequest))
                .isInstanceOf(DomainException.class)
                .hasMessage("Skill name must not be blank.");
        verify(userRepository).findByAuthSubject(subject);
        verify(userRepository, never()).findById(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Uploads an avatar and returns the new avatar URL when no previous avatar exists.")
    void shouldUploadAvatarAndReturnProfileWhenNoPreviousAvatar() {
        setMaxImageBytes(10L * 1024L * 1024L);
        String subject = "user_upload_avatar";
        Jwt jwt = jwt(subject, "avatar@example.test", true);
        UserAccount existingUser = TestFixtures.userAccount()
                .authSubject(subject)
                .avatarUrl(null)
                .build();
        MockMultipartFile file = validPngFile("avatar.png");
        when(userRepository.findByAuthSubject(subject)).thenReturn(Optional.of(existingUser));
        when(azureBlobStorageService.uploadImage(any(MultipartFile.class), anyString(), eq("image/png")))
                .thenReturn(NEW_AVATAR_URL);
        stubProfileStats(existingUser);

        var result = userService.uploadCurrentUserAvatar(jwt, file);

        assertThat(result.getAvatarUrl()).isEqualTo(NEW_AVATAR_URL);
        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(azureBlobStorageService).uploadImage(same(file), pathCaptor.capture(), eq("image/png"));
        assertThat(pathCaptor.getValue())
                .matches("avatars/" + existingUser.getId() + "/[0-9a-fA-F-]{36}\\.png");
        verify(azureBlobStorageService, never()).deleteByUrlQuietly(anyString());

        ArgumentCaptor<UserAccount> userCaptor = ArgumentCaptor.forClass(UserAccount.class);
        verify(userRepository).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getAvatarUrl()).isEqualTo(NEW_AVATAR_URL);
    }

    @Test
    @DisplayName("Deletes the previous avatar URL after uploading a replacement avatar.")
    void shouldDeletePreviousAvatarWhenAvatarIsReplaced() {
        setMaxImageBytes(10L * 1024L * 1024L);
        String subject = "user_replace_avatar";
        Jwt jwt = jwt(subject, "replace-avatar@example.test", true);
        UserAccount existingUser = TestFixtures.userAccount()
                .authSubject(subject)
                .avatarUrl(OLD_AVATAR_URL)
                .build();
        MockMultipartFile file = validPngFile("avatar.png");
        when(userRepository.findByAuthSubject(subject)).thenReturn(Optional.of(existingUser));
        when(azureBlobStorageService.uploadImage(any(MultipartFile.class), anyString(), eq("image/png")))
                .thenReturn(NEW_AVATAR_URL);
        stubProfileStats(existingUser);

        var result = userService.uploadCurrentUserAvatar(jwt, file);

        assertThat(result.getAvatarUrl()).isEqualTo(NEW_AVATAR_URL);
        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(azureBlobStorageService).uploadImage(same(file), pathCaptor.capture(), eq("image/png"));
        assertThat(pathCaptor.getValue())
                .matches("avatars/" + existingUser.getId() + "/[0-9a-fA-F-]{36}\\.png");
        verify(azureBlobStorageService).deleteByUrlQuietly(OLD_AVATAR_URL);

        ArgumentCaptor<UserAccount> userCaptor = ArgumentCaptor.forClass(UserAccount.class);
        verify(userRepository).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getAvatarUrl()).isEqualTo(NEW_AVATAR_URL);
    }

    @Test
    @DisplayName("Keeps the existing avatar blob when upload returns the same URL.")
    void shouldNotDeleteAvatarWhenUploadReturnsSameUrl() {
        setMaxImageBytes(10L * 1024L * 1024L);
        String subject = "user_same_avatar_url";
        Jwt jwt = jwt(subject, "same-avatar@example.test", true);
        UserAccount existingUser = TestFixtures.userAccount()
                .authSubject(subject)
                .avatarUrl(OLD_AVATAR_URL)
                .build();
        MockMultipartFile file = validPngFile("avatar.png");
        when(userRepository.findByAuthSubject(subject)).thenReturn(Optional.of(existingUser));
        when(azureBlobStorageService.uploadImage(any(MultipartFile.class), anyString(), eq("image/png")))
                .thenReturn(OLD_AVATAR_URL);
        stubProfileStats(existingUser);

        var result = userService.uploadCurrentUserAvatar(jwt, file);

        assertThat(result.getAvatarUrl()).isEqualTo(OLD_AVATAR_URL);
        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(azureBlobStorageService).uploadImage(same(file), pathCaptor.capture(), eq("image/png"));
        assertThat(pathCaptor.getValue())
                .matches("avatars/" + existingUser.getId() + "/[0-9a-fA-F-]{36}\\.png");
        verify(azureBlobStorageService, never()).deleteByUrlQuietly(anyString());

        ArgumentCaptor<UserAccount> userCaptor = ArgumentCaptor.forClass(UserAccount.class);
        verify(userRepository).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getAvatarUrl()).isEqualTo(OLD_AVATAR_URL);
    }

    @Test
    @DisplayName("Rejects a missing avatar file before uploading or deleting storage.")
    void shouldRejectNullAvatarFileBeforeUpload() {
        setMaxImageBytes(10L * 1024L * 1024L);
        String subject = "user_null_avatar";
        Jwt jwt = jwt(subject, "null-avatar@example.test", true);
        UserAccount existingUser = TestFixtures.userAccount()
                .authSubject(subject)
                .avatarUrl(OLD_AVATAR_URL)
                .build();
        when(userRepository.findByAuthSubject(subject)).thenReturn(Optional.of(existingUser));

        assertThatThrownBy(() -> userService.uploadCurrentUserAvatar(jwt, null))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(ex.getReason()).isEqualTo("Image file is required.");
                });
        verify(azureBlobStorageService, never()).uploadImage(any(), anyString(), anyString());
        verify(azureBlobStorageService, never()).deleteByUrlQuietly(anyString());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Rejects an empty avatar file before uploading or deleting storage.")
    void shouldRejectEmptyAvatarFileBeforeUpload() {
        setMaxImageBytes(10L * 1024L * 1024L);
        String subject = "user_empty_avatar";
        Jwt jwt = jwt(subject, "empty-avatar@example.test", true);
        UserAccount existingUser = TestFixtures.userAccount()
                .authSubject(subject)
                .avatarUrl(OLD_AVATAR_URL)
                .build();
        MockMultipartFile file = new MockMultipartFile("file", "empty.png", "image/png", new byte[0]);
        when(userRepository.findByAuthSubject(subject)).thenReturn(Optional.of(existingUser));

        assertThatThrownBy(() -> userService.uploadCurrentUserAvatar(jwt, file))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(ex.getReason()).isEqualTo("Image file is required.");
                });
        verify(azureBlobStorageService, never()).uploadImage(any(), anyString(), anyString());
        verify(azureBlobStorageService, never()).deleteByUrlQuietly(anyString());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Rejects an unsupported avatar content type before uploading or deleting storage.")
    void shouldRejectUnsupportedAvatarContentTypeBeforeUpload() {
        setMaxImageBytes(10L * 1024L * 1024L);
        String subject = "user_text_avatar";
        Jwt jwt = jwt(subject, "text-avatar@example.test", true);
        UserAccount existingUser = TestFixtures.userAccount()
                .authSubject(subject)
                .avatarUrl(OLD_AVATAR_URL)
                .build();
        MockMultipartFile file = new MockMultipartFile("file", "avatar.txt", "text/plain", validPng());
        when(userRepository.findByAuthSubject(subject)).thenReturn(Optional.of(existingUser));

        assertThatThrownBy(() -> userService.uploadCurrentUserAvatar(jwt, file))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(ex.getReason()).isEqualTo("Unsupported image format. Please use PNG/JPG/WEBP/GIF.");
                });
        verify(azureBlobStorageService, never()).uploadImage(any(), anyString(), anyString());
        verify(azureBlobStorageService, never()).deleteByUrlQuietly(anyString());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Rejects an SVG avatar before uploading or deleting storage.")
    void shouldRejectSvgAvatarBeforeUpload() {
        setMaxImageBytes(10L * 1024L * 1024L);
        String subject = "user_svg_avatar";
        Jwt jwt = jwt(subject, "svg-avatar@example.test", true);
        UserAccount existingUser = TestFixtures.userAccount()
                .authSubject(subject)
                .avatarUrl(OLD_AVATAR_URL)
                .build();
        MockMultipartFile file = new MockMultipartFile("file", "avatar.svg", "image/svg+xml", "<svg/>".getBytes());
        when(userRepository.findByAuthSubject(subject)).thenReturn(Optional.of(existingUser));

        assertThatThrownBy(() -> userService.uploadCurrentUserAvatar(jwt, file))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(ex.getReason()).isEqualTo("SVG images are not supported.");
                });
        verify(azureBlobStorageService, never()).uploadImage(any(), anyString(), anyString());
        verify(azureBlobStorageService, never()).deleteByUrlQuietly(anyString());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Rejects an oversized avatar before uploading or deleting storage.")
    void shouldRejectOversizedAvatarBeforeUpload() {
        setMaxImageBytes(1L);
        String subject = "user_oversized_avatar";
        Jwt jwt = jwt(subject, "oversized-avatar@example.test", true);
        UserAccount existingUser = TestFixtures.userAccount()
                .authSubject(subject)
                .avatarUrl(OLD_AVATAR_URL)
                .build();
        MockMultipartFile file = validPngFile("avatar.png");
        when(userRepository.findByAuthSubject(subject)).thenReturn(Optional.of(existingUser));

        assertThatThrownBy(() -> userService.uploadCurrentUserAvatar(jwt, file))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
                    assertThat(ex.getReason()).isEqualTo("Image is too large.");
                });
        verify(azureBlobStorageService, never()).uploadImage(any(), anyString(), anyString());
        verify(azureBlobStorageService, never()).deleteByUrlQuietly(anyString());
        verify(userRepository, never()).save(any());
    }

    private Jwt jwt(String subject, String email, boolean emailVerified) {
        return jwtWithClaims(subject, builder -> builder
                .claim("email", email)
                .claim("email_verified", emailVerified));
    }

    private Jwt jwtWithClaims(String subject, Consumer<Jwt.Builder> configureClaims) {
        Jwt.Builder builder = Jwt.withTokenValue("token-" + subject)
                .header("alg", "none")
                .issuer(CLERK_ISSUER)
                .subject(subject);
        configureClaims.accept(builder);
        return builder.build();
    }

    private Jwt jwtWithoutSubject(String email, boolean emailVerified) {
        return Jwt.withTokenValue("token-without-subject")
                .header("alg", "none")
                .issuer(CLERK_ISSUER)
                .claim("email", email)
                .claim("email_verified", emailVerified)
                .build();
    }

    private UserSkill skill(String skillName, UserAccount user) {
        UserSkill skill = new UserSkill();
        skill.setSkillName(skillName);
        skill.setUser(user);
        return skill;
    }

    private void setMaxImageBytes(long maxImageBytes) {
        ReflectionTestUtils.setField(userService, "maxImageBytes", maxImageBytes);
    }

    private void stubProfileStats(UserAccount user) {
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(workshopRepository.countByFacilitatorId(user.getId())).thenReturn(0L);
        when(participantRepository.countByUserId(user.getId())).thenReturn(0L);
    }

    private MockMultipartFile validPngFile(String fileName) {
        return new MockMultipartFile("file", fileName, "image/png", validPng());
    }

    private byte[] validPng() {
        return java.util.Base64.getDecoder()
                .decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=");
    }
}
