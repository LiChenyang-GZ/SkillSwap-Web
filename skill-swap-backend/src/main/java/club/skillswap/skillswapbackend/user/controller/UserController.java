package club.skillswap.skillswapbackend.user.controller;

import club.skillswap.skillswapbackend.user.dto.SkillRequestDto;
import club.skillswap.skillswapbackend.user.dto.UpdateProfileRequestDto;
import club.skillswap.skillswapbackend.user.dto.UserProfileDto;
import club.skillswap.skillswapbackend.user.entity.UserAccount;
import club.skillswap.skillswapbackend.user.service.UserService;

import org.springframework.http.ResponseEntity;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * 获取当前登录用户的信息。
     * @AuthenticationPrincipal Jwt jwt 会自动注入经过验证的 JWT 对象。
     */
    @GetMapping("/me")
    public ResponseEntity<UserProfileDto> getCurrentUser(@AuthenticationPrincipal Jwt jwt) {
        // 直接调用新的 service 方法，它已经返回了我们需要的 DTO
        UserProfileDto userProfile = userService.findOrCreateCurrentUserProfile(jwt);
        return ResponseEntity.ok(userProfile);
    }

    /**
     * 根据 ID 获取任何用户的公开信息。
     * 这个端点是公开的，由 SecurityConfig 配置。
     */
    @GetMapping("/{id}")
    public ResponseEntity<UserProfileDto> getUserProfileById(@PathVariable UUID id) {
        UserProfileDto userProfile = userService.getUserProfileWithStats(id);
        return ResponseEntity.ok(userProfile);
    }

    /**
     * 更新当前登录用户的个人资料。
     */
    @PatchMapping("/me")
    public ResponseEntity<UserProfileDto> updateCurrentUserProfile(
            @AuthenticationPrincipal Jwt jwt, 
            @RequestBody UpdateProfileRequestDto updateRequest) {
        
        UserAccount updatedUser = userService.updateCurrentUserProfile(jwt, updateRequest);
        UserProfileDto userProfileDto = UserProfileDto.fromEntity(updatedUser);
        
        return ResponseEntity.ok(userProfileDto);
    }

    /**
     * 为当前用户添加一项新技能。
     */
    @PostMapping("/me/skills")
    public ResponseEntity<UserProfileDto> addSkill(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody SkillRequestDto skillRequest) {
                
        UserAccount updatedUser = userService.addSkillToCurrentUser(jwt, skillRequest);
        return new ResponseEntity<>(UserProfileDto.fromEntity(updatedUser), HttpStatus.CREATED);
    }

    /**
     * 删除当前用户的指定技能（通过技能名称）。
     * 我们使用 POST /delete 来处理，因为 DELETE 方法通常不建议带请求体。
     */
    @PostMapping("/me/skills/delete")
    public ResponseEntity<?> deleteSkill( // 1. 修改返回类型为通配符
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody SkillRequestDto skillRequest) {
                
        boolean wasDeleted = userService.removeSkillFromCurrentUserByName(jwt, skillRequest.getSkillName());

        // 2. 根据 Service 的返回结果，构建不同的响应
        if (wasDeleted) {
            return ResponseEntity.ok(Map.of("message", "Skill successfully deleted."));
        } else {
            return ResponseEntity.ok(Map.of("message", "Nothing to delete. Skill not found."));
        }
    }
}