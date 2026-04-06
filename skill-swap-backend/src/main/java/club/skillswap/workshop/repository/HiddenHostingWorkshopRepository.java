package club.skillswap.workshop.repository;

import club.skillswap.workshop.entity.HiddenHostingWorkshop;
import club.skillswap.workshop.entity.HiddenHostingWorkshopId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface HiddenHostingWorkshopRepository extends JpaRepository<HiddenHostingWorkshop, HiddenHostingWorkshopId> {

    @Query("SELECT h.id.workshopId FROM HiddenHostingWorkshop h WHERE h.id.userId = :userId")
    List<Long> findHiddenWorkshopIdsByUserId(@Param("userId") UUID userId);

    boolean existsByIdUserIdAndIdWorkshopId(UUID userId, Long workshopId);
}
