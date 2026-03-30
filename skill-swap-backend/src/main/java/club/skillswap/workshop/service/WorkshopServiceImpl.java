package club.skillswap.workshop.service;

import club.skillswap.common.exception.ResourceNotFoundException;
import club.skillswap.credit.entity.CreditTransaction;
import club.skillswap.credit.repository.CreditTransactionRepository;
import club.skillswap.user.entity.UserAccount;
import club.skillswap.user.service.UserService;
import club.skillswap.workshop.dto.WorkshopCreateRequestDto;
import club.skillswap.workshop.dto.WorkshopResponseDto;
import club.skillswap.workshop.dto.FacilitatorDto;
import club.skillswap.workshop.entity.Workshop;
import club.skillswap.workshop.entity.WorkshopParticipant;
import club.skillswap.workshop.repository.WorkshopRepository;
import club.skillswap.workshop.repository.WorkshopParticipantRepository;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WorkshopServiceImpl implements WorkshopService {

    private final WorkshopRepository workshopRepository;
    private final UserService userService;
    private final WorkshopParticipantRepository participantRepository;
    private final CreditTransactionRepository creditTransactionRepository;

    @Override
    @Transactional
    public WorkshopResponseDto createWorkshop(WorkshopCreateRequestDto createRequestDto, String facilitatorId) {
        // 1. 鏍规嵁 facilitatorId 鏌ユ壘鐢ㄦ埛
        UserAccount facilitator = userService.findUserByStringId(facilitatorId);

        // 2. 灏?DTO 杞崲涓?Entity
        Workshop workshop = new Workshop();
        workshop.setTitle(createRequestDto.title());
        workshop.setDescription(createRequestDto.description());
        workshop.setCategory(createRequestDto.category());
        workshop.setSkillLevel(createRequestDto.skillLevel());
        workshop.setDuration(createRequestDto.duration());
        workshop.setDate(createRequestDto.date());
        workshop.setTime(createRequestDto.time());
        workshop.setIsOnline(createRequestDto.isOnline());
        workshop.setLocation(createRequestDto.location());
        workshop.setMaxParticipants(createRequestDto.maxParticipants());
        workshop.setCreditCost(createRequestDto.creditCost());
        workshop.setCreditReward(createRequestDto.creditReward());
        workshop.setTags(createRequestDto.tags());
        workshop.setMaterials(createRequestDto.materials());
        workshop.setRequirements(createRequestDto.requirements());
        workshop.setFacilitator(facilitator);

        // ... 璋冪敤绉垎鏈嶅姟 ...

        // 3. 淇濆瓨鍒版暟鎹簱
        Workshop savedWorkshop = workshopRepository.save(workshop);

        // 4. 灏嗕繚瀛樺悗鐨?Entity 杞崲鍥?Response DTO 骞惰繑鍥?
        return mapToDto(savedWorkshop);
    }

    @Override
    @Transactional(readOnly = true)
    public WorkshopResponseDto getWorkshopById(Long id) {
        Workshop workshop = workshopRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workshop not found with ID: " + id));
        
        return mapToDto(workshop);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkshopResponseDto> getAllWorkshops() {
        List<Workshop> workshops = workshopRepository.findAllWithFacilitator();
        // 瑙﹀彂鎳掑姞杞斤紙娣诲姞 null 妫€鏌ワ級
        workshops.forEach(w -> {
            if (w.getLocation() != null) w.getLocation().size();
            if (w.getTags() != null) w.getTags().size();
            if (w.getMaterials() != null) w.getMaterials().size();
            if (w.getRequirements() != null) w.getRequirements().size();
        });
        return workshops.stream().map(this::mapToDto).toList();
    }

    @Override
    @Transactional
    public void deleteWorkshop(Long workshopId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please login.");
        }

        // 1. 鏍规嵁ID鏌ユ壘Workshop锛屽鏋滄壘涓嶅埌鍒欐姏鍑哄紓甯?
        Workshop workshop = workshopRepository.findById(workshopId)
                .orElseThrow(() -> new ResourceNotFoundException("Workshop not found with ID: " + workshopId));

        // 2. 鑾峰彇褰撳墠鎿嶄綔鐢ㄦ埛鐨処D鍜岃鑹?
        String currentUserId = extractUserId(authentication);
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));

        // 3. 鑾峰彇Workshop鍒涘缓鑰呯殑ID
        String facilitatorId = workshop.getFacilitator().getId().toString();

        // 4. 鏉冮檺鏍￠獙锛?
        // 濡傛灉褰撳墠鐢ㄦ埛鏃笉鏄疉dmin锛屼篃涓嶆槸璇orkshop鐨勫垱寤鸿€咃紝鍒欐姏鍑?03 Forbidden寮傚父
        if (!isAdmin && !currentUserId.equals(facilitatorId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to delete this workshop.");
        }

        // 5. 濡傛灉鏉冮檺鏍￠獙閫氳繃锛屽垯鎵ц鍒犻櫎鎿嶄綔
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

        // 4. 妫€鏌ョ敤鎴锋槸鍚︽湁瓒冲鐨勭Н鍒?
        Integer creditCost = workshop.getCreditCost();
        if (creditCost == null) creditCost = 0;
        
        Integer userCreditBalance = user.getCreditBalance();
        if (userCreditBalance == null) userCreditBalance = 0;
        
        if (userCreditBalance < creditCost) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insufficient credits to join this workshop");
        }

        // 5. 娣诲姞鍙備笌鑰呰褰?
        WorkshopParticipant participant = new WorkshopParticipant();
        participant.setWorkshop(workshop);
        participant.setUser(user);
        participant.setRegistrationDate(LocalDateTime.now());
        participantRepository.save(participant);

        // 6. 鎵ｉ櫎绉垎
        user.setCreditBalance(userCreditBalance - creditCost);
        userService.saveUser(user);

        // 7. 璁板綍绉垎浜ゆ槗
        CreditTransaction transaction = new CreditTransaction();
        transaction.setUser(user);
        transaction.setWorkshop(workshop);
        transaction.setCreditAmount(-creditCost);
        transaction.setTransactionType("JOIN");
        transaction.setDescription("Joined workshop: " + workshop.getTitle());
        creditTransactionRepository.save(transaction);
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

        // 5. 閫€杩樼Н鍒?
        Integer creditCost = workshop.getCreditCost();
        if (creditCost == null) creditCost = 0;

        Integer userCreditBalance = user.getCreditBalance();
        if (userCreditBalance == null) userCreditBalance = 0;

        user.setCreditBalance(userCreditBalance + creditCost);
        userService.saveUser(user);

        // 6. 璁板綍绉垎浜ゆ槗锛堥€€杩橈級
        CreditTransaction transaction = new CreditTransaction();
        transaction.setUser(user);
        transaction.setWorkshop(workshop);
        transaction.setCreditAmount(creditCost);
        transaction.setTransactionType("LEAVE");
        transaction.setDescription("Left workshop: " + workshop.getTitle());
        creditTransactionRepository.save(transaction);
    }

    // 绉佹湁杈呭姪鏂规硶锛岀敤浜庡皢 Entity 鏄犲皠鍒?DTO
    private WorkshopResponseDto mapToDto(Workshop workshop) {

        // 鍒涘缓宓屽鐨?FacilitatorDto锛堟坊鍔?null 妫€鏌ワ級
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
            workshop.getTitle(),
            workshop.getDescription(),
            workshop.getCategory(),
            workshop.getSkillLevel(),
            workshop.getStatus(),
            workshop.getDate(),
            workshop.getTime(),
            workshop.getDuration(),
            workshop.getIsOnline(),
            workshop.getLocation(),
            workshop.getMaxParticipants(),
            workshop.getCreditCost(),
            workshop.getCreditReward(),
            facilitatorDto,
            workshop.getTags(),
            workshop.getMaterials(),
            workshop.getRequirements(),
            workshop.getCreatedAt()
            );
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
