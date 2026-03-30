package club.skillswap.workshop.service;

import club.skillswap.workshop.dto.WorkshopCreateRequestDto;
import club.skillswap.workshop.dto.WorkshopResponseDto;

import org.springframework.security.core.Authentication;

import java.util.List;

public interface WorkshopService {
    
    WorkshopResponseDto createWorkshop(WorkshopCreateRequestDto createRequestDto, String facilitatorId);

    WorkshopResponseDto getWorkshopById(Long id);

    List<WorkshopResponseDto> getAllWorkshops();
    
    void deleteWorkshop(Long workshopId, Authentication authentication);

    void joinWorkshop(Long workshopId, String userId);

    void leaveWorkshop(Long workshopId, String userId);
}
