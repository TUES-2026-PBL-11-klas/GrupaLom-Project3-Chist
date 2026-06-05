package com.chist.notificationmodule.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

/**
 * Audit record for every delivery attempt (EMAIL / PUSH / WEB).
 * status: SENT | FAILED | RETRY
 */
@Entity
@Table(name = "delivery_log")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryLog {

    @Id
    @GeneratedValue
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "notification_id", nullable = false)
    private Notification notification;

    /** EMAIL | PUSH | WEB */
    @Column(nullable = false, length = 16)
    private String channel;

    /** SENT | FAILED | RETRY */
    @Column(nullable = false, length = 16)
    private String status;

    @Column(columnDefinition = "text")
    private String errorMessage;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private Instant attemptedAt = Instant.now();
}
