package com.chist.verificationmodule.messaging;

import com.chist.verificationmodule.event.FraudFlaggedEvent;
import com.chist.verificationmodule.event.TaskVerifiedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * Publishes domain events from Verification Service.
 *
 * task.verified  → consumed by User Service (points) + Notification Service
 * fraud.flagged  → consumed by Notification Service (admin alert)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VerificationEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishTaskVerified(TaskVerifiedEvent event) {
        log.info("Publishing TaskVerifiedEvent taskId={} outcome={}",
                event.getTaskId(), event.getOutcome());
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE,
                RabbitMQConfig.RK_TASK_VERIFIED,
                event);
    }

    public void publishFraudFlagged(FraudFlaggedEvent event) {
        log.info("Publishing FraudFlaggedEvent taskId={}", event.getTaskId());
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE,
                RabbitMQConfig.RK_FRAUD_FLAGGED,
                event);
    }
}
