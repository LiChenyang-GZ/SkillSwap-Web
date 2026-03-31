package club.skillswap.workshop.repository;

import club.skillswap.workshop.entity.WorkshopParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;
import java.util.List;

@Repository
public interface WorkshopParticipantRepository extends JpaRepository<WorkshopParticipant, Long> {
    
    // 缁熻鐢ㄦ埛鍙傚姞鐨勫伐浣滃潑鏁伴噺
    long countByUserId(UUID userId);

    // 鏌ヨ鐢ㄦ埛鍦ㄧ壒瀹氬伐浣滃潑鐨勫弬涓庤褰?
    List<WorkshopParticipant> findByUserIdAndWorkshopId(UUID userId, Long workshopId);

    // 根据 workshop ID 查询参与者记录
    List<WorkshopParticipant> findByWorkshopId(Long workshopId);
}

