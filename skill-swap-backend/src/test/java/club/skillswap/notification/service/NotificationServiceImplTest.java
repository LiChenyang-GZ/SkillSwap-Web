package club.skillswap.notification.service;

import club.skillswap.notification.repository.NotificationRepository;
import club.skillswap.testsupport.TestFixtures;
import club.skillswap.user.entity.UserAccount;
import club.skillswap.user.repository.UserRepository;
import club.skillswap.user.service.UserService;
import club.skillswap.workshop.repository.WorkshopRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceImplTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserService userService;

    @Mock
    private WorkshopRepository workshopRepository;

    @InjectMocks
    private NotificationServiceImpl notificationService;

    @Test
    @DisplayName("Resolves notification user ID from JwtAuthenticationToken through UserService.")
    void shouldResolveUserIdFromJwtAuthenticationToken() {
        UUID userId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        Jwt jwt = jwt("user_notification");
        UserAccount user = TestFixtures.userAccount()
                .id(userId)
                .authSubject(jwt.getSubject())
                .build();
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(user);
        when(notificationRepository.countByRecipientIdAndIsReadFalse(userId)).thenReturn(3L);

        long count = notificationService.getUnreadCount(jwtAuthentication(jwt));

        assertThat(count).isEqualTo(3L);
        verify(userService).findOrCreateCurrentUser(jwt);
        verify(notificationRepository).countByRecipientIdAndIsReadFalse(userId);
    }

    @Test
    @DisplayName("Rejects UserDetails principal instead of parsing username as UUID.")
    void shouldRejectUserDetailsPrincipal() {
        UUID username = UUID.fromString("22222222-2222-2222-2222-222222222222");

        assertUnsupportedAuthentication(userDetailsAuthentication(username.toString()));
        verify(userService, never()).findOrCreateCurrentUser(any());
        verifyNoInteractions(notificationRepository, userRepository, workshopRepository);
    }

    @Test
    @DisplayName("Rejects DefaultOAuth2User principal instead of parsing sub or id as UUID.")
    void shouldRejectDefaultOAuth2UserPrincipal() {
        UUID subject = UUID.fromString("33333333-3333-3333-3333-333333333333");

        assertUnsupportedAuthentication(defaultOAuth2Authentication(subject.toString()));
        verify(userService, never()).findOrCreateCurrentUser(any());
        verifyNoInteractions(notificationRepository, userRepository, workshopRepository);
    }

    private void assertUnsupportedAuthentication(Authentication authentication) {
        assertThatThrownBy(() -> notificationService.getUnreadCount(authentication))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(ex.getReason()).isEqualTo("Unsupported authentication type.");
                });
    }

    private Authentication jwtAuthentication(Jwt jwt) {
        return new JwtAuthenticationToken(jwt, List.of(), jwt.getSubject());
    }

    private Authentication userDetailsAuthentication(String username) {
        UserDetails userDetails = User.withUsername(username)
                .password("ignored")
                .authorities("ROLE_USER")
                .build();
        return new UsernamePasswordAuthenticationToken(userDetails, "ignored", userDetails.getAuthorities());
    }

    private Authentication defaultOAuth2Authentication(String subject) {
        DefaultOAuth2User principal = new DefaultOAuth2User(
                List.of(new SimpleGrantedAuthority("ROLE_USER")),
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
}
