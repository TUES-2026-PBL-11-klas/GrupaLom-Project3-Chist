package com.chist.notificationmodule.service;

import com.chist.notificationmodule.dto.EmailNotification;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private EmailService emailService;

    private EmailNotification testNotification;

    @BeforeEach
    void setUp() {
        testNotification = EmailNotification.builder()
                .to("test@test.com")
                .subject("Test Subject")
                .body("Test Body")
                .build();
    }

    @Test
    void sendEmail_success() {
        doNothing().when(mailSender).send(any(SimpleMailMessage.class));

        emailService.sendEmail(testNotification);

        verify(mailSender).send(any(SimpleMailMessage.class));
    }

    @Test
    void sendRegistrationEmail_success() {
        doNothing().when(mailSender).send(any(SimpleMailMessage.class));

        emailService.sendRegistrationEmail("test@test.com", "testuser");

        verify(mailSender).send(any(SimpleMailMessage.class));
    }

    @Test
    void sendTaskCompletedEmail_success() {
        doNothing().when(mailSender).send(any(SimpleMailMessage.class));

        emailService.sendTaskCompletionEmail("test@test.com", "testuser", 50);

        verify(mailSender).send(any(SimpleMailMessage.class));
    }

    @Test
    void sendRewardEmail_success() {
        doNothing().when(mailSender).send(any(SimpleMailMessage.class));

        emailService.sendRewardEmail("test@test.com", "testuser", "Еко Войн");

        verify(mailSender).send(any(SimpleMailMessage.class));
    }

    @Test
    void sendEmail_setsCorrectFields() {
        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        doNothing().when(mailSender).send(captor.capture());

        emailService.sendEmail(testNotification);

        SimpleMailMessage sent = captor.getValue();
        assertEquals("test@test.com", sent.getTo()[0]);
        assertEquals("Test Subject", sent.getSubject());
        assertEquals("Test Body", sent.getText());
    }

    @Test
    void sendEmail_mailSenderThrows_propagatesException() {
        doThrow(new RuntimeException("SMTP error")).when(mailSender).send(any(SimpleMailMessage.class));
        assertThrows(RuntimeException.class, () -> emailService.sendEmail(testNotification));
    }
}