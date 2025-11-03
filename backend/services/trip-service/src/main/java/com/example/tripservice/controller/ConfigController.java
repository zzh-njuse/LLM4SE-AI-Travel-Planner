package com.example.tripservice.controller;

import com.example.tripservice.config.XFYunConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 配置控制器 - 提供前端所需的 API 配置
 */
@RestController
public class ConfigController {

    @Autowired
    private XFYunConfig xfyunConfig;

    /**
     * 获取科大讯飞语音识别配置
     * 供前端初始化语音识别使用
     */
    @GetMapping("/api/v1/config/xfyun")
    public ResponseEntity<?> getXFYunConfig() {
        return ResponseEntity.ok(Map.of(
            "appId", xfyunConfig.getAppid() != null ? xfyunConfig.getAppid() : "",
            "apiKey", xfyunConfig.getApikey() != null ? xfyunConfig.getApikey() : "",
            "apiSecret", xfyunConfig.getApisecret() != null ? xfyunConfig.getApisecret() : ""
        ));
    }
}
