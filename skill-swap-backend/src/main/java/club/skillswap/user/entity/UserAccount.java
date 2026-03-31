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

    // 涓婚敭锛屼笌 Supabase auth.users.id 瀵瑰簲
    @Id
    private UUID id;

    @Column(unique = true, nullable = false)
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

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL)
    @PrimaryKeyJoinColumn
    private RatingSummary ratingSummary;

    // 娉ㄦ剰锛歊eview 涓湁涓や釜 UserAccount 鐨勫閿紝杩欓噷鍙槧灏勭敤鎴蜂綔涓鸿瘎璁鸿€呯殑鍏崇郴
    @OneToMany(mappedBy = "reviewer")
    private List<Review> reviewsGiven;
}
