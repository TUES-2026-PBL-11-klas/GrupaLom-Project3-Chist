package com.chist.verificationmodule.service;

import com.chist.verificationmodule.dto.VerificationRequest;
import com.chist.verificationmodule.dto.VerificationResponse;
import com.chist.verificationmodule.exception.VerificationNotFoundException;
import com.chist.verificationmodule.model.Verification;
import com.chist.verificationmodule.model.VerificationStatus;
import com.chist.verificationmodule.model.VerificationType;
import com.chist.verificationmodule.repository.VerificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VerificationServiceTest {

    @Mock
    private VerificationRepository verificationRepository;
    @Mock
    private GpsVerificationService gpsVerificationService;
    @Mock
    private AiVerificationService aiVerificationService;

    @InjectMocks
    private VerificationService verificationService;

    private VerificationRequest request;
    private Verification verification;
    private UUID testId;

    @BeforeEach
    void setUp() {
        testId = UUID.randomUUID();
        request = new VerificationRequest(
                testId, VerificationType.AI,
                42.6977, 23.3219,
                "https://before.jpg", "https://after.jpg",
                42.6977, 23.3219
        );

        verification = Verification.builder()
                .id(testId)
                .taskId(testId)
                .type(VerificationType.AI)
                .status(VerificationStatus.APPROVED)
                .result("Both GPS and AI verification passed")
                .build();
    }

    @Test
    void verify_gpsPass_photoFetchFails_returnsPending() {
        when(gpsVerificationService.verify(anyDouble(), anyDouble(), anyDouble(), anyDouble())).thenReturn(true);
        when(verificationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        VerificationResponse response = verificationService.verify(request);

        assertNotNull(response);
        assertEquals(VerificationStatus.PENDING, response.getStatus());
        assertEquals("Partial verification - waiting for admin approval", response.getResult());
    }

    @Test
    void verify_bothFail_returnsRejected() {
        when(gpsVerificationService.verify(anyDouble(), anyDouble(), anyDouble(), anyDouble())).thenReturn(false);
        when(verificationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        VerificationResponse response = verificationService.verify(request);

        assertEquals(VerificationStatus.REJECTED, response.getStatus());
        assertEquals("Both GPS and AI verification failed", response.getResult());
    }

    @Test
    void adminApprove_success() {
        when(verificationRepository.findById(testId)).thenReturn(Optional.of(verification));
        when(verificationRepository.save(any())).thenReturn(verification);

        VerificationResponse response = verificationService.adminApprove(testId);

        assertEquals(VerificationStatus.APPROVED, response.getStatus());
    }

    @Test
    void adminApprove_notFound_throwsException() {
        when(verificationRepository.findById(testId)).thenReturn(Optional.empty());

        assertThrows(VerificationNotFoundException.class,
                () -> verificationService.adminApprove(testId));
    }

    @Test
    void verify_gpsFail_photoFetchFails_returnsRejected() {
        when(gpsVerificationService.verify(anyDouble(), anyDouble(), anyDouble(), anyDouble())).thenReturn(false);
        when(verificationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        VerificationResponse response = verificationService.verify(request);

        assertEquals(VerificationStatus.REJECTED, response.getStatus());
    }

    @Test
    void adminReject_success() {
        when(verificationRepository.findById(testId)).thenReturn(Optional.of(verification));
        verification.setStatus(VerificationStatus.REJECTED);
        when(verificationRepository.save(any())).thenReturn(verification);

        VerificationResponse response = verificationService.adminReject(testId);

        assertEquals(VerificationStatus.REJECTED, response.getStatus());
        assertEquals("Rejected by admin", response.getResult());
    }

    @Test
    void adminReject_notFound_throwsException() {
        when(verificationRepository.findById(testId)).thenReturn(Optional.empty());
        assertThrows(VerificationNotFoundException.class,
                () -> verificationService.adminReject(testId));
    }

    @Test
    void getById_success() {
        when(verificationRepository.findById(testId)).thenReturn(Optional.of(verification));
        VerificationResponse response = verificationService.getById(testId);
        assertEquals(testId, response.getTaskId());
    }

    @Test
    void getById_notFound_throwsException() {
        when(verificationRepository.findById(testId)).thenReturn(Optional.empty());
        assertThrows(VerificationNotFoundException.class,
                () -> verificationService.getById(testId));
    }
}
