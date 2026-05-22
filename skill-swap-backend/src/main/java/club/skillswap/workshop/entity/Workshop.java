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

    @Column(length = 200)
    private String title;
    @Column(columnDefinition = "text")
    private String description;
    @Column(length = 100)
    private String category;

    private Integer duration;

    @Column(length = 30)
    private String status = "pending";

    private LocalDate date;
    private LocalTime time;

    @Column(name = "attend_close_at")
    private LocalDateTime attendCloseAt;

    @Column(name = "is_online")
    private Boolean isOnline;


    @Column(name = "location", length = 500)
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

    @Column(name = "host_name", length = 100)
    private String hostName;

    @Column(name = "contact_number", length = 20)
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

    @Column(name = "submitter_username", length = 100)
    private String submitterUsername;

    @Column(name = "submitter_email", length = 320)
    private String submitterEmail;

    @Column(name = "image_url", columnDefinition = "text")
    private String imageUrl;

    @Column(name = "week_number")
    private Integer weekNumber;

    @Column(name = "member_responsible", length = 100)
    private String memberResponsible;

    @Column(name = "members_present", columnDefinition = "text")
    private String membersPresent;

    @Column(name = "event_submitted")
    private Boolean eventSubmitted;

    @Column(name = "usu_approval_status", length = 30)
    private String usuApprovalStatus;

    @Column(name = "hidden_by_host", nullable = false, columnDefinition = "boolean not null default false")
    private Boolean hiddenByHost = false;

}
