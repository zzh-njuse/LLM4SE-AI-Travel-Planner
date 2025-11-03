package com.example.tripservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * 高德地图地理编码服务
 * 用于将地址转换为经纬度坐标
 */
@Service
public class AmapGeocodingService {

    private static final Logger logger = LoggerFactory.getLogger(AmapGeocodingService.class);

    @Value("${amap.api.key:}")
    private String apiKey;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public AmapGeocodingService(ObjectMapper objectMapper) {
        this.webClient = WebClient.builder().build();
        this.objectMapper = objectMapper;
    }

    /**
     * 地理编码：将地址转换为坐标
     * 
     * @param address 地址字符串
     * @param city 城市名称(可选,用于提高准确度)
     * @return JSON 格式的坐标 {"lng": xxx, "lat": xxx}，失败返回 null
     */
    public String geocodeAddress(String address, String city) {
        // 如果没有配置 API Key，返回 null
        if (apiKey == null || apiKey.isEmpty()) {
            logger.debug("未配置高德地图 API Key，跳过地理编码");
            return null;
        }

        try {
            // 构建请求参数
            final String queryAddress;
            if (city != null && !city.isEmpty()) {
                queryAddress = city + address;
            } else {
                queryAddress = address;
            }

            logger.debug("正在地理编码: {}", queryAddress);

            // 调用高德地图 API
            String response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .scheme("https")
                            .host("restapi.amap.com")
                            .path("/v3/geocode/geo")
                            .queryParam("key", apiKey)
                            .queryParam("address", queryAddress)
                            .build())
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            // 解析响应
            JsonNode root = objectMapper.readTree(response);
            String status = root.path("status").asText();
            
            if (!"1".equals(status)) {
                logger.warn("地理编码失败: {}", root.path("info").asText());
                return null;
            }

            JsonNode geocodes = root.path("geocodes");
            if (geocodes.isEmpty()) {
                logger.warn("未找到地址: {}", queryAddress);
                return null;
            }

            // 获取第一个结果的坐标
            String location = geocodes.get(0).path("location").asText();
            if (location == null || location.isEmpty()) {
                return null;
            }

            // 解析坐标 "lng,lat"
            String[] parts = location.split(",");
            if (parts.length != 2) {
                return null;
            }

            double lng = Double.parseDouble(parts[0]);
            double lat = Double.parseDouble(parts[1]);

            // 返回 JSON 格式
            String coordinates = String.format("{\"lng\":%.6f,\"lat\":%.6f}", lng, lat);
            logger.debug("地理编码成功: {} -> {}", queryAddress, coordinates);
            
            return coordinates;

        } catch (Exception e) {
            logger.error("地理编码异常: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 地理编码：将地址转换为坐标（不指定城市）
     */
    public String geocodeAddress(String address) {
        return geocodeAddress(address, null);
    }
}
