package club.skillswap.skillswapbackend.workshop.controller;

import club.skillswap.skillswapbackend.common.dto.ApiMessageDto;
import club.skillswap.skillswapbackend.workshop.dto.WorkshopCreateRequestDto;
import club.skillswap.skillswapbackend.workshop.dto.WorkshopResponseDto;
import club.skillswap.skillswapbackend.workshop.service.WorkshopService;
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
@RequiredArgsConstructor // 使用 Lombok 自动注入 final 字段
public class WorkshopController {

    private final WorkshopService workshopService;
    private final Environment env;

    @PostMapping
    public ResponseEntity<WorkshopResponseDto> createWorkshop(
            @RequestBody WorkshopCreateRequestDto createRequestDto,
            Authentication authentication,
            @RequestHeader(value = "X-Mock-User", required = false) String mockUserId) {
        // 支持 dev 下的 X-Mock-User 用于本地测试
        String facilitatorId;
        // 1️⃣ dev 环境允许 mock
        if (mockUserId != null && env.acceptsProfiles(Profiles.of("dev"))) {
            facilitatorId = mockUserId;
        }
        // 2️⃣ JWT 登录用户
        else if (authentication instanceof JwtAuthenticationToken jwtAuth) {
            facilitatorId = jwtAuth.getToken().getSubject(); // ✅ 直接取 sub
        }
        else {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please login.");
        }
        WorkshopResponseDto createdWorkshop = workshopService.createWorkshop(createRequestDto, facilitatorId);
        System.out.println("facilitatorId = " + facilitatorId);
        return new ResponseEntity<>(createdWorkshop, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkshopResponseDto> getWorkshopById(@PathVariable Long id) {
        WorkshopResponseDto workshop = workshopService.getWorkshopById(id);
        return ResponseEntity.ok(workshop);
    }
    
    @GetMapping
    public ResponseEntity<List<WorkshopResponseDto>> getAllWorkshops() {
        List<WorkshopResponseDto> workshops = workshopService.getAllWorkshops();
        return ResponseEntity.ok(workshops);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiMessageDto> deleteWorkshop(@PathVariable Long id, Authentication authentication,
                                                        @RequestHeader(value = "X-Mock-User", required = false) String mockUserId) {
        // 支持 dev 下的 X-Mock-User 用于本地测试
        Authentication authToUse = authentication;
        if (mockUserId != null && env.acceptsProfiles(Profiles.of("dev")) && authentication == null) {
            // 创建一个 minimal Authentication-like object is complex; workshopService.deleteWorkshop
            // 需要 Authentication for authorization check. For dev, allow bypass by throwing if no auth.
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