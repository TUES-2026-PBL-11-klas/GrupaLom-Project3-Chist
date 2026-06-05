package com.chist.verificationmodule.messaging;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * RabbitMQ topology for Verification Service.
 *
 * Listens to:
 *   chist.events / report.created    → AI-check the before photo
 *   chist.events / task.completed    → AI-compare before vs after
 *
 * Publishes:
 *   chist.events / task.verified     → downstream consumers (User + Notification services)
 *   chist.events / fraud.flagged     → Notification Service admin alert
 */
@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE = "chist.events";

    // Routing keys consumed by Verification Service
    public static final String RK_REPORT_CREATED  = "report.created";
    public static final String RK_TASK_COMPLETED  = "task.completed";

    // Routing keys published by Verification Service
    public static final String RK_TASK_VERIFIED   = "task.verified";
    public static final String RK_FRAUD_FLAGGED   = "fraud.flagged";

    // Queue names — durable, service-owned
    public static final String Q_VERIFICATION_REPORT_CREATED = "chist.verification.report-created";
    public static final String Q_VERIFICATION_TASK_COMPLETED = "chist.verification.task-completed";

    @Bean
    public TopicExchange chistEventsExchange() {
        return ExchangeBuilder.topicExchange(EXCHANGE).durable(true).build();
    }

    @Bean
    public Queue verificationReportCreatedQueue() {
        return QueueBuilder.durable(Q_VERIFICATION_REPORT_CREATED).build();
    }

    @Bean
    public Queue verificationTaskCompletedQueue() {
        return QueueBuilder.durable(Q_VERIFICATION_TASK_COMPLETED).build();
    }

    @Bean
    public Binding bindReportCreated(TopicExchange chistEventsExchange) {
        return BindingBuilder
                .bind(verificationReportCreatedQueue())
                .to(chistEventsExchange)
                .with(RK_REPORT_CREATED);
    }

    @Bean
    public Binding bindTaskCompleted(TopicExchange chistEventsExchange) {
        return BindingBuilder
                .bind(verificationTaskCompletedQueue())
                .to(chistEventsExchange)
                .with(RK_TASK_COMPLETED);
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
