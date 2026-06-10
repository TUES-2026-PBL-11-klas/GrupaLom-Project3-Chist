package com.chist.reportmodule.service;

import com.chist.reportmodule.dto.CreateReportRequest;
import com.chist.reportmodule.dto.ReportResponse;
import com.chist.reportmodule.exception.ReportOrTaskNotFoundException;
import com.chist.reportmodule.model.Report;
import com.chist.reportmodule.model.ReportStatus;
import com.chist.reportmodule.repository.ReportRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock
    private ReportRepository reportRepository;

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private ReportService reportService;

    private Report testReport;
    private UUID testId;
    private UUID testUserId;

    @BeforeEach
    void setUp() {
        testId = UUID.randomUUID();
        testUserId = UUID.randomUUID();
        testReport = Report.builder()
                .id(testId)
                .userId(testUserId)
                .latitude(42.6977)
                .longitude(23.3219)
                .description("Test report")
                .status(ReportStatus.NEW)
                .build();
    }

    @Test
    void createReport_success() throws Exception {
        CreateReportRequest request = new CreateReportRequest(
                42.6977, 23.3219, "Test report","Landfill"
                ,"Terrible"
        );
        when(reportRepository.save(any(Report.class))).thenReturn(testReport);

        ReportResponse response = reportService.createReport(testUserId, request, null);

        assertNotNull(response);
        assertEquals(testUserId, response.getUserId());
        verify(reportRepository).save(any(Report.class));
    }


    @Test
    void getReportById_success() {
        when(reportRepository.findById(testId)).thenReturn(Optional.of(testReport));

        ReportResponse response = reportService.getReportById(testId);

        assertNotNull(response);
        assertEquals(testId, response.getReportId());
    }

    @Test
    void getReportById_notFound_throwsException() {
        when(reportRepository.findById(testId)).thenReturn(Optional.empty());

        assertThrows(ReportOrTaskNotFoundException.class, () -> reportService.getReportById(testId));
    }

    @Test
    void getReportsByUser_success() {
        when(reportRepository.findByUserId(testUserId)).thenReturn(List.of(testReport));

        List<ReportResponse> result = reportService.getReportsByUserId(testUserId);

        assertEquals(1, result.size());
        assertEquals(testUserId, result.get(0).getUserId());
    }

    @Test
    void updateStatus_success() {
        when(reportRepository.findById(testId)).thenReturn(Optional.of(testReport));
        when(reportRepository.save(any(Report.class))).thenReturn(testReport);

        ReportResponse response = reportService.updateStatus(testId, ReportStatus.IN_PROGRESS, null);

        assertNotNull(response);
        verify(reportRepository).save(any(Report.class));
    }

    @Test
    void deleteReport_success() {
        when(reportRepository.existsById(testId)).thenReturn(true);
        doNothing().when(reportRepository).deleteById(testId);

        assertDoesNotThrow(() -> reportService.deleteReport(testId));
        verify(reportRepository).deleteById(testId);
    }

    @Test
    void deleteReport_notFound_throwsException() {
        when(reportRepository.existsById(testId)).thenReturn(false);

        assertThrows(ReportOrTaskNotFoundException.class, () -> reportService.deleteReport(testId));
    }

    @Test
    void getReportsByStatus_success() {
        when(reportRepository.findByStatus(ReportStatus.NEW)).thenReturn(List.of(testReport));
        List<ReportResponse> result = reportService.getReportsByStatus(ReportStatus.NEW);
        assertEquals(1, result.size());
        assertEquals(ReportStatus.NEW, result.get(0).getStatus());
    }

    @Test
    void getReportsByUser_emptyList() {
        when(reportRepository.findByUserId(testUserId)).thenReturn(List.of());
        assertTrue(reportService.getReportsByUserId(testUserId).isEmpty());
    }

    @Test
    void updateStatus_notFound_throwsException() {
        when(reportRepository.findById(testId)).thenReturn(Optional.empty());
        assertThrows(ReportOrTaskNotFoundException.class,
                () -> reportService.updateStatus(testId, ReportStatus.CLEANED, null));
    }

    @Test
    void getAllReports_success() {
        when(reportRepository.findAll()).thenReturn(List.of(testReport));
        assertEquals(1, reportService.getAllReports().size());
    }
}