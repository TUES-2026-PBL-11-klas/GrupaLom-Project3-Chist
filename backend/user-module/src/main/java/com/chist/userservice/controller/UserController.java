package com.chist.userservice.controller;

import com.chist.userservice.dto.UserResponse;
import com.chist.userservice.model.User;
import com.chist.userservice.repository.UserRepository;
import com.chist.userservice.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;


import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;
    private final UserRepository userRepository;


    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal User user){
        return ResponseEntity.ok(mapToDTO(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable UUID id){
        return ResponseEntity.ok(mapToDTO(userService.getUserById(id)));
    }

    @GetMapping("/internal/{id}")
    public ResponseEntity<?> getUserByIdPublic(@PathVariable UUID id){
        return ResponseEntity.ok(mapToDTO(userService.getUserById(id)));
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<List<UserResponse>> getLeaderboard(){
        int limit = 50;
        return ResponseEntity.ok(
            userService.getTopUsers(limit)
                    .stream()
                    .map(this::mapToDTO)
                    .collect(Collectors.toList())
        );
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponse>> getAllUsers(){
        return ResponseEntity.ok(
                userService.getAllUsers()
                        .stream()
                        .map(this::mapToDTO)
                        .collect(Collectors.toList())
        );
    }


    @PatchMapping("/internal/{id}/points")
    public ResponseEntity<?> addPoints(@PathVariable UUID id, @RequestParam int points) {
        userService.addPoints(id, points);
        return ResponseEntity.ok(mapToDTO(userService.getUserById(id)));
    }

    @PatchMapping("/internal/{id}/streak")
    public ResponseEntity<?> setStreak(@PathVariable UUID id, @RequestParam int streak) {
        User user = userService.getUserById(id);
        user.setStreak(streak);
        userRepository.save(user);
        return ResponseEntity.ok(mapToDTO(user));
    }

    private UserResponse mapToDTO(User user){
        return UserResponse.builder()
                .id(user.getUuid())
                .email(user.getEmail())
                .username(user.getUsername())
                .points(user.getPoints())
                .streak(user.getStreak())
                .role(user.getClass().getSimpleName())
                .createdAt(user.getCreated_at())
                .updatedAt(user.getUpdated_at())
                .build();
    }




}
