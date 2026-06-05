package com.chist.notificationmodule.messaging;

import com.chist.notificationmodule.model.DeliveryLog;
import com.chist.notificationmodule.model.Notification;
import com.chist.notificationmodule.repository.DeliveryLogRepository;
import com.chist.notificationmodule.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Listens to all domain events that should trigger user notifications.
 *
 * For each event:
 *   1. Persist a Notification row in chist_notif.
 *   2. Attempt delivery via Email (extend to push/web as needed).
 *   3. Log the delivery attempt in delivery_log.
 *
 * Routing:
 *   task.verified   → Q_NOTIF_TASK_VERIFIED
 *   reward.earned   → Q_NOTIF_REWARD_EARNED
 *   streak.updated  → Q_NOTIF_STREAK_UPDATED
 *   fraud.flagged   → Q_NOTIF_FRAUD_FLAGGED
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    private final NotificationRepository notificationRepository;
    private final DeliveryLogRepository  deliveryLogRepository;
    private final JavaMailSender         mailSender;

    // ── task.verified ─────────────────────────────────────────────────────────
    @RabbitListener(queues = RabbitMQConfig.Q_NOTIF_TASK_VERIFIED)
    public void onTaskVerified(Map<String, Object> raw) {
        String outcome    = str(raw, "outcome");
        String cleanerId  = str(raw, "cleanerId");
        String taskId     = str(raw, "taskId");
        int    points     = raw.containsKey("pointsAwarded")
                            ? ((Number) raw.get("pointsAwarded")).intValue() : 0;

        String title = "APPROVED".equals(outcome)
                ? "✅ Your cleanup was verified!"
                : "❌ Cleanup verification failed";
        String body = "APPROVED".equals(outcome)
                ? "Great job! You earned " + points + " points for task " + taskId + "."
                : "Unfortunately your submission for task " + taskId + " was not approved.";

        Notification n = saveNotification(cleanerId, "REPORT_VERIFIED", title, body,
                "chist://tasks/" + taskId);
        sendEmail(n, /* email unknown here – use a REST call in production */ "user@example.com");
    }

    // ── reward.earned ─────────────────────────────────────────────────────────
    @RabbitListener(queues = RabbitMQConfig.Q_NOTIF_REWARD_EARNED)
    public void onRewardEarned(Map<String, Object> raw) {
        String userId      = str(raw, "userId");
        String userEmail   = str(raw, "userEmail");
        String rewardTitle = str(raw, "rewardTitle");
        int    total       = raw.containsKey("totalPoints")
                             ? ((Number) raw.get("totalPoints")).intValue() : 0;

        String title = "🏆 New reward unlocked: " + rewardTitle;
        String body  = "You reached " + total + " points and earned the reward: " + rewardTitle;

        Notification n = saveNotification(userId, "REWARD_EARNED", title, body,
                "chist://rewards");
        sendEmail(n, userEmail);
    }

    // ── streak.updated ────────────────────────────────────────────────────────
    @RabbitListener(queues = RabbitMQConfig.Q_NOTIF_STREAK_UPDATED)
    public void onStreakUpdated(Map<String, Object> raw) {
        String userId    = str(raw, "userId");
        String userEmail = str(raw, "userEmail");
        int    streak    = raw.containsKey("newStreakDays")
                           ? ((Number) raw.get("newStreakDays")).intValue() : 0;
        int    bonus     = raw.containsKey("bonusPoints")
                           ? ((Number) raw.get("bonusPoints")).intValue() : 0;

        String title = "🔥 " + streak + "-day streak bonus!";
        String body  = "You kept your streak alive for " + streak + " days and earned "
                + bonus + " bonus points!";

        Notification n = saveNotification(userId, "STREAK_BONUS", title, body,
                "chist://profile");
        sendEmail(n, userEmail);
    }

    // ── fraud.flagged ─────────────────────────────────────────────────────────
    @RabbitListener(queues = RabbitMQConfig.Q_NOTIF_FRAUD_FLAGGED)
    public void onFraudFlagged(Map<String, Object> raw) {
        String taskId = str(raw, "taskId");
        String reason = str(raw, "reason");

        // Admin notification — recipient is hardcoded here; in production
        // fetch admin user IDs from User Service via REST.
        String title = "⚠️ Fraud alert: task " + taskId;
        String body  = "A task has been flagged for fraud. Reason: " + reason;

        Notification n = saveNotification("admin", "FRAUD_FLAGGED", title, body,
                "chist://admin/tasks/" + taskId);
        sendEmail(n, "admin@chist.bg");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Notification saveNotification(String recipientId, String type,
                                          String title, String body, String deepLink) {
        Notification n = Notification.builder()
                .recipientUserId(safeUuid(recipientId))
                .type(type)
                .title(title)
                .body(body)
                .deepLink(deepLink)
                .build();
        return notificationRepository.save(n);
    }

    private void sendEmail(Notification notification, String toEmail) {
        String status = "SENT";
        String errorMsg = null;
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(toEmail);
            msg.setSubject(notification.getTitle());
            msg.setText(notification.getBody());
            mailSender.send(msg);
            log.info("Email sent to {} for notification {}", toEmail, notification.getId());
        } catch (Exception ex) {
            status = "FAILED";
            errorMsg = ex.getMessage();
            log.error("Failed to send email to {} : {}", toEmail, ex.getMessage());
        }

        deliveryLogRepository.save(DeliveryLog.builder()
                .notification(notification)
                .channel("EMAIL")
                .status(status)
                .errorMessage(errorMsg)
                .build());
    }

    private static String str(Map<String, Object> map, String key) {
        Object v = map.get(key);
        return v == null ? "" : v.toString();
    }

    private static java.util.UUID safeUuid(String s) {
        try { return java.util.UUID.fromString(s); }
        catch (Exception e) { return java.util.UUID.randomUUID(); }
    }
}
