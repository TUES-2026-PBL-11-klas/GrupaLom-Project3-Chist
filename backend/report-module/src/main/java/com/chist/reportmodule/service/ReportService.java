package com.chist.reportmodule.service;


import com.chist.reportmodule.dto.CreateReportRequest;
import com.chist.reportmodule.dto.ReportResponse;
import com.chist.reportmodule.exception.ReportOrTaskNotFoundException;
import com.chist.reportmodule.model.Report;
import com.chist.reportmodule.model.ReportStatus;
import com.chist.reportmodule.repository.ReportRepository;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final RestTemplate restTemplate;

    @Value("${app.upload-dir:uploads/reports}")
    private String uploadDir;

    @Value("${user-service.url:http://localhost:8080}")
    private String userServiceUrl;

    private static final int POINTS_PER_COMPLETION = 50;

    public ReportResponse createReport(UUID userId, CreateReportRequest request, MultipartFile image) {
        String photoUrl = null;
        if (image != null && !image.isEmpty()) {
            try {
                Path uploadPath = Paths.get(uploadDir);
                Files.createDirectories(uploadPath);
                String filename = UUID.randomUUID() + "_" + image.getOriginalFilename();
                Path filePath = uploadPath.resolve(filename);
                Files.copy(image.getInputStream(), filePath);
                photoUrl = "/uploads/reports/" + filename;
            } catch (IOException e) {
                log.warn("Could not save uploaded image: {}", e.getMessage());
            }
        }

        Report report = Report.builder()
                .userId(userId)
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .photoUrl(photoUrl)
                .description(request.getDescription())
                .severity(request.getSeverity())
                .status(ReportStatus.NEW)
                .build();
        return mapToDTO(reportRepository.save(report));
    }

    public ReportResponse getReportById(UUID reportId){
        return mapToDTO(reportRepository.findById(reportId)
                .orElseThrow(() -> new ReportOrTaskNotFoundException("Report Not Found.")));
    }

    public List<ReportResponse> getReportsByUserId(UUID userId){
        return reportRepository.findByUserId(userId)
                .stream()
                .map(this :: mapToDTO)
                .collect(Collectors.toList());
    }

    public List<ReportResponse> getReportsByStatus(ReportStatus status){
        return reportRepository.findByStatus(status)
                .stream()
                .map(this :: mapToDTO)
                .collect(Collectors.toList());
    }

    public List<ReportResponse> getAllReports(){
        return reportRepository.findAll()
                .stream()
                .map(this :: mapToDTO)
                .collect(Collectors.toList());
    }

    public ReportResponse updateStatus(UUID reportId, ReportStatus status, UUID actingUserId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ReportOrTaskNotFoundException("Report Not Found."));
        report.setStatus(status);
        ReportResponse saved = mapToDTO(reportRepository.save(report));

        if (status == ReportStatus.CLEANED && actingUserId != null) {
            awardPoints(actingUserId, POINTS_PER_COMPLETION);
        }

        return saved;
    }

    public void deleteReport(UUID reportId){
        if(!reportRepository.existsById(reportId)){
            throw new ReportOrTaskNotFoundException("Report Not Found.");
        }
        reportRepository.deleteById(reportId);
    }

    public Path getImagePath(UUID reportId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ReportOrTaskNotFoundException("Report Not Found."));
        if (report.getPhotoUrl() == null) return null;
        String filename = Paths.get(report.getPhotoUrl()).getFileName().toString();
        Path base = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path target = base.resolve(filename).normalize();
        if (!target.startsWith(base)) return null;
        return target;
    }

    private void awardPoints(UUID userId, int points) {
        try {
            String url = userServiceUrl + "/api/users/internal/" + userId + "/points?points=" + points;
            restTemplate.patchForObject(url, null, Void.class);
            log.info("Awarded {} points to user {}", points, userId);
        } catch (Exception e) {
            log.warn("Could not award points to user {}: {}", userId, e.getMessage());
        }
    }

    private ReportResponse mapToDTO(Report report) {
        return ReportResponse.builder()
                .reportId(report.getId())
                .userId(report.getUserId())
                .latitude(report.getLatitude())
                .longitude(report.getLongitude())
                .photoUrl(report.getPhotoUrl())
                .description(report.getDescription())
                .severity(report.getSeverity())
                .status(report.getStatus())
                .createdAt(report.getCreatedAt())
                .updatedAt(report.getUpdatedAt())
                .build();
    }
}
