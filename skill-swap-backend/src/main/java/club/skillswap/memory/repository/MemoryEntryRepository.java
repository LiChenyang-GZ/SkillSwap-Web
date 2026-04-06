package club.skillswap.memory.repository;

import club.skillswap.memory.entity.MemoryEntry;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MemoryEntryRepository extends JpaRepository<MemoryEntry, Long> {

    List<MemoryEntry> findByStatusOrderByPublishedAtDescCreatedAtDesc(String status);

    List<MemoryEntry> findAllByOrderByUpdatedAtDesc();

    Optional<MemoryEntry> findBySlug(String slug);

    Optional<MemoryEntry> findBySlugAndStatus(String slug, String status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from MemoryEntry e where e.id = :id")
    Optional<MemoryEntry> findByIdForUpdate(@Param("id") Long id);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);
}
