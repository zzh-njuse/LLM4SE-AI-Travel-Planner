package com.example.tripservice.service;

import com.example.tripservice.dto.CreateTripRequest;
import com.example.tripservice.dto.TripResponse;
import com.example.tripservice.dto.ItineraryItemDto;
import com.example.tripservice.entity.ItineraryItem;
import com.example.tripservice.entity.Trip;
import com.example.tripservice.repository.ItineraryItemRepository;
import com.example.tripservice.repository.TripRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 行程服务
 */
@Service
public class TripService {

    private static final Logger logger = LoggerFactory.getLogger(TripService.class);

    @Autowired
    private TripRepository tripRepository;

    @Autowired
    private ItineraryItemRepository itineraryItemRepository;

    @Autowired
    private QwenService qwenService;

    @Autowired
    private AmapGeocodingService amapGeocodingService;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * 创建并生成行程
     */
    @Transactional
    public TripResponse createAndGenerateTrip(Long userId, CreateTripRequest request) {
        logger.info("开始为用户 {} 创建行程", userId);

        // 1. 创建行程记录（状态：生成中）
        Trip trip = new Trip();
        trip.setUserId(userId);
        trip.setDestination(request.getDestination());
        trip.setStartDate(request.getStartDate());
        trip.setEndDate(request.getEndDate());
        trip.setParticipants(request.getParticipants());
        trip.setBudget(request.getBudget());
        trip.setRawInput(request.getRawInput());
        trip.setStatus("generating");

        // 设置临时标题（AI 生成后会更新）
        trip.setTitle("生成中：" + request.getDestination() + "之旅");

        if (request.getPreferences() != null && !request.getPreferences().isEmpty()) {
            try {
                trip.setPreferences(objectMapper.writeValueAsString(request.getPreferences()));
            } catch (Exception e) {
                logger.warn("偏好设置序列化失败", e);
            }
        }

        trip = tripRepository.save(trip);
        logger.info("行程记录已创建，ID: {}", trip.getId());

        try {
            // 2. 构建提示词
            String prompt = buildPrompt(request);
            logger.info("提示词构建完成，开始调用 AI 生成行程");

            // 3. 调用 AI 生成行程
            String generatedJson = qwenService.generateTripPlan(prompt);
            logger.info("AI 生成完成，开始解析结果");

            // 4. 解析生成结果
            JsonNode resultNode = objectMapper.readTree(generatedJson);

            // 更新标题
            String title = resultNode.path("title").asText();
            if (title != null && !title.isEmpty()) {
                trip.setTitle(title);
            }

            // 5. 保存行程项
            List<ItineraryItem> items = new ArrayList<>();
            JsonNode daysNode = resultNode.path("days");

            for (JsonNode dayNode : daysNode) {
                int dayIndex = dayNode.path("dayIndex").asInt();
                JsonNode itemsNode = dayNode.path("items");

                for (JsonNode itemNode : itemsNode) {
                    ItineraryItem item = new ItineraryItem();
                    item.setTripId(trip.getId());
                    item.setDayIndex(dayIndex);

                    // 解析时间
                    String startTimeStr = itemNode.path("startTime").asText();
                    String endTimeStr = itemNode.path("endTime").asText();
                    item.setStartTime(java.time.LocalTime.parse(startTimeStr));
                    item.setEndTime(java.time.LocalTime.parse(endTimeStr));

                    item.setTitle(itemNode.path("title").asText());
                    item.setType(itemNode.path("type").asText().toLowerCase());
                    item.setLocation(itemNode.path("location").asText());
                    item.setDescription(itemNode.path("description").asText());
                    item.setEstimatedCost(BigDecimal.valueOf(
                            itemNode.path("estimatedCost").asDouble()));

                    if (itemNode.has("notes")) {
                        item.setNotes(itemNode.path("notes").asText());
                    }

                    // 自动获取地理坐标
                    String location = item.getLocation();
                    if (location != null && !location.isEmpty()) {
                        String coordinates = amapGeocodingService.geocodeAddress(location, trip.getDestination());
                        if (coordinates != null) {
                            item.setCoordinates(coordinates);
                            logger.debug("已获取坐标: {} -> {}", location, coordinates);
                        }
                    }

                    items.add(item);
                }
            }

            itineraryItemRepository.saveAll(items);
            logger.info("已保存 {} 个行程项", items.size());

            // 6. 更新行程状态和预算信息
            JsonNode budgetNode = resultNode.path("budgetBreakdown");
            BigDecimal estimatedCost = BigDecimal.valueOf(
                    budgetNode.path("transport").asDouble() +
                            budgetNode.path("accommodation").asDouble() +
                            budgetNode.path("food").asDouble() +
                            budgetNode.path("attractions").asDouble() +
                            budgetNode.path("other").asDouble());

            trip.setStatus("generated");
            trip = tripRepository.save(trip);

            logger.info("行程生成完成，总预算: {}, 预估费用: {}", trip.getBudget(), estimatedCost);

            // 7. 构建响应
            return buildTripResponse(trip, items, budgetNode);

        } catch (Exception e) {
            logger.error("行程生成失败", e);
            trip.setStatus("draft");
            tripRepository.save(trip);
            throw new RuntimeException("行程生成失败：" + e.getMessage(), e);
        }
    }

    /**
     * 获取用户的所有行程
     */
    public List<TripResponse> getUserTrips(Long userId) {
        List<Trip> trips = tripRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<TripResponse> responses = new ArrayList<>();

        for (Trip trip : trips) {
            List<ItineraryItem> items = itineraryItemRepository
                    .findByTripIdOrderByDayIndexAscStartTimeAsc(trip.getId());

            // 计算预算信息
            BigDecimal totalCost = items.stream()
                    .map(ItineraryItem::getEstimatedCost)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            responses.add(buildSimpleTripResponse(trip, totalCost));
        }

        return responses;
    }

    /**
     * 获取行程详情
     */
    public TripResponse getTripDetail(Long tripId, Long userId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("行程不存在"));

        if (!trip.getUserId().equals(userId)) {
            throw new RuntimeException("无权访问此行程");
        }

        List<ItineraryItem> items = itineraryItemRepository
                .findByTripIdOrderByDayIndexAscStartTimeAsc(tripId);

        return buildDetailedTripResponse(trip, items);
    }

    /**
     * 删除行程
     */
    @Transactional
    public void deleteTrip(Long tripId, Long userId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("行程不存在"));

        if (!trip.getUserId().equals(userId)) {
            throw new RuntimeException("无权删除此行程");
        }

        itineraryItemRepository.deleteByTripId(tripId);
        tripRepository.delete(trip);
        logger.info("已删除行程 {}", tripId);
    }

    /**
     * 更新行程信息
     */
    @Transactional
    public TripResponse updateTrip(Long tripId, Long userId, TripResponse updateData) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("行程不存在"));

        if (!trip.getUserId().equals(userId)) {
            throw new RuntimeException("无权修改此行程");
        }

        // 更新基本信息
        if (updateData.getTitle() != null) {
            trip.setTitle(updateData.getTitle());
        }
        if (updateData.getDestination() != null) {
            trip.setDestination(updateData.getDestination());
        }
        if (updateData.getBudgetSummary() != null && updateData.getBudgetSummary().getTotalBudget() != null) {
            BigDecimal totalBudget = updateData.getBudgetSummary().getTotalBudget();
            trip.setBudget(totalBudget);
        }

        trip = tripRepository.save(trip);
        logger.info("已更新行程 {}", tripId);

        return getTripDetail(tripId, userId);
    }

    /**
     * 更新行程项
     */
    @Transactional
    public TripResponse updateItineraryItem(Long tripId, Long userId, int itemIndex,
            java.util.Map<String, Object> updateData) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("行程不存在"));

        if (!trip.getUserId().equals(userId)) {
            throw new RuntimeException("无权修改此行程");
        }

        List<ItineraryItem> items = itineraryItemRepository.findByTripIdOrderByDayIndexAscStartTimeAsc(tripId);

        if (itemIndex < 0 || itemIndex >= items.size()) {
            throw new RuntimeException("行程项索引无效");
        }

        ItineraryItem item = items.get(itemIndex);

        // 更新字段
        if (updateData.containsKey("title")) {
            item.setTitle((String) updateData.get("title"));
        }
        if (updateData.containsKey("location")) {
            item.setLocation((String) updateData.get("location"));
        }
        if (updateData.containsKey("description")) {
            item.setDescription((String) updateData.get("description"));
        }
        if (updateData.containsKey("startTime")) {
            String timeStr = (String) updateData.get("startTime");
            item.setStartTime(java.time.LocalTime.parse(timeStr));
        }
        if (updateData.containsKey("endTime")) {
            String timeStr = (String) updateData.get("endTime");
            item.setEndTime(java.time.LocalTime.parse(timeStr));
        }
        if (updateData.containsKey("estimatedCost")) {
            Object cost = updateData.get("estimatedCost");
            if (cost instanceof Number) {
                item.setEstimatedCost(BigDecimal.valueOf(((Number) cost).doubleValue()));
            }
        }
        if (updateData.containsKey("notes")) {
            item.setNotes((String) updateData.get("notes"));
        }

        itineraryItemRepository.save(item);
        logger.info("已更新行程项: tripId={}, itemIndex={}", tripId, itemIndex);

        return getTripDetail(tripId, userId);
    }

    /**
     * 删除行程项
     */
    @Transactional
    public TripResponse deleteItineraryItem(Long tripId, Long userId, int itemIndex) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("行程不存在"));

        if (!trip.getUserId().equals(userId)) {
            throw new RuntimeException("无权修改此行程");
        }

        List<ItineraryItem> items = itineraryItemRepository.findByTripIdOrderByDayIndexAscStartTimeAsc(tripId);

        if (itemIndex < 0 || itemIndex >= items.size()) {
            throw new RuntimeException("行程项索引无效");
        }

        ItineraryItem itemToDelete = items.get(itemIndex);
        itineraryItemRepository.delete(itemToDelete);
        logger.info("已删除行程项: tripId={}, itemIndex={}", tripId, itemIndex);

        return getTripDetail(tripId, userId);
    }

    /**
     * 添加行程项
     */
    @Transactional
    public TripResponse addItineraryItem(Long tripId, Long userId, Map<String, Object> itemData) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("行程不存在"));

        if (!trip.getUserId().equals(userId)) {
            throw new RuntimeException("无权修改此行程");
        }

        ItineraryItem newItem = new ItineraryItem();
        newItem.setTripId(tripId);
        newItem.setDayIndex(((Number) itemData.get("dayIndex")).intValue());

        // 处理时间 - 从字符串转换为 LocalTime
        String startTimeStr = (String) itemData.get("startTime");
        if (startTimeStr != null && !startTimeStr.isEmpty()) {
            newItem.setStartTime(LocalTime.parse(startTimeStr));
        }

        String endTimeStr = (String) itemData.get("endTime");
        if (endTimeStr != null && !endTimeStr.isEmpty()) {
            newItem.setEndTime(LocalTime.parse(endTimeStr));
        }

        newItem.setTitle((String) itemData.get("title"));
        newItem.setType((String) itemData.get("type"));
        newItem.setLocation((String) itemData.get("location"));
        newItem.setDescription((String) itemData.getOrDefault("description", ""));
        newItem.setNotes((String) itemData.getOrDefault("notes", ""));

        // 处理成本
        Object estimatedCostObj = itemData.get("estimatedCost");
        if (estimatedCostObj != null) {
            newItem.setEstimatedCost(new BigDecimal(estimatedCostObj.toString()));
        } else {
            newItem.setEstimatedCost(BigDecimal.ZERO);
        }

        // 处理坐标（如果用户提供了地址，则进行地理编码）
        String location = (String) itemData.get("location");
        if (location != null && !location.isEmpty()) {
            try {
                String coordinatesJson = amapGeocodingService.geocodeAddress(location);
                if (coordinatesJson != null) {
                    newItem.setCoordinates(coordinatesJson);
                    logger.info("地址 '{}' 地理编码成功: {}", location, coordinatesJson);
                }
            } catch (Exception e) {
                logger.warn("地址 '{}' 地理编码失败: {}", location, e.getMessage());
            }
        }

        itineraryItemRepository.save(newItem);
        logger.info("已添加行程项: tripId={}, dayIndex={}, title={}",
                tripId, newItem.getDayIndex(), newItem.getTitle());

        return getTripDetail(tripId, userId);
    }

    // ==================== 私有辅助方法 ====================

    private String buildPrompt(CreateTripRequest request) {
        StringBuilder prompt = new StringBuilder();

        if (request.getRawInput() != null && !request.getRawInput().isEmpty()) {
            prompt.append(request.getRawInput()).append("\n\n");
        }

        prompt.append("目的地：").append(request.getDestination()).append("\n");
        prompt.append("出发日期：").append(request.getStartDate()).append("\n");
        prompt.append("返回日期：").append(request.getEndDate()).append("\n");
        prompt.append("人数：").append(request.getParticipants()).append(" 人\n");
        prompt.append("预算：").append(request.getBudget()).append(" 元\n");

        if (request.getPreferences() != null && !request.getPreferences().isEmpty()) {
            prompt.append("偏好：").append(request.getPreferences()).append("\n");
        }

        return prompt.toString();
    }

    private TripResponse buildTripResponse(Trip trip, List<ItineraryItem> items, JsonNode budgetNode) {
        TripResponse response = new TripResponse();
        response.setId(trip.getId());
        response.setTitle(trip.getTitle());
        response.setDestination(trip.getDestination());
        response.setStartDate(trip.getStartDate());
        response.setEndDate(trip.getEndDate());
        response.setParticipants(trip.getParticipants());
        response.setStatus(trip.getStatus());
        response.setCreatedAt(trip.getCreatedAt());

        // 预算摘要
        TripResponse.BudgetSummary budget = new TripResponse.BudgetSummary();
        BigDecimal totalCost = items.stream()
                .map(ItineraryItem::getEstimatedCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        budget.setTotalBudget(trip.getBudget());
        budget.setEstimatedCost(totalCost);
        budget.setRemaining(trip.getBudget().subtract(totalCost));

        // 分类预算
        TripResponse.CategoryBreakdown breakdown = new TripResponse.CategoryBreakdown();
        breakdown.setTransport(BigDecimal.valueOf(budgetNode.path("transport").asDouble()));
        breakdown.setAccommodation(BigDecimal.valueOf(budgetNode.path("accommodation").asDouble()));
        breakdown.setFood(BigDecimal.valueOf(budgetNode.path("food").asDouble()));
        breakdown.setAttractions(BigDecimal.valueOf(budgetNode.path("attractions").asDouble()));
        breakdown.setOther(BigDecimal.valueOf(budgetNode.path("other").asDouble()));
        budget.setBreakdown(breakdown);

        response.setBudgetSummary(budget);

        // 行程项
        List<ItineraryItemDto> itemDtos = new ArrayList<>();
        for (ItineraryItem item : items) {
            itemDtos.add(toDto(item));
        }
        response.setItinerary(itemDtos);

        return response;
    }

    private TripResponse buildSimpleTripResponse(Trip trip, BigDecimal totalCost) {
        TripResponse response = new TripResponse();
        response.setId(trip.getId());
        response.setTitle(trip.getTitle());
        response.setDestination(trip.getDestination());
        response.setStartDate(trip.getStartDate());
        response.setEndDate(trip.getEndDate());
        response.setParticipants(trip.getParticipants());
        response.setStatus(trip.getStatus());
        response.setCreatedAt(trip.getCreatedAt());

        TripResponse.BudgetSummary budget = new TripResponse.BudgetSummary();
        budget.setTotalBudget(trip.getBudget());
        budget.setEstimatedCost(totalCost);
        budget.setRemaining(trip.getBudget().subtract(totalCost));
        response.setBudgetSummary(budget);

        return response;
    }

    private TripResponse buildDetailedTripResponse(Trip trip, List<ItineraryItem> items) {
        TripResponse response = new TripResponse();
        response.setId(trip.getId());
        response.setTitle(trip.getTitle());
        response.setDestination(trip.getDestination());
        response.setStartDate(trip.getStartDate());
        response.setEndDate(trip.getEndDate());
        response.setParticipants(trip.getParticipants());
        response.setStatus(trip.getStatus());
        response.setCreatedAt(trip.getCreatedAt());

        // 计算预算
        BigDecimal totalCost = items.stream()
                .map(ItineraryItem::getEstimatedCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        TripResponse.BudgetSummary budget = new TripResponse.BudgetSummary();
        budget.setTotalBudget(trip.getBudget());
        budget.setEstimatedCost(totalCost);
        budget.setRemaining(trip.getBudget().subtract(totalCost));

        // 分类统计
        TripResponse.CategoryBreakdown breakdown = new TripResponse.CategoryBreakdown();
        breakdown.setTransport(calculateCategoryTotal(items, "transport"));
        breakdown.setAccommodation(calculateCategoryTotal(items, "hotel"));
        breakdown.setFood(calculateCategoryTotal(items, "restaurant"));
        breakdown.setAttractions(calculateCategoryTotal(items, "attraction"));
        breakdown.setOther(calculateCategoryTotal(items, "other"));
        budget.setBreakdown(breakdown);

        response.setBudgetSummary(budget);

        List<ItineraryItemDto> itemDtos = new ArrayList<>();
        for (ItineraryItem item : items) {
            itemDtos.add(toDto(item));
        }
        response.setItinerary(itemDtos);

        return response;
    }

    private BigDecimal calculateCategoryTotal(List<ItineraryItem> items, String type) {
        return items.stream()
                .filter(item -> type.equals(item.getType()))
                .map(ItineraryItem::getEstimatedCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private ItineraryItemDto toDto(ItineraryItem item) {
        ItineraryItemDto dto = new ItineraryItemDto();
        dto.setId(item.getId());
        dto.setDayIndex(item.getDayIndex());
        dto.setStartTime(item.getStartTime());
        dto.setEndTime(item.getEndTime());
        dto.setTitle(item.getTitle());
        dto.setType(item.getType());
        dto.setLocation(item.getLocation());
        dto.setDescription(item.getDescription());
        dto.setEstimatedCost(item.getEstimatedCost());
        dto.setNotes(item.getNotes());

        // 解析坐标 JSON 字符串
        if (item.getCoordinates() != null && !item.getCoordinates().isEmpty()) {
            try {
                // 简单的 JSON 解析: {"lng":xxx,"lat":xxx}
                String coordStr = item.getCoordinates();
                coordStr = coordStr.replace("{", "").replace("}", "").replace("\"", "");
                String[] parts = coordStr.split(",");

                Double lng = null;
                Double lat = null;

                for (String part : parts) {
                    String[] kv = part.split(":");
                    if (kv.length == 2) {
                        String key = kv[0].trim();
                        Double value = Double.parseDouble(kv[1].trim());
                        if ("lng".equals(key)) {
                            lng = value;
                        } else if ("lat".equals(key)) {
                            lat = value;
                        }
                    }
                }

                if (lng != null && lat != null) {
                    dto.setCoordinates(new ItineraryItemDto.Coordinates(lng, lat));
                }
            } catch (Exception e) {
                // 解析失败时忽略坐标
                System.err.println("Failed to parse coordinates: " + item.getCoordinates());
            }
        }

        return dto;
    }
}
