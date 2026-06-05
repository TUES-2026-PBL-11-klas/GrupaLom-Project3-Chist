package com.chist.reportmodule.messaging;

import com.chist.reportmodule.event.ReportCreatedEvent;
import com.chist.reportmodule.event.TaskCompletedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * Publishes domain events from the Report Service to RabbitMQ.
 *
 * Integration points:
 *  - Call publishReportCreated() inside ReportService.createReport() after persisting.
 *  - Call publishTaskCompleted() inside CleaningTaskService.completeTask() after persisting.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ReportEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishReportCreated(ReportCreatedEvent event) {
        log.info("Publishing ReportCreatedEvent reportId={}", event.getReportId());
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE,
                RabbitMQConfig.RK_REPORT_CREATED,
                event);
    }

    public void publishTaskCompleted(TaskCompletedEvent event) {
        log.info("Publishing TaskCompletedEvent taskId={}", event.getTaskId());
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE,
                RabbitMQConfig.RK_TASK_COMPLETED,
                event);
    }
}
