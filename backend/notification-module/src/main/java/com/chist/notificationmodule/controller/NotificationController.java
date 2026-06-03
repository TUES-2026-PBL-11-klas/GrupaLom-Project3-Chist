package com.chist.notificationmodule.controller;

import com.chist.notificationmodule.dto.EmailNotification;
import com.chist.notificationmodule.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final EmailService emailService;

    @PostMapping("/email")
    public ResponseEntity<String> sendEmail(@RequestBody EmailNotification notification) {
        emailService.sendEmail(notification);
        return ResponseEntity.ok("Email sent successfully.");
    }

    @PostMapping("/registration")
    public ResponseEntity<String> sendRegistrationEmail(
            @RequestParam String to,
            @RequestParam String username) {
        emailService.sendRegistrationEmail(to, username);
        return ResponseEntity.ok("Registration email sent.");
    }

    @PostMapping("/cleaning-task-completed")
    public ResponseEntity<String> sendTaskCompletedEmail(
            @RequestParam String to,
            @RequestParam String username,
            @RequestParam int points) {
        emailService.sendTaskCompletionEmail(to, username, points);
        return ResponseEntity.ok("Cleaning Task completed email sent.");
    }

    @PostMapping("/reward")
    public ResponseEntity<String> sendRewardEmail(
            @RequestParam String to,
            @RequestParam String username,
            @RequestParam String rewardTitle) {
        emailService.sendRewardEmail(to, username, rewardTitle);
        return ResponseEntity.ok("Reward email sent.");
    }
}