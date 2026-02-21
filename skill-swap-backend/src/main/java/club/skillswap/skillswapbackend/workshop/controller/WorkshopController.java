package club.skillswap.skillswapbackend.workshop.controller;

import club.skillswap.skillswapbackend.common.dto.ApiMessageDto;
import club.skillswap.skillswapbackend.workshop.dto.WorkshopCreateRequestDto;
import club.skillswap.skillswapbackend.workshop.dto.WorkshopResponseDto;
import club.skillswap.skillswapbackend.workshop.dto.JoinWorkshopRequestDto;
import club.skillswap.skillswapbackend.workshop.dto.LeaveWorkshopRequestDto;
import club.skillswap.skillswapbackend.workshop.service.WorkshopService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
        if (mockUserId != null && env.acceptsProfiles(Profiles.of("dev"))) {
            facilitatorId = mockUserId;
        } else if (authentication != null) {
            facilitatorId = authentication.getName();
        } else {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please login.");
        }

        WorkshopResponseDto createdWorkshop = workshopService.createWorkshop(createRequestDto, facilitatorId);
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
            @RequestBody JoinWorkshopRequestDto request,
            Authentication authentication,
            @Value("${spring.profiles.active:prod}") String activeProfile) {
        
        String userId;
        
        // Dev 环境：允许从 request body 读取 userId
        if ("dev".equals(activeProfile)) {
            userId = request.userId();
        } else {
            // Prod 环境：必须有有效的 authentication
            if (authentication == null || !authentication.isAuthenticated()) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please login.");
            }
            userId = authentication.getName();
        }

        workshopService.joinWorkshop(id, userId);
        return ResponseEntity.ok(new ApiMessageDto("Successfully joined workshop"));
    }

    @PostMapping("/{id}/leave")
    public ResponseEntity<ApiMessageDto> leaveWorkshop(
            @PathVariable Long id,
            @RequestBody LeaveWorkshopRequestDto request,
            Authentication authentication,
            @Value("${spring.profiles.active:prod}") String activeProfile) {
        
        String userId;
        
        // Dev 环境：允许从 request body 读取 userId
        if ("dev".equals(activeProfile)) {
            userId = request.userId();
        } else {
            // Prod 环境：必须有有效的 authentication
            if (authentication == null || !authentication.isAuthenticated()) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please login.");
            }
            userId = authentication.getName();
        }

        workshopService.leaveWorkshop(id, userId);
        return ResponseEntity.ok(new ApiMessageDto("Successfully left workshop"));
    }
}