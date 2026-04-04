package club.skillswap.user.controller;

import club.skillswap.user.dto.SkillRequestDto;
import club.skillswap.user.dto.UpdateProfileRequestDto;
import club.skillswap.user.dto.UserProfileDto;
import club.skillswap.user.entity.UserAccount;
import club.skillswap.user.service.UserService;

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
     * 鑾峰彇褰撳墠鐧诲綍鐢ㄦ埛鐨勪俊鎭€?
     * @AuthenticationPrincipal Jwt jwt 浼氳嚜鍔ㄦ敞鍏ョ粡杩囬獙璇佺殑 JWT 瀵硅薄銆?
     */
    @GetMapping("/me")
    public ResponseEntity<UserProfileDto> getCurrentUser(@AuthenticationPrincipal Jwt jwt) {
        // 鐩存帴璋冪敤鏂扮殑 service 鏂规硶锛屽畠宸茬粡杩斿洖浜嗘垜浠渶瑕佺殑 DTO
        UserProfileDto userProfile = userService.findOrCreateCurrentUserProfile(jwt);
        return ResponseEntity.ok(userProfile);
    }

    /**
     * 鏍规嵁 ID 鑾峰彇浠讳綍鐢ㄦ埛鐨勫叕寮€淇℃伅銆?
     * 杩欎釜绔偣鏄叕寮€鐨勶紝鐢?SecurityConfig 閰嶇疆銆?
     */
    @GetMapping("/{id}")
    public ResponseEntity<UserProfileDto> getUserProfileById(@PathVariable UUID id) {
        UserProfileDto userProfile = userService.getUserProfileWithStats(id);
        return ResponseEntity.ok(userProfile);
    }

    /**
     * 鏇存柊褰撳墠鐧诲綍鐢ㄦ埛鐨勪釜浜鸿祫鏂欍€?
     */
    @PatchMapping("/me")
    public ResponseEntity<UserProfileDto> updateCurrentUserProfile(
            @AuthenticationPrincipal Jwt jwt, 
            @RequestBody UpdateProfileRequestDto updateRequest) {
        
        UserAccount updatedUser = userService.updateCurrentUserProfile(jwt, updateRequest);
        UserProfileDto userProfileDto = userService.getUserProfileWithStats(updatedUser.getId());
        
        return ResponseEntity.ok(userProfileDto);
    }

    /**
     * 涓哄綋鍓嶇敤鎴锋坊鍔犱竴椤规柊鎶€鑳姐€?
     */
    @PostMapping("/me/skills")
    public ResponseEntity<UserProfileDto> addSkill(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody SkillRequestDto skillRequest) {
                
        UserAccount updatedUser = userService.addSkillToCurrentUser(jwt, skillRequest);
        return new ResponseEntity<>(UserProfileDto.fromEntity(updatedUser), HttpStatus.CREATED);
    }

    /**
     * 鍒犻櫎褰撳墠鐢ㄦ埛鐨勬寚瀹氭妧鑳斤紙閫氳繃鎶€鑳藉悕绉帮級銆?
     * 鎴戜滑浣跨敤 POST /delete 鏉ュ鐞嗭紝鍥犱负 DELETE 鏂规硶閫氬父涓嶅缓璁甫璇锋眰浣撱€?
     */
    @PostMapping("/me/skills/delete")
    public ResponseEntity<?> deleteSkill( // 1. 淇敼杩斿洖绫诲瀷涓洪€氶厤绗?
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody SkillRequestDto skillRequest) {
                
        boolean wasDeleted = userService.removeSkillFromCurrentUserByName(jwt, skillRequest.getSkillName());

        // 2. 鏍规嵁 Service 鐨勮繑鍥炵粨鏋滐紝鏋勫缓涓嶅悓鐨勫搷搴?
        if (wasDeleted) {
            return ResponseEntity.ok(Map.of("message", "Skill successfully deleted."));
        } else {
            return ResponseEntity.ok(Map.of("message", "Nothing to delete. Skill not found."));
        }
    }
}
