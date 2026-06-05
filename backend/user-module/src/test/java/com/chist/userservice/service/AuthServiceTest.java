package com.chist.userservice.service;

import com.chist.userservice.dto.AuthRequest;
import com.chist.userservice.dto.AuthResponse;
import com.chist.userservice.dto.RegisterRequest;
import com.chist.userservice.exception.EmailAlreadyExistException;
import com.chist.userservice.model.User;
import com.chist.userservice.repository.UserRepository;
import com.chist.userservice.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.client.RestTemplate;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private JwtService jwtService;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private AuthService authService;

    private User testUser;
    private RegisterRequest registerRequest;
    private AuthRequest authRequest;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .email("test@test.com")
                .username("testuser")
                .password("encodedPassword")
                .build();

        registerRequest = new RegisterRequest("test@test.com", "testuser", "password123");
        authRequest = new AuthRequest("test@test.com", "password123");
    }

    @Test
    void register_success() {
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(jwtService.generateToken(anyString(), any(UUID.class))).thenReturn("testToken");

        AuthResponse response = authService.register(registerRequest);

        assertNotNull(response);
        assertEquals("testToken", response.getToken());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_emailAlreadyExists_throwsException() {
        when(userRepository.existsByEmail(anyString())).thenReturn(true);

        assertThrows(EmailAlreadyExistException.class, () -> authService.register(registerRequest));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void login_success() {
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(testUser));
        when(jwtService.generateToken(anyString(), any(UUID.class))).thenReturn("testToken");

        AuthResponse response = authService.login(authRequest);

        assertNotNull(response);
        assertEquals("testToken", response.getToken());
    }

    @Test
    void login_userNotFound_throwsException() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(null);
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> authService.login(authRequest));
    }

    @Test
    void register_notificationServiceDown_stillSucceeds() {
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(jwtService.generateToken(anyString(), any(UUID.class))).thenReturn("testToken");
        doThrow(new RuntimeException("notification down"))
                .when(restTemplate).postForObject(anyString(), isNull(), eq(String.class));

        AuthResponse response = authService.register(registerRequest);

        assertEquals("testToken", response.getToken());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void login_callsAuthenticationManager() {
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(testUser));
        when(jwtService.generateToken(anyString(), any(UUID.class))).thenReturn("testToken");

        authService.login(authRequest);

        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
    }
}