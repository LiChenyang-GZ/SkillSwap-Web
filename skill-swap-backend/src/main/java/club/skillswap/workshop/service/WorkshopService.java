package club.skillswap.workshop.service;

import club.skillswap.workshop.dto.WorkshopCreateRequestDto;
import club.skillswap.workshop.dto.WorkshopReviewRequestDto;
import club.skillswap.workshop.dto.WorkshopResponseDto;

import org.springframework.security.core.Authentication;

import java.util.List;

public interface WorkshopService {
    
    void createWorkshop(WorkshopCreateRequestDto createRequestDto, String facilitatorId);

    WorkshopResponseDto getWorkshopById(Long id, Authentication authentication);

    List<WorkshopResponseDto> getAllWorkshops();

    List<WorkshopResponseDto> getPublicWorkshops();

    List<WorkshopResponseDto> getMyWorkshops(String facilitatorId);

    List<WorkshopResponseDto> getAllWorkshopsForAdmin(Authentication authentication);

    List<WorkshopResponseDto> getPendingWorkshops(Authentication authentication);

    WorkshopResponseDto updatePendingWorkshop(Long workshopId, WorkshopCreateRequestDto updateRequestDto, Authentication authentication);

    void approveWorkshop(Long workshopId, Authentication authentication);

    void rejectWorkshop(Long workshopId, WorkshopReviewRequestDto reviewRequestDto, Authentication authentication);

    void cancelWorkshop(Long workshopId, Authentication authentication);
    
    void deleteWorkshop(Long workshopId, Authentication authentication);

    void joinWorkshop(Long workshopId, String userId);

    void leaveWorkshop(Long workshopId, String userId);

    void requestWorkshopApproval(Long workshopId, Authentication authentication);
}
