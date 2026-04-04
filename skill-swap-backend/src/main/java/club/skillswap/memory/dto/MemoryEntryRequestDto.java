package club.skillswap.memory.dto;

import java.time.LocalDateTime;
import java.util.List;

public record MemoryEntryRequestDto(
        Long version,
        String title,
        String slug,
        String coverUrl,
        String content,
        List<String> mediaUrls,
        String status,
        LocalDateTime publishedAt
) {
}
