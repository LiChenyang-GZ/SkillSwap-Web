package club.skillswap.skillswapbackend.workshop.entity;

import club.skillswap.skillswapbackend.user.entity.UserAccount;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Set;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "workshops")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
public class Workshop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String description;
    private String category;
    
    @Column(name = "skill_level")
    private String skillLevel;

    private Integer duration;

    private String status = "upcoming"; // 默认状态

    private LocalDate date;
    private LocalTime time;

    @Column(name = "is_online")
    private Boolean isOnline;


    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "workshop_locations", joinColumns = @JoinColumn(name = "workshop_id"))
    @Column(name = "location")
    @org.hibernate.annotations.Fetch(org.hibernate.annotations.FetchMode.SUBSELECT)
    private Set<String> location;

    @Column(name = "max_participants")
    private Integer maxParticipants;

    @Column(name = "credit_cost")
    private Integer creditCost;        // 参与者付出的积分

    @Column(name = "credit_reward")
    private Integer creditReward;      // 讲师获得的积分

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "facilitator_id", nullable = false)
    private UserAccount facilitator; // 与用户实体的多对一关系

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "workshop_tags", joinColumns = @JoinColumn(name = "workshop_id"))
    @Column(name = "tag")
    @org.hibernate.annotations.Fetch(org.hibernate.annotations.FetchMode.SUBSELECT)
    private Set<String> tags;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "workshop_materials", joinColumns = @JoinColumn(name = "workshop_id"))
    @Column(name = "material")
    @org.hibernate.annotations.Fetch(org.hibernate.annotations.FetchMode.SUBSELECT)
    private Set<String> materials;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "workshop_requirements", joinColumns = @JoinColumn(name = "workshop_id"))
    @Column(name = "requirement")
    @org.hibernate.annotations.Fetch(org.hibernate.annotations.FetchMode.SUBSELECT)
    private Set<String> requirements;

}