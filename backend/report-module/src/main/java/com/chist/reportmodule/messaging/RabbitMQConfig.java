package com.chist.reportmodule.messaging;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * RabbitMQ topology for Report Service.
 *
 * All domain events are published to one durable TopicExchange ("chist.events").
 * Every service declares its own queues and bindings so the exchange stays stable
 * even as new services are added.
 */
@Configuration
public class RabbitMQConfig {

    // ── Shared exchange ──────────────────────────────────────────────────────
    public static final String EXCHANGE = "chist.events";

    // ── Routing keys published by Report Service ─────────────────────────────
    public static final String RK_REPORT_CREATED = "report.created";
    public static final String RK_TASK_COMPLETED = "task.completed";

    @Bean
    public TopicExchange chistEventsExchange() {
        return ExchangeBuilder.topicExchange(EXCHANGE).durable(true).build();
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
