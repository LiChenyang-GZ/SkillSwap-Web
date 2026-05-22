package club.skillswap.memory.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "memory_media")
@Getter
@Setter
public class MemoryMedia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "memory_entry_id", nullable = false)
    private MemoryEntry entry;

    @Column(name = "media_url", nullable = false, columnDefinition = "text")
    private String mediaUrl;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;
}
