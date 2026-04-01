package club.skillswap.workshop.controller;

import club.skillswap.common.dto.ApiMessageDto;
import club.skillswap.workshop.dto.WorkshopCreateRequestDto;
import club.skillswap.workshop.dto.WorkshopResponseDto;
import club.skillswap.workshop.service.WorkshopService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/workshops")
@RequiredArgsConstructor // 浣跨敤 Lombok 鑷姩娉ㄥ叆 final 瀛楁
public class WorkshopController {

    private final WorkshopService workshopService;
    private final Environment env;

    @PostMapping
    public ResponseEntity<ApiMessageDto> createWorkshop(
            @RequestBody WorkshopCreateRequestDto createRequestDto,
            Authentication authentication,
            @RequestHeader(value = "X-Mock-User", required = false) String mockUserId) {
        // 鏀寔 dev 涓嬬殑 X-Mock-User 鐢ㄤ簬鏈湴娴嬭瘯
        String facilitatorId;
        // 1锔忊儯 dev 鐜鍏佽 mock
        if (mockUserId != null && env.acceptsProfiles(Profiles.of("dev"))) {
            facilitatorId = mockUserId;
        }
        // 2锔忊儯 JWT 鐧诲綍鐢ㄦ埛
        else if (authentication instanceof JwtAuthenticationToken jwtAuth) {
            facilitatorId = jwtAuth.getToken().getSubject(); // 鉁?鐩存帴鍙?sub
        }
        else {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please login.");
        }
        workshopService.createWorkshop(createRequestDto, facilitatorId);
        System.out.println("facilitatorId = " + facilitatorId);
        return new ResponseEntity<>(new ApiMessageDto("Workshop created successfully."), HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
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

        String facilitatorId = jwtAuth.getToken().getSubject();
        List<WorkshopResponseDto> workshops = workshopService.getMyWorkshops(facilitatorId);
        return ResponseEntity.ok(workshops);
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
    public ResponseEntity<ApiMessageDto> deleteWorkshop(@PathVariable Long id, Authentication authentication,
                                                        @RequestHeader(value = "X-Mock-User", required = false) String mockUserId) {
        // 鏀寔 dev 涓嬬殑 X-Mock-User 鐢ㄤ簬鏈湴娴嬭瘯
        Authentication authToUse = authentication;
        if (mockUserId != null && env.acceptsProfiles(Profiles.of("dev")) && authentication == null) {
            // 鍒涘缓涓€涓?minimal Authentication-like object is complex; workshopService.deleteWorkshop
            // 闇€瑕?Authentication for authorization check. For dev, allow bypass by throwing if no auth.
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Mock delete not permitted without auth in this flow.");
        }

        workshopService.deleteWorkshop(id, authToUse);
        return ResponseEntity.ok(new ApiMessageDto("delete success"));
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<ApiMessageDto> joinWorkshop(
            @PathVariable Long id,
            Authentication authentication) {
        
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please login.");
        }
        
        String userId = authentication.getName();
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
        
        String userId = authentication.getName();
        workshopService.leaveWorkshop(id, userId);
        return ResponseEntity.ok(new ApiMessageDto("Successfully left workshop"));
    }
}
