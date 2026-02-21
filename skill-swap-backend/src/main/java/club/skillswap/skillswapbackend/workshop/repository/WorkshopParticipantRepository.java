package club.skillswap.skillswapbackend.workshop.repository;

import club.skillswap.skillswapbackend.workshop.entity.WorkshopParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;
import java.util.List;

@Repository
public interface WorkshopParticipantRepository extends JpaRepository<WorkshopParticipant, Long> {
    
    // 统计用户参加的工作坊数量
    long countByUserId(UUID userId);

    // 查询用户在特定工作坊的参与记录
    List<WorkshopParticipant> findByUserIdAndWorkshopId(UUID userId, Long workshopId);
}
