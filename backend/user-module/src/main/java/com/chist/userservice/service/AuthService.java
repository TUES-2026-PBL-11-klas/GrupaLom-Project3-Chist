package com.chist.userservice.service;


import com.chist.userservice.dto.AuthRequest;
import com.chist.userservice.dto.AuthResponse;
import com.chist.userservice.dto.RegisterRequest;
import com.chist.userservice.exception.EmailAlreadyExistException;
import com.chist.userservice.model.User;
import com.chist.userservice.repository.UserRepository;
import com.chist.userservice.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final RestTemplate restTemplate;


    public AuthResponse register(RegisterRequest request){
        if(userRepository.existsByEmail(request.getEmail())){
            throw new EmailAlreadyExistException("Email or Password not correct.");
        }
        User user = User.builder()
                .email(request.getEmail())
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();

        userRepository.save(user);

        try {
            restTemplate.postForObject(
                    "http://notification-module:8082/api/notifications/registration?to=" +
                            user.getEmail() + "&username=" + user.getUsername(),
                    null, String.class
            );
        } catch (Exception e) {
            // Registration should succeed even if the notification service is unavailable
        }

        String token = jwtService.generateToken(user.getEmail(), user.getUuid());
        return new AuthResponse(token);
    }

    public AuthResponse login(AuthRequest request){
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User or Password not correct."));

        String token = jwtService.generateToken(user.getEmail(), user.getUuid());
        return new AuthResponse(token);
    }
}
