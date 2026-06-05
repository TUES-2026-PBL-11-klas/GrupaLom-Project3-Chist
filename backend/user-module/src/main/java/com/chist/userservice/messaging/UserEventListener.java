package com.chist.userservice.messaging;

import com.chist.userservice.event.RewardEarnedEvent;
import com.chist.userservice.event.StreakUpdatedEvent;
import com.chist.userservice.event.TaskVerifiedEvent;
import com.chist.userservice.model.User;
import com.chist.userservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;

/**
 * Listens for TaskVerifiedEvent and:
 *   1. Awards points to the cleaner.
 *   2. Checks if any reward threshold has been crossed → publishes RewardEarnedEvent.
 *   3. Updates the activity streak → publishes StreakUpdatedEvent if streak incremented.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UserEventListener {

    private final UserRepository    userRepository;
    private final UserEventPublisher publisher;

    // Streak bonus points per day milestone (every 7 days)
    private static final int STREAK_MILESTONE = 7;
    private static final int STREAK_BONUS     = 50;

    // Example reward thresholds — replace with DB-driven lookup in production
    private static final int[] REWARD_THRESHOLDS = {100, 250, 500, 1000, 2500};

    @Transactional
    @RabbitListener(queues = RabbitMQConfig.Q_USER_TASK_VERIFIED)
    public void onTaskVerified(TaskVerifiedEvent event) {
        log.info("Received TaskVerifiedEvent taskId={} outcome={} points={}",
                event.getTaskId(), event.getOutcome(), event.getPointsAwarded());

        if (!"APPROVED".equals(event.getOutcome()) || event.getPointsAwarded() <= 0) {
            log.debug("Task not approved or no points – skipping user update");
            return;
        }

        User user = userRepository.findById(event.getCleanerId()).orElse(null);
        if (user == null) {
            log.warn("User {} not found for task {}", event.getCleanerId(), event.getTaskId());
            return;
        }

        int previousPoints = user.getPoints();
        int newPoints      = previousPoints + event.getPointsAwarded();
        user.setPoints(newPoints);

        // ── Streak update ────────────────────────────────────────────────────
        Date now     = new Date();
        Date lastActive = user.getUpdated_at();
        boolean sameDay = lastActive != null &&
                (now.getTime() - lastActive.getTime()) < 24L * 60 * 60 * 1000;

        if (!sameDay) {
            int newStreak = user.getStreak() + 1;
            user.setStreak(newStreak);

            // Milestone bonus every STREAK_MILESTONE days
            if (newStreak % STREAK_MILESTONE == 0) {
                user.setPoints(user.getPoints() + STREAK_BONUS);
                publisher.publishStreakUpdated(StreakUpdatedEvent.builder()
                        .userId(user.getUuid())
                        .userEmail(user.getEmail())
                        .username(user.getUsername())
                        .newStreakDays(newStreak)
                        .bonusPoints(STREAK_BONUS)
                        .build());
            }
        }

        userRepository.save(user);

        // ── Reward threshold check ────────────────────────────────────────────
        for (int threshold : REWARD_THRESHOLDS) {
            if (previousPoints < threshold && newPoints >= threshold) {
                publisher.publishRewardEarned(RewardEarnedEvent.builder()
                        .userId(user.getUuid())
                        .userEmail(user.getEmail())
                        .username(user.getUsername())
                        .rewardTitle("Level " + threshold + " Cleaner")
                        .totalPoints(newPoints)
                        .build());
                log.info("User {} crossed reward threshold {}", user.getUuid(), threshold);
            }
        }
    }
}
