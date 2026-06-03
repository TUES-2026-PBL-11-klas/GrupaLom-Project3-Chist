package com.chist.reportmodule.dto;


import com.chist.reportmodule.model.TaskStatus;
import lombok.*;
import java.util.Date;
import java.util.UUID;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CleaningTaskResponse {
    private UUID task_id;
    private UUID reportId;
    private UUID cleanerId;
    private String beforePhoto;
    private String afterPhoto;
    private boolean verified;
    private TaskStatus status;
    private Date createdAt;
    private Date updatedAt;
}
