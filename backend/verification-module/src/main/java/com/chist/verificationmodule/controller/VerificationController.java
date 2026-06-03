package com.chist.verificationmodule.controller;

import com.chist.verificationmodule.dto.VerificationRequest;
import com.chist.verificationmodule.dto.VerificationResponse;
import com.chist.verificationmodule.service.AiVerificationService;
import com.chist.verificationmodule.service.VerificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/verifications")
@RequiredArgsConstructor
public class VerificationController {

    private final VerificationService verificationService;
    private final AiVerificationService aiVerificationService;

    @PostMapping
    public ResponseEntity<VerificationResponse> verify(@RequestBody VerificationRequest request) {
        return ResponseEntity.ok(verificationService.verify(request));
    }

    @PostMapping("/check-image")
    public ResponseEntity<Map<String, Object>> checkImage(@RequestParam("image") MultipartFile image) {
        try {
            byte[] bytes = image.getBytes();
            Boolean isTrash = aiVerificationService.verifyHasTrashFromBytes(bytes).block();
            return ResponseEntity.ok(Map.of(
                    "isTrash", Boolean.TRUE.equals(isTrash),
                    "verified", true
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                    "isTrash", false,
                    "verified", false,
                    "error", e.getMessage() != null ? e.getMessage() : "Verification failed"
            ));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<VerificationResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(verificationService.getById(id));
    }

    @GetMapping("/task/{taskId}")
    public ResponseEntity<List<VerificationResponse>> getByTaskId(@PathVariable UUID taskId) {
        return ResponseEntity.ok(verificationService.getByTaskId(taskId));
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<VerificationResponse> adminApprove(@PathVariable UUID id) {
        return ResponseEntity.ok(verificationService.adminApprove(id));
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<VerificationResponse> adminReject(@PathVariable UUID id) {
        return ResponseEntity.ok(verificationService.adminReject(id));
    }
}