package club.skillswap.memory.dto;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.validation.constraints.Size;

public record MemoryEntryRequestDto(
        @Size(max = 200, message = "Memory title must be at most 200 characters.")
        String title,
        @Size(max = 220, message = "Memory slug must be at most 220 characters.")
        String slug,
        @Size(max = 2048, message = "Cover URL must be at most 2048 characters.")
        String coverUrl,
        @Size(max = 10000, message = "Memory content must be at most 10000 characters.")
        String content,
        @Size(max = 50, message = "At most 50 memory media URLs are allowed.")
        List<@Size(max = 2048, message = "Memory media URL must be at most 2048 characters.") String> mediaUrls,
        @Size(max = 30, message = "Memory status must be at most 30 characters.")
        String status,
        LocalDateTime publishedAt
) {
}
