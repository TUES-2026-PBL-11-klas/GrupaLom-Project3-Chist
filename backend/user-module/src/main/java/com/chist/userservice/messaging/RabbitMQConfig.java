package com.chist.userservice.messaging;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * RabbitMQ topology for User Service.
 *
 * Listens to:
 *   chist.events / task.verified  → award points + update streak
 *
 * Publishes:
 *   chist.events / reward.earned  → Notification Service
 *   chist.events / streak.updated → Notification Service
 */
@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE = "chist.events";

    // Consumed
    public static final String RK_TASK_VERIFIED   = "task.verified";

    // Published
    public static final String RK_REWARD_EARNED   = "reward.earned";
    public static final String RK_STREAK_UPDATED  = "streak.updated";

    public static final String Q_USER_TASK_VERIFIED = "chist.user.task-verified";

    @Bean
    public TopicExchange chistEventsExchange() {
        return ExchangeBuilder.topicExchange(EXCHANGE).durable(true).build();
    }

    @Bean
    public Queue userTaskVerifiedQueue() {
        return QueueBuilder.durable(Q_USER_TASK_VERIFIED).build();
    }

    @Bean
    public Binding bindUserTaskVerified(TopicExchange chistEventsExchange) {
        return BindingBuilder
                .bind(userTaskVerifiedQueue())
                .to(chistEventsExchange)
                .with(RK_TASK_VERIFIED);
    }

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
