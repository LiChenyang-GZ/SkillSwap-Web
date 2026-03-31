package club.skillswap.notification.service;

import club.skillswap.notification.dto.NotificationResponseDto;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.UUID;

public interface NotificationService {

    List<NotificationResponseDto> getNotifications(Authentication authentication);

    long getUnreadCount(Authentication authentication);

    NotificationResponseDto markRead(Long notificationId, Authentication authentication);

    int markAllRead(Authentication authentication);

    void createNotification(UUID recipientId, String type, String title, String message, Long workshopId);
}
