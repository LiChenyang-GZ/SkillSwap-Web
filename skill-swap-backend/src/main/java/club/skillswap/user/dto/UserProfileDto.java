package club.skillswap.user.dto;

import lombok.Data;

import java.time.Instant;
import java.util.UUID;
import java.util.List; // 寮曞叆 List
import java.util.stream.Collectors;

import club.skillswap.user.entity.UserAccount;
import club.skillswap.user.entity.UserSkill;
import club.skillswap.user.model.UniversityCode;

@Data
public class UserProfileDto {
    private UUID id;
    private String username;
    private String email;
    private String avatarUrl;
    private String bio;
    private UniversityCode universityCode;
    private String universityName;
    private String role;
    private List<String> skills;
    private Integer creditBalance;
    private Long totalWorkshopsHosted;
    private Long totalWorkshopsAttended;
    private Double rating;
    private Integer reviewCount;
    
    private Instant createdAt;
    private Instant updatedAt;
    

    // 涓€涓柟渚跨殑杞崲鏂规硶
    public static UserProfileDto fromEntity(UserAccount user) {
        UserProfileDto dto = new UserProfileDto();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setAvatarUrl(user.getAvatarUrl());
        dto.setBio(user.getBio());
        dto.setUniversityCode(user.getUniversityCode());
        dto.setUniversityName(user.getUniversityName());
        dto.setRole(user.getRole());
        // 鏂扮敤鎴峰垵濮?100 credits
        dto.setCreditBalance(100);
        // 缁熻鏁版嵁闇€瑕侀€氳繃 service 灞傛潵鑾峰彇
        dto.setTotalWorkshopsHosted(0L);
        dto.setTotalWorkshopsAttended(0L);
        dto.setRating(0.0);
        dto.setReviewCount(0);

        dto.setCreatedAt(user.getCreatedAt());
        dto.setUpdatedAt(user.getUpdatedAt());
        if (user.getSkills() != null) {
            dto.setSkills(user.getSkills().stream()
                    .map(UserSkill::getSkillName) // 浣跨敤鏂规硶寮曠敤锛屼粠 UserSkill 瀵硅薄涓彁鍙?skillName 瀛楃涓?
                    .collect(Collectors.toList()));
        } else {
            dto.setSkills(List.of()); // 濡傛灉娌℃湁鎶€鑳斤紝璁剧疆涓虹┖鍒楄〃
        }
        return dto;
    }
}
