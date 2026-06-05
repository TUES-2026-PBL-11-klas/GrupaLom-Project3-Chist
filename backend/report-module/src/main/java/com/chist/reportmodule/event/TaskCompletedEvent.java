package com.chist.reportmodule.event;

import lombok.*;
import java.util.UUID;

/** Published to chist.events / task.completed when a cleaner submits a finished task. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskCompletedEvent {
    private UUID taskId;
    private UUID reportId;
    private UUID cleanerId;
    private String beforePhotoUrl;
    private String afterPhotoUrl;
    private double latitude;
    private double longitude;
}
