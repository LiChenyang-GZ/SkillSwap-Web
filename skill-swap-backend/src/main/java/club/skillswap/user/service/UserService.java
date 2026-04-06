package club.skillswap.user.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import club.skillswap.common.storage.SupabaseStorageService;
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
import java.util.Map;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final long DEFAULT_MAX_IMAGE_BYTES = 10L * 1024L * 1024L;

    private final UserRepository userRepository;
    private final WorkshopRepository workshopRepository;
    private final WorkshopParticipantRepository participantRepository;
    private final SupabaseStorageService supabaseStorageService;

    @Value("${app.upload.max-image-bytes:" + DEFAULT_MAX_IMAGE_BYTES + "}")
    private long maxImageBytes;

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
        dto.setRole(user.getRole());
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
        String jwtEmail = extractEmailFromJwt(jwt);
        requireVerifiedEmail(jwt, jwtEmail);
        String roleFromJwt = extractRoleFromJwt(jwt);
        
        UserAccount user = userRepository.findById(userId).orElseGet(() -> {
            UserAccount newUser = new UserAccount();
            newUser.setId(userId);
            String baseUsername = buildBaseUsername(userId, jwtEmail);
            newUser.setUsername(baseUsername);
            newUser.setEmail(jwtEmail);
            newUser.setRole(roleFromJwt);
            return userRepository.save(newUser);
        });

        // Backfill email for existing records created before email persistence was implemented.
        if ((user.getEmail() == null || user.getEmail().isBlank()) && jwtEmail != null && !jwtEmail.isBlank()) {
            user.setEmail(jwtEmail);
            user = userRepository.save(user);
        }

        if (roleFromJwt != null && !roleFromJwt.equalsIgnoreCase(user.getRole())) {
            user.setRole(roleFromJwt);
            user = userRepository.save(user);
        }

        // 杩斿洖鍖呭惈瀹屾暣缁熻鏁版嵁鐨?DTO
        return getUserProfileWithStats(user.getId());
    }

    @Transactional(readOnly = true)
    public List<UserAccount> findAdmins() {
        return userRepository.findByRoleIgnoreCase("admin");
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
            String nextUsername = updateRequest.getUsername().trim();
            if (nextUsername.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username must not be blank.");
            }
            userToUpdate.setUsername(nextUsername);
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

    @Transactional
    public UserProfileDto uploadCurrentUserAvatar(Jwt jwt, MultipartFile file) {
        UUID userId = UUID.fromString(jwt.getSubject());
        UserAccount user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("UserAccount", "ID", userId));
        String previousAvatarUrl = trimToNull(user.getAvatarUrl());

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image file is required.");
        }

        String contentType = trimToNull(file.getContentType());
        if (contentType == null || !contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only image uploads are supported.");
        }

        if (file.getSize() > maxImageBytes) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Image is too large.");
        }

        String extension = resolveImageFileExtension(file.getOriginalFilename(), contentType);
        String fileName = UUID.randomUUID() + extension;
        String objectPath = "avatars/" + user.getId() + "/" + fileName;
        String publicUrl = supabaseStorageService.uploadImage(file, objectPath);

        user.setAvatarUrl(publicUrl);
        userRepository.save(user);
        if (previousAvatarUrl != null && !previousAvatarUrl.equals(publicUrl)) {
            supabaseStorageService.deleteByPublicUrlQuietly(previousAvatarUrl);
        }

        return getUserProfileWithStats(userId);
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

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String resolveImageFileExtension(String originalFilename, String contentType) {
        String candidate = null;
        if (originalFilename != null) {
            int dotIndex = originalFilename.lastIndexOf('.');
            if (dotIndex >= 0 && dotIndex < originalFilename.length() - 1) {
                candidate = originalFilename.substring(dotIndex).toLowerCase(Locale.ROOT);
            }
        }

        if (candidate != null && candidate.matches("\\.[a-z0-9]{1,5}")) {
            return candidate;
        }

        return switch (contentType.toLowerCase(Locale.ROOT)) {
            case "image/png" -> ".png";
            case "image/gif" -> ".gif";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
    }

    private void requireNonBlank(String skill) {
        if (skill == null || skill.isBlank()) {
            throw new DomainException("Skill name must not be blank.");
        }
    }

    private String extractEmailFromJwt(Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        return (email == null || email.isBlank()) ? null : email;
    }

    private void requireVerifiedEmail(Jwt jwt, String email) {
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email is missing in auth token. Please sign in again.");
        }

        // Supabase deployments may expose either `confirmed_at` or `email_confirmed_at`.
        boolean verifiedByConfirmedAt = hasText(jwt.getClaimAsString("confirmed_at"));
        boolean verifiedByTimestamp = hasText(jwt.getClaimAsString("email_confirmed_at"));
        Boolean emailVerified = jwt.getClaimAsBoolean("email_verified");
        boolean verifiedByBoolean = Boolean.TRUE.equals(emailVerified);

        Map<String, Object> userMetadata = jwt.getClaimAsMap("user_metadata");
        boolean verifiedByMetadata = userMetadata != null && Boolean.TRUE.equals(userMetadata.get("email_verified"));

        Map<String, Object> rawUserMetadata = jwt.getClaimAsMap("raw_user_meta_data");
        boolean verifiedByRawMetadata = rawUserMetadata != null && Boolean.TRUE.equals(rawUserMetadata.get("email_verified"));

        if (!verifiedByConfirmedAt && !verifiedByTimestamp && !verifiedByBoolean && !verifiedByMetadata && !verifiedByRawMetadata) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Please verify your email before accessing profile.");
        }
    }

    private String extractRoleFromJwt(Jwt jwt) {
        Map<String, Object> appMetadata = jwt.getClaimAsMap("app_metadata");
        if (appMetadata == null) {
            return "member";
        }

        List<String> roles = new ArrayList<>();
        Object roleList = appMetadata.get("roles");
        if (roleList instanceof List<?> rawRoles) {
            for (Object role : rawRoles) {
                if (role instanceof String roleValue && !roleValue.isBlank()) {
                    roles.add(roleValue);
                }
            }
        }

        Object singleRole = appMetadata.get("role");
        if (singleRole instanceof String roleValue && !roleValue.isBlank()) {
            roles.add(roleValue);
        }

        for (String role : roles) {
            String normalized = role.trim().toLowerCase(Locale.ROOT);
            if ("admin".equals(normalized) || "role_admin".equals(normalized)) {
                return "admin";
            }
        }

        return "member";
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String buildBaseUsername(UUID userId, String email) {
        if (email != null && !email.isBlank()) {
            String localPart = email.split("@")[0];
            String sanitized = localPart.replaceAll("[^a-zA-Z0-9]", "_");
            if (!sanitized.isBlank()) {
                return sanitized;
            }
        }

        return "user_" + userId.toString().replace("-", "").substring(0, 8);
    }
}
