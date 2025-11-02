package com.example.tripservice.dto;

public class UserDto {
    private Long id;
    private String email;
    private String displayName;
    private String authProvider;

    public UserDto() {}

    public UserDto(Long id, String email, String displayName, String authProvider) {
        this.id = id;
        this.email = email;
        this.displayName = displayName;
        this.authProvider = authProvider;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getAuthProvider() {
        return authProvider;
    }

    public void setAuthProvider(String authProvider) {
        this.authProvider = authProvider;
    }
}
