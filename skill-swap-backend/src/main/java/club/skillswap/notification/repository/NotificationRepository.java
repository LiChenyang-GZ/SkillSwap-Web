package club.skillswap.notification.repository;

import club.skillswap.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    @Query("""
            select n from Notification n
            where n.recipient.id = :recipientId
            order by n.createdAt desc
            """)
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(@Param("recipientId") UUID recipientId);

    long countByRecipientIdAndIsReadFalse(UUID recipientId);

    Optional<Notification> findByIdAndRecipientId(Long id, UUID recipientId);

    @Modifying
    @Query("""
            update Notification n
            set n.isRead = true,
                n.readAt = CURRENT_TIMESTAMP
            where n.recipient.id = :recipientId and n.isRead = false
            """)
    int markAllReadByRecipientId(@Param("recipientId") UUID recipientId);
}
