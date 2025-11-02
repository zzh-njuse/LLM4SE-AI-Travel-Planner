package com.example.tripservice.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalTime;

@Entity
@Table(name = "itinerary_items")
public class ItineraryItem {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private Long tripId;
    
    @Column(nullable = false)
    private Integer dayIndex; // 第几天，从1开始
    
    private LocalTime startTime;
    
    private LocalTime endTime;
    
    @Column(nullable = false, length = 200)
    private String title;
    
    @Column(length = 50)
    private String type; // attraction, restaurant, hotel, transport, other
    
    private String location;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    private BigDecimal estimatedCost;
    
    @Column(columnDefinition = "TEXT")
    private String coordinates; // JSON: {lat, lng}
    
    @Column(columnDefinition = "TEXT")
    private String notes;
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Long getTripId() {
        return tripId;
    }
    
    public void setTripId(Long tripId) {
        this.tripId = tripId;
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
    
    public String getCoordinates() {
        return coordinates;
    }
    
    public void setCoordinates(String coordinates) {
        this.coordinates = coordinates;
    }
    
    public String getNotes() {
        return notes;
    }
    
    public void setNotes(String notes) {
        this.notes = notes;
    }
}
