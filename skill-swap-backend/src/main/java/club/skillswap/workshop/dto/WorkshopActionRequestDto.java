package club.skillswap.workshop.dto;

/**
 * Body for admin workshop actions that carry no other data (approve, cancel).
 */
public record WorkshopActionRequestDto(
    Long version
) {}
