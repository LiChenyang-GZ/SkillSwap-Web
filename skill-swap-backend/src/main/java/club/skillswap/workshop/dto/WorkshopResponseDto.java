package club.skillswap.workshop.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

public record WorkshopResponseDto(
    String id,
    String title,
    String description,
    String category,
    String skillLevel,
    String status,
    LocalDate date,
    LocalTime time,
    Integer duration,
    Boolean isOnline,
    Set<String> location,
    Integer maxParticipants,
    Integer currentParticipants,
    Integer creditCost,
    Integer creditReward,
    FacilitatorDto facilitator,
    List<WorkshopParticipantDto> participants,
    Set<String> tags,
    Set<String> materials,
    Set<String> requirements,
    LocalDateTime createdAt
) {}
