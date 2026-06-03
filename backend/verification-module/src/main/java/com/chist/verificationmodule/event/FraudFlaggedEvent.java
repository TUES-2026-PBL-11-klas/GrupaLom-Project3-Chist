package com.chist.verificationmodule.event;

import lombok.*;
import java.util.UUID;

/**
 * Published to chist.events / fraud.flagged when the AI or a user
 * flags a task as potentially fraudulent.
 *
 * Consumed by:
 *   - Notification Service → alert admin
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FraudFlaggedEvent {
    private UUID taskId;
    private UUID reportedByUserId;
    private String reason;
}
