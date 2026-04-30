package club.skillswap.user.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import club.skillswap.common.storage.AzureBlobStorageService;
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
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final long DEFAULT_MAX_IMAGE_BYTES = 10L * 1024L * 1024L;
    private static final Set<String> SUPPORTED_IMAGE_CONTENT_TYPES = Set.of(
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/webp",
            "image/gif",
            "image/svg+xml"
    );

    private final UserRepository userRepository;
    private final WorkshopRepository workshopRepository;
    private final WorkshopParticipantRepository participantRepository;
    private final AzureBlobStorageService azureBlobStorageService;
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
        
        // 当前评分模块未启用，先返回默认值。
        double rating = 0.0;
        int reviewCount = 0;

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
        UUID userUuid = tryParseUuid(userId);
        if (userUuid != null) {
            return findUserById(userUuid);
        }

        return userRepository.findByAuthSubject(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }

    /**
     * 鑾峰彇褰撳墠璁よ瘉鐨勭敤鎴枫€?
     */
    @Transactional
    public UserProfileDto findOrCreateCurrentUserProfile(Jwt jwt) {
        UserAccount user = findOrCreateCurrentUser(jwt);
        return getUserProfileWithStats(user.getId());
    }

    @Transactional
    public UserAccount findOrCreateCurrentUser(Jwt jwt) {
        String subject = jwt.getSubject();
        String issuer = jwt.getIssuer() != null ? jwt.getIssuer().toString() : null;
        UUID subjectUuid = tryParseUuid(subject);

        UserAccount user = userRepository.findByAuthSubject(subject)
                .or(() -> subjectUuid == null ? java.util.Optional.empty() : userRepository.findById(subjectUuid))
                .orElseGet(() -> {
                    UUID newId = subjectUuid != null ? subjectUuid : UUID.randomUUID();
                    String jwtEmail = extractEmailFromJwt(jwt);
                    maybeRequireVerifiedEmail(jwt, jwtEmail);

                    UserAccount newUser = new UserAccount();
                    newUser.setId(newId);
                    newUser.setAuthProvider(issuer);
                    newUser.setAuthSubject(subject);
                    newUser.setEmail(jwtEmail);
                    newUser.setUsername(buildBaseUsername(newId, jwtEmail, subject, jwt));
                    newUser.setRole("member");
                    return userRepository.save(newUser);
                });

        boolean dirty = false;

        if ((user.getAuthSubject() == null || user.getAuthSubject().isBlank()) && subject != null && !subject.isBlank()) {
            user.setAuthSubject(subject);
            dirty = true;
        }
        if ((user.getAuthProvider() == null || user.getAuthProvider().isBlank()) && issuer != null && !issuer.isBlank()) {
            user.setAuthProvider(issuer);
            dirty = true;
        }

        String jwtEmail = extractEmailFromJwt(jwt);
        if ((user.getEmail() == null || user.getEmail().isBlank()) && jwtEmail != null && !jwtEmail.isBlank()) {
            user.setEmail(jwtEmail);
            dirty = true;
        }

        if (user.getRole() == null || user.getRole().isBlank()) {
            user.setRole("member");
            dirty = true;
        }

        return dirty ? userRepository.save(user) : user;
    }

    @Transactional(readOnly = true)
    public List<UserAccount> findAdmins() {
        return userRepository.findAllAdminUsers();
    }

    /**
     * 鏇存柊褰撳墠璁よ瘉鐢ㄦ埛鐨勪釜浜鸿祫鏂欍€?
     */
    @Transactional
    public UserAccount updateCurrentUserProfile(Jwt jwt, UpdateProfileRequestDto updateRequest) {
        UserAccount userToUpdate = findOrCreateCurrentUser(jwt);

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
        UserAccount user = findOrCreateCurrentUser(jwt);
        UUID userId = user.getId();
        String previousAvatarUrl = trimToNull(user.getAvatarUrl());

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image file is required.");
        }

        String contentType = trimToNull(file.getContentType());
        String normalizedContentType = contentType == null ? null : contentType.toLowerCase(Locale.ROOT);
        if (normalizedContentType == null || !SUPPORTED_IMAGE_CONTENT_TYPES.contains(normalizedContentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported image format. Please use PNG/JPG/WEBP/GIF/SVG.");
        }

        if (file.getSize() > maxImageBytes) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Image is too large.");
        }

        String extension = resolveImageFileExtension(file.getOriginalFilename(), normalizedContentType);
        String fileName = UUID.randomUUID() + extension;
        String objectPath = "avatars/" + user.getId() + "/" + fileName;
        String publicUrl = azureBlobStorageService.uploadImage(file, objectPath);

        user.setAvatarUrl(publicUrl);
        userRepository.save(user);
        if (previousAvatarUrl != null && !previousAvatarUrl.equals(publicUrl)) {
            azureBlobStorageService.deleteByUrlQuietly(previousAvatarUrl);
            supabaseStorageService.deleteByPublicUrlQuietly(previousAvatarUrl);
        }

        return getUserProfileWithStats(userId);
    }

    /**
     * 涓哄綋鍓嶈璇佺殑鐢ㄦ埛娣诲姞涓€椤规柊鎶€鑳姐€?
     */
    @Transactional
    public UserAccount addSkillToCurrentUser(Jwt jwt, SkillRequestDto skillRequest) {
        UserAccount user = findOrCreateCurrentUser(jwt);

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
        UserAccount user = findOrCreateCurrentUser(jwt);
        UUID userId = user.getId();
        
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
            case "image/jpeg", "image/jpg" -> ".jpg";
            case "image/gif" -> ".gif";
            case "image/webp" -> ".webp";
            case "image/svg+xml" -> ".svg";
            default -> ".bin";
        };
    }

    private void requireNonBlank(String skill) {
        if (skill == null || skill.isBlank()) {
            throw new DomainException("Skill name must not be blank.");
        }
    }

    private String extractEmailFromJwt(Jwt jwt) {
        String email = trimToNull(jwt.getClaimAsString("email"));
        if (email != null) {
            return email;
        }

        // Some providers may expose an alternate email claim.
        String alternateEmail = trimToNull(jwt.getClaimAsString("email_address"));
        if (alternateEmail != null) {
            return alternateEmail;
        }

        return null;
    }

    private void maybeRequireVerifiedEmail(Jwt jwt, String email) {
        // 邮箱缺失时：不强制（某些身份平台默认 JWT 不包含 email claim）。
        if (email == null || email.isBlank()) {
            return;
        }

        // Supabase deployments may expose either `confirmed_at` or `email_confirmed_at`.
        String confirmedAt = jwt.getClaimAsString("confirmed_at");
        String emailConfirmedAt = jwt.getClaimAsString("email_confirmed_at");
        Boolean emailVerified = jwt.getClaimAsBoolean("email_verified");

        Map<String, Object> userMetadata = jwt.getClaimAsMap("user_metadata");
        Object metaVerified = userMetadata == null ? null : userMetadata.get("email_verified");
        Map<String, Object> rawUserMetadata = jwt.getClaimAsMap("raw_user_meta_data");
        Object rawMetaVerified = rawUserMetadata == null ? null : rawUserMetadata.get("email_verified");

        boolean hasAnyVerificationSignal =
                confirmedAt != null || emailConfirmedAt != null || emailVerified != null || metaVerified != null || rawMetaVerified != null;

        boolean isVerified =
                hasText(confirmedAt)
                        || hasText(emailConfirmedAt)
                        || Boolean.TRUE.equals(emailVerified)
                        || Boolean.TRUE.equals(metaVerified)
                        || Boolean.TRUE.equals(rawMetaVerified);

        // 只有当 token 明确提供了验证信号但都不通过时，才拒绝。
        if (hasAnyVerificationSignal && !isVerified) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Please verify your email before accessing profile.");
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private UUID tryParseUuid(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private String buildBaseUsername(UUID userId, String email, String subject, Jwt jwt) {
        if (email != null && !email.isBlank()) {
            String localPart = email.split("@")[0];
            String sanitized = localPart.replaceAll("[^\\p{L}\\p{N}._-]", "_");
            if (!sanitized.isBlank()) {
                return sanitized;
            }
        }

        String preferredUsername = firstNonBlank(
                jwt.getClaimAsString("preferred_username"),
                jwt.getClaimAsString("username"),
                jwt.getClaimAsString("name"),
                jwt.getClaimAsString("given_name"));
        if (preferredUsername != null) {
            String sanitized = preferredUsername.replaceAll("[^\\p{L}\\p{N}._\\-\\s]", "_").trim();
            if (!sanitized.isBlank()) {
                return sanitized.length() > 32 ? sanitized.substring(0, 32) : sanitized;
            }
        }

        if (subject != null && !subject.isBlank()) {
            String sanitized = subject.replaceAll("[^a-zA-Z0-9]", "_");
            if (sanitized.length() > 24) {
                sanitized = sanitized.substring(0, 24);
            }
            if (!sanitized.isBlank()) {
                return "user_" + sanitized;
            }
        }

        return "user_" + userId.toString().replace("-", "").substring(0, 8);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}
