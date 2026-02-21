package club.skillswap.skillswapbackend.credit.entity;

import club.skillswap.skillswapbackend.user.entity.UserAccount;
import club.skillswap.skillswapbackend.workshop.entity.Workshop;
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
    @JoinColumn(name = "workshop_id", nullable = true) // 某些交易可能与工作坊无关
    private Workshop workshop;

    @Column(name = "credit_amount", nullable = false)
    private Integer creditAmount; // 正数表示收入，负数表示支出

    @Column(name = "transaction_type", nullable = false)
    private String transactionType; // JOIN, LEAVE, EARN, BONUS 等

    @Column(name = "description")
    private String description; // 交易描述

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
