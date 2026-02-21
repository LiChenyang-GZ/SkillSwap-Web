package club.skillswap.skillswapbackend.workshop.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

// 使用 record 简化代码
public record WorkshopCreateRequestDto(
    String title,
    String description,
    String category,
    String skillLevel,
    Integer duration,
    LocalDate date,
    LocalTime time,
    Boolean isOnline,
    Set<String> location,
    Integer maxParticipants,
    Integer creditCost,
    Integer creditReward,
    Set<String> tags,
    Set<String> materials,
    Set<String> requirements
) {}