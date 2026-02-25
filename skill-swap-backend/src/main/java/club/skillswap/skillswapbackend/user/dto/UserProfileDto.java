package club.skillswap.skillswapbackend.user.dto;

import lombok.Data;

import java.time.Instant;
import java.util.UUID;
import java.util.List; // 引入 List
import java.util.stream.Collectors;

import club.skillswap.skillswapbackend.user.entity.UserAccount;
import club.skillswap.skillswapbackend.user.entity.UserSkill;

@Data
public class UserProfileDto {
    private UUID id;
    private String username;
    private String email;
    private String avatarUrl;
    private String bio;
    private List<String> skills;
    private Integer creditBalance;
    private Long totalWorkshopsHosted;
    private Long totalWorkshopsAttended;
    private Double rating;
    private Integer reviewCount;
    
    private Instant createdAt;
    private Instant updatedAt;
    

    // 一个方便的转换方法
    public static UserProfileDto fromEntity(UserAccount user) {
        UserProfileDto dto = new UserProfileDto();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setAvatarUrl(user.getAvatarUrl());
        dto.setBio(user.getBio());
        // 新用户初始 100 credits
        dto.setCreditBalance(100);
        dto.setTotalWorkshopsHosted(0L);
        dto.setTotalWorkshopsAttended(0L);
        dto.setRating(0.0);
        dto.setReviewCount(0);

        dto.setCreatedAt(user.getCreatedAt());
        dto.setUpdatedAt(user.getUpdatedAt());
        if (user.getSkills() != null) {
            dto.setSkills(user.getSkills().stream()
                    .map(UserSkill::getSkillName) // 使用方法引用，从 UserSkill 对象中提取 skillName 字符串
                    .collect(Collectors.toList()));
        } else {
            dto.setSkills(List.of()); // 如果没有技能，设置为空列表
        }
        return dto;
    }
}