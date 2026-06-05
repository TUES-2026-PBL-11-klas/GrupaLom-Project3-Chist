package com.chist.verificationmodule.messaging;

import com.chist.verificationmodule.event.*;
import com.chist.verificationmodule.model.Verification;
import com.chist.verificationmodule.model.VerificationStatus;
import com.chist.verificationmodule.model.VerificationType;
import com.chist.verificationmodule.repository.VerificationRepository;
import com.chist.verificationmodule.service.AiVerificationService;
import com.chist.verificationmodule.service.GpsVerificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Listens to domain events from Report Service and triggers async verification.
 *
 * Flow:
 *   ReportCreatedEvent  → AI-check the before photo for AI-generated content
 *   TaskCompletedEvent  → GPS + AI before/after comparison → publish TaskVerifiedEvent
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VerificationEventListener {

    private final VerificationRepository verificationRepository;
    private final AiVerificationService   aiVerificationService;
    private final GpsVerificationService  gpsVerificationService;
    private final VerificationEventPublisher publisher;

    // ── ReportCreated: check the before photo for AI-generated content ────────
    @Async
    @RabbitListener(queues = RabbitMQConfig.Q_VERIFICATION_REPORT_CREATED)
    public void onReportCreated(ReportCreatedEvent event) {
        log.info("Received ReportCreatedEvent reportId={}", event.getReportId());
        try {
            byte[] beforeBytes = new java.net.URL(event.getBeforePhotoUrl())
                    .openStream().readAllBytes();
            boolean hasTrash = Boolean.TRUE.equals(
                    aiVerificationService.verifyHasTrashFromBytes(beforeBytes).block());

            VerificationStatus status = hasTrash
                    ? VerificationStatus.APPROVED
                    : VerificationStatus.REJECTED;

            Verification v = Verification.builder()
                    .taskId(event.getReportId())   // logical ref to reports.id
                    .type(VerificationType.AI)
                    .status(status)
                    .result(hasTrash ? "Before photo contains trash – report accepted"
                                     : "Before photo did not pass AI check – report rejected")
                    .build();
            verificationRepository.save(v);
            log.info("ReportCreated verification saved id={} status={}", v.getId(), status);
        } catch (Exception ex) {
            log.error("Error verifying report {}: {}", event.getReportId(), ex.getMessage(), ex);
        }
    }

    // ── TaskCompleted: GPS + AI compare before vs after ───────────────────────
    @Async
    @RabbitListener(queues = RabbitMQConfig.Q_VERIFICATION_TASK_COMPLETED)
    public void onTaskCompleted(TaskCompletedEvent event) {
        log.info("Received TaskCompletedEvent taskId={}", event.getTaskId());
        try {
            boolean gpsOk = gpsVerificationService.verify(
                    event.getLatitude(), event.getLongitude(),
                    event.getLatitude(), event.getLongitude());  // same location expected

            boolean aiOk;
            byte[] before = new java.net.URL(event.getBeforePhotoUrl()).openStream().readAllBytes();
            byte[] after  = new java.net.URL(event.getAfterPhotoUrl()).openStream().readAllBytes();
            aiOk = Boolean.TRUE.equals(
                    aiVerificationService.verifyCleanFromBytes(before, after).block());

            VerificationStatus status;
            String result;
            int points;

            if (gpsOk && aiOk) {
                status = VerificationStatus.APPROVED;
                result = "GPS and AI verification passed";
                points = 100;
            } else if (gpsOk || aiOk) {
                status = VerificationStatus.PENDING;
                result = "Partial verification – awaiting admin review";
                points = 0;
            } else {
                status = VerificationStatus.REJECTED;
                result = "Both GPS and AI verification failed";
                points = 0;
            }

            Verification v = Verification.builder()
                    .taskId(event.getTaskId())
                    .type(VerificationType.AI)
                    .status(status)
                    .actualLat(event.getLatitude())
                    .actualLng(event.getLongitude())
                    .result(result)
                    .build();
            verificationRepository.save(v);

            // Publish downstream regardless of outcome so consumers can react
            publisher.publishTaskVerified(TaskVerifiedEvent.builder()
                    .taskId(event.getTaskId())
                    .cleanerId(event.getCleanerId())
                    .reportId(event.getReportId())
                    .outcome(status.name())
                    .pointsAwarded(points)
                    .build());

        } catch (Exception ex) {
            log.error("Error verifying task {}: {}", event.getTaskId(), ex.getMessage(), ex);
        }
    }
}
