package club.skillswap.workshop.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDate;
import java.time.LocalTime;

// 浣跨敤 record 绠€鍖栦唬鐮?
public record WorkshopCreateRequestDto(
    @NotBlank(message = "Host name is required.")
    String hostName,

    @NotBlank(message = "Workshop title is required.")
    String title,

    String description,

    @NotBlank(message = "Category is required.")
    String category,

    @NotNull(message = "Duration is required.")
    @Positive(message = "Duration must be greater than 0.")
    Integer duration,

    @NotNull(message = "Date is required.")
    LocalDate date,

    @NotNull(message = "Time is required.")
    LocalTime time,

    @NotNull(message = "isOnline is required.")
    Boolean isOnline,

    String location,

    @Positive(message = "Max participants must be greater than 0 when provided.")
    Integer maxParticipants,

    @NotBlank(message = "Contact number is required.")
    String contactNumber,

    String materialsProvided,
    String materialsNeededFromClub,
    String venueRequirements,
    String otherImportantInfo,

    @NotNull(message = "Details confirmation is required.")
    @AssertTrue(message = "You must confirm that the details are accurate.")
    Boolean detailsConfirmed
) {}
