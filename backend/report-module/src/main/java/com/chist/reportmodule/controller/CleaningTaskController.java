package com.chist.reportmodule.controller;

import com.chist.reportmodule.dto.CleaningTaskResponse;
import com.chist.reportmodule.dto.CreateCleaningTaskRequest;
import com.chist.reportmodule.service.CleaningTaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


import java.util.List;
import java.util.UUID;


@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class CleaningTaskController {

    private final CleaningTaskService cleaningTaskService;

    @PostMapping
    public ResponseEntity<CleaningTaskResponse> createTask(
            @RequestHeader("X-User-Id") UUID cleanerId,
            @RequestBody CreateCleaningTaskRequest request) {
        return ResponseEntity.ok(cleaningTaskService.createCleaningTask(cleanerId, request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CleaningTaskResponse> getTaskById(@PathVariable UUID id) {
        return ResponseEntity.ok(cleaningTaskService.getCleaningTaskById(id));
    }

    @GetMapping("/cleaner/{cleanerId}")
    public ResponseEntity<List<CleaningTaskResponse>> getTasksByCleanerId(
            @PathVariable UUID cleanerId) {
        return ResponseEntity.ok(cleaningTaskService.getCleaningTaskByCleanerId(cleanerId));
    }

    @PatchMapping("/{id}/photos")
    public ResponseEntity<CleaningTaskResponse> uploadPhotos(
            @PathVariable UUID id,
            @RequestParam String beforePhoto,
            @RequestParam String afterPhoto) {
        return ResponseEntity.ok(cleaningTaskService.uploadPhotos(id, beforePhoto, afterPhoto));
    }

    @PatchMapping("/{id}/complete")
    public ResponseEntity<CleaningTaskResponse> completeTask(@PathVariable UUID id) {
        return ResponseEntity.ok(cleaningTaskService.completeTask(id));
    }

}
