package com.chist.verificationmodule.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class GpsVerificationServiceTest {

    @InjectMocks
    private GpsVerificationService gpsVerificationService;

    @Test
    void verify_sameLocation_returnsTrue() {
        ReflectionTestUtils.setField(gpsVerificationService, "maxDistanceMeters", 100.0);

        boolean result = gpsVerificationService.verify(42.6977, 23.3219, 42.6977, 23.3219);

        assertTrue(result);
    }

    @Test
    void verify_locationWithinRange_returnsTrue() {
        ReflectionTestUtils.setField(gpsVerificationService, "maxDistanceMeters", 100.0);

        boolean result = gpsVerificationService.verify(42.6977, 23.3219, 42.6978, 23.3220);

        assertTrue(result);
    }

    @Test
    void verify_locationOutOfRange_returnsFalse() {
        ReflectionTestUtils.setField(gpsVerificationService, "maxDistanceMeters", 100.0);

        boolean result = gpsVerificationService.verify(42.6977, 23.3219, 42.7500, 23.4000);

        assertFalse(result);
    }

    @Test
    void verify_zeroDistanceWithinZeroThreshold_returnsTrue() {
        ReflectionTestUtils.setField(gpsVerificationService, "maxDistanceMeters", 0.0);
        boolean result = gpsVerificationService.verify(42.6977, 23.3219, 42.6977, 23.3219);
        assertTrue(result);
    }

    @Test
    void verify_anyOffsetWithZeroThreshold_returnsFalse() {
        ReflectionTestUtils.setField(gpsVerificationService, "maxDistanceMeters", 0.0);
        boolean result = gpsVerificationService.verify(42.6977, 23.3219, 42.6978, 23.3219);
        assertFalse(result);
    }
}