package com.example.tripservice.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class CreateTripRequest {
    private String destination;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer participants;
    private BigDecimal budget;
    private String preferences; // 偏好标签，如 "美食,动漫,购物"
    private String rawInput; // 用户原始输入（语音转文字后的内容）
    
    // Getters and Setters
    public String getDestination() {
        return destination;
    }
    
    public void setDestination(String destination) {
        this.destination = destination;
    }
    
    public LocalDate getStartDate() {
        return startDate;
    }
    
    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }
    
    public LocalDate getEndDate() {
        return endDate;
    }
    
    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }
    
    public Integer getParticipants() {
        return participants;
    }
    
    public void setParticipants(Integer participants) {
        this.participants = participants;
    }
    
    public BigDecimal getBudget() {
        return budget;
    }
    
    public void setBudget(BigDecimal budget) {
        this.budget = budget;
    }
    
    public String getPreferences() {
        return preferences;
    }
    
    public void setPreferences(String preferences) {
        this.preferences = preferences;
    }
    
    public String getRawInput() {
        return rawInput;
    }
    
    public void setRawInput(String rawInput) {
        this.rawInput = rawInput;
    }
}
