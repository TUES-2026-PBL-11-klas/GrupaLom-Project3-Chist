package com.chist.userservice.event;

import lombok.*;
import java.util.UUID;

/** Published when a user's streak counter changes (daily activity streak). */
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class StreakUpdatedEvent {
    private UUID userId;
    private String userEmail;
    private String username;
    private int newStreakDays;
    private int bonusPoints;
}
