package club.skillswap.workshop.repository;

import club.skillswap.workshop.entity.Workshop;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkshopRepository extends JpaRepository<Workshop, Long> {

        @Query("SELECT w FROM Workshop w " +
            "LEFT JOIN FETCH w.facilitator " +
            "WHERE w.id = :id")
    Optional<Workshop> findByIdWithDetails(@Param("id") Long id);

    @Query("""
            select distinct w from Workshop w
            left join fetch w.facilitator
            """)
    List<Workshop> findAllWithFacilitator();

        @Query("""
            select distinct w from Workshop w
            left join fetch w.facilitator
            where lower(coalesce(w.status, 'pending')) = 'approved'
            """)
        List<Workshop> findAllPublicApprovedWithFacilitator();

        @Query("""
            select distinct w from Workshop w
            left join fetch w.facilitator
            where w.facilitator.id = :facilitatorId
            """)
        List<Workshop> findAllByFacilitatorIdWithFacilitator(@Param("facilitatorId") UUID facilitatorId);

        @Query("""
            select distinct w from Workshop w
            left join fetch w.facilitator
            where lower(coalesce(w.status, 'pending')) = 'pending'
            """)
        List<Workshop> findAllPendingWithFacilitator();

    // 淇锛氶€氳繃鍏宠仈瀹炰綋鐨?ID 鏌ヨ
    @Query("SELECT COUNT(w) FROM Workshop w WHERE w.facilitator.id = :facilitatorId")
    long countByFacilitatorId(@Param("facilitatorId") UUID facilitatorId);
}
