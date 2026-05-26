package club.skillswap.common.config;

import club.skillswap.testsupport.TestFixtures;
import club.skillswap.user.entity.UserAccount;
import club.skillswap.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

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
class JwtConverterTest {

    @Mock
    private UserRepository userRepository;

    @Test
    @DisplayName("Grants admin authority for a user found by auth subject.")
    void shouldGrantAdminAuthorityForAuthSubjectAdmin() {
        String subject = "user_admin";
        UserAccount admin = TestFixtures.userAccount()
                .authSubject(subject)
                .role(" role_admin ")
                .build();
        when(userRepository.findByAuthSubject(subject)).thenReturn(Optional.of(admin));
        JwtConverter converter = new JwtConverter(userRepository);

        AbstractAuthenticationToken authentication = converter.convert(jwt(subject));

        assertThat(authentication.getName()).isEqualTo(subject);
        assertThat(authentication.getAuthorities())
                .extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_ADMIN");
        verify(userRepository).findByAuthSubject(subject);
        verify(userRepository, never()).findById(any());
    }

    @Test
    @DisplayName("Does not fall back to internal user ID lookup for UUID-shaped subjects.")
    void shouldNotLookupUserByIdForUuidShapedSubject() {
        UUID subjectUuid = UUID.fromString("33333333-3333-3333-3333-333333333333");
        String subject = subjectUuid.toString();
        when(userRepository.findByAuthSubject(subject)).thenReturn(Optional.empty());
        JwtConverter converter = new JwtConverter(userRepository);

        AbstractAuthenticationToken authentication = converter.convert(jwt(subject));

        assertThat(authentication.getName()).isEqualTo(subject);
        assertThat(authentication.getAuthorities()).isEmpty();
        verify(userRepository).findByAuthSubject(subject);
        verify(userRepository, never()).findById(any());
    }

    @Test
    @DisplayName("Rejects a JWT with no subject before role lookup.")
    void shouldRejectNullSubjectBeforeLookup() {
        JwtConverter converter = new JwtConverter(userRepository);

        assertThatThrownBy(() -> converter.convert(jwtWithoutSubject()))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("JWT subject is required.");
        verifyNoInteractions(userRepository);
    }

    @Test
    @DisplayName("Rejects a blank JWT subject before role lookup.")
    void shouldRejectBlankSubjectBeforeLookup() {
        JwtConverter converter = new JwtConverter(userRepository);

        assertThatThrownBy(() -> converter.convert(jwt("   ")))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("JWT subject is required.");
        verifyNoInteractions(userRepository);
    }

    private Jwt jwt(String subject) {
        return Jwt.withTokenValue("token-" + subject)
                .header("alg", "none")
                .subject(subject)
                .build();
    }

    private Jwt jwtWithoutSubject() {
        return Jwt.withTokenValue("token-without-subject")
                .header("alg", "none")
                .claim("email", "missing-subject@example.test")
                .build();
    }
}
