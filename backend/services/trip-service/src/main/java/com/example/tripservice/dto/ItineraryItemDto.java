package com.example.tripservice.dto;

import java.math.BigDecimal;
import java.time.LocalTime;

public class ItineraryItemDto {
    private Long id;
    private Integer dayIndex;
    private LocalTime startTime;
    private LocalTime endTime;
    private String title;
    private String type;
    private String location;
    private String description;
    private BigDecimal estimatedCost;
    private String notes;
    private Coordinates coordinates;
    
    // 坐标内部类
    public static class Coordinates {
        private Double lng;
        private Double lat;
        
        public Coordinates() {}
        
        public Coordinates(Double lng, Double lat) {
            this.lng = lng;
            this.lat = lat;
        }
        
        public Double getLng() {
            return lng;
        }
        
        public void setLng(Double lng) {
            this.lng = lng;
        }
        
        public Double getLat() {
            return lat;
        }
        
        public void setLat(Double lat) {
            this.lat = lat;
        }
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Integer getDayIndex() {
        return dayIndex;
    }
    
    public void setDayIndex(Integer dayIndex) {
        this.dayIndex = dayIndex;
    }
    
    public LocalTime getStartTime() {
        return startTime;
    }
    
    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }
    
    public LocalTime getEndTime() {
        return endTime;
    }
    
    public void setEndTime(LocalTime endTime) {
        this.endTime = endTime;
    }
    
    public String getTitle() {
        return title;
    }
    
    public void setTitle(String title) {
        this.title = title;
    }
    
    public String getType() {
        return type;
    }
    
    public void setType(String type) {
        this.type = type;
    }
    
    public String getLocation() {
        return location;
    }
    
    public void setLocation(String location) {
        this.location = location;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public BigDecimal getEstimatedCost() {
        return estimatedCost;
    }
    
    public void setEstimatedCost(BigDecimal estimatedCost) {
        this.estimatedCost = estimatedCost;
    }
    
    public String getNotes() {
        return notes;
    }
    
    public void setNotes(String notes) {
        this.notes = notes;
    }
    
    public Coordinates getCoordinates() {
        return coordinates;
    }
    
    public void setCoordinates(Coordinates coordinates) {
        this.coordinates = coordinates;
    }
}
