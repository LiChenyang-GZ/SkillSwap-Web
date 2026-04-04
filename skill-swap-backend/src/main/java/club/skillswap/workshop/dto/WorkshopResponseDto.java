package club.skillswap.workshop.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record WorkshopResponseDto(
    String id,
    String hostName,
    String title,
    String description,
    String category,
    String status,
    LocalDate date,
    LocalTime time,
    Integer duration,
    Boolean isOnline,
    String location,
    Integer maxParticipants,
    Integer currentParticipants,
    Integer creditCost,
    Integer creditReward,
    String contactNumber,
    String materialsProvided,
    String materialsNeededFromClub,
    String venueRequirements,
    String otherImportantInfo,
    Boolean detailsConfirmed,
    String submitterUsername,
    String submitterEmail,
    FacilitatorDto facilitator,
    List<WorkshopParticipantDto> participants,
    LocalDateTime createdAt
) {}
