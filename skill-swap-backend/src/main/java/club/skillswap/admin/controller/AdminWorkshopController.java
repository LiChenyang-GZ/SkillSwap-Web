package club.skillswap.admin.controller;

import club.skillswap.workshop.dto.WorkshopCreateRequestDto;
import club.skillswap.workshop.dto.WorkshopReviewRequestDto;
import club.skillswap.workshop.dto.WorkshopResponseDto;
import club.skillswap.workshop.dto.WorkshopStatusUpdateResponseDto;
import club.skillswap.workshop.service.WorkshopService;
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
            @RequestBody WorkshopCreateRequestDto request,
            Authentication authentication) {
        return ResponseEntity.ok(workshopService.updatePendingWorkshop(id, request, authentication));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<WorkshopStatusUpdateResponseDto> approveWorkshop(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(workshopService.approveWorkshop(id, authentication));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<WorkshopStatusUpdateResponseDto> rejectWorkshop(
            @PathVariable Long id,
            @RequestBody(required = false) WorkshopReviewRequestDto request,
            Authentication authentication) {
        return ResponseEntity.ok(workshopService.rejectWorkshop(id, request, authentication));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<WorkshopStatusUpdateResponseDto> cancelWorkshop(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(workshopService.cancelWorkshop(id, authentication));
    }
}
