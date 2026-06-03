package com.chist.notificationmodule.dto;

import lombok.*;

@Getter @Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailNotification {
    private String to;
    private String subject;
    private String body;
}
