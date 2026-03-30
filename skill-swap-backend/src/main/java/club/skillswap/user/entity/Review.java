package club.skillswap.user.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "review")
@Getter
@Setter
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "workshop_id", nullable = false)
    private Long workshopId; // 鏆傛椂浣滀负鏅€氬瓧娈碉紝鍥犱负 Workshop 瀹炰綋鍦ㄥ叾浠栨ā鍧?

    // 璇勮鑰?
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_id", nullable = false)
    private UserAccount reviewer;

    // 琚瘎璁虹殑涓绘寔浜?
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "host_id", nullable = false)
    private UserAccount host;

    @Column(nullable = false, precision = 2, scale = 1)
    private BigDecimal rating; // 浣跨敤 BigDecimal 鏉ョ簿纭〃绀?4.5 杩欐牱鐨勫崐鏄?

    @Column
    private String comment;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
