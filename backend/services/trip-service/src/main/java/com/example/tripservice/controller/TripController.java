package com.example.tripservice.controller;

import com.example.tripservice.dto.CreateTripRequest;
import com.example.tripservice.dto.TripResponse;
import com.example.tripservice.service.TripService;
import com.example.tripservice.util.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 行程管理控制器
 */
@RestController
public class TripController {

    private static final Logger logger = LoggerFactory.getLogger(TripController.class);

    @Autowired
    private TripService tripService;

    @Autowired
    private JwtUtil jwtUtil;

    /**
     * 健康检查
     */
    @GetMapping("/api/v1/health")
    public Map<String,String> health() {
        return Map.of("status","ok","service","trip-service");
    }

    /**
     * 创建并生成行程
     */
    @PostMapping("/api/v1/trips")
    public ResponseEntity<?> createTrip(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody CreateTripRequest request) {
        try {
            logger.info("收到创建行程请求: destination={}, startDate={}, endDate={}", 
                request.getDestination(), request.getStartDate(), request.getEndDate());
            
            // 检查 Authorization header
            if (authHeader == null || authHeader.isEmpty()) {
                logger.warn("缺少 Authorization header");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "缺少访问令牌"));
            }

            // 验证 JWT 并获取用户 ID
            String token = authHeader.replace("Bearer ", "");
            if (!jwtUtil.validateToken(token)) {
                logger.warn("无效的 JWT token");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "无效的访问令牌"));
            }

            Long userId = jwtUtil.getUserIdFromToken(token);
            logger.info("用户 {} 创建行程", userId);
            
            // 调用服务生成行程
            TripResponse response = tripService.createAndGenerateTrip(userId, request);
            
            logger.info("行程创建成功: tripId={}", response.getId());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("创建行程失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "创建行程失败：" + e.getMessage()));
        }
    }

    /**
     * 获取用户的所有行程
     */
    @GetMapping("/api/v1/trips")
    public ResponseEntity<?> getUserTrips(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            if (authHeader == null || authHeader.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "缺少访问令牌"));
            }

            String token = authHeader.replace("Bearer ", "");
            if (!jwtUtil.validateToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "无效的访问令牌"));
            }

            Long userId = jwtUtil.getUserIdFromToken(token);
            
            List<TripResponse> trips = tripService.getUserTrips(userId);
            
            return ResponseEntity.ok(trips);
            
        } catch (Exception e) {
            logger.error("获取行程列表失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "获取行程列表失败：" + e.getMessage()));
        }
    }

    /**
     * 获取行程详情
     */
    @GetMapping("/api/v1/trips/{id}")
    public ResponseEntity<?> getTripDetail(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {
        try {
            if (authHeader == null || authHeader.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "缺少访问令牌"));
            }

            String token = authHeader.replace("Bearer ", "");
            if (!jwtUtil.validateToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "无效的访问令牌"));
            }

            Long userId = jwtUtil.getUserIdFromToken(token);
            
            TripResponse trip = tripService.getTripDetail(id, userId);
            
            return ResponseEntity.ok(trip);
            
        } catch (RuntimeException e) {
            logger.error("获取行程详情失败", e);
            if (e.getMessage().contains("不存在")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
            } else if (e.getMessage().contains("无权")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "获取行程详情失败：" + e.getMessage()));
        }
    }

    /**
     * 删除行程
     */
    @DeleteMapping("/api/v1/trips/{id}")
    public ResponseEntity<?> deleteTrip(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {
        try {
            if (authHeader == null || authHeader.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "缺少访问令牌"));
            }

            String token = authHeader.replace("Bearer ", "");
            if (!jwtUtil.validateToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "无效的访问令牌"));
            }

            Long userId = jwtUtil.getUserIdFromToken(token);
            
            tripService.deleteTrip(id, userId);
            
            return ResponseEntity.ok().build();
            
        } catch (RuntimeException e) {
            logger.error("删除行程失败", e);
            if (e.getMessage().contains("不存在")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
            } else if (e.getMessage().contains("无权")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "删除行程失败：" + e.getMessage()));
        }
    }

    /**
     * 更新行程信息
     */
    @PutMapping("/api/v1/trips/{id}")
    public ResponseEntity<?> updateTrip(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id,
            @RequestBody TripResponse updateData) {
        try {
            if (authHeader == null || authHeader.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "缺少访问令牌"));
            }

            String token = authHeader.replace("Bearer ", "");
            if (!jwtUtil.validateToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "无效的访问令牌"));
            }

            Long userId = jwtUtil.getUserIdFromToken(token);
            
            TripResponse updated = tripService.updateTrip(id, userId, updateData);
            
            return ResponseEntity.ok(updated);
            
        } catch (RuntimeException e) {
            logger.error("更新行程失败", e);
            if (e.getMessage().contains("不存在")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
            } else if (e.getMessage().contains("无权")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "更新行程失败：" + e.getMessage()));
        }
    }

    /**
     * 更新行程项
     */
    @PutMapping("/api/v1/trips/{id}/itinerary/{itemIndex}")
    public ResponseEntity<?> updateItineraryItem(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id,
            @PathVariable int itemIndex,
            @RequestBody Map<String, Object> updateData) {
        try {
            if (authHeader == null || authHeader.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "缺少访问令牌"));
            }

            String token = authHeader.replace("Bearer ", "");
            if (!jwtUtil.validateToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "无效的访问令牌"));
            }

            Long userId = jwtUtil.getUserIdFromToken(token);
            
            TripResponse updated = tripService.updateItineraryItem(id, userId, itemIndex, updateData);
            
            return ResponseEntity.ok(updated);
            
        } catch (RuntimeException e) {
            logger.error("更新行程项失败", e);
            if (e.getMessage().contains("不存在") || e.getMessage().contains("索引")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
            } else if (e.getMessage().contains("无权")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "更新行程项失败：" + e.getMessage()));
        }
    }

    /**
     * 删除行程项
     */
    @DeleteMapping("/api/v1/trips/{id}/itinerary/{itemIndex}")
    public ResponseEntity<?> deleteItineraryItem(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id,
            @PathVariable int itemIndex) {
        try {
            if (authHeader == null || authHeader.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "缺少访问令牌"));
            }

            String token = authHeader.replace("Bearer ", "");
            if (!jwtUtil.validateToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "无效的访问令牌"));
            }

            Long userId = jwtUtil.getUserIdFromToken(token);
            
            TripResponse updated = tripService.deleteItineraryItem(id, userId, itemIndex);
            
            return ResponseEntity.ok(updated);
            
        } catch (RuntimeException e) {
            logger.error("删除行程项失败", e);
            if (e.getMessage().contains("不存在") || e.getMessage().contains("索引")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
            } else if (e.getMessage().contains("无权")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "删除行程项失败：" + e.getMessage()));
        }
    }
}
