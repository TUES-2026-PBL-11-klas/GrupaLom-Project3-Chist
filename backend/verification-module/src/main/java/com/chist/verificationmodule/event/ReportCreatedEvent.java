package com.chist.verificationmodule.event;

import lombok.*;
import java.util.UUID;

/** Mirror of ReportCreatedEvent published by Report Service. */
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ReportCreatedEvent {
    private UUID reportId;
    private UUID reporterId;
    private double latitude;
    private double longitude;
    private String beforePhotoUrl;
}
