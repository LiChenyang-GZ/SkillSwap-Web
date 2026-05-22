package club.skillswap.workshop.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

// 浣跨敤 record 绠€鍖栦唬鐮?
public record WorkshopCreateRequestDto(
    @NotBlank(message = "Host name is required.")
    @Size(max = 100, message = "Host name must be at most 100 characters.")
    String hostName,

    @NotBlank(message = "Workshop title is required.")
    @Size(max = 200, message = "Workshop title must be at most 200 characters.")
    String title,

    @Size(max = 5000, message = "Description must be at most 5000 characters.")
    String description,

    @NotBlank(message = "Category is required.")
    @Size(max = 100, message = "Category must be at most 100 characters.")
    String category,

    @NotNull(message = "Duration is required.")
    @Positive(message = "Duration must be greater than 0.")
    Integer duration,

    @NotNull(message = "Date is required.")
    LocalDate date,

    @NotNull(message = "Time is required.")
    LocalTime time,

    LocalDateTime attendCloseAt,

    @NotNull(message = "isOnline is required.")
    Boolean isOnline,

    @Size(max = 255, message = "Location must be at most 255 characters.")
    String location,

    @Positive(message = "Max participants must be greater than 0 when provided.")
    Integer maxParticipants,

    @NotBlank(message = "Contact number is required.")
    @Pattern(
        regexp = "^0\\d{9}$",
        message = "Contact number must be an Australian 10-digit number."
    )
    @Size(max = 20, message = "Contact number must be at most 20 characters.")
    String contactNumber,

    @Size(max = 2000, message = "Materials provided must be at most 2000 characters.")
    String materialsProvided,
    @Size(max = 2000, message = "Materials needed from club must be at most 2000 characters.")
    String materialsNeededFromClub,
    @Size(max = 2000, message = "Venue requirements must be at most 2000 characters.")
    String venueRequirements,
    @Size(max = 2000, message = "Other important info must be at most 2000 characters.")
    String otherImportantInfo,

    @Positive(message = "Week number must be greater than 0 when provided.")
    Integer weekNumber,
    @Size(max = 100, message = "Member responsible must be at most 100 characters.")
    String memberResponsible,
    @Size(max = 2000, message = "Members present must be at most 2000 characters.")
    String membersPresent,
    Boolean eventSubmitted,
    @Size(max = 30, message = "USU approval status must be at most 30 characters.")
    String usuApprovalStatus,

    @NotNull(message = "Details confirmation is required.")
    @AssertTrue(message = "You must confirm that the details are accurate.")
    Boolean detailsConfirmed
) {}
