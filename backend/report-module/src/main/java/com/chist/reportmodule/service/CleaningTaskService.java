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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CleaningTaskService {

    private final CleaningTaskRepository cleaningTaskRepository;
    private final ReportRepository reportRepository;

    public CleaningTaskResponse createCleaningTask(UUID cleanerId, CreateCleaningTaskRequest request){
        Report report = reportRepository.findById(request.getReportId())
                .orElseThrow(() -> new ReportOrTaskNotFoundException("Report Not Found."));
        report.setStatus(ReportStatus.IN_PROGRESS);
        reportRepository.save(report);

        CleaningTask cleaningTask = CleaningTask.builder()
                .report(report)
                .cleanerId(cleanerId)
                .status(TaskStatus.PENDING)
                .verified(false)
                .build();

        return mapToDTO(cleaningTaskRepository.save(cleaningTask));
    }

    public CleaningTaskResponse getCleaningTaskById(UUID cleaningTaskId){
        return mapToDTO(cleaningTaskRepository.findById(cleaningTaskId)
                .orElseThrow(() -> new ReportOrTaskNotFoundException("Task Not Found.")));
    }

    public List<CleaningTaskResponse> getCleaningTaskByCleanerId(UUID cleanerId){
        return cleaningTaskRepository.findByCleanerId(cleanerId)
                .stream()
                .map(this :: mapToDTO)
                .collect(Collectors.toList());
    }

    public CleaningTaskResponse uploadPhotos(UUID cleaningTaskId,String beforePhoto,String afterPhoto){
        CleaningTask cleaningTask = cleaningTaskRepository.findById(cleaningTaskId)
                .orElseThrow(() -> new ReportOrTaskNotFoundException("Task Not Found."));
        cleaningTask.setBeforePhoto(beforePhoto);
        cleaningTask.setAfterPhoto(afterPhoto);
        cleaningTask.setStatus(TaskStatus.IN_PROGRESS);
        return mapToDTO(cleaningTaskRepository.save(cleaningTask));
    }

    public CleaningTaskResponse completeTask(UUID cleaningTaskId){
        CleaningTask cleaningTask = cleaningTaskRepository.findById(cleaningTaskId)
                .orElseThrow(() -> new ReportOrTaskNotFoundException("Task Not Found."));
        cleaningTask.setStatus(TaskStatus.COMPLETED);
        cleaningTask.getReport().setStatus(ReportStatus.CLEANED);
        reportRepository.save(cleaningTask.getReport());
        return mapToDTO(cleaningTaskRepository.save(cleaningTask));
    }

    private CleaningTaskResponse mapToDTO(CleaningTask cleaningTask){
        return CleaningTaskResponse.builder()
                .task_id(cleaningTask.getId())
                .cleanerId(cleaningTask.getCleanerId())
                .reportId(cleaningTask.getReport().getId())
                .beforePhoto(cleaningTask.getBeforePhoto())
                .afterPhoto(cleaningTask.getAfterPhoto())
                .verified(cleaningTask.isVerified())
                .status(cleaningTask.getStatus())
                .createdAt(cleaningTask.getCreatedAt())
                .updatedAt(cleaningTask.getUpdatedAt())
                .build();
    }


}
