package com.chist.notificationmodule.event;

import lombok.*;
import java.util.UUID;


// ── All incoming event DTOs live in this package ──────────────────────────────
// They are mirrors of the DTOs published by other services. Keeping them local
// avoids a shared-library dependency between microservices.

@Data @NoArgsConstructor @AllArgsConstructor @Builder
class TaskVerifiedEvent {
    UUID taskId; UUID cleanerId; UUID reportId;
    String outcome; int pointsAwarded;
}

@Data @NoArgsConstructor @AllArgsConstructor @Builder
class RewardEarnedEvent {
    UUID userId; String userEmail; String username;
    String rewardTitle; int totalPoints;
}

@Data @NoArgsConstructor @AllArgsConstructor @Builder
class StreakUpdatedEvent {
    UUID userId; String userEmail; String username;
    int newStreakDays; int bonusPoints;
}

@Data @NoArgsConstructor @AllArgsConstructor @Builder
class FraudFlaggedEvent {
    UUID taskId; UUID reportedByUserId; String reason;
}
