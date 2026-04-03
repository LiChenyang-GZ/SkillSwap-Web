package club.skillswap.memory.dto;

import java.time.LocalDateTime;
import java.util.List;

public record MemoryEntryResponseDto(
        String id,
        String title,
        String slug,
        String coverUrl,
        String content,
        List<String> mediaUrls,
        String status,
        LocalDateTime publishedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String createdBy,
        String updatedBy
) {
}
