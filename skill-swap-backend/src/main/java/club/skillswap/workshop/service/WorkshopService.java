package club.skillswap.workshop.service;

import club.skillswap.workshop.dto.WorkshopCreateRequestDto;
import club.skillswap.workshop.dto.WorkshopReviewRequestDto;
import club.skillswap.workshop.dto.WorkshopResponseDto;
import club.skillswap.workshop.dto.WorkshopStatusUpdateResponseDto;

import org.springframework.security.core.Authentication;

import java.util.List;

public interface WorkshopService {
    
    WorkshopResponseDto createWorkshop(WorkshopCreateRequestDto createRequestDto, String facilitatorId);

    WorkshopResponseDto getWorkshopById(Long id);

    List<WorkshopResponseDto> getAllWorkshops();

    List<WorkshopResponseDto> getPublicWorkshops();

    List<WorkshopResponseDto> getMyWorkshops(String facilitatorId);

    List<WorkshopResponseDto> getPendingWorkshops(Authentication authentication);

    WorkshopResponseDto updatePendingWorkshop(Long workshopId, WorkshopCreateRequestDto updateRequestDto, Authentication authentication);

    WorkshopStatusUpdateResponseDto approveWorkshop(Long workshopId, Authentication authentication);

    WorkshopStatusUpdateResponseDto rejectWorkshop(Long workshopId, WorkshopReviewRequestDto reviewRequestDto, Authentication authentication);
    
    void deleteWorkshop(Long workshopId, Authentication authentication);

    void joinWorkshop(Long workshopId, String userId);

    void leaveWorkshop(Long workshopId, String userId);
}
