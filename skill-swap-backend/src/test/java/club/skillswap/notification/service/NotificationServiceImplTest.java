package club.skillswap.notification.service;

import club.skillswap.common.exception.ResourceNotFoundException;
import club.skillswap.notification.dto.NotificationResponseDto;
import club.skillswap.notification.entity.Notification;
import club.skillswap.notification.repository.NotificationRepository;
import club.skillswap.testsupport.TestFixtures;
import club.skillswap.user.entity.UserAccount;
import club.skillswap.user.repository.UserRepository;
import club.skillswap.user.service.UserService;
import club.skillswap.workshop.entity.Workshop;
import club.skillswap.workshop.repository.WorkshopRepository;
import org.junit.jupiter.api.BeforeEach;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceImplTest {

    private static final UUID CURRENT_USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID OTHER_USER_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final long WORKSHOP_ID = 99L;

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

    private UserAccount currentUser;
    private Jwt currentJwt;
    private Authentication currentAuthentication;

    @BeforeEach
    void setUp() {
        currentJwt = jwt("user_notification");
        currentAuthentication = jwtAuthentication(currentJwt);
        currentUser = TestFixtures.userAccount()
                .id(CURRENT_USER_ID)
                .authSubject(currentJwt.getSubject())
                .build();
    }

    @Test
    @DisplayName("Resolves notification user ID from JwtAuthenticationToken through UserService.")
    void shouldResolveUserIdFromJwtAuthenticationToken() {
        when(userService.findOrCreateCurrentUser(currentJwt)).thenReturn(currentUser);
        when(notificationRepository.countByRecipientIdAndIsReadFalse(CURRENT_USER_ID)).thenReturn(3L);

        long count = notificationService.getUnreadCount(currentAuthentication);

        assertThat(count).isEqualTo(3L);
        verify(userService).findOrCreateCurrentUser(currentJwt);
        verify(notificationRepository).countByRecipientIdAndIsReadFalse(CURRENT_USER_ID);
    }

    @Test
    @DisplayName("Returns current user's notifications as DTOs ordered by the repository.")
    void shouldReturnNotificationsForResolvedRecipient() {
        Workshop workshop = workshop(WORKSHOP_ID);
        LocalDateTime firstCreatedAt = LocalDateTime.of(2026, 5, 20, 10, 15);
        LocalDateTime secondCreatedAt = LocalDateTime.of(2026, 5, 19, 9, 0);
        Notification unreadNotification = notification(10L, currentUser, workshop, "WORKSHOP_APPROVED",
                "Approved", "Your workshop was approved.", firstCreatedAt, false);
        Notification readNotification = notification(11L, currentUser, null, "SYSTEM",
                "Welcome", "Welcome to SkillSwap.", secondCreatedAt, true);
        when(userService.findOrCreateCurrentUser(currentJwt)).thenReturn(currentUser);
        when(notificationRepository.findByRecipientIdOrderByCreatedAtDesc(CURRENT_USER_ID))
                .thenReturn(List.of(unreadNotification, readNotification));

        List<NotificationResponseDto> result = notificationService.getNotifications(currentAuthentication);

        assertThat(result)
                .extracting(NotificationResponseDto::id)
                .containsExactly("10", "11");
        assertThat(result.get(0).userId()).isEqualTo(CURRENT_USER_ID.toString());
        assertThat(result.get(0).type()).isEqualTo("WORKSHOP_APPROVED");
        assertThat(result.get(0).title()).isEqualTo("Approved");
        assertThat(result.get(0).message()).isEqualTo("Your workshop was approved.");
        assertThat(result.get(0).timestamp()).isEqualTo(firstCreatedAt);
        assertThat(result.get(0).read()).isFalse();
        assertThat(result.get(0).workshopId()).isEqualTo(String.valueOf(WORKSHOP_ID));
        assertThat(result.get(1).workshopId()).isNull();
        assertThat(result.get(1).read()).isTrue();
        verify(notificationRepository).findByRecipientIdOrderByCreatedAtDesc(CURRENT_USER_ID);
    }

    @Test
    @DisplayName("Marks an unread notification as read for the resolved recipient.")
    void shouldMarkUnreadNotificationRead() {
        Notification notification = notification(20L, currentUser, null, "SYSTEM",
                "Reminder", "Please check your updates.", LocalDateTime.of(2026, 5, 21, 12, 0), false);
        when(userService.findOrCreateCurrentUser(currentJwt)).thenReturn(currentUser);
        when(notificationRepository.findByIdAndRecipientId(20L, CURRENT_USER_ID))
                .thenReturn(Optional.of(notification));

        NotificationResponseDto result = notificationService.markRead(20L, currentAuthentication);

        ArgumentCaptor<Notification> notificationCaptor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(notificationCaptor.capture());
        Notification savedNotification = notificationCaptor.getValue();
        assertThat(savedNotification).isSameAs(notification);
        assertThat(savedNotification.isRead()).isTrue();
        assertThat(savedNotification.getReadAt()).isNotNull();
        assertThat(result.id()).isEqualTo("20");
        assertThat(result.read()).isTrue();
    }

    @Test
    @DisplayName("Returns an already-read notification without saving it again.")
    void shouldNotSaveWhenNotificationAlreadyRead() {
        LocalDateTime readAt = LocalDateTime.of(2026, 5, 21, 13, 0);
        Notification notification = notification(21L, currentUser, null, "SYSTEM",
                "Already read", "This was already read.", LocalDateTime.of(2026, 5, 21, 12, 0), true);
        notification.setReadAt(readAt);
        when(userService.findOrCreateCurrentUser(currentJwt)).thenReturn(currentUser);
        when(notificationRepository.findByIdAndRecipientId(21L, CURRENT_USER_ID))
                .thenReturn(Optional.of(notification));

        NotificationResponseDto result = notificationService.markRead(21L, currentAuthentication);

        assertThat(result.id()).isEqualTo("21");
        assertThat(result.read()).isTrue();
        assertThat(notification.getReadAt()).isEqualTo(readAt);
        verify(notificationRepository, never()).save(any(Notification.class));
    }

    @Test
    @DisplayName("Throws ResourceNotFoundException when the notification is not scoped to the current user.")
    void shouldThrowWhenNotificationMissingForRecipient() {
        when(userService.findOrCreateCurrentUser(currentJwt)).thenReturn(currentUser);
        when(notificationRepository.findByIdAndRecipientId(404L, CURRENT_USER_ID))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.markRead(404L, currentAuthentication))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Notification not found with ID: 404");
        verify(notificationRepository, never()).save(any(Notification.class));
    }

    @Test
    @DisplayName("Returns the repository update count when marking all notifications read.")
    void shouldReturnUpdatedCountWhenMarkingAllRead() {
        when(userService.findOrCreateCurrentUser(currentJwt)).thenReturn(currentUser);
        when(notificationRepository.markAllReadByRecipientId(CURRENT_USER_ID)).thenReturn(4);

        int result = notificationService.markAllRead(currentAuthentication);

        assertThat(result).isEqualTo(4);
        verify(notificationRepository).markAllReadByRecipientId(CURRENT_USER_ID);
    }

    @Test
    @DisplayName("Creates an unread notification for a recipient ID and workshop ID.")
    void shouldCreateNotificationFromIds() {
        Workshop workshop = workshop(WORKSHOP_ID);
        when(userRepository.findById(CURRENT_USER_ID)).thenReturn(Optional.of(currentUser));
        when(workshopRepository.findById(WORKSHOP_ID)).thenReturn(Optional.of(workshop));

        notificationService.createNotification(CURRENT_USER_ID, "WORKSHOP_APPROVED",
                "Approved", "Your workshop was approved.", WORKSHOP_ID);

        ArgumentCaptor<Notification> notificationCaptor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(notificationCaptor.capture());
        Notification savedNotification = notificationCaptor.getValue();
        assertThat(savedNotification.getRecipient()).isSameAs(currentUser);
        assertThat(savedNotification.getWorkshop()).isSameAs(workshop);
        assertThat(savedNotification.getType()).isEqualTo("WORKSHOP_APPROVED");
        assertThat(savedNotification.getTitle()).isEqualTo("Approved");
        assertThat(savedNotification.getMessage()).isEqualTo("Your workshop was approved.");
        assertThat(savedNotification.isRead()).isFalse();
    }

    @Test
    @DisplayName("Returns normally without saving when recipient ID is null.")
    void shouldSkipCreateFromIdsWhenRecipientIdIsNull() {
        assertThatCode(() -> notificationService.createNotification((UUID) null, "SYSTEM",
                "Ignored", "No recipient.", WORKSHOP_ID))
                .doesNotThrowAnyException();

        verify(notificationRepository, never()).save(any(Notification.class));
        verify(userRepository, never()).findById(any());
        verify(workshopRepository, never()).findById(any());
    }

    @Test
    @DisplayName("Returns normally without saving when recipient ID does not resolve.")
    void shouldSkipCreateWhenRecipientIsMissing() {
        when(userRepository.findById(OTHER_USER_ID)).thenReturn(Optional.empty());

        assertThatCode(() -> notificationService.createNotification(OTHER_USER_ID, "SYSTEM",
                "Ignored", "Missing recipient.", WORKSHOP_ID))
                .doesNotThrowAnyException();

        verify(notificationRepository, never()).save(any(Notification.class));
        verify(workshopRepository, never()).findById(any());
    }

    @Test
    @DisplayName("Creates a notification without a workshop when workshop ID is null.")
    void shouldCreateNotificationWithoutWorkshopWhenWorkshopIdIsNull() {
        when(userRepository.findById(CURRENT_USER_ID)).thenReturn(Optional.of(currentUser));

        notificationService.createNotification(CURRENT_USER_ID, "SYSTEM",
                "General", "No workshop attached.", null);

        ArgumentCaptor<Notification> notificationCaptor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(notificationCaptor.capture());
        Notification savedNotification = notificationCaptor.getValue();
        assertThat(savedNotification.getRecipient()).isSameAs(currentUser);
        assertThat(savedNotification.getWorkshop()).isNull();
        assertThat(savedNotification.getType()).isEqualTo("SYSTEM");
        assertThat(savedNotification.isRead()).isFalse();
        verify(workshopRepository, never()).findById(any());
    }

    @Test
    @DisplayName("Creates a notification without a workshop when workshop ID does not resolve.")
    void shouldCreateNotificationWithoutWorkshopWhenWorkshopIsMissing() {
        when(userRepository.findById(CURRENT_USER_ID)).thenReturn(Optional.of(currentUser));
        when(workshopRepository.findById(WORKSHOP_ID)).thenReturn(Optional.empty());

        notificationService.createNotification(CURRENT_USER_ID, "SYSTEM",
                "General", "Missing workshop.", WORKSHOP_ID);

        ArgumentCaptor<Notification> notificationCaptor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(notificationCaptor.capture());
        Notification savedNotification = notificationCaptor.getValue();
        assertThat(savedNotification.getRecipient()).isSameAs(currentUser);
        assertThat(savedNotification.getWorkshop()).isNull();
        assertThat(savedNotification.getType()).isEqualTo("SYSTEM");
        assertThat(savedNotification.isRead()).isFalse();
    }

    @Test
    @DisplayName("Creates a notification from recipient and workshop entity IDs.")
    void shouldCreateNotificationFromEntityIds() {
        UserAccount inputRecipient = TestFixtures.userAccount()
                .id(CURRENT_USER_ID)
                .authSubject("input-recipient")
                .build();
        Workshop inputWorkshop = workshop(WORKSHOP_ID);
        Workshop storedWorkshop = workshop(WORKSHOP_ID);
        when(userRepository.findById(CURRENT_USER_ID)).thenReturn(Optional.of(currentUser));
        when(workshopRepository.findById(WORKSHOP_ID)).thenReturn(Optional.of(storedWorkshop));

        notificationService.createNotification(inputRecipient, "WORKSHOP_REJECTED",
                "Rejected", "Please revise your workshop.", inputWorkshop);

        ArgumentCaptor<Notification> notificationCaptor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(notificationCaptor.capture());
        Notification savedNotification = notificationCaptor.getValue();
        assertThat(savedNotification.getRecipient()).isSameAs(currentUser);
        assertThat(savedNotification.getWorkshop()).isSameAs(storedWorkshop);
        assertThat(savedNotification.getType()).isEqualTo("WORKSHOP_REJECTED");
        assertThat(savedNotification.getTitle()).isEqualTo("Rejected");
        assertThat(savedNotification.getMessage()).isEqualTo("Please revise your workshop.");
        assertThat(savedNotification.isRead()).isFalse();
    }

    @Test
    @DisplayName("Returns normally without saving when recipient entity is null.")
    void shouldSkipCreateFromEntitiesWhenRecipientIsNull() {
        Workshop workshop = workshop(WORKSHOP_ID);

        assertThatCode(() -> notificationService.createNotification((UserAccount) null, "SYSTEM",
                "Ignored", "No recipient entity.", workshop))
                .doesNotThrowAnyException();

        verify(notificationRepository, never()).save(any(Notification.class));
        verify(userRepository, never()).findById(any());
        verify(workshopRepository, never()).findById(any());
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

    private Notification notification(
            Long id,
            UserAccount recipient,
            Workshop workshop,
            String type,
            String title,
            String message,
            LocalDateTime createdAt,
            boolean read
    ) {
        Notification notification = new Notification();
        notification.setId(id);
        notification.setRecipient(recipient);
        notification.setWorkshop(workshop);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setCreatedAt(createdAt);
        notification.setRead(read);
        return notification;
    }

    private Workshop workshop(Long id) {
        Workshop workshop = new Workshop();
        workshop.setId(id);
        return workshop;
    }
}
