package club.skillswap.workshop.repository;

import club.skillswap.workshop.entity.WorkshopParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    long countByWorkshopId(Long workshopId);

    @Query("""
        select wp from WorkshopParticipant wp
        join fetch wp.user
        where wp.workshop.id = :workshopId
        """)
    List<WorkshopParticipant> findByWorkshopIdWithUser(@Param("workshopId") Long workshopId);

    @Query("""
        select wp from WorkshopParticipant wp
        join fetch wp.user
        join fetch wp.workshop
        where wp.workshop.id in :workshopIds
        """)
    List<WorkshopParticipant> findByWorkshopIdInWithUser(@Param("workshopIds") List<Long> workshopIds);

    @Query("""
        select wp.workshop.id, count(wp.id)
        from WorkshopParticipant wp
        where wp.workshop.id in :workshopIds
        group by wp.workshop.id
        """)
    List<Object[]> countParticipantsByWorkshopIds(@Param("workshopIds") List<Long> workshopIds);
}

