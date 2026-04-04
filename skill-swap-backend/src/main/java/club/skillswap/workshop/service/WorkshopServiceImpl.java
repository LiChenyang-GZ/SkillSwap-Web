package club.skillswap.workshop.service;

import club.skillswap.common.exception.ResourceNotFoundException;
import club.skillswap.notification.service.NotificationService;
import club.skillswap.user.entity.UserAccount;
import club.skillswap.user.service.UserService;
import club.skillswap.workshop.dto.WorkshopCreateRequestDto;
import club.skillswap.workshop.dto.WorkshopReviewRequestDto;
import club.skillswap.workshop.dto.WorkshopResponseDto;
import club.skillswap.workshop.dto.FacilitatorDto;
import club.skillswap.workshop.dto.WorkshopParticipantDto;
import club.skillswap.workshop.entity.Workshop;
import club.skillswap.workshop.entity.WorkshopParticipant;
import club.skillswap.workshop.repository.WorkshopRepository;
import club.skillswap.workshop.repository.WorkshopParticipantRepository;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Map;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorkshopServiceImpl implements WorkshopService {

    private static final long DEFAULT_MAX_IMAGE_BYTES = 10L * 1024L * 1024L;

    private final WorkshopRepository workshopRepository;
    private final UserService userService;
    private final WorkshopParticipantRepository participantRepository;
    private final NotificationService notificationService;

    @Value("${app.upload.base-dir:uploads}")
    private String uploadBaseDir;

    @Value("${app.upload.max-image-bytes:" + DEFAULT_MAX_IMAGE_BYTES + "}")
    private long maxImageBytes;

    @Override
    @Transactional
    public void createWorkshop(WorkshopCreateRequestDto createRequestDto, String facilitatorId) {
        // 1. 鏍规嵁 facilitatorId 鏌ユ壘鐢ㄦ埛
        UserAccount facilitator = userService.findUserByStringId(facilitatorId);

        // 2. 灏?DTO 杞崲涓?Entity
        Workshop workshop = new Workshop();
        workshop.setHostName(createRequestDto.hostName());
        workshop.setTitle(createRequestDto.title());
        workshop.setDescription(createRequestDto.description());
        workshop.setCategory(createRequestDto.category());
        workshop.setDuration(createRequestDto.duration());
        workshop.setDate(createRequestDto.date());
        workshop.setTime(createRequestDto.time());
        workshop.setIsOnline(createRequestDto.isOnline());
        workshop.setLocation(createRequestDto.location());
        workshop.setMaxParticipants(createRequestDto.maxParticipants());
        workshop.setContactNumber(createRequestDto.contactNumber());
        workshop.setMaterialsProvided(createRequestDto.materialsProvided());
        workshop.setMaterialsNeededFromClub(createRequestDto.materialsNeededFromClub());
        workshop.setVenueRequirements(createRequestDto.venueRequirements());
        workshop.setOtherImportantInfo(createRequestDto.otherImportantInfo());
        workshop.setDetailsConfirmed(Boolean.TRUE.equals(createRequestDto.detailsConfirmed()));
        workshop.setWeekNumber(createRequestDto.weekNumber());
        workshop.setMemberResponsible(createRequestDto.memberResponsible());
        workshop.setMembersPresent(createRequestDto.membersPresent());
        workshop.setEventSubmitted(Boolean.TRUE.equals(createRequestDto.eventSubmitted()));
        workshop.setUsuApprovalStatus(normalizeUsuApprovalStatus(createRequestDto.usuApprovalStatus()));
        // 积分系统已停用：创建 workshop 时不再使用请求中的积分配置。
        // workshop.setCreditCost(createRequestDto.creditCost());
        // workshop.setCreditReward(createRequestDto.creditReward());
        workshop.setCreditCost(0);
        workshop.setCreditReward(0);
        workshop.setFacilitator(facilitator);
        workshop.setSubmitterUsername(facilitator.getUsername());
        workshop.setSubmitterEmail(facilitator.getEmail());
        workshop.setStatus("pending");
        workshop.setReviewedBy(null);
        workshop.setReviewedAt(null);
        workshop.setReviewComment(null);
        workshop.setApprovedAt(null);

        // ... 璋冪敤绉垎鏈嶅姟 ...

        // 3. 淇濆瓨鍒版暟鎹簱
        Workshop savedWorkshop = workshopRepository.save(workshop);

        notifyAdminsForWorkshop(
                savedWorkshop,
                facilitator,
                "workshop_submission",
                "New workshop submitted: " + savedWorkshop.getTitle(),
                "A new workshop (" + savedWorkshop.getTitle() + ") is awaiting your review."
        );

        // 创建接口仅返回成功消息，避免额外 DTO 映射开销。
    }

    @Override
    @Transactional(readOnly = true)
    public WorkshopResponseDto getWorkshopById(Long id, Authentication authentication) {
        Workshop workshop = workshopRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workshop not found with ID: " + id));
        enforceWorkshopVisibility(workshop, authentication);
        return mapToDtoForViewer(workshop, authentication);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkshopResponseDto> getAllWorkshops() {
        List<Workshop> workshops = workshopRepository.findAllWithFacilitator();
        return mapToDtoList(workshops);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkshopResponseDto> getPublicWorkshops() {
        List<Workshop> workshops = workshopRepository.findAllPublicApprovedWithFacilitator();
        return workshops.stream().map(this::mapToSummaryDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkshopResponseDto> getMyWorkshops(String facilitatorId) {
        UUID facilitatorUuid;
        try {
            facilitatorUuid = UUID.fromString(facilitatorId);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid user id.");
        }

        List<Workshop> workshops = workshopRepository.findAllByFacilitatorIdWithFacilitator(facilitatorUuid);
        return workshops.stream().map(this::mapToSummaryDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkshopResponseDto> getAllWorkshopsForAdmin(Authentication authentication) {
        requireAdmin(authentication);
        List<Workshop> workshops = workshopRepository.findAllWithFacilitator();
        return workshops.stream().map(this::mapToSummaryDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkshopResponseDto> getPendingWorkshops(Authentication authentication) {
        requireAdmin(authentication);
        List<Workshop> workshops = workshopRepository.findAllPendingWithFacilitator();
        return workshops.stream().map(this::mapToSummaryDto).toList();
    }

    @Override
    @Transactional
    public WorkshopResponseDto updatePendingWorkshop(Long workshopId, WorkshopCreateRequestDto updateRequestDto, Authentication authentication) {
        requireAdmin(authentication);

        Workshop workshop = workshopRepository.findById(workshopId)
                .orElseThrow(() -> new ResourceNotFoundException("Workshop not found with ID: " + workshopId));

        String currentStatus = normalizeStatus(workshop.getStatus());
        if ("completed".equals(currentStatus) || "cancelled".equals(currentStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Completed or cancelled workshops cannot be edited.");
        }
        if (isWorkshopStarted(workshop)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Workshops cannot be edited after they start.");
        }

        workshop.setTitle(updateRequestDto.title());
        workshop.setDescription(updateRequestDto.description());
        workshop.setCategory(updateRequestDto.category());
        workshop.setDuration(updateRequestDto.duration());
        workshop.setDate(updateRequestDto.date());
        workshop.setTime(updateRequestDto.time());
        workshop.setIsOnline(updateRequestDto.isOnline());
        workshop.setLocation(updateRequestDto.location());
        workshop.setMaxParticipants(updateRequestDto.maxParticipants());
        workshop.setHostName(updateRequestDto.hostName());
        workshop.setContactNumber(updateRequestDto.contactNumber());
        workshop.setMaterialsProvided(updateRequestDto.materialsProvided());
        workshop.setMaterialsNeededFromClub(updateRequestDto.materialsNeededFromClub());
        workshop.setVenueRequirements(updateRequestDto.venueRequirements());
        workshop.setOtherImportantInfo(updateRequestDto.otherImportantInfo());
        workshop.setDetailsConfirmed(Boolean.TRUE.equals(updateRequestDto.detailsConfirmed()));
        workshop.setWeekNumber(updateRequestDto.weekNumber());
        workshop.setMemberResponsible(updateRequestDto.memberResponsible());
        workshop.setMembersPresent(updateRequestDto.membersPresent());
        workshop.setEventSubmitted(Boolean.TRUE.equals(updateRequestDto.eventSubmitted()));
        workshop.setUsuApprovalStatus(normalizeUsuApprovalStatus(updateRequestDto.usuApprovalStatus()));

        Workshop saved = workshopRepository.save(workshop);
        notifyWorkshopAdminUpdate(saved);
        return mapToDto(saved);
    }

    @Override
    @Transactional
    public WorkshopResponseDto uploadWorkshopImage(Long workshopId, MultipartFile file, Authentication authentication) {
        requireAdmin(authentication);

        Workshop workshop = workshopRepository.findById(workshopId)
                .orElseThrow(() -> new ResourceNotFoundException("Workshop not found with ID: " + workshopId));

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

        Path targetDirectory = Paths.get(uploadBaseDir, "workshops").toAbsolutePath().normalize();
        Path targetFile = targetDirectory.resolve(fileName).normalize();

        if (!targetFile.startsWith(targetDirectory)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file path.");
        }

        try {
            Files.createDirectories(targetDirectory);
            Files.copy(file.getInputStream(), targetFile, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store image.");
        }

        workshop.setImageUrl("/uploads/workshops/" + fileName);
        Workshop saved = workshopRepository.save(workshop);
        return mapToDto(saved);
    }

    @Override
    @Transactional
    public void approveWorkshop(Long workshopId, Authentication authentication) {
        requireAdmin(authentication);

        Workshop workshop = workshopRepository.findById(workshopId)
                .orElseThrow(() -> new ResourceNotFoundException("Workshop not found with ID: " + workshopId));

        String currentStatus = normalizeStatus(workshop.getStatus());
        if (!"pending".equals(currentStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only pending workshops can be approved.");
        }

        workshop.setStatus("approved");
        workshop.setApprovedAt(LocalDateTime.now());
        workshop.setReviewedAt(LocalDateTime.now());
        workshop.setReviewComment(null);
        workshop.setReviewedBy(extractUserUuid(authentication));

        Workshop saved = workshopRepository.save(workshop);
        notifyWorkshopReview(saved, "workshop_approved", "Workshop approved: " + saved.getTitle(),
            "Your workshop (" + saved.getTitle() + ") has been approved and is now visible to others.");
    }

    @Override
    @Transactional
    public void rejectWorkshop(Long workshopId, WorkshopReviewRequestDto reviewRequestDto, Authentication authentication) {
        requireAdmin(authentication);

        Workshop workshop = workshopRepository.findById(workshopId)
                .orElseThrow(() -> new ResourceNotFoundException("Workshop not found with ID: " + workshopId));

        String currentStatus = normalizeStatus(workshop.getStatus());
        if (!"pending".equals(currentStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only pending workshops can be rejected.");
        }

        workshop.setStatus("rejected");
        workshop.setApprovedAt(null);
        workshop.setReviewedAt(LocalDateTime.now());
        workshop.setReviewComment(reviewRequestDto != null ? reviewRequestDto.comment() : null);
        workshop.setReviewedBy(extractUserUuid(authentication));

        Workshop saved = workshopRepository.save(workshop);
        notifyWorkshopReview(saved, "workshop_rejected", "Workshop rejected: " + saved.getTitle(),
            "Your workshop submission (" + saved.getTitle() + ") was rejected. You can review the details and submit again.");
    }

    @Override
    @Transactional
    public void cancelWorkshop(Long workshopId, Authentication authentication) {
        requireAdmin(authentication);

        Workshop workshop = workshopRepository.findById(workshopId)
                .orElseThrow(() -> new ResourceNotFoundException("Workshop not found with ID: " + workshopId));

        String currentStatus = normalizeStatus(workshop.getStatus());
        if ("completed".equals(currentStatus) || "cancelled".equals(currentStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Completed or cancelled workshops cannot be cancelled.");
        }
        if (isWorkshopStarted(workshop)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Workshops cannot be cancelled after they start.");
        }

        workshop.setStatus("cancelled");
        workshop.setReviewedAt(LocalDateTime.now());
        workshop.setReviewedBy(extractUserUuid(authentication));

        Workshop saved = workshopRepository.save(workshop);
        notifyWorkshopCancelled(saved);
    }

    @Override
    @Transactional
    public void requestWorkshopApproval(Long workshopId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please login.");
        }

        Workshop workshop = workshopRepository.findById(workshopId)
                .orElseThrow(() -> new ResourceNotFoundException("Workshop not found with ID: " + workshopId));

        String currentStatus = normalizeStatus(workshop.getStatus());
        if (!"pending".equals(currentStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only pending workshops can request approval.");
        }

        UUID requesterId = extractUserUuid(authentication);
        boolean isAdmin = isAdmin(authentication);
        boolean isFacilitator = workshop.getFacilitator() != null
                && workshop.getFacilitator().getId() != null
                && workshop.getFacilitator().getId().equals(requesterId);

        if (!isAdmin && !isFacilitator) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the host can request approval.");
        }

        notifyAdminsForWorkshop(
                workshop,
                workshop.getFacilitator(),
                "workshop_submission",
                "Approval requested: " + workshop.getTitle(),
                "The host requested approval for workshop (" + workshop.getTitle() + ")."
        );
    }

    private List<WorkshopResponseDto> mapToDtoList(List<Workshop> workshops) {
        if (workshops == null || workshops.isEmpty()) {
            return List.of();
        }

        List<Long> workshopIds = workshops.stream()
            .map(Workshop::getId)
            .toList();

        Map<Long, List<WorkshopParticipantDto>> participantsByWorkshopId = participantRepository
            .findByWorkshopIdInWithUser(workshopIds)
            .stream()
            .collect(Collectors.groupingBy(
                p -> p.getWorkshop().getId(),
                Collectors.mapping(
                    p -> new WorkshopParticipantDto(
                        p.getUser().getId().toString(),
                        p.getUser().getUsername(),
                        p.getUser().getAvatarUrl(),
                        p.getUser().getEmail()
                    ),
                    Collectors.toList()
                )
            ));

        return workshops.stream()
            .map(workshop -> mapToDto(workshop, participantsByWorkshopId.getOrDefault(workshop.getId(), List.of())))
            .toList();
    }

    @Override
    @Transactional
    public void deleteWorkshop(Long workshopId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please login.");
        }

        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));
        if (!isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required to delete workshops.");
        }

        // 1. 鏍规嵁ID鏌ユ壘Workshop锛屽鏋滄壘涓嶅埌鍒欐姏鍑哄紓甯?
        Workshop workshop = workshopRepository.findById(workshopId)
                .orElseThrow(() -> new ResourceNotFoundException("Workshop not found with ID: " + workshopId));

        // 2. admin-only delete
        workshopRepository.delete(workshop);
    }

    @Override
    @Transactional
    public void joinWorkshop(Long workshopId, String userId) {
        // 1. 鏌ユ壘宸ヤ綔鍧?
        Workshop workshop = workshopRepository.findById(workshopId)
                .orElseThrow(() -> new ResourceNotFoundException("Workshop not found with ID: " + workshopId));

        // 2. 鏌ユ壘鐢ㄦ埛
        UserAccount user = userService.findUserByStringId(userId);

        // 3. 妫€鏌ョ敤鎴锋槸鍚﹀凡缁忓弬鍔犱簡杩欎釜宸ヤ綔鍧?
        List<WorkshopParticipant> existingParticipations = participantRepository.findByUserIdAndWorkshopId(
                user.getId(), workshopId
        );
        if (!existingParticipations.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User is already a participant in this workshop");
        }

        // 4. 积分系统已停用：不再校验用户积分是否充足。
        // Integer creditCost = workshop.getCreditCost();
        // if (creditCost == null) creditCost = 0;
        //
        // Integer userCreditBalance = user.getCreditBalance();
        // if (userCreditBalance == null) userCreditBalance = 0;
        //
        // if (userCreditBalance < creditCost) {
        //     throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insufficient credits to join this workshop");
        // }

        // 5. 娣诲姞鍙備笌鑰呰褰?
        WorkshopParticipant participant = new WorkshopParticipant();
        participant.setWorkshop(workshop);
        participant.setUser(user);
        participant.setRegistrationDate(LocalDateTime.now());
        participantRepository.save(participant);

        // 6. 积分系统已停用：不再扣减积分。
        // user.setCreditBalance(userCreditBalance - creditCost);
        // userService.saveUser(user);

        // 7. 积分系统已停用：不再记录积分交易。
        // CreditTransaction transaction = new CreditTransaction();
        // transaction.setUser(user);
        // transaction.setWorkshop(workshop);
        // transaction.setCreditAmount(-creditCost);
        // transaction.setTransactionType("JOIN");
        // transaction.setDescription("Joined workshop: " + workshop.getTitle());
        // creditTransactionRepository.save(transaction);
    }

    @Override
    @Transactional
    public void leaveWorkshop(Long workshopId, String userId) {
        // 1. 鏌ユ壘宸ヤ綔鍧?
        Workshop workshop = workshopRepository.findById(workshopId)
                .orElseThrow(() -> new ResourceNotFoundException("Workshop not found with ID: " + workshopId));

        // 2. 鏌ユ壘鐢ㄦ埛
        UserAccount user = userService.findUserByStringId(userId);

        // 3. 鏌ユ壘鍙備笌璁板綍
        List<WorkshopParticipant> participations = participantRepository.findByUserIdAndWorkshopId(
                user.getId(), workshopId
        );
        if (participations.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User is not a participant in this workshop");
        }

        // 4. 鍒犻櫎鍙備笌璁板綍
        participantRepository.deleteAll(participations);

        // 5. 积分系统已停用：退出 workshop 时不再返还积分。
        // Integer creditCost = workshop.getCreditCost();
        // if (creditCost == null) creditCost = 0;
        //
        // Integer userCreditBalance = user.getCreditBalance();
        // if (userCreditBalance == null) userCreditBalance = 0;
        //
        // user.setCreditBalance(userCreditBalance + creditCost);
        // userService.saveUser(user);

        // 6. 积分系统已停用：不再记录积分交易（退出返还）。
        // CreditTransaction transaction = new CreditTransaction();
        // transaction.setUser(user);
        // transaction.setWorkshop(workshop);
        // transaction.setCreditAmount(creditCost);
        // transaction.setTransactionType("LEAVE");
        // transaction.setDescription("Left workshop: " + workshop.getTitle());
        // creditTransactionRepository.save(transaction);
    }

    private WorkshopResponseDto mapToSummaryDto(Workshop workshop) {
        FacilitatorDto facilitatorDto = null;
        if (workshop.getFacilitator() != null) {
            facilitatorDto = new FacilitatorDto(
                workshop.getFacilitator().getId().toString(),
                workshop.getFacilitator().getUsername(),
                workshop.getFacilitator().getAvatarUrl()
            );
        }

        String summaryLocation = Boolean.TRUE.equals(workshop.getIsOnline())
            ? "Online"
            : (workshop.getLocation() == null || workshop.getLocation().isBlank() ? "To be confirmed" : workshop.getLocation());

        return new WorkshopResponseDto(
            workshop.getId().toString(),
            workshop.getHostName(),
            workshop.getTitle(),
            workshop.getDescription(),
            workshop.getCategory(),
            resolveEffectiveStatus(workshop),
            workshop.getDate(),
            workshop.getTime(),
            workshop.getDuration(),
            workshop.getIsOnline(),
            summaryLocation,
            workshop.getMaxParticipants(),
            null,
            workshop.getCreditCost(),
            workshop.getCreditReward(),
            null,
            workshop.getMaterialsProvided(),
            workshop.getMaterialsNeededFromClub(),
            workshop.getVenueRequirements(),
            workshop.getOtherImportantInfo(),
            workshop.getDetailsConfirmed(),
            workshop.getSubmitterUsername(),
            null,
            workshop.getImageUrl(),
            workshop.getWeekNumber(),
            workshop.getMemberResponsible(),
            workshop.getMembersPresent(),
            workshop.getEventSubmitted(),
            workshop.getUsuApprovalStatus(),
            facilitatorDto,
            null,
            workshop.getCreatedAt()
        );
    }

    // 绉佹湁杈呭姪鏂规硶锛岀敤浜庡皢 Entity 鏄犲皠鍒?DTO
    private WorkshopResponseDto mapToDto(Workshop workshop) {
        return mapToDto(workshop, false, true);
    }

    private WorkshopResponseDto mapToDto(Workshop workshop, boolean includeParticipants) {
        return mapToDto(workshop, includeParticipants, true);
    }

    private WorkshopResponseDto mapToDto(Workshop workshop, boolean includeParticipants, boolean includeSensitive) {
        if (includeParticipants) {
            List<WorkshopParticipantDto> participants = participantRepository.findByWorkshopIdWithUser(workshop.getId())
                .stream()
                .map(p -> new WorkshopParticipantDto(
                    p.getUser().getId().toString(),
                    p.getUser().getUsername(),
                    p.getUser().getAvatarUrl(),
                    p.getUser().getEmail()
                ))
                .toList();
            return mapToDto(workshop, participants, participants.size(), includeSensitive);
        }

        Integer participantCount = Math.toIntExact(participantRepository.countByWorkshopId(workshop.getId()));
        return mapToDto(workshop, null, participantCount, includeSensitive);
    }

    private WorkshopResponseDto mapToDto(Workshop workshop, List<WorkshopParticipantDto> participants) {
        Integer participantCount = participants == null ? null : participants.size();
        return mapToDto(workshop, participants, participantCount, true);
    }

    private WorkshopResponseDto mapToDto(Workshop workshop, List<WorkshopParticipantDto> participants, Integer participantCount) {
        return mapToDto(workshop, participants, participantCount, true);
    }

    private WorkshopResponseDto mapToDto(Workshop workshop, List<WorkshopParticipantDto> participants, Integer participantCount, boolean includeSensitive) {
        List<WorkshopParticipantDto> safeParticipants = participants == null ? null : participants;
        FacilitatorDto facilitatorDto = null;
        if (workshop.getFacilitator() != null) {
            facilitatorDto = new FacilitatorDto(
                workshop.getFacilitator().getId().toString(),
                workshop.getFacilitator().getUsername(),
                workshop.getFacilitator().getAvatarUrl()
            );
        }

        return new WorkshopResponseDto(
            workshop.getId().toString(),
            workshop.getHostName(),
            workshop.getTitle(),
            workshop.getDescription(),
            workshop.getCategory(),
            resolveEffectiveStatus(workshop),
            workshop.getDate(),
            workshop.getTime(),
            workshop.getDuration(),
            workshop.getIsOnline(),
            workshop.getLocation(),
            workshop.getMaxParticipants(),
            participantCount,
            workshop.getCreditCost(),
            workshop.getCreditReward(),
            includeSensitive ? workshop.getContactNumber() : null,
            workshop.getMaterialsProvided(),
            workshop.getMaterialsNeededFromClub(),
            workshop.getVenueRequirements(),
            workshop.getOtherImportantInfo(),
            workshop.getDetailsConfirmed(),
            workshop.getSubmitterUsername(),
            includeSensitive ? workshop.getSubmitterEmail() : null,
            workshop.getImageUrl(),
            workshop.getWeekNumber(),
            workshop.getMemberResponsible(),
            workshop.getMembersPresent(),
            workshop.getEventSubmitted(),
            workshop.getUsuApprovalStatus(),
            facilitatorDto,
            safeParticipants,
            workshop.getCreatedAt()
            );
    }

    private WorkshopResponseDto mapToDtoForViewer(Workshop workshop, Authentication authentication) {
        boolean admin = isAdmin(authentication);
        boolean includeSensitive = canViewSensitiveWorkshopInfo(workshop, authentication);
        return mapToDto(workshop, admin, includeSensitive);
    }

    private boolean canViewSensitiveWorkshopInfo(Workshop workshop, Authentication authentication) {
        if (isAdmin(authentication)) {
            return true;
        }
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        UUID requesterId = extractUserUuid(authentication);
        UUID facilitatorId = workshop.getFacilitator() != null ? workshop.getFacilitator().getId() : null;
        return requesterId != null && facilitatorId != null && facilitatorId.equals(requesterId);
    }

    private String normalizeUsuApprovalStatus(String status) {
        String normalized = trimToNull(status);
        if (normalized == null) {
            return "pending";
        }

        String lower = normalized.toLowerCase(Locale.ROOT);
        if (!"pending".equals(lower) && !"approved".equals(lower)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "USU approval status must be pending or approved.");
        }

        return lower;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String resolveImageFileExtension(String originalFilename, String contentType) {
        String fallback = switch (contentType.toLowerCase(Locale.ROOT)) {
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            case "image/gif" -> ".gif";
            case "image/webp" -> ".webp";
            case "image/svg+xml" -> ".svg";
            default -> ".bin";
        };

        String fileName = trimToNull(originalFilename);
        if (fileName == null) {
            return fallback;
        }

        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == fileName.length() - 1) {
            return fallback;
        }

        String extension = fileName.substring(dotIndex).toLowerCase(Locale.ROOT);
        if (!extension.matches("\\.[a-z0-9]{1,10}")) {
            return fallback;
        }

        return extension;
    }

    private String resolveEffectiveStatus(Workshop workshop) {
        String status = workshop.getStatus();
        if (status == null) {
            return "pending";
        }

        String normalized = normalizeStatus(status);
        if ("cancelled".equals(normalized)
                || "completed".equals(normalized)
                || "pending".equals(normalized)
                || "rejected".equals(normalized)) {
            return normalized;
        }

        LocalDate date = workshop.getDate();
        LocalTime time = workshop.getTime();
        if (date == null) {
            return normalized;
        }

        LocalDateTime startDateTime = LocalDateTime.of(date, time != null ? time : LocalTime.MIDNIGHT);
        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(startDateTime)) {
            return "upcoming";
        }

        Integer durationMinutes = workshop.getDuration();
        if (durationMinutes != null && durationMinutes > 0) {
            LocalDateTime endDateTime = startDateTime.plusMinutes(durationMinutes);
            if (now.isBefore(endDateTime)) {
                return "ongoing";
            }

            return "completed";
        }

        return "ongoing";
    }

    private String normalizeStatus(String status) {
        return status == null ? "pending" : status.toLowerCase();
    }

    private boolean isWorkshopStarted(Workshop workshop) {
        LocalDate date = workshop.getDate();
        if (date == null) {
            return false;
        }

        LocalTime time = workshop.getTime() != null ? workshop.getTime() : LocalTime.MIDNIGHT;
        LocalDateTime startTime = LocalDateTime.of(date, time);
        return !startTime.isAfter(LocalDateTime.now());
    }

    private boolean isAdmin(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        return authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ADMIN".equals(a.getAuthority()));
    }

    private void enforceWorkshopVisibility(Workshop workshop, Authentication authentication) {
        if (workshop == null) {
            return;
        }

        String status = normalizeStatus(workshop.getStatus());
        boolean isRestricted = "pending".equals(status) || "rejected".equals(status);
        if (!isRestricted) {
            return;
        }

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Workshop not found.");
        }

        if (isAdmin(authentication)) {
            return;
        }

        UUID requesterId = extractUserUuid(authentication);
        UUID facilitatorId = workshop.getFacilitator() != null ? workshop.getFacilitator().getId() : null;
        if (requesterId != null && facilitatorId != null && facilitatorId.equals(requesterId)) {
            return;
        }

        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Workshop not found.");
    }

    private void requireAdmin(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please login.");
        }
        if (!isAdmin(authentication)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required.");
        }
    }

    private UUID extractUserUuid(Authentication authentication) {
        try {
            return UUID.fromString(extractUserId(authentication));
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private void notifyAdminsForWorkshop(Workshop workshop, UserAccount facilitator, String type, String title, String message) {
        if (workshop == null) {
            return;
        }

        List<UserAccount> admins = userService.findAdmins();
        for (UserAccount admin : admins) {
            if (admin == null || admin.getId() == null) {
                continue;
            }
            if (facilitator != null && admin.getId().equals(facilitator.getId())) {
                continue;
            }
            notificationService.createNotification(
                    admin,
                    type,
                    title,
                    message,
                    workshop
            );
        }
    }

    private void notifyWorkshopReview(Workshop workshop, String type, String title, String message) {
        if (workshop == null || workshop.getFacilitator() == null) {
            return;
        }
        notificationService.createNotification(
            workshop.getFacilitator(),
                type,
                title,
                message,
            workshop
        );
    }

    private void notifyWorkshopCancelled(Workshop workshop) {
        if (workshop == null) {
            return;
        }

        UserAccount facilitator = workshop.getFacilitator();
        if (facilitator != null) {
            notificationService.createNotification(
                    facilitator,
                    "workshop_cancelled",
                    "Workshop cancelled: " + workshop.getTitle(),
                    "Your workshop (" + workshop.getTitle() + ") was cancelled by an administrator.",
                    workshop
            );
        }

        List<WorkshopParticipant> participants = participantRepository.findByWorkshopId(workshop.getId());
        for (WorkshopParticipant participant : participants) {
            if (participant.getUser() == null) {
                continue;
            }
            if (facilitator != null && facilitator.getId().equals(participant.getUser().getId())) {
                continue;
            }
            notificationService.createNotification(
                    participant.getUser(),
                    "workshop_cancelled",
                    "Workshop cancelled: " + workshop.getTitle(),
                    "The workshop (" + workshop.getTitle() + ") you joined was cancelled by an administrator.",
                    workshop
            );
        }
    }

    private void notifyWorkshopAdminUpdate(Workshop workshop) {
        if (workshop == null) {
            return;
        }

        UserAccount facilitator = workshop.getFacilitator();
        if (facilitator != null) {
            notificationService.createNotification(
                    facilitator,
                    "workshop_updated_by_admin",
                    "Workshop updated: " + workshop.getTitle(),
                    "An administrator updated your workshop (" + workshop.getTitle() + ").",
                    workshop
            );
        }

        String status = normalizeStatus(workshop.getStatus());
        if (!"approved".equals(status)) {
            return;
        }

        List<WorkshopParticipant> participants = participantRepository.findByWorkshopId(workshop.getId());
        for (WorkshopParticipant participant : participants) {
            if (participant.getUser() == null) {
                continue;
            }
            if (facilitator != null && facilitator.getId().equals(participant.getUser().getId())) {
                continue;
            }
            notificationService.createNotification(
                    participant.getUser(),
                    "workshop_updated",
                    "Workshop updated: " + workshop.getTitle(),
                    "An administrator updated the workshop (" + workshop.getTitle() + "). Please review the latest schedule and information.",
                    workshop
            );
        }
    }

    private String extractUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please login.");
        }

        // 1) Spring Resource Server锛圔earer JWT锛?
        if (authentication instanceof JwtAuthenticationToken jwtAuth) {
            // 涓€鑸氨鏄敤鎴风殑 UUID锛圝WT 鐨?sub锛?
            return jwtAuth.getToken().getSubject();
            // 涔熷彲浠ヤ粠 claim 閲屽彇锛歫wtAuth.getTokenAttributes().get("sub")
        }

        // 2) 浼犵粺琛ㄥ崟/鑷畾涔?UserDetails
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDetails ud) {
            // 閫氬父鏄敤鎴峰悕锛涘鏋滀綘鐨?username 瀛樼殑鏄?UUID锛岃繖閲屽氨鏄?UUID
            return ud.getUsername();
        }

        // 3) OAuth2 Login锛圙oogle/GitHub/鈥︼級
        if (principal instanceof DefaultOAuth2User ou) {
            Object sub = ou.getAttribute("sub"); // 鏈変簺鎻愪緵鏂圭敤 "id"
            if (sub != null) return sub.toString();
            Object id = ou.getAttribute("id");
            if (id != null) return id.toString();
            return ou.getName(); // fallback
        }

        // 4) 鍏滃簳
        return authentication.getName();
    }
}
