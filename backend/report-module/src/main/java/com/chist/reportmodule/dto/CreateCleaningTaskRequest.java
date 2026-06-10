package com.chist.reportmodule.dto;

import lombok.*;
import java.util.UUID;


@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateCleaningTaskRequest {
    private UUID reportId;
}
