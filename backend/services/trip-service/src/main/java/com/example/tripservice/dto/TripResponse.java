package com.example.tripservice.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class TripResponse {
    private Long id;
    private String title;
    private String destination;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer participants;
    private BigDecimal budget;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<ItineraryItemDto> itinerary;
    private BudgetSummary budgetSummary;
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getTitle() {
        return title;
    }
    
    public void setTitle(String title) {
        this.title = title;
    }
    
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
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public List<ItineraryItemDto> getItinerary() {
        return itinerary;
    }
    
    public void setItinerary(List<ItineraryItemDto> itinerary) {
        this.itinerary = itinerary;
    }
    
    public BudgetSummary getBudgetSummary() {
        return budgetSummary;
    }
    
    public void setBudgetSummary(BudgetSummary budgetSummary) {
        this.budgetSummary = budgetSummary;
    }
    
    // Inner class for budget summary
    public static class BudgetSummary {
        private BigDecimal totalBudget;
        private BigDecimal estimatedCost;
        private BigDecimal remaining;
        private CategoryBreakdown breakdown;
        
        public BigDecimal getTotalBudget() {
            return totalBudget;
        }
        
        public void setTotalBudget(BigDecimal totalBudget) {
            this.totalBudget = totalBudget;
        }
        
        public BigDecimal getEstimatedCost() {
            return estimatedCost;
        }
        
        public void setEstimatedCost(BigDecimal estimatedCost) {
            this.estimatedCost = estimatedCost;
        }
        
        public BigDecimal getRemaining() {
            return remaining;
        }
        
        public void setRemaining(BigDecimal remaining) {
            this.remaining = remaining;
        }
        
        public CategoryBreakdown getBreakdown() {
            return breakdown;
        }
        
        public void setBreakdown(CategoryBreakdown breakdown) {
            this.breakdown = breakdown;
        }
    }
    
    public static class CategoryBreakdown {
        private BigDecimal transport;
        private BigDecimal accommodation;
        private BigDecimal food;
        private BigDecimal attractions;
        private BigDecimal other;
        
        public BigDecimal getTransport() {
            return transport;
        }
        
        public void setTransport(BigDecimal transport) {
            this.transport = transport;
        }
        
        public BigDecimal getAccommodation() {
            return accommodation;
        }
        
        public void setAccommodation(BigDecimal accommodation) {
            this.accommodation = accommodation;
        }
        
        public BigDecimal getFood() {
            return food;
        }
        
        public void setFood(BigDecimal food) {
            this.food = food;
        }
        
        public BigDecimal getAttractions() {
            return attractions;
        }
        
        public void setAttractions(BigDecimal attractions) {
            this.attractions = attractions;
        }
        
        public BigDecimal getOther() {
            return other;
        }
        
        public void setOther(BigDecimal other) {
            this.other = other;
        }
    }
}
