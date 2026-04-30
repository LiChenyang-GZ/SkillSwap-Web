package club.skillswap.user.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.util.UUID;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "user_account")
@Getter
@Setter
public class UserAccount {

    // 本地用户主键（内部 UUID）。
    // 注意：认证平台的 subject(sub) 不一定是 UUID（例如 Clerk）。
    @Id
    private UUID id;

    // 外部身份平台标识（可选），例如："supabase" / "clerk" / issuer URI。
    @Column(name = "auth_provider")
    private String authProvider;

    // 外部身份平台 subject(sub)。用于把 JWT sub 映射到本地用户 UUID。
    @Column(name = "auth_subject", unique = true)
    private String authSubject;

    @Column(nullable = false)
    private String username;

    @Column(unique = true)
    private String email;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "bio")
    private String bio;

    @Column(name = "role")
    private String role;

    @Column(name = "credit_balance")
    private Integer creditBalance;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<UserSkill> skills = new ArrayList<>();
}
