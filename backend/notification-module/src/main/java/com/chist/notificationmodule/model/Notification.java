package com.chist.notificationmodule.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

/**
 * Persisted notification record.
 * recipient_user_id is a logical reference – Notification Service does not join
 * to chist_users; it receives user identity via the event payload.
 */
@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    /** Logical ref → users.id in chist_users (no FK constraint). */
    @Column(name = "recipient_user_id", nullable = false)
    private UUID recipientUserId;

    /**
     * REPORT_VERIFIED | REWARD_EARNED | FRAUD_FLAGGED | STREAK_BONUS
     */
    @Column(nullable = false, length = 32)
    private String type;

    @Column(nullable = false, length = 128)
    private String title;

    @Column(nullable = false, columnDefinition = "text")
    private String body;

    /** Deep-link for mobile push (e.g. chist://tasks/{id}) */
    @Column(length = 256)
    private String deepLink;

    @Column(nullable = false)
    @Builder.Default
    private boolean read = false;

    private Instant readAt;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
