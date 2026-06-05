package com.chist.userservice.messaging;

import com.chist.userservice.event.RewardEarnedEvent;
import com.chist.userservice.event.StreakUpdatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * Publishes domain events from User Service.
 *
 * reward.earned  → Notification Service sends reward notification
 * streak.updated → Notification Service sends streak bonus notification
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UserEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishRewardEarned(RewardEarnedEvent event) {
        log.info("Publishing RewardEarnedEvent userId={} reward={}",
                event.getUserId(), event.getRewardTitle());
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE,
                RabbitMQConfig.RK_REWARD_EARNED,
                event);
    }

    public void publishStreakUpdated(StreakUpdatedEvent event) {
        log.info("Publishing StreakUpdatedEvent userId={} streak={}",
                event.getUserId(), event.getNewStreakDays());
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE,
                RabbitMQConfig.RK_STREAK_UPDATED,
                event);
    }
}
