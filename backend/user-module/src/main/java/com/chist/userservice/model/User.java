package com.chist.userservice.model;


import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter @Setter
@DiscriminatorValue("USER")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@EntityListeners(AuditingEntityListener.class)
@DiscriminatorColumn(name = "role",discriminatorType = DiscriminatorType.STRING)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID uuid;

    @Column(nullable = false,unique = true,length = 100)
    private String email;

    @Column(nullable = false, name = "password_hash")
    private String password;

    @Column(nullable = false, length = 100)
    private String username;

    @Column(nullable = false)
    private int points = 0;

    @Column(nullable = false, name = "streak_days")
    private int streak = 0;

    @CreatedDate
    @Column(nullable = false,name = "created_at")
    private Date created_at;

    @LastModifiedDate
    @Column(nullable = false,name = "updated_at")
    private Date updated_at;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities(){
        return List.of(new SimpleGrantedAuthority("ROLE_USER"));
    }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return true; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return true; }
}
