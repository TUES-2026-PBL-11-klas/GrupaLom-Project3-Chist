package com.chist.reportmodule.event;


import lombok.*;
import java.util.UUID;

/** Published to chist.events / report.created when a new report is submitted. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportCreatedEvent {
    private UUID reportId;
    private UUID reporterId;
    private double latitude;
    private double longitude;
    private String beforePhotoUrl;
}
