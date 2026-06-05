package com.chist.reportmodule.service;


import com.chist.reportmodule.dto.CreateReportRequest;
import com.chist.reportmodule.dto.ReportResponse;
import com.chist.reportmodule.exception.ReportOrTaskNotFoundException;
import com.chist.reportmodule.model.Report;
import com.chist.reportmodule.model.ReportStatus;
import com.chist.reportmodule.repository.ReportRepository;
import lombok.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;

    @Value("${app.upload-dir:uploads/reports}")
    private String uploadDir;

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
                // Local filesystem storage is not available in this environment — photo skipped
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

    public ReportResponse getReportById(UUID  reportId){
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

    public ReportResponse updateStatus(UUID reportId, ReportStatus status){
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ReportOrTaskNotFoundException("Report Not Found."));
        report.setStatus(status);
        return mapToDTO(reportRepository.save(report));
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
        if (!target.startsWith(base)) return null; // path traversal guard
        return target;
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
