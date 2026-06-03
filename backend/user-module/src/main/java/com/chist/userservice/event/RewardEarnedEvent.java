package com.chist.userservice.event;
 
 
import lombok.*;
import java.util.UUID;

/** Published when a user unlocks a reward after crossing a points threshold. */
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class RewardEarnedEvent {
    private UUID userId;
    private String userEmail;
    private String username;
    private String rewardTitle;
    private int totalPoints;
}
