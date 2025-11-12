# 高德地图 API 速率限制修复

## 问题描述
在创建行程时，系统会批量调用高德地图地理编码 API 为多个行程项获取坐标。在 0.6 秒内发送了 5 个请求，超过了高德 API 的 **3次/秒** 并发限制，导致请求失败。

## 解决方案
在后端和前端都实现了请求速率限制机制，确保每个地理编码请求之间都有足够的延迟。

### 实现原理
- **高德 API 限制**: 3 次/秒
- **安全限制**: 2.5 次/秒（为了留有余量）
- **请求延迟**: 400ms（1000ms ÷ 2.5 = 400ms）

这样可以确保在任何情况下都不会超过高德 API 的并发限制。

## 修改文件

### 1. 后端修改：`AmapGeocodingService.java`
**位置**: `backend/services/trip-service/src/main/java/com/example/tripservice/service/AmapGeocodingService.java`

**改进**:
- 添加了 `REQUEST_DELAY_MS` 常量（400ms）
- 添加了 `lastRequestTime` 静态变量记录上次请求时间
- 实现了 `rateLimitWait()` 方法，使用 synchronized 块确保线程安全
- 在 `geocodeAddress()` 方法调用 API 前调用 `rateLimitWait()`

**关键代码**:
```java
private static final long REQUEST_DELAY_MS = 400;
private static long lastRequestTime = 0;

private void rateLimitWait() {
    synchronized (AmapGeocodingService.class) {
        long now = System.currentTimeMillis();
        long timeSinceLastRequest = now - lastRequestTime;
        
        if (timeSinceLastRequest < REQUEST_DELAY_MS) {
            long sleepTime = REQUEST_DELAY_MS - timeSinceLastRequest;
            try {
                logger.debug("等待 {}ms 以满足速率限制", sleepTime);
                Thread.sleep(sleepTime);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                logger.warn("速率限制等待被中断");
            }
        }
        
        lastRequestTime = System.currentTimeMillis();
    }
}
```

### 2. 前端修改：`amap.ts`
**位置**: `frontend/src/services/amap.ts`

**改进**:
- 添加了 `REQUEST_DELAY_MS` 常量（400ms）
- 添加了 `lastRequestTime` 变量记录上次请求时间
- 实现了 `rateLimitWait()` 异步方法
- 在 `geocodeAddress()` 和 `reverseGeocode()` 方法中调用 `rateLimitWait()`

**关键代码**:
```typescript
const REQUEST_DELAY_MS = 400;
let lastRequestTime = 0;

async function rateLimitWait(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < REQUEST_DELAY_MS) {
    const sleepTime = REQUEST_DELAY_MS - timeSinceLastRequest;
    console.debug(`等待 ${sleepTime}ms 以满足高德 API 速率限制`);
    await new Promise(resolve => setTimeout(resolve, sleepTime));
  }
  
  lastRequestTime = Date.now();
}
```

## 效果

### 修改前
- 5 个请求在 0.6 秒内发送
- 请求速率: ~8.3 次/秒 ❌ 超过限制

### 修改后
- 相同的 5 个请求将在 2 秒内发送
- 请求速率: 2.5 次/秒 ✅ 符合限制

## 批量操作性能影响

对于创建行程时的批量地理编码请求：

| 请求数 | 修改前用时 | 修改后用时 | 备注 |
|--------|----------|----------|------|
| 5 个 | 0.6 秒 ❌ | 2 秒 | 超过限制 → 符合限制 |
| 10 个 | 1.2 秒 ❌ | 4 秒 | 超过限制 → 符合限制 |
| 20 个 | 2.4 秒 ❌ | 8 秒 | 超过限制 → 符合限制 |

虽然总时间增加，但这是必要的权衡，保证了服务的稳定性和可靠性。

## 后续优化建议

1. **缓存坐标**: 对于频繁查询的地址，可以在数据库中缓存坐标结果
2. **批量 API**: 考虑使用高德地图的批量地理编码 API（如果提供）
3. **异步处理**: 在后端使用异步队列处理地理编码请求
4. **离线坐标**: 预先配置常见景点和地点的坐标

