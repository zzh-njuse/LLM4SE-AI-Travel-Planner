package com.example.tripservice.service;

import com.example.tripservice.config.QwenConfig;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.HashMap;
import java.util.Map;

/**
 * 阿里云通义千问 API 服务
 */
@Service
public class QwenService {

    private static final Logger logger = LoggerFactory.getLogger(QwenService.class);

    @Autowired
    private WebClient qwenWebClient;

    @Autowired
    private QwenConfig qwenConfig;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * 调用通义千问生成行程规划
     * 
     * @param prompt 用户输入的行程需求
     * @return 生成的行程 JSON 字符串
     */
    public String generateTripPlan(String prompt) {
        try {
            // 构建请求体
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", qwenConfig.getModel());
            
            Map<String, Object> input = new HashMap<>();
            
            // 系统提示词 + 用户输入
            String systemPrompt = buildSystemPrompt();
            String fullPrompt = systemPrompt + "\n\n用户需求：\n" + prompt;
            
            input.put("prompt", fullPrompt);
            requestBody.put("input", input);
            
            // 参数配置
            Map<String, Object> parameters = new HashMap<>();
            parameters.put("result_format", "message");
            parameters.put("max_tokens", 6000);  // 增加 token 限制,支持更长的行程规划
            parameters.put("temperature", 0.7);
            parameters.put("top_p", 0.8);
            requestBody.put("parameters", parameters);

            logger.info("调用通义千问 API，模型：{}", qwenConfig.getModel());

            // 调用 API
            String response = qwenWebClient.post()
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            logger.info("通义千问响应成功");

            // 解析响应,提取生成的文本
            JsonNode responseNode = objectMapper.readTree(response);
            String generatedText = responseNode
                    .path("output")
                    .path("choices")
                    .get(0)
                    .path("message")
                    .path("content")
                    .asText();

            logger.info("生成的文本长度: {} 字符", generatedText.length());
            logger.debug("生成的 JSON 内容: {}", generatedText);
            
            // 验证 JSON 是否完整
            if (!generatedText.trim().endsWith("}")) {
                logger.warn("警告: 生成的 JSON 可能不完整,未以 } 结尾");
            }

            return generatedText;

        } catch (Exception e) {
            logger.error("调用通义千问 API 失败", e);
            throw new RuntimeException("AI 行程生成失败：" + e.getMessage(), e);
        }
    }

    /**
     * 构建系统提示词
     */
    private String buildSystemPrompt() {
        return """
                你是一个专业的旅行规划助手。请根据用户的需求生成详细的旅行行程规划。
                
                要求：
                1. 必须返回严格的 JSON 格式,不要有任何额外的文字说明或markdown标记
                2. JSON 必须完整,确保所有括号正确闭合
                3. JSON 结构如下：
                {
                  "title": "行程标题",
                  "destination": "目的地",
                  "days": [
                    {
                      "dayIndex": 1,
                      "items": [
                        {
                          "startTime": "09:00",
                          "endTime": "11:00",
                          "title": "景点名称",
                          "type": "attraction",
                          "location": "具体地址",
                          "description": "简短描述(50字以内)",
                          "estimatedCost": 100.0,
                          "notes": "简短提示(30字以内)"
                        }
                      ]
                    }
                  ],
                  "budgetBreakdown": {
                    "transport": 1000.0,
                    "accommodation": 2000.0,
                    "food": 1500.0,
                    "attractions": 800.0,
                    "other": 200.0
                  }
                }
                
                4. type 只能是以下值之一：attraction（景点）、restaurant（餐厅）、hotel（住宿）、transport（交通）、other（其他）
                5. 时间格式为 HH:mm（24小时制）
                6. 费用单位为人民币（元）
                7. 根据用户的预算合理安排行程,确保总费用不超过预算
                8. 每天安排 3-5 个活动,时间合理分配
                9. description 和 notes 要简洁,避免过长文字
                10. 确保 JSON 完整,所有字段必须正确闭合
                """;
    }
}
