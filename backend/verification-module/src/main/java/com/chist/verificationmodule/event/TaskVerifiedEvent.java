package com.chist.verificationmodule.event;

import lombok.*;
import java.util.UUID;

/**
 * Published to chist.events / task.verified after Verification Service
 * finalises a cleaning task check.
 *
 * Consumed by:
 *   - User Service    → award points to cleaner
 *   - Notification Service → send completion notification
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskVerifiedEvent {
    private UUID taskId;
    private UUID cleanerId;
    private UUID reportId;
    /** APPROVED | REJECTED | INCONCLUSIVE */
    private String outcome;
    /** Points to award; 0 when outcome != APPROVED */
    private int pointsAwarded;
}
