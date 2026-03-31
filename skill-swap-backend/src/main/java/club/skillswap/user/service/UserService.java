package club.skillswap.user.service;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.apache.commons.lang3.RandomStringUtils;

import club.skillswap.common.exception.DomainException;
import club.skillswap.common.exception.ResourceNotFoundException;
import club.skillswap.user.dto.UpdateProfileRequestDto;
import club.skillswap.user.dto.UserProfileDto;
import club.skillswap.user.dto.SkillRequestDto;
import club.skillswap.user.entity.UserAccount;
import club.skillswap.user.entity.UserSkill;
import club.skillswap.user.repository.UserRepository;
import club.skillswap.workshop.repository.WorkshopRepository;
import club.skillswap.workshop.repository.WorkshopParticipantRepository;
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
     * 鏍规嵁鐢ㄦ埛 ID 鏌ユ壘鐢ㄦ埛鍏紑淇℃伅銆?
     */
    public UserAccount findUserById(UUID id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found: " + id));
    }

    /**
     * 淇濆瓨鐢ㄦ埛淇℃伅
     */
    @Transactional
    public UserAccount saveUser(UserAccount user) {
        return userRepository.save(user);
    }

    /**
     * 鑾峰彇鐢ㄦ埛璧勬枡锛堝寘鍚粺璁℃暟鎹級
     */
    @Transactional(readOnly = true)
    public UserProfileDto getUserProfileWithStats(UUID userId) {
        UserAccount user = findUserById(userId);
        
        // 鏌ヨ缁熻鏁版嵁
        long workshopsHosted = workshopRepository.countByFacilitatorId(userId);
        long workshopsAttended = participantRepository.countByUserId(userId);
        
        // 鑾峰彇璇勫垎锛堝鏋滄湁 RatingSummary锛?
        double rating = 0.0;
        int reviewCount = 0;
        // if (user.getRatingSummary() != null) {
        //     rating = user.getRatingSummary().getAverageRating();
        //     reviewCount = user.getRatingSummary().getTotalReviews();
        // }

        // 鑾峰彇鎶€鑳藉垪琛?
        List<String> skillNames = user.getSkills() == null 
            ? List.of() 
            : user.getSkills().stream()
                .map(UserSkill::getSkillName)
                .collect(Collectors.toList());

        // 鏋勫缓 DTO
        UserProfileDto dto = new UserProfileDto();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setAvatarUrl(user.getAvatarUrl());
        dto.setBio(user.getBio());
        dto.setSkills(skillNames);
        // 积分系统已停用：不再展示/初始化 100 积分。
        // dto.setCreditBalance(100);
        dto.setCreditBalance(0);
        dto.setTotalWorkshopsHosted(workshopsHosted);
        dto.setTotalWorkshopsAttended(workshopsAttended);
        dto.setRating(rating);
        dto.setReviewCount(reviewCount);
        dto.setCreatedAt(user.getCreatedAt());
        dto.setUpdatedAt(user.getUpdatedAt());
        
        return dto;
    }

    /**
     * 鏍规嵁瀛楃涓插舰寮忕殑鐢ㄦ埛 ID 鏌ユ壘鐢ㄦ埛鍏紑淇℃伅銆?
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
     * 鑾峰彇褰撳墠璁よ瘉鐨勭敤鎴枫€?
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

        // 杩斿洖鍖呭惈瀹屾暣缁熻鏁版嵁鐨?DTO
        return getUserProfileWithStats(user.getId());
    }

    /**
     * 鏇存柊褰撳墠璁よ瘉鐢ㄦ埛鐨勪釜浜鸿祫鏂欍€?
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
     * 涓哄綋鍓嶈璇佺殑鐢ㄦ埛娣诲姞涓€椤规柊鎶€鑳姐€?
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
     * 浠庡綋鍓嶈璇佺敤鎴风殑鎶€鑳藉垪琛ㄤ腑鍒犻櫎涓€椤规妧鑳姐€?
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

    // ============== 绉佹湁杈呭姪鏂规硶 ==============

    private String normalizeSkill(String skill) {
        return skill == null ? null : skill.trim().toLowerCase(Locale.ROOT);
    }

    private void requireNonBlank(String skill) {
        if (skill == null || skill.isBlank()) {
            throw new DomainException("Skill name must not be blank.");
        }
    }
}
