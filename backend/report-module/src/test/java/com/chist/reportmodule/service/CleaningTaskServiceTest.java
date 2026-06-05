package com.chist.reportmodule.service;

import com.chist.reportmodule.dto.CleaningTaskResponse;
import com.chist.reportmodule.dto.CreateCleaningTaskRequest;
import com.chist.reportmodule.exception.ReportOrTaskNotFoundException;
import com.chist.reportmodule.model.CleaningTask;
import com.chist.reportmodule.model.Report;
import com.chist.reportmodule.model.ReportStatus;
import com.chist.reportmodule.model.TaskStatus;
import com.chist.reportmodule.repository.CleaningTaskRepository;
import com.chist.reportmodule.repository.ReportRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CleaningTaskServiceTest {

    @Mock
    private CleaningTaskRepository cleaningTaskRepository;

    @Mock
    private ReportRepository reportRepository;

    @InjectMocks
    private CleaningTaskService cleaningTaskService;

    private Report testReport;
    private CleaningTask testTask;
    private UUID testId;
    private UUID testCleanerId;
    private UUID testReportId;

    @BeforeEach
    void setUp() {
        testId = UUID.randomUUID();
        testCleanerId = UUID.randomUUID();
        testReportId = UUID.randomUUID();

        testReport = Report.builder()
                .id(testReportId)
                .status(ReportStatus.NEW)
                .build();

        testTask = CleaningTask.builder()
                .id(testId)
                .report(testReport)
                .cleanerId(testCleanerId)
                .status(TaskStatus.PENDING)
                .verified(false)
                .build();
    }

    @Test
    void createTask_success() {
        CreateCleaningTaskRequest request = new CreateCleaningTaskRequest(testReportId);
        when(reportRepository.findById(testReportId)).thenReturn(Optional.of(testReport));
        when(cleaningTaskRepository.save(any(CleaningTask.class))).thenReturn(testTask);

        CleaningTaskResponse response = cleaningTaskService.createCleaningTask(testCleanerId, request);

        assertNotNull(response);
        assertEquals(testCleanerId, response.getCleanerId());
        verify(reportRepository).save(testReport);
    }

    @Test
    void createTask_reportNotFound_throwsException() {
        CreateCleaningTaskRequest request = new CreateCleaningTaskRequest(testReportId);
        when(reportRepository.findById(testReportId)).thenReturn(Optional.empty());

        assertThrows(ReportOrTaskNotFoundException.class,
                () -> cleaningTaskService.createCleaningTask(testCleanerId, request));
    }

    @Test
    void getTaskById_success() {
        when(cleaningTaskRepository.findById(testId)).thenReturn(Optional.of(testTask));

        CleaningTaskResponse response = cleaningTaskService.getCleaningTaskById(testId);

        assertNotNull(response);
        assertEquals(testId, response.getTask_id());
    }

    @Test
    void getTasksByCleanerId_success() {
        when(cleaningTaskRepository.findByCleanerId(testCleanerId)).thenReturn(List.of(testTask));

        List<CleaningTaskResponse> result = cleaningTaskService.getCleaningTaskByCleanerId(testCleanerId);

        assertEquals(1, result.size());
        assertEquals(testCleanerId, result.get(0).getCleanerId());
    }

    @Test
    void completeTask_success() {
        when(cleaningTaskRepository.findById(testId)).thenReturn(Optional.of(testTask));
        when(cleaningTaskRepository.save(any(CleaningTask.class))).thenReturn(testTask);

        CleaningTaskResponse response = cleaningTaskService.completeTask(testId);

        assertNotNull(response);
        assertEquals(TaskStatus.COMPLETED, testTask.getStatus());
    }

    @Test
    void getTaskById_notFound_throwsException() {
        when(cleaningTaskRepository.findById(testId)).thenReturn(Optional.empty());
        assertThrows(ReportOrTaskNotFoundException.class,
                () -> cleaningTaskService.getCleaningTaskById(testId));
    }

    @Test
    void uploadPhotos_success() {
        when(cleaningTaskRepository.findById(testId)).thenReturn(Optional.of(testTask));
        when(cleaningTaskRepository.save(any(CleaningTask.class))).thenReturn(testTask);

        CleaningTaskResponse response = cleaningTaskService.uploadPhotos(
                testId, "before.jpg", "after.jpg");

        assertEquals(TaskStatus.IN_PROGRESS, testTask.getStatus());
        assertEquals("before.jpg", testTask.getBeforePhoto());
        assertEquals("after.jpg", testTask.getAfterPhoto());
        assertNotNull(response);
    }

    @Test
    void uploadPhotos_notFound_throwsException() {
        when(cleaningTaskRepository.findById(testId)).thenReturn(Optional.empty());
        assertThrows(ReportOrTaskNotFoundException.class,
                () -> cleaningTaskService.uploadPhotos(testId, "before.jpg", "after.jpg"));
    }

    @Test
    void completeTask_updatesReportToCleaned() {
        when(cleaningTaskRepository.findById(testId)).thenReturn(Optional.of(testTask));
        when(cleaningTaskRepository.save(any(CleaningTask.class))).thenReturn(testTask);

        cleaningTaskService.completeTask(testId);

        assertEquals(ReportStatus.CLEANED, testTask.getReport().getStatus());
        verify(reportRepository).save(testReport);
    }

    @Test
    void completeTask_notFound_throwsException() {
        when(cleaningTaskRepository.findById(testId)).thenReturn(Optional.empty());
        assertThrows(ReportOrTaskNotFoundException.class,
                () -> cleaningTaskService.completeTask(testId));
    }

    @Test
    void getTasksByCleanerId_emptyList() {
        when(cleaningTaskRepository.findByCleanerId(testCleanerId)).thenReturn(List.of());
        assertTrue(cleaningTaskService.getCleaningTaskByCleanerId(testCleanerId).isEmpty());
    }
}