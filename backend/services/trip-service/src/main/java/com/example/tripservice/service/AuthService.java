package com.example.tripservice.service;

import com.example.tripservice.dto.*;
import com.example.tripservice.entity.User;
import com.example.tripservice.repository.UserRepository;
import com.example.tripservice.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthService {
    
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    public AuthResponse register(RegisterRequest request) {
        // Check if user exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("该邮箱已被注册");
        }

        // Create user
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setDisplayName(request.getDisplayName());
        user.setAuthProvider("local");
        
        user = userRepository.save(user);

        // Generate JWT token
        String token = jwtUtil.generateToken(user.getId(), user.getEmail());
        
        UserDto userDto = toUserDto(user);
        return new AuthResponse(token, userDto);
    }

    public AuthResponse login(LoginRequest request) {
        Optional<User> userOpt = userRepository.findByEmail(request.getEmail());
        
        if (userOpt.isEmpty()) {
            throw new RuntimeException("邮箱或密码错误");
        }

        User user = userOpt.get();
        
        // Verify password
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("邮箱或密码错误");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getEmail());
        UserDto userDto = toUserDto(user);
        
        return new AuthResponse(token, userDto);
    }

    private UserDto toUserDto(User user) {
        return new UserDto(
            user.getId(),
            user.getEmail(),
            user.getDisplayName(),
            user.getAuthProvider()
        );
    }
}
