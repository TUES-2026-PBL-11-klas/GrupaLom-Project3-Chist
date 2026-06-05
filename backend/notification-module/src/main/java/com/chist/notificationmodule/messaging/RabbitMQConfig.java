package com.chist.notificationmodule.messaging;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * RabbitMQ topology for Notification Service.
 *
 * Listens to ALL notification-worthy events via a single wildcard queue:
 *   task.verified   → notify cleaner of result
 *   reward.earned   → notify user of new reward
 *   streak.updated  → notify user of streak bonus
 *   fraud.flagged   → alert admin
 *
 * A separate queue per routing key makes it easy to add per-type
 * dead-letter queues or independent concurrency settings later.
 */
@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE = "chist.events";

    // Consumed routing keys
    public static final String RK_TASK_VERIFIED  = "task.verified";
    public static final String RK_REWARD_EARNED  = "reward.earned";
    public static final String RK_STREAK_UPDATED = "streak.updated";
    public static final String RK_FRAUD_FLAGGED  = "fraud.flagged";

    // Queue names
    public static final String Q_NOTIF_TASK_VERIFIED  = "chist.notif.task-verified";
    public static final String Q_NOTIF_REWARD_EARNED  = "chist.notif.reward-earned";
    public static final String Q_NOTIF_STREAK_UPDATED = "chist.notif.streak-updated";
    public static final String Q_NOTIF_FRAUD_FLAGGED  = "chist.notif.fraud-flagged";

    @Bean
    public TopicExchange chistEventsExchange() {
        return ExchangeBuilder.topicExchange(EXCHANGE).durable(true).build();
    }

    // ── Queues ────────────────────────────────────────────────────────────────

    @Bean public Queue notifTaskVerifiedQueue()  { return QueueBuilder.durable(Q_NOTIF_TASK_VERIFIED).build(); }
    @Bean public Queue notifRewardEarnedQueue()  { return QueueBuilder.durable(Q_NOTIF_REWARD_EARNED).build(); }
    @Bean public Queue notifStreakUpdatedQueue() { return QueueBuilder.durable(Q_NOTIF_STREAK_UPDATED).build(); }
    @Bean public Queue notifFraudFlaggedQueue()  { return QueueBuilder.durable(Q_NOTIF_FRAUD_FLAGGED).build(); }

    // ── Bindings ──────────────────────────────────────────────────────────────

    @Bean
    public Binding bindNotifTaskVerified(TopicExchange chistEventsExchange) {
        return BindingBuilder.bind(notifTaskVerifiedQueue()).to(chistEventsExchange).with(RK_TASK_VERIFIED);
    }
    @Bean
    public Binding bindNotifRewardEarned(TopicExchange chistEventsExchange) {
        return BindingBuilder.bind(notifRewardEarnedQueue()).to(chistEventsExchange).with(RK_REWARD_EARNED);
    }
    @Bean
    public Binding bindNotifStreakUpdated(TopicExchange chistEventsExchange) {
        return BindingBuilder.bind(notifStreakUpdatedQueue()).to(chistEventsExchange).with(RK_STREAK_UPDATED);
    }
    @Bean
    public Binding bindNotifFraudFlagged(TopicExchange chistEventsExchange) {
        return BindingBuilder.bind(notifFraudFlaggedQueue()).to(chistEventsExchange).with(RK_FRAUD_FLAGGED);
    }

    // ── Serialisation ─────────────────────────────────────────────────────────

    @Bean
    public Jackson2JsonMessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory cf) {
        RabbitTemplate tpl = new RabbitTemplate(cf);
        tpl.setMessageConverter(jsonMessageConverter());
        return tpl;
    }
}
