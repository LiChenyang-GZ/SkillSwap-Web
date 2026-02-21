package club.skillswap.skillswapbackend.workshop.repository;

import club.skillswap.skillswapbackend.workshop.entity.WorkshopParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface WorkshopParticipantRepository extends JpaRepository<WorkshopParticipant, Long> {
    
    // 统计用户参加的工作坊数量
    long countByUserId(UUID userId);
}
