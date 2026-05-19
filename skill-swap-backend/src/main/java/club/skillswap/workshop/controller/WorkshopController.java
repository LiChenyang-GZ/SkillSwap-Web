package club.skillswap.workshop.controller;

import club.skillswap.common.dto.ApiMessageDto;
import club.skillswap.user.service.UserService;
import club.skillswap.workshop.dto.WorkshopCreateRequestDto;
import club.skillswap.workshop.dto.WorkshopResponseDto;
import club.skillswap.workshop.service.WorkshopService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/workshops")
@RequiredArgsConstructor // 浣跨敤 Lombok 鑷姩娉ㄥ叆 final 瀛楁
public class WorkshopController {

    private final WorkshopService workshopService;
    private final UserService userService;

    @PostMapping
    public ResponseEntity<ApiMessageDto> createWorkshop(
            @Valid @RequestBody WorkshopCreateRequestDto createRequestDto,
            Authentication authentication) {
        if (!(authentication instanceof JwtAuthenticationToken jwtAuth)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please login.");
        }
        String facilitatorId = userService.findOrCreateCurrentUser(jwtAuth.getToken()).getId().toString();
        workshopService.createWorkshop(createRequestDto, facilitatorId);
        return new ResponseEntity<>(new ApiMessageDto("Workshop created successfully."), HttpStatus.CREATED);
    }

    @GetMapping("/{id:\\d+}")
    public ResponseEntity<WorkshopResponseDto> getWorkshopById(
            @PathVariable Long id,
            Authentication authentication) {
        WorkshopResponseDto workshop = workshopService.getWorkshopById(id, authentication);
        return ResponseEntity.ok(workshop);
    }
    
    @GetMapping
    public ResponseEntity<List<WorkshopResponseDto>> getAllWorkshops(Authentication authentication) {
        if (isAdmin(authentication)) {
            return ResponseEntity.ok(workshopService.getAllWorkshopsForAdmin(authentication));
        }
        return ResponseEntity.ok(workshopService.getPublicWorkshops());
    }

    @GetMapping("/public")
    public ResponseEntity<List<WorkshopResponseDto>> getPublicWorkshops() {
        List<WorkshopResponseDto> workshops = workshopService.getPublicWorkshops();
        return ResponseEntity.ok(workshops);
    }

    @GetMapping("/mine")
    public ResponseEntity<List<WorkshopResponseDto>> getMyWorkshops(Authentication authentication) {
        if (!(authentication instanceof JwtAuthenticationToken jwtAuth)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please login.");
        }

        String facilitatorId = userService.findOrCreateCurrentUser(jwtAuth.getToken()).getId().toString();
        List<WorkshopResponseDto> workshops = workshopService.getMyWorkshops(facilitatorId);
        return ResponseEntity.ok(workshops);
    }

    @GetMapping("/attending")
    public ResponseEntity<List<WorkshopResponseDto>> getAttendingWorkshops(Authentication authentication) {
        if (!(authentication instanceof JwtAuthenticationToken jwtAuth)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please login.");
        }

        String userId = userService.findOrCreateCurrentUser(jwtAuth.getToken()).getId().toString();
        List<WorkshopResponseDto> workshops = workshopService.getAttendingWorkshops(userId);
        return ResponseEntity.ok(workshops);
    }

    @PostMapping("/{id}/hosting/hide")
    public ResponseEntity<ApiMessageDto> hideHostingWorkshop(
            @PathVariable Long id,
            Authentication authentication) {
        if (!(authentication instanceof JwtAuthenticationToken jwtAuth)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please login.");
        }

        String userId = userService.findOrCreateCurrentUser(jwtAuth.getToken()).getId().toString();
        workshopService.hideHostingWorkshop(userId, id);
        return ResponseEntity.ok(new ApiMessageDto("Workshop hidden from hosting list."));
    }

    @PostMapping("/{id}/request-approval")
    public ResponseEntity<ApiMessageDto> requestWorkshopApproval(
            @PathVariable Long id,
            Authentication authentication) {
        workshopService.requestWorkshopApproval(id, authentication);
        return ResponseEntity.ok(new ApiMessageDto("Approval request sent."));
    }

    private boolean isAdmin(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        return authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ADMIN".equals(a.getAuthority()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiMessageDto> deleteWorkshop(@PathVariable Long id, Authentication authentication) {
        workshopService.deleteWorkshop(id, authentication);
        return ResponseEntity.ok(new ApiMessageDto("delete success"));
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<ApiMessageDto> joinWorkshop(
            @PathVariable Long id,
            Authentication authentication) {
        
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please login.");
        }
        
        String userId = extractAuthenticatedUserId(authentication);
        workshopService.joinWorkshop(id, userId);
        return ResponseEntity.ok(new ApiMessageDto("Successfully joined workshop"));
    }

    @PostMapping("/{id}/leave")
    public ResponseEntity<ApiMessageDto> leaveWorkshop(
            @PathVariable Long id,
            Authentication authentication) {
        
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please login.");
        }
        
        String userId = extractAuthenticatedUserId(authentication);
        workshopService.leaveWorkshop(id, userId);
        return ResponseEntity.ok(new ApiMessageDto("Successfully left workshop"));
    }

    private String extractAuthenticatedUserId(Authentication authentication) {
        if (authentication instanceof JwtAuthenticationToken jwtAuth) {
            return userService.findOrCreateCurrentUser(jwtAuth.getToken()).getId().toString();
        }
        return authentication.getName();
    }
}
