package club.skillswap.common.audit;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import club.skillswap.user.entity.UserAccount;

import java.time.Instant;

@Entity
@Table(name = "audit_log")
@Getter
@Setter
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 鎿嶄綔鑰咃紝鍙互鏄?null
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private UserAccount actor;

    @Column(nullable = false)
    private String action;

    @Column(name = "target_entity")
    private String targetEntity;

    @Column(name = "target_id")
    private String targetId;

    // 鏄犲皠 PostgreSQL 鐨?JSONB 绫诲瀷
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String details; // 鍙互鏄犲皠涓?String 鎴?Map<String, Object>

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
