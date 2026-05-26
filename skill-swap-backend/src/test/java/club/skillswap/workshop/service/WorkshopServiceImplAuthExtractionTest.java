package club.skillswap.workshop.service;

import club.skillswap.common.storage.AzureBlobStorageService;
import club.skillswap.notification.service.NotificationService;
import club.skillswap.testsupport.TestFixtures;
import club.skillswap.user.entity.UserAccount;
import club.skillswap.user.service.UserService;
import club.skillswap.workshop.entity.Workshop;
import club.skillswap.workshop.entity.WorkshopParticipant;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkshopServiceImplAuthExtractionTest {

    @Mock
    private WorkshopRepository workshopRepository;

    @Mock
    private UserService userService;

    @Mock
    private WorkshopParticipantRepository participantRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private AzureBlobStorageService azureBlobStorageService;

    @InjectMocks
    private WorkshopServiceImpl workshopService;

    @Test
    @DisplayName("Resolves workshop user ID from JwtAuthenticationToken through UserService.")
    void shouldResolveUserIdFromJwtAuthenticationToken() {
        UUID userId = UUID.fromString("44444444-4444-4444-4444-444444444444");
        Jwt jwt = jwt("user_workshop");
        UserAccount user = TestFixtures.userAccount()
                .id(userId)
                .authSubject(jwt.getSubject())
                .build();
        Workshop workshop = pendingWorkshop(10L, user);
        when(workshopRepository.findById(10L)).thenReturn(Optional.of(workshop));
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(user);
        when(userService.findAdmins()).thenReturn(List.of());

        workshopService.requestWorkshopApproval(10L, jwtAuthentication(jwt));

        verify(userService).findOrCreateCurrentUser(jwt);
        verify(userService).findAdmins();
        verifyNoInteractions(notificationService);
    }

    @Test
    @DisplayName("Rejects UserDetails principal instead of parsing username as UUID.")
    void shouldRejectUserDetailsPrincipal() {
        UUID username = UUID.fromString("55555555-5555-5555-5555-555555555555");

        assertUnsupportedAuthentication(userDetailsAuthentication(username.toString()));
        verify(userService, never()).findOrCreateCurrentUser(any());
        verify(userService, never()).findUserByStringId(anyString());
        verify(userService, never()).findAdmins();
        verifyNoInteractions(notificationService);
    }

    @Test
    @DisplayName("Rejects DefaultOAuth2User principal instead of parsing sub or id as UUID.")
    void shouldRejectDefaultOAuth2UserPrincipal() {
        UUID subject = UUID.fromString("66666666-6666-6666-6666-666666666666");

        assertUnsupportedAuthentication(defaultOAuth2Authentication(subject.toString()));
        verify(userService, never()).findOrCreateCurrentUser(any());
        verify(userService, never()).findUserByStringId(anyString());
        verify(userService, never()).findAdmins();
        verifyNoInteractions(notificationService);
    }

    @Test
    @DisplayName("Rejects non-JWT ROLE_ADMIN for admin workshop list.")
    void shouldRejectNonJwtRoleAdminForAdminWorkshopList() {
        assertUnsupportedAuthentication(() ->
                workshopService.getAllWorkshopsForAdmin(nonJwtAdminAuthentication()));

        verify(workshopRepository, never()).findAllWithFacilitator();
        verify(userService, never()).findOrCreateCurrentUser(any());
    }

    @Test
    @DisplayName("Rejects non-JWT ROLE_ADMIN for pending workshop list.")
    void shouldRejectNonJwtRoleAdminForPendingWorkshops() {
        assertUnsupportedAuthentication(() ->
                workshopService.getPendingWorkshops(nonJwtAdminAuthentication()));

        verify(workshopRepository, never()).findAllPendingWithFacilitator();
        verify(userService, never()).findOrCreateCurrentUser(any());
    }

    @Test
    @DisplayName("Rejects non-JWT ROLE_ADMIN before deleting a workshop.")
    void shouldRejectNonJwtRoleAdminForDeleteWorkshop() {
        assertUnsupportedAuthentication(() ->
                workshopService.deleteWorkshop(10L, nonJwtAdminAuthentication()));

        verify(workshopRepository, never()).findById(any());
        verify(userService, never()).findOrCreateCurrentUser(any());
    }

    @Test
    @DisplayName("Allows JwtAuthenticationToken with admin authority for admin workshop list.")
    void shouldAllowJwtAdminForAdminWorkshopList() {
        Jwt jwt = jwt("user_admin");
        when(workshopRepository.findAllWithFacilitator()).thenReturn(List.of());

        List<?> workshops = workshopService.getAllWorkshopsForAdmin(jwtAdminAuthentication(jwt));

        assertThat(workshops).isEmpty();
        verify(workshopRepository).findAllWithFacilitator();
    }

    @Test
    @DisplayName("Forbids JwtAuthenticationToken without admin authority for admin workshop list.")
    void shouldForbidJwtWithoutAdminAuthorityForAdminWorkshopList() {
        Jwt jwt = jwt("user_member");

        assertThatThrownBy(() -> workshopService.getAllWorkshopsForAdmin(jwtAuthentication(jwt)))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(ex.getReason()).isEqualTo("Admin access required.");
                });

        verify(workshopRepository, never()).findAllWithFacilitator();
    }

    @Test
    @DisplayName("Join resolves the current user through JwtAuthenticationToken, not authentication name.")
    void shouldJoinWorkshopWithJwtCurrentUser() {
        UUID userId = UUID.fromString("88888888-8888-8888-8888-888888888888");
        Jwt jwt = jwt("user_join");
        UserAccount user = TestFixtures.userAccount()
                .id(userId)
                .authSubject(jwt.getSubject())
                .build();
        Workshop workshop = upcomingWorkshop(20L);
        when(workshopRepository.findById(20L)).thenReturn(Optional.of(workshop));
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(user);
        when(participantRepository.findByUserIdAndWorkshopId(userId, 20L)).thenReturn(List.of());

        workshopService.joinWorkshop(20L, jwtAuthentication(jwt));

        verify(userService).findOrCreateCurrentUser(jwt);
        verify(userService, never()).findUserByStringId(anyString());
        ArgumentCaptor<WorkshopParticipant> participantCaptor = ArgumentCaptor.forClass(WorkshopParticipant.class);
        verify(participantRepository).save(participantCaptor.capture());
        WorkshopParticipant participant = participantCaptor.getValue();
        assertThat(participant.getWorkshop()).isSameAs(workshop);
        assertThat(participant.getUser()).isSameAs(user);
    }

    @Test
    @DisplayName("Leave resolves the current user through JwtAuthenticationToken, not authentication name.")
    void shouldLeaveWorkshopWithJwtCurrentUser() {
        UUID userId = UUID.fromString("99999999-9999-9999-9999-999999999999");
        Jwt jwt = jwt("user_leave");
        UserAccount user = TestFixtures.userAccount()
                .id(userId)
                .authSubject(jwt.getSubject())
                .build();
        Workshop workshop = upcomingWorkshop(30L);
        WorkshopParticipant participant = new WorkshopParticipant();
        participant.setWorkshop(workshop);
        participant.setUser(user);
        List<WorkshopParticipant> participations = List.of(participant);
        when(workshopRepository.findById(30L)).thenReturn(Optional.of(workshop));
        when(userService.findOrCreateCurrentUser(jwt)).thenReturn(user);
        when(participantRepository.findByUserIdAndWorkshopId(userId, 30L)).thenReturn(participations);

        workshopService.leaveWorkshop(30L, jwtAuthentication(jwt));

        verify(userService).findOrCreateCurrentUser(jwt);
        verify(userService, never()).findUserByStringId(anyString());
        verify(participantRepository).deleteAll(participations);
    }

    @Test
    @DisplayName("Join rejects UUID-shaped non-JWT authentication name without legacy lookup.")
    void shouldRejectUuidNamedNonJwtForJoinWithoutLegacyLookup() {
        UUID authenticationName = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

        assertUnsupportedAuthentication(() ->
                workshopService.joinWorkshop(20L, namedAuthentication(authenticationName.toString())));

        verify(userService, never()).findOrCreateCurrentUser(any());
        verify(userService, never()).findUserByStringId(anyString());
        verifyNoInteractions(workshopRepository, participantRepository, notificationService);
    }

    @Test
    @DisplayName("Leave rejects UUID-shaped non-JWT authentication name without legacy lookup.")
    void shouldRejectUuidNamedNonJwtForLeaveWithoutLegacyLookup() {
        UUID authenticationName = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

        assertUnsupportedAuthentication(() ->
                workshopService.leaveWorkshop(30L, namedAuthentication(authenticationName.toString())));

        verify(userService, never()).findOrCreateCurrentUser(any());
        verify(userService, never()).findUserByStringId(anyString());
        verifyNoInteractions(workshopRepository, participantRepository, notificationService);
    }

    private void assertUnsupportedAuthentication(Authentication authentication) {
        UserAccount facilitator = TestFixtures.userAccount()
                .id(UUID.fromString("77777777-7777-7777-7777-777777777777"))
                .build();
        when(workshopRepository.findById(10L)).thenReturn(Optional.of(pendingWorkshop(10L, facilitator)));

        assertThatThrownBy(() -> workshopService.requestWorkshopApproval(10L, authentication))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(ex.getReason()).isEqualTo("Unsupported authentication type.");
                });
    }

    private void assertUnsupportedAuthentication(Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(ex.getReason()).isEqualTo("Unsupported authentication type.");
                });
    }

    private Workshop pendingWorkshop(Long id, UserAccount facilitator) {
        Workshop workshop = new Workshop();
        workshop.setId(id);
        workshop.setTitle("Pending workshop");
        workshop.setStatus("pending");
        workshop.setFacilitator(facilitator);
        return workshop;
    }

    private Workshop upcomingWorkshop(Long id) {
        Workshop workshop = new Workshop();
        workshop.setId(id);
        workshop.setTitle("Upcoming workshop");
        workshop.setStatus("approved");
        workshop.setDate(LocalDate.now().plusDays(3));
        workshop.setTime(LocalTime.NOON);
        workshop.setAttendCloseAt(LocalDateTime.now().plusDays(1));
        return workshop;
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

    private Authentication userDetailsAuthentication(String username) {
        UserDetails userDetails = User.withUsername(username)
                .password("ignored")
                .authorities("ROLE_USER")
                .build();
        return new UsernamePasswordAuthenticationToken(userDetails, "ignored", userDetails.getAuthorities());
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
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
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
