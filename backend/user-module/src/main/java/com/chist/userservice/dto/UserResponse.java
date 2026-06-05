package com.chist.userservice.dto;

import lombok.*;
import java.util.Date;
import java.util.UUID;


@Getter @Setter
@Builder
@NoArgsConstructor @AllArgsConstructor
public class UserResponse {
    private UUID id;
    private String username;
    private String email;
    private int points;
    private int streak;
    private String role;
    private Date createdAt;
    private Date updatedAt;
}


