package com.chist.userservice.service;

import com.chist.userservice.exception.UserNotFoundException;
import com.chist.userservice.model.User;
import com.chist.userservice.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    private User testUser;
    private UUID testId;

    @BeforeEach
    void setUp() {
        testId = UUID.randomUUID();
        testUser = User.builder()
                .email("test@test.com")
                .username("testuser")
                .points(100)
                .streak(5)
                .build();
    }

    @Test
    void getUserById_success() {
        when(userRepository.findById(testId)).thenReturn(Optional.of(testUser));
        User result = userService.getUserById(testId);
        assertNotNull(result);
        assertEquals("test@test.com", result.getEmail());
    }

    @Test
    void getUserById_notFound_throwsException() {
        when(userRepository.findById(testId)).thenReturn(Optional.empty());
        assertThrows(UserNotFoundException.class, () -> userService.getUserById(testId));
    }

    @Test
    void addPoints_success() {
        when(userRepository.findById(testId)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        userService.addPoints(testId, 50);

        assertEquals(150, testUser.getPoints());
        verify(userRepository).save(testUser);
    }

    @Test
    void incrementStreak_success() {
        when(userRepository.findById(testId)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        userService.increaseStreak(testId);

        assertEquals(6, testUser.getStreak());
        verify(userRepository).save(testUser);
    }

    @Test
    void resetStreak_success() {
        when(userRepository.findById(testId)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        userService.resetStreak(testId);

        assertEquals(0, testUser.getStreak());
        verify(userRepository).save(testUser);
    }

    @Test
    void getTopUsers_success() {
        User user2 = User.builder().points(200).build();
        when(userRepository.findAll()).thenReturn(List.of(testUser, user2));

        List<User> result = userService.getTopUsers(2);

        assertEquals(2, result.size());
        assertEquals(200, result.get(0).getPoints());
    }

    @Test
    void getUserByEmail_success() {
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(testUser));
        User result = userService.getUserByEmail("test@test.com");
        assertEquals("testuser", result.getUsername());
    }

    @Test
    void getUserByEmail_notFound_throwsException() {
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        assertThrows(UsernameNotFoundException.class,
                () -> userService.getUserByEmail("missing@test.com"));
    }

    @Test
    void addPoints_userNotFound_throwsException() {
        when(userRepository.findById(testId)).thenReturn(Optional.empty());
        assertThrows(UserNotFoundException.class, () -> userService.addPoints(testId, 10));
    }

    @Test
    void addPoints_zeroPoints_noChange() {
        when(userRepository.findById(testId)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        userService.addPoints(testId, 0);
        assertEquals(100, testUser.getPoints());
    }

    @Test
    void getTopUsers_limitZero_returnsEmpty() {
        when(userRepository.findAll()).thenReturn(List.of(testUser));
        assertTrue(userService.getTopUsers(0).isEmpty());
    }

    @Test
    void getTopUsers_emptyRepository_returnsEmpty() {
        when(userRepository.findAll()).thenReturn(List.of());
        assertTrue(userService.getTopUsers(5).isEmpty());
    }

    @Test
    void getTopUsers_limitExceedsSize_returnsAllSorted() {
        User user2 = User.builder().points(200).build();
        User user3 = User.builder().points(50).build();
        when(userRepository.findAll()).thenReturn(List.of(testUser, user2, user3));
        List<User> result = userService.getTopUsers(10);
        assertEquals(3, result.size());
        assertEquals(200, result.get(0).getPoints());
    }

    @Test
    void getAllUsers_returnsAll() {
        when(userRepository.findAll()).thenReturn(List.of(testUser));
        assertEquals(1, userService.getAllUsers().size());
    }
}