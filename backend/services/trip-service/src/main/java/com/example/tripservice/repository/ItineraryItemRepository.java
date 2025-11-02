package com.example.tripservice.repository;

import com.example.tripservice.entity.ItineraryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ItineraryItemRepository extends JpaRepository<ItineraryItem, Long> {
    List<ItineraryItem> findByTripIdOrderByDayIndexAscStartTimeAsc(Long tripId);
    void deleteByTripId(Long tripId);
}
