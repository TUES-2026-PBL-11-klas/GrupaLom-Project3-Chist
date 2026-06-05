package com.chist.userservice.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.Collection;
import java.util.List;

import lombok.experimental.SuperBuilder;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

@Entity
@DiscriminatorValue("Admin")
@Getter @Setter
@NoArgsConstructor
@SuperBuilder
public class Admin extends User {

    @Column(name = "admin_level")
    private int adminLevel = 1;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    public void banUser(User user) {

    }
}