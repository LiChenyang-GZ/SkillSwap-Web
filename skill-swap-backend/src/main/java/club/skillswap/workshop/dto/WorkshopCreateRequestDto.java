package club.skillswap.workshop.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

// 浣跨敤 record 绠€鍖栦唬鐮?
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
