package club.skillswap.workshop.dto;

public record WorkshopParticipantDto(
    String id,
    String username,
    String avatarUrl,
    String email
) {}