package club.skillswap.workshop.entity;

import club.skillswap.user.entity.UserAccount;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import org.hibernate.annotations.UpdateTimestamp;

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
    @Column(columnDefinition = "text")
    private String description;
    private String category;

    private Integer duration;

    private String status = "pending";

    private LocalDate date;
    private LocalTime time;

    @Column(name = "is_online")
    private Boolean isOnline;


    @Column(name = "location")
    private String location;

    @Column(name = "max_participants")
    private Integer maxParticipants;

    @Column(name = "credit_cost")
    private Integer creditCost;        // 鍙備笌鑰呬粯鍑虹殑绉垎

    @Column(name = "credit_reward")
    private Integer creditReward;      // 璁插笀鑾峰緱鐨勭Н鍒?

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "reviewed_by")
    private java.util.UUID reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "review_comment", columnDefinition = "text")
    private String reviewComment;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "facilitator_id", nullable = false)
    private UserAccount facilitator; // 涓庣敤鎴峰疄浣撶殑澶氬涓€鍏崇郴

    @Column(name = "host_name")
    private String hostName;

    @Column(name = "contact_number")
    private String contactNumber;

    @Column(name = "materials_provided", columnDefinition = "text")
    private String materialsProvided;

    @Column(name = "materials_needed_from_club", columnDefinition = "text")
    private String materialsNeededFromClub;

    @Column(name = "venue_requirements", columnDefinition = "text")
    private String venueRequirements;

    @Column(name = "other_important_info", columnDefinition = "text")
    private String otherImportantInfo;

    @Column(name = "details_confirmed")
    private Boolean detailsConfirmed;

    @Column(name = "submitter_username")
    private String submitterUsername;

    @Column(name = "submitter_email")
    private String submitterEmail;

}
