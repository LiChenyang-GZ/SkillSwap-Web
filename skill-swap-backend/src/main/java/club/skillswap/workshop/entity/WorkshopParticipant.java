package club.skillswap.workshop.entity;

import club.skillswap.user.entity.UserAccount;
import jakarta.persistence.*;
import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "workshop_participants")
@Getter
@Setter
public class WorkshopParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workshop_id", nullable = false)
    private Workshop workshop;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    @Column(name = "registration_date")
    private LocalDateTime registrationDate;
    
}
