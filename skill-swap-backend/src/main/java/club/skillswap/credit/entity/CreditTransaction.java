package club.skillswap.credit.entity;

import club.skillswap.user.entity.UserAccount;
import club.skillswap.workshop.entity.Workshop;
import jakarta.persistence.*;
import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "credit_transactions")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
public class CreditTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workshop_id", nullable = true) // 鏌愪簺浜ゆ槗鍙兘涓庡伐浣滃潑鏃犲叧
    private Workshop workshop;

    @Column(name = "credit_amount", nullable = false)
    private Integer creditAmount; // 姝ｆ暟琛ㄧず鏀跺叆锛岃礋鏁拌〃绀烘敮鍑?

    @Column(name = "transaction_type", nullable = false)
    private String transactionType; // JOIN, LEAVE, EARN, BONUS 绛?

    @Column(name = "description")
    private String description; // 浜ゆ槗鎻忚堪

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}

