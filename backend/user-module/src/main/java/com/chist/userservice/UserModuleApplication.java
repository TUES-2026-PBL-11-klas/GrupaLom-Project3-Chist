package com.chist.userservice;

import com.chist.userservice.model.Admin;
import com.chist.userservice.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.client.RestTemplate;

@SpringBootApplication
@EnableJpaAuditing
public class UserModuleApplication {

    public static void main(String[] args) {
        SpringApplication.run(UserModuleApplication.class, args);
    }

    @Bean
    public RestTemplate restTemplate(){
        return new RestTemplate();
    }

    @Bean
    public CommandLineRunner seedAdmin(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            boolean adminExists = userRepository.findAll().stream()
                    .anyMatch(u -> u instanceof Admin);
            if (!adminExists) {
                Admin admin = Admin.builder()
                        .email("admin@chist.bg")
                        .username("admin")
                        .password(passwordEncoder.encode("Admin123!"))
                        .adminLevel(1)
                        .build();
                userRepository.save(admin);
                System.out.println("Admin account created: admin@chist.bg / Admin123!");
            }
        };
    }
}
