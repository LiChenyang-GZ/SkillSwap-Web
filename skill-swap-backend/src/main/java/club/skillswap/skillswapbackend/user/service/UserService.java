package club.skillswap.skillswapbackend.user.service;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.apache.commons.lang3.RandomStringUtils;

import club.skillswap.skillswapbackend.common.exception.DomainException;
import club.skillswap.skillswapbackend.common.exception.ResourceNotFoundException;
import club.skillswap.skillswapbackend.user.dto.UpdateProfileRequestDto;
import club.skillswap.skillswapbackend.user.dto.UserProfileDto;
import club.skillswap.skillswapbackend.user.dto.SkillRequestDto;
import club.skillswap.skillswapbackend.user.entity.UserAccount;
import club.skillswap.skillswapbackend.user.entity.UserSkill;
import club.skillswap.skillswapbackend.user.repository.UserRepository;
import club.skillswap.skillswapbackend.workshop.repository.WorkshopRepository;
import club.skillswap.skillswapbackend.workshop.repository.WorkshopParticipantRepository;
import lombok.RequiredArgsConstructor;

import java.util.UUID;
import java.util.stream.Collectors;
import java.util.Locale;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final WorkshopRepository workshopRepository;
    private final WorkshopParticipantRepository participantRepository;

    /**
     * 根据用户 ID 查找用户公开信息。
     */
    public UserAccount findUserById(UUID id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found: " + id));
    }

    /**
     * 保存用户信息
     */
    @Transactional
    public UserAccount saveUser(UserAccount user) {
        return userRepository.save(user);
    }

    /**
     * 获取用户资料（包含统计数据）
     */
    @Transactional(readOnly = true)
    public UserProfileDto getUserProfileWithStats(UUID userId) {
        UserAccount user = findUserById(userId);
        
        // 查询统计数据
        long workshopsHosted = workshopRepository.countByFacilitatorId(userId);
        long workshopsAttended = participantRepository.countByUserId(userId);
        
        // 获取评分（如果有 RatingSummary）
        double rating = 0.0;
        int reviewCount = 0;
        // if (user.getRatingSummary() != null) {
        //     rating = user.getRatingSummary().getAverageRating();
        //     reviewCount = user.getRatingSummary().getTotalReviews();
        // }

        // 获取技能列表
        List<String> skillNames = user.getSkills() == null 
            ? List.of() 
            : user.getSkills().stream()
                .map(UserSkill::getSkillName)
                .collect(Collectors.toList());

        // 构建 DTO
        UserProfileDto dto = new UserProfileDto();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setAvatarUrl(user.getAvatarUrl());
        dto.setBio(user.getBio());
        dto.setSkills(skillNames);
        dto.setCreditBalance(50);  // TODO: 从 credit 表获取
        dto.setTotalWorkshopsHosted(workshopsHosted);
        dto.setTotalWorkshopsAttended(workshopsAttended);
        dto.setRating(rating);
        dto.setReviewCount(reviewCount);
        dto.setCreatedAt(user.getCreatedAt());
        dto.setUpdatedAt(user.getUpdatedAt());
        
        return dto;
    }

    /**
     * 根据字符串形式的用户 ID 查找用户公开信息。
     */
    public UserAccount findUserByStringId(String userId) {
        UUID userUuid;
        try {
            userUuid = UUID.fromString(userId);
        } catch (IllegalArgumentException e) {
            throw new ResourceNotFoundException("Invalid user ID format: " + userId);
        }
        return findUserById(userUuid);
    }

    /**
     * 获取当前认证的用户。
     */
    @Transactional
    public UserProfileDto findOrCreateCurrentUserProfile(Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        
        UserAccount user = userRepository.findById(userId).orElseGet(() -> {
            UserAccount newUser = new UserAccount();
            newUser.setId(userId);
            String email = jwt.getClaimAsString("email");
            String baseUsername = email.split("@")[0].replaceAll("[^a-zA-Z0-9]", "_");
            
            String finalUsername = baseUsername;
            while (userRepository.findByUsername(finalUsername).isPresent()) {
                finalUsername = baseUsername + "_" + RandomStringUtils.randomAlphanumeric(4);
            }
            newUser.setUsername(finalUsername);
            return userRepository.save(newUser);
        });

        return UserProfileDto.fromEntity(user);
    }

    /**
     * 更新当前认证用户的个人资料。
     */
    @Transactional
    public UserAccount updateCurrentUserProfile(Jwt jwt, UpdateProfileRequestDto updateRequest) {
        UUID userId = UUID.fromString(jwt.getSubject());
        
        UserAccount userToUpdate = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("UserAccount", "ID", userId));

        if (updateRequest.getUsername() != null) {
            userToUpdate.setUsername(updateRequest.getUsername());
        }
        if (updateRequest.getAvatarUrl() != null) {
            userToUpdate.setAvatarUrl(updateRequest.getAvatarUrl());
        }
        if (updateRequest.getBio() != null) {
            userToUpdate.setBio(updateRequest.getBio());
        }
        if (updateRequest.getSkills() != null) {
            userToUpdate.getSkills().clear();

            List<UserSkill> newSkills = updateRequest.getSkills().stream()
                    .map(skillName -> {
                        String normalizedSkill = normalizeSkill(skillName);
                        requireNonBlank(normalizedSkill);
                        
                        UserSkill newSkill = new UserSkill();
                        newSkill.setSkillName(normalizedSkill);
                        newSkill.setUser(userToUpdate);
                        return newSkill;
                    })
                    .collect(Collectors.toList());

            userToUpdate.getSkills().addAll(newSkills);
        }

        return userRepository.save(userToUpdate);
    }

    /**
     * 为当前认证的用户添加一项新技能。
     */
    @Transactional
    public UserAccount addSkillToCurrentUser(Jwt jwt, SkillRequestDto skillRequest) {
        UUID userId = UUID.fromString(jwt.getSubject());
        UserAccount user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("UserAccount", "ID", userId));

        String normalizedSkill = normalizeSkill(skillRequest.getSkillName());
        requireNonBlank(normalizedSkill);
        
        boolean skillExists = user.getSkills().stream()
                .anyMatch(skill -> skill.getSkillName().equals(normalizedSkill));

        if (skillExists) {
            return user;
        }

        UserSkill newSkill = new UserSkill();
        newSkill.setSkillName(normalizedSkill);
        newSkill.setUser(user);

        user.getSkills().add(newSkill);

        return userRepository.save(user);
    }

    /**
     * 从当前认证用户的技能列表中删除一项技能。
     */
    @Transactional
    public boolean removeSkillFromCurrentUserByName(Jwt jwt, String skillName) {
        UUID userId = UUID.fromString(jwt.getSubject());
        UserAccount user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("UserAccount", "ID", userId));
        
        String normalizedSkill = normalizeSkill(skillName);

        boolean removed = user.getSkills().removeIf(skill -> skill.getSkillName().equals(normalizedSkill));

        if (removed) {
            userRepository.save(user);
        }

        return removed;
    }

    // ============== 私有辅助方法 ==============

    private String normalizeSkill(String skill) {
        return skill == null ? null : skill.trim().toLowerCase(Locale.ROOT);
    }

    private void requireNonBlank(String skill) {
        if (skill == null || skill.isBlank()) {
            throw new DomainException("Skill name must not be blank.");
        }
    }
}