package com.chist.verificationmodule.event;

import lombok.*;
import java.util.UUID;

/** Mirror of TaskCompletedEvent published by Report Service. */
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class TaskCompletedEvent {
    private UUID taskId;
    private UUID reportId;
    private UUID cleanerId;
    private String beforePhotoUrl;
    private String afterPhotoUrl;
    private double latitude;
    private double longitude;
}
