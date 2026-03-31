package club.skillswap.notification.dto;

import java.time.LocalDateTime;

public record NotificationResponseDto(
    String id,
    String userId,
    String type,
    String title,
    String message,
    LocalDateTime timestamp,
    boolean read,
    String workshopId
) {}
