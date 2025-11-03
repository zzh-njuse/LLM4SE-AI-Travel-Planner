# 多阶段构建 - 构建阶段
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app

# 复制 pom.xml 并下载依赖(利用 Docker 缓存)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# 复制源代码
COPY src ./src

# 构建应用(跳过测试以加快构建速度)
RUN mvn clean package -DskipTests

# 运行阶段 - 使用更小的基础镜像
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# 复制构建产物
COPY --from=builder /app/target/*.jar app.jar

# 创建非 root 用户运行应用
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# 暴露端口
EXPOSE 8081

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8081/api/v1/health || exit 1

# 启动应用
# 支持通过环境变量覆盖配置
ENTRYPOINT ["java", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-jar", "app.jar"]
