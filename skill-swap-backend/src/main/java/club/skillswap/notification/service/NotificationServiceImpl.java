package club.skillswap.notification.service;

import club.skillswap.common.exception.ResourceNotFoundException;
import club.skillswap.notification.dto.NotificationResponseDto;
import club.skillswap.notification.entity.Notification;
import club.skillswap.notification.repository.NotificationRepository;
import club.skillswap.user.entity.UserAccount;
import club.skillswap.user.repository.UserRepository;
import club.skillswap.user.service.UserService;
import club.skillswap.workshop.entity.Workshop;
import club.skillswap.workshop.repository.WorkshopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final WorkshopRepository workshopRepository;

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponseDto> getNotifications(Authentication authentication) {
        UUID recipientId = extractUserUuid(authentication);
        List<Notification> notifications = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(recipientId);
        return notifications.stream().map(this::mapToDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Authentication authentication) {
        UUID recipientId = extractUserUuid(authentication);
        return notificationRepository.countByRecipientIdAndIsReadFalse(recipientId);
    }

    @Override
    @Transactional
    public NotificationResponseDto markRead(Long notificationId, Authentication authentication) {
        UUID recipientId = extractUserUuid(authentication);
        Notification notification = notificationRepository.findByIdAndRecipientId(notificationId, recipientId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with ID: " + notificationId));

        if (!notification.isRead()) {
            notification.setRead(true);
            notification.setReadAt(java.time.LocalDateTime.now());
            notificationRepository.save(notification);
        }

        return mapToDto(notification);
    }

    @Override
    @Transactional
    public int markAllRead(Authentication authentication) {
        UUID recipientId = extractUserUuid(authentication);
        return notificationRepository.markAllReadByRecipientId(recipientId);
    }

    @Override
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void createNotification(UUID recipientId, String type, String title, String message, Long workshopId) {
        persistNotification(recipientId, type, title, message, workshopId);
    }

    @Override
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void createNotification(UserAccount recipient, String type, String title, String message, Workshop workshop) {
        UUID recipientId = recipient != null ? recipient.getId() : null;
        Long workshopId = workshop != null ? workshop.getId() : null;
        persistNotification(recipientId, type, title, message, workshopId);
    }

    private void persistNotification(UUID recipientId, String type, String title, String message, Long workshopId) {
        if (recipientId == null) {
            return;
        }

        UserAccount recipient = userRepository.findById(recipientId).orElse(null);
        if (recipient == null) {
            return;
        }

        Workshop workshop = null;
        if (workshopId != null) {
            workshop = workshopRepository.findById(workshopId).orElse(null);
        }

        Notification notification = new Notification();
        notification.setRecipient(recipient);
        notification.setWorkshop(workshop);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setRead(false);

        notificationRepository.save(notification);
    }

    private NotificationResponseDto mapToDto(Notification notification) {
        String workshopId = notification.getWorkshop() != null ? notification.getWorkshop().getId().toString() : null;
        return new NotificationResponseDto(
                notification.getId().toString(),
                notification.getRecipient().getId().toString(),
                notification.getType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getCreatedAt(),
                notification.isRead(),
                workshopId
        );
    }

    private UUID extractUserUuid(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please login.");
        }

        if (authentication instanceof JwtAuthenticationToken jwtAuth) {
            return userService.findOrCreateCurrentUser(jwtAuth.getToken()).getId();
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDetails ud) {
            return UUID.fromString(ud.getUsername());
        }

        if (principal instanceof DefaultOAuth2User ou) {
            Object sub = ou.getAttribute("sub");
            if (sub != null) return UUID.fromString(sub.toString());
            Object id = ou.getAttribute("id");
            if (id != null) return UUID.fromString(id.toString());
            return UUID.fromString(ou.getName());
        }

        return UUID.fromString(authentication.getName());
    }
}
