package club.skillswap.admin.controller;

import club.skillswap.common.dto.ApiMessageDto;
import club.skillswap.workshop.dto.WorkshopCreateRequestDto;
import club.skillswap.workshop.dto.WorkshopReviewRequestDto;
import club.skillswap.workshop.dto.WorkshopResponseDto;
import club.skillswap.workshop.service.WorkshopService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/workshops")
@RequiredArgsConstructor
public class AdminWorkshopController {

    private final WorkshopService workshopService;

    @GetMapping
    public ResponseEntity<List<WorkshopResponseDto>> getAllWorkshops(Authentication authentication) {
        return ResponseEntity.ok(workshopService.getAllWorkshopsForAdmin(authentication));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<WorkshopResponseDto>> getPendingWorkshops(Authentication authentication) {
        return ResponseEntity.ok(workshopService.getPendingWorkshops(authentication));
    }

    @PutMapping("/{id}")
    public ResponseEntity<WorkshopResponseDto> updatePendingWorkshop(
            @PathVariable Long id,
            @Valid @RequestBody WorkshopCreateRequestDto request,
            Authentication authentication) {
        return ResponseEntity.ok(workshopService.updatePendingWorkshop(id, request, authentication));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ApiMessageDto> approveWorkshop(
            @PathVariable Long id,
            Authentication authentication) {
        workshopService.approveWorkshop(id, authentication);
        return ResponseEntity.ok(new ApiMessageDto("Workshop approved successfully."));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ApiMessageDto> rejectWorkshop(
            @PathVariable Long id,
            @RequestBody(required = false) WorkshopReviewRequestDto request,
            Authentication authentication) {
        workshopService.rejectWorkshop(id, request, authentication);
        return ResponseEntity.ok(new ApiMessageDto("Workshop rejected successfully."));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiMessageDto> cancelWorkshop(
            @PathVariable Long id,
            Authentication authentication) {
        workshopService.cancelWorkshop(id, authentication);
        return ResponseEntity.ok(new ApiMessageDto("Workshop cancelled successfully."));
    }
}
