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
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    private static final String CLERK_ISSUER = "https://clerk.test.invalid";

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

        // FIXME: Current behavior depends on the Clerk signupTemplate emitting email_verified.
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

    private Jwt jwt(String subject, String email, boolean emailVerified) {
        return Jwt.withTokenValue("token-" + subject)
                .header("alg", "none")
                .issuer(CLERK_ISSUER)
                .subject(subject)
                .claim("email", email)
                .claim("email_verified", emailVerified)
                .build();
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
}
