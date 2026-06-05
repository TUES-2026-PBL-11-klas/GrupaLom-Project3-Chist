package com.chist.userservice.event;

import lombok.*;
import java.util.UUID;

/** Mirror of TaskVerifiedEvent published by Verification Service. */
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class TaskVerifiedEvent {
    private UUID taskId;
    private UUID cleanerId;
    private UUID reportId;
    private String outcome;      // APPROVED | REJECTED | INCONCLUSIVE
    private int pointsAwarded;
}
