package club.skillswap.memory.repository;

import club.skillswap.memory.entity.MemoryEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MemoryEntryRepository extends JpaRepository<MemoryEntry, Long> {

    List<MemoryEntry> findByStatusOrderByPublishedAtDescCreatedAtDesc(String status);

    List<MemoryEntry> findAllByOrderByUpdatedAtDesc();

    Optional<MemoryEntry> findBySlug(String slug);

    Optional<MemoryEntry> findBySlugAndStatus(String slug, String status);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);
}
