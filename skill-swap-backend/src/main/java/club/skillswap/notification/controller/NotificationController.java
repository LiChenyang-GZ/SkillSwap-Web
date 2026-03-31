package club.skillswap.notification.controller;

import club.skillswap.common.dto.ApiMessageDto;
import club.skillswap.notification.dto.NotificationCountDto;
import club.skillswap.notification.dto.NotificationResponseDto;
import club.skillswap.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<List<NotificationResponseDto>> getNotifications(Authentication authentication) {
        return ResponseEntity.ok(notificationService.getNotifications(authentication));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<NotificationCountDto> getUnreadCount(Authentication authentication) {
        long count = notificationService.getUnreadCount(authentication);
        return ResponseEntity.ok(new NotificationCountDto(count));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<NotificationResponseDto> markRead(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(notificationService.markRead(id, authentication));
    }

    @PostMapping("/read-all")
    public ResponseEntity<ApiMessageDto> markAllRead(Authentication authentication) {
        int updated = notificationService.markAllRead(authentication);
        return ResponseEntity.ok(new ApiMessageDto("Marked " + updated + " notifications as read."));
    }
}
