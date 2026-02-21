package club.skillswap.skillswapbackend.workshop.repository;

import club.skillswap.skillswapbackend.workshop.entity.Workshop;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkshopRepository extends JpaRepository<Workshop, Long> {

    @Query("SELECT DISTINCT w FROM Workshop w " +
           "LEFT JOIN FETCH w.facilitator " +
           "LEFT JOIN FETCH w.location " +
           "LEFT JOIN FETCH w.tags " +
           "LEFT JOIN FETCH w.materials " +
           "LEFT JOIN FETCH w.requirements " +
           "WHERE w.id = :id")
    Optional<Workshop> findByIdWithDetails(@Param("id") Long id);

    @Query("""
            select distinct w from Workshop w
            left join fetch w.facilitator
            """)
    List<Workshop> findAllWithFacilitator();

    // 修复：通过关联实体的 ID 查询
    @Query("SELECT COUNT(w) FROM Workshop w WHERE w.facilitator.id = :facilitatorId")
    long countByFacilitatorId(@Param("facilitatorId") UUID facilitatorId);
}