# 代码结构与整体说明 — AI 旅行规划师（Web）

文档目的：基于仓库中的 `REQS.md`，给出一份清晰、可执行的代码结构设计与总体说明，便于团队开始实现（包括前端、后端、第三方集成、部署与测试）。

## 1. 简短契约（Contract）
- 输入：用户通过语音或文字提交的旅行请求（目的地、日期、预算、人数、偏好）；用户在设置中提供的第三方 API keys（或后端使用共享 key）。
- 输出：结构化行程（按日/时段划分）、预算分解、地图视图与可保存的行程数据。
- 错误模式：API 调用失败、网络/鉴权错误、LLM 超时或生成不满足约束。系统应提供可理解错误与回退策略（文本输入、简化生成规则）。

## 2. 高层架构（概述）
- 前端：响应式单页应用（React + TypeScript）。负责 UI、语音录入与转写展示、与后端的 REST API 通信、地图显示与本地缓存。
- 后端：采用双栈后端：
  - Node.js (TypeScript) 作为 API Gateway（或 BFF），负责对外 REST 接口、鉴权、会话管理、以及将请求路由到后端业务服务；
  - Java（Spring Boot）负责核心业务服务（行程生成、预算计算、与第三方 LLM/地图/语音服务的稳定集成）。所有后端服务通过 REST API 相互通信。
- 数据存储：Supabase（基于 Postgres），用于存储用户、行程、费用记录与鉴权（Supabase Auth 可选）；Supabase 也提供对象存储与实时订阅功能。
- 第三方：LLM（OpenAI/Azure/Anthropic）、语音识别（科大讯飞或云厂商）、地图（高德/百度）。所有敏感 key 由后端服务管理/注入，前端不直接保存。
- 部署：各服务容器化（Node Gateway + Java 服务 + Supabase 托管/自建 Postgres），CI 使用 GitHub Actions 构建镜像并部署。移除外部缓存/队列（如 Redis/BullMQ）的可选项，采用 Java 服务内部的轻量调度或 Supabase 的功能替代。

## 3. 技术选型建议（参考）
- 前端：React + Vite + TypeScript、React Query、组件库（如 Ant Design / MUI 可选）、Leaflet / 高德 SDK 用于地图展示。
- 后端 Gateway：Node.js + TypeScript（NestJS 或 Express）负责 REST API、鉴权中间件与对外流量限流。
- 后端 业务服务：Java + Spring Boot（Spring Web、Spring Data JPA），负责行程合成、复杂业务逻辑、与第三方 API 的可靠集成。
- 数据访问：Supabase（Postgres）；在 Node 层可使用 `@supabase/supabase-js` 或直接通过 REST/GraphQL；在 Java 层使用 PostgreSQL JDBC + Spring Data JPA。Prisma 可作为 Node 层的 ORM（如果 prefer Prisma，也可以继续用 Prisma 操作 Supabase 的 Postgres）。
- Auth：优先使用 Supabase Auth（简化实现）；若需要更多自定义可在 Node Gateway 中实现 JWT 验证并与 Supabase 用户表同步。
- LLM 客户端：由 Java 服务负责对接 LLM（可选 Node 层代理轻量请求），所有第三方 key 存放在后端环境变量或机密管理中。
- CI/CD：GitHub Actions（build、lint、test、docker build/push），构建与推送 Node 与 Java 镜像。

## 4. 当前项目文件树（已实现部分）

```
/ (repo root)
├── README.md                      # 项目说明与运行指南
├── CODE_STRUCTURE.md              # 本文件：架构与代码组织说明
├── REQS.md                        # 需求规格文档
├── .gitignore                     # Git 忽略规则
│
├── infra/                         # 基础设施与部署配置
│   ├── docker-compose.dev.yml     # 本地开发环境 Docker Compose（postgres, gateway, trip-service）
│   └── init.sql                   # 数据库初始化脚本
│
├── frontend/                      # React 前端应用
│   ├── package.json               # npm 依赖（react, vite, typescript）
│   ├── vite.config.ts             # Vite 构建配置
│   ├── tsconfig.json              # TypeScript 配置
│   ├── Dockerfile                 # 前端容器化配置
│   ├── index.html                 # 应用入口 HTML
│   ├── README.md                  # 前端说明文档
│   └── src/
│       ├── main.tsx               # React 入口文件
│       ├── App.tsx                # 主应用组件（路由、用户状态管理）
│       ├── styles.css             # 全局样式（包含登录/注册表单样式）
│       ├── vite-env.d.ts          # Vite 环境变量类型定义
│       ├── components/
│       │   └── VoiceRecorder.tsx  # 语音录制组件（待实现）
│       ├── pages/
│       │   ├── Login.tsx          # ✅ 登录页面
│       │   └── Register.tsx       # ✅ 注册页面
│       └── services/
│           └── auth.ts            # ✅ 认证 API 服务（register, login, token 存储）
│
├── backend/
│   ├── gateway/                   # Node.js API Gateway（端口 8080）
│   │   ├── package.json           # 依赖（express, axios, typescript）
│   │   ├── tsconfig.json          # TypeScript 配置
│   │   ├── Dockerfile             # Gateway 容器化配置
│   │   ├── README.md              # Gateway 说明文档
│   │   └── src/
│   │       ├── index.ts           # ✅ 服务入口（CORS、路由注册）
│   │       └── controllers/
│   │           ├── health.ts      # ✅ 健康检查端点
│   │           └── auth.ts        # ✅ 认证路由代理（转发到 trip-service）
│   │
│   └── services/
│       └── trip-service/          # Java Spring Boot 核心服务（端口 8081）
│           ├── pom.xml            # Maven 依赖（Spring Boot, PostgreSQL, JWT, Security）
│           ├── Dockerfile         # trip-service 容器化配置
│           └── src/main/
│               ├── resources/
│               │   └── application.yml  # ✅ Spring Boot 配置（数据库连接、JPA）
│               └── java/com/example/tripservice/
│                   ├── TripServiceApplication.java  # ✅ Spring Boot 启动类
│                   ├── config/
│                   │   ├── SecurityConfig.java      # ✅ Spring Security 配置（CORS、JWT 认证）
│                   │   └── CorsConfig.java          # ✅ CORS 全局配置
│                   ├── controller/
│                   │   ├── TripController.java      # ✅ 行程 REST 端点（健康检查）
│                   │   └── AuthController.java      # ✅ 认证端点（/register, /login）
│                   ├── service/
│                   │   └── AuthService.java         # ✅ 认证业务逻辑（BCrypt、JWT）
│                   ├── repository/
│                   │   └── UserRepository.java      # ✅ JPA 数据访问层（findByEmail）
│                   ├── entity/
│                   │   └── User.java                # ✅ 用户实体（JPA，@PrePersist/@PreUpdate）
│                   ├── dto/
│                   │   ├── RegisterRequest.java     # ✅ 注册请求 DTO
│                   │   ├── LoginRequest.java        # ✅ 登录请求 DTO
│                   │   ├── AuthResponse.java        # ✅ 认证响应 DTO（token + user）
│                   │   ├── UserDto.java             # ✅ 用户信息 DTO（无密码）
│                   │   └── ErrorResponse.java       # ✅ 统一错误响应
│                   └── util/
│                       └── JwtUtil.java             # ✅ JWT 工具类（生成、验证 token）
│
├── diagnose.ps1                   # PowerShell 诊断脚本（检查服务状态、测试 API）
├── clean-db.ps1                   # 数据库清理脚本（删除测试用户）
├── test-api.html                  # HTML API 测试页面
├── FIX_FAILED_TO_FETCH.md         # 常见网络错误修复指南
└── RESTART.md                     # 服务重启指南

✅ = 已实现
⏳ = 待实现
```

## 5. 已实现功能模块说明

### 5.1 前端（React + Vite + TypeScript）
- **✅ 认证 UI**：完整的登录/注册页面，支持表单验证、错误提示（中文）
- **✅ 路由管理**：基于 hash 的简单路由（#login, #register, #home）
- **✅ API 集成**：通过 `services/auth.ts` 与后端通信，包含错误处理与 token 存储
- **✅ 用户状态**：使用 localStorage 持久化用户信息和 JWT token
- **⏳ 语音录制**：VoiceRecorder 组件骨架已创建，待实现实际录音功能
- **⏳ 行程管理**：待实现行程创建、查看、编辑、地图展示等功能

### 5.2 后端 Gateway（Node.js + Express）
- **✅ CORS 支持**：全局 CORS 中间件，支持跨域请求
- **✅ 认证代理**：将 `/api/v1/auth/*` 请求转发到 trip-service
- **✅ 健康检查**：`/api/v1/health` 端点
- **⏳ 其他路由**：待实现行程、费用、语音转写等 API 代理

### 5.3 后端 trip-service（Java Spring Boot）
- **✅ 用户认证**：
  - 注册（邮箱唯一性检查、BCrypt 密码加密）
  - 登录（密码验证、JWT token 生成）
  - JWT 工具类（HS256 签名，24 小时有效期）
- **✅ 数据持久化**：
  - PostgreSQL 数据库集成（通过 Spring Data JPA）
  - User 实体（自动时间戳管理）
  - UserRepository（邮箱查询、存在性检查）
- **✅ 安全配置**：
  - Spring Security（无状态 session、BCrypt 密码编码器）
  - CORS 配置（允许跨域请求）
  - 公开端点白名单（/api/v1/auth/**, /health）
- **✅ 错误处理**：统一的中文错误消息与 HTTP 状态码
- **⏳ 行程管理**：待实现行程 CRUD、LLM 生成、预算计算等核心功能

### 5.4 数据库（PostgreSQL via Supabase/本地）
- **✅ Users 表**：通过 JPA 自动创建（ddl-auto=update）
  - 字段：id, email, password_hash, display_name, auth_provider, preferences, created_at, updated_at
- **⏳ 其他表**：待创建 Trip, ItineraryItem, ExpenseRecord 等

### 5.5 开发工具
- **✅ Docker Compose**：本地开发环境定义（postgres, gateway, trip-service）
- **✅ 诊断脚本**：自动检查服务状态、测试 API、生成测试用户
- **✅ 数据库管理**：SQL 初始化脚本、清理脚本

## 6. 关键模块说明

### 6.1 前端架构
- **App.tsx**：应用根组件，负责：
  - 基于 hash 的路由管理（#login, #register, #home）
  - 用户登录状态管理（从 localStorage 读取）
  - 退出登录逻辑
- **pages/Login.tsx & Register.tsx**：
  - 表单验证（邮箱格式、密码最小长度）
  - 与后端 API 通信（通过 auth.ts service）
  - 错误提示（中文）与加载状态
  - 成功后自动跳转首页
- **services/auth.ts**：
  - 封装认证 API 调用（register, login）
  - 错误处理（网络错误、业务错误）
  - Token 和用户信息存储工具（localStorage）

### 6.2 Gateway 架构（Node.js）
- **index.ts**：
  - Express 服务器启动（端口 8080）
  - 全局 CORS 中间件（允许所有来源）
  - 路由注册（health, auth）
- **controllers/auth.ts**：
  - 代理认证请求到 trip-service（使用 axios）
  - 错误转发与状态码处理
- **controllers/health.ts**：
  - 返回服务健康状态 JSON

### 6.3 trip-service 架构（Java Spring Boot）
- **AuthController**：
  - `POST /api/v1/auth/register`：用户注册
  - `POST /api/v1/auth/login`：用户登录
  - 返回统一的 AuthResponse（token + user）或 ErrorResponse
- **AuthService**：
  - 邮箱唯一性验证
  - 密码加密（BCryptPasswordEncoder）
  - JWT token 生成（通过 JwtUtil）
  - 登录凭证验证
- **JwtUtil**：
  - 使用 HS256 算法生成 JWT
  - Token 包含：用户 ID、邮箱、签发时间、过期时间（24h）
  - Token 验证方法
- **SecurityConfig**：
  - 禁用 CSRF（前后端分离）
  - 无状态 session（STATELESS）
  - 公开路径白名单：/api/v1/auth/**, /health
  - 提供 BCryptPasswordEncoder Bean
- **CorsConfig**：
  - 全局 CORS 配置（允许所有来源、方法、请求头）
- **User 实体**：
  - JPA 实体映射到 users 表
  - 字段：id, email (unique), password_hash, display_name, auth_provider, preferences (JSON), created_at, updated_at
  - 生命周期钩子：@PrePersist/@PreUpdate 自动设置时间戳
- **UserRepository**：
  - Spring Data JPA 接口
  - 方法：findByEmail, existsByEmail

### 6.4 待实现的关键模块（规划）
- **TripService（Java）**：
  - 行程 CRUD（创建、查看、更新、删除）
  - LLM 集成（调用 OpenAI/Azure 生成行程）
  - 预算计算与分解
  - 行程导出（JSON/PDF）
- **LLM Adapter（Java）**：
  - 负责与 LLM 提供方通信（OpenAI/Azure 等）
  - Prompt 管理与优化
  - 重试、超时、限流策略
  - 响应解析与验证
- **Map Adapter（Java）**：
  - 调用地图 API（高德/百度）
  - 地理编码（地址 ↔ 坐标）
  - POI 查询
  - 路线规划
- **TranscriptionService**：
  - 音频上传处理
  - 调用语音识别 API（科大讯飞等）
  - 返回转写文本
- **前端组件**：
  - VoiceRecorder（语音录制与上传）
  - TripList（行程列表展示）
  - TripDetail（行程详情与编辑）
  - MapView（地图可视化）
  - BudgetChart（预算分解图表）

## 7. API 设计（当前实现 + 规划）

### 7.1 已实现的 API

#### 认证相关（Authentication）
- **POST /api/v1/auth/register**
  - 描述：用户注册
  - 请求体：`{ email: string, password: string, displayName: string }`
  - 响应：`{ token: string, user: { id, email, displayName, authProvider } }`
  - 错误：`{ message: "该邮箱已被注册", status: 400 }`
  
- **POST /api/v1/auth/login**
  - 描述：用户登录
  - 请求体：`{ email: string, password: string }`
  - 响应：`{ token: string, user: { id, email, displayName, authProvider } }`
  - 错误：`{ message: "邮箱或密码错误", status: 401 }`

#### 健康检查
- **GET /api/v1/health** (Gateway)
  - 响应：`{ status: "ok", service: "gateway" }`
  
- **GET /health** (trip-service)
  - 响应：`{ status: "ok" }`

### 7.2 规划中的 API

#### 行程管理（Trips）
- **GET /api/v1/trips** — 获取用户的所有行程列表
- **POST /api/v1/trips** — 创建新行程（包含基本信息）
- **GET /api/v1/trips/:id** — 获取行程详情
- **PUT /api/v1/trips/:id** — 更新行程信息
- **DELETE /api/v1/trips/:id** — 删除行程
- **POST /api/v1/trips/:id/generate** — 使用 LLM 生成行程内容

#### 行程项目（Itinerary Items）
- **GET /api/v1/trips/:tripId/items** — 获取行程的所有项目
- **POST /api/v1/trips/:tripId/items** — 添加行程项目
- **PUT /api/v1/trips/:tripId/items/:itemId** — 更新行程项目
- **DELETE /api/v1/trips/:tripId/items/:itemId** — 删除行程项目

#### 费用管理（Expenses）
- **GET /api/v1/trips/:tripId/expenses** — 获取行程的所有费用记录
- **POST /api/v1/trips/:tripId/expenses** — 添加费用记录
- **DELETE /api/v1/expenses/:id** — 删除费用记录

#### 语音转写（Transcription）
- **POST /api/v1/transcribe** — 上传音频文件并返回转写文本
  - 请求：multipart/form-data（音频文件）
  - 响应：`{ text: string, duration: number }`

请求/响应统一使用 JSON 格式（除文件上传）。错误响应格式：`{ message: string, status: number, details?: any }`。

## 8. 数据模型（当前实现 + 规划）

### 8.1 已实现的数据模型

#### User（用户）
```java
// Java Entity (backend/services/trip-service/src/main/java/com/example/tripservice/entity/User.java)
{
  id: Long (主键，自增)
  email: String (唯一，非空)
  passwordHash: String (BCrypt 加密)
  displayName: String (用户昵称)
  authProvider: String (认证方式，默认 "local")
  preferences: String (JSON 格式，用户偏好设置)
  createdAt: LocalDateTime (创建时间，自动设置)
  updatedAt: LocalDateTime (更新时间，自动更新)
}
```

#### UserDto（用户信息传输对象，不含密码）
```java
{
  id: Long
  email: String
  displayName: String
  authProvider: String
}
```

### 8.2 规划中的数据模型

#### Trip（行程）
```
{
  id: Long (主键)
  userId: Long (外键 → User)
  title: String (行程标题)
  destination: String (目的地)
  startDate: LocalDate (开始日期)
  endDate: LocalDate (结束日期)
  participants: Integer (参与人数)
  preferences: String (JSON，偏好信息)
  status: String (状态：draft, generated, confirmed)
  createdAt: LocalDateTime
  updatedAt: LocalDateTime
}
```

#### ItineraryItem（行程项目）
```
{
  id: Long (主键)
  tripId: Long (外键 → Trip)
  dayIndex: Integer (第几天，从 1 开始)
  startTime: LocalTime (开始时间)
  endTime: LocalTime (结束时间)
  title: String (活动标题)
  type: String (类型：attraction, restaurant, hotel, transport)
  location: String (地点名称)
  coordinates: String (JSON，经纬度)
  estimatedCost: BigDecimal (预估费用)
  description: String (描述)
}
```

#### ExpenseRecord（费用记录）
```
{
  id: Long (主键)
  tripId: Long (外键 → Trip)
  itemId: Long (可选，外键 → ItineraryItem)
  amount: BigDecimal (金额)
  currency: String (货币，默认 CNY)
  category: String (类别：food, transport, accommodation, entertainment, other)
  date: LocalDate (日期)
  note: String (备注)
  createdAt: LocalDateTime
}
```

**数据库实现**：使用 PostgreSQL（通过 Supabase 或本地部署），Java 层使用 Spring Data JPA 进行 ORM 映射。

## 9. 本地开发与运行

### 9.1 环境要求
- **Node.js**：v18+ (推荐 v18.x LTS)
- **Java**：JDK 17+
- **Maven**：3.6+
- **PostgreSQL**：15+ (本地安装或使用 Supabase)
- **npm/pnpm**：包管理器

### 9.2 启动流程（Windows 开发环境）

#### 1. 数据库准备
```powershell
# 选项 A：本地 PostgreSQL
# 安装 PostgreSQL 15+
winget install PostgreSQL.PostgreSQL

# 创建数据库
psql -U postgres
CREATE DATABASE travel;
\q

# 选项 B：使用 Supabase 云服务
# 访问 https://supabase.com 创建项目
# 获取数据库连接信息
```

#### 2. 启动后端服务

**trip-service (Java Spring Boot - 端口 8081)**
```powershell
cd backend\services\trip-service

# 配置环境变量（可选，默认使用 application.yml 中的配置）
$env:SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/travel"
$env:SPRING_DATASOURCE_USERNAME="postgres"
$env:SPRING_DATASOURCE_PASSWORD="postgres"

# 启动服务
mvn spring-boot:run
# 或使用 Maven Wrapper
.\mvnw.cmd spring-boot:run

# 验证：访问 http://localhost:8081/health
```

**Gateway (Node.js - 端口 8080)**
```powershell
cd backend\gateway

# 安装依赖
npm install

# 配置环境变量
$env:TRIP_SERVICE_URL="http://localhost:8081"

# 启动服务
npm run dev

# 验证：访问 http://localhost:8080/api/v1/health
```

#### 3. 启动前端

```powershell
cd frontend

# 安装依赖（首次运行）
npm install

# 启动开发服务器
npm run dev

# 访问：http://localhost:5173
```

### 9.3 Docker 方式运行（推荐用于集成测试）

```powershell
# 在项目根目录
cd infra

# 启动所有服务
docker-compose -f docker-compose.dev.yml up

# 停止服务
docker-compose -f docker-compose.dev.yml down
```

### 9.4 常见问题排查

**问题：Failed to fetch**
- 确保 Gateway 和 trip-service 都已启动
- 检查 CORS 配置是否生效（需要重启服务）
- 查看浏览器 Console 和 Network 标签页

**问题：邮箱已被注册**
- 使用不同的邮箱地址
- 或使用 `clean-db.ps1` 清理数据库

**问题：数据库连接失败**
- 检查 PostgreSQL 服务是否运行：`Get-Service postgresql*`
- 验证数据库配置（URL、用户名、密码）

**诊断工具**
```powershell
# 运行诊断脚本（需要先解除 PowerShell 脚本限制）
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\diagnose.ps1
```

## 10. 部署与 Docker

### 10.1 Docker 镜像构建

每个服务都提供了 Dockerfile：

**前端**
```powershell
cd frontend
docker build -t ai-travel-planner-frontend .
```

**Gateway**
```powershell
cd backend\gateway
docker build -t ai-travel-planner-gateway .
```

**trip-service**
```powershell
cd backend\services\trip-service
docker build -t ai-travel-planner-trip-service .
```

### 10.2 Docker Compose 部署

使用提供的 `docker-compose.dev.yml` 一键启动所有服务：

```yaml
# infra/docker-compose.dev.yml
services:
  postgres:
    image: postgres:15-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: travel
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
  
  trip-service:
    build: ../backend/services/trip-service
    ports: ["8081:8081"]
    depends_on: [postgres]
  
  gateway:
    build: ../backend/gateway
    ports: ["8080:8080"]
    depends_on: [trip-service]
  
  frontend:
    build: ../frontend
    ports: ["80:80"]
```

启动命令：
```powershell
cd infra
docker-compose -f docker-compose.dev.yml up -d
```

### 10.3 生产部署建议

- **容器编排**：使用 Kubernetes 或 Docker Swarm
- **数据库**：使用 Supabase 托管服务或云数据库（AWS RDS、Azure Database 等）
- **反向代理**：Nginx 或 Traefik 处理 HTTPS 和负载均衡
- **CI/CD**：GitHub Actions 自动构建、测试、推送镜像
- **密钥管理**：使用环境变量或密钥管理服务（AWS Secrets Manager、Azure Key Vault）

### 10.4 CI/CD 流程（规划）

```yaml
# .github/workflows/ci.yml (待创建)
name: CI/CD Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Run frontend tests
      - Run backend tests
  
  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - Build Docker images
      - Push to registry (Docker Hub / GitHub Container Registry)
  
  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - Deploy to production environment
```

## 11. 测试策略

### 11.1 已完成的测试
- ✅ **手动功能测试**：用户注册、登录流程
- ✅ **API 测试**：使用 PowerShell/curl 测试认证端点
- ✅ **集成测试**：前端 → Gateway → trip-service → 数据库完整链路

### 11.2 测试工具与脚本
- **diagnose.ps1**：自动化服务健康检查、API 测试
- **test-api.html**：浏览器端 API 测试页面
- **PowerShell 命令**：快速测试 REST API

### 11.3 规划中的测试

**单元测试**
- 前端：React 组件测试（Vitest + React Testing Library）
- Java：业务逻辑测试（JUnit 5 + Mockito）
- Node.js：路由和中间件测试（Jest）

**集成测试**
- E2E 测试：Playwright 或 Cypress 覆盖完整用户流程
- API 测试：RestAssured (Java) 或 Supertest (Node.js)

**测试覆盖目标**
- 后端业务逻辑：>80%
- 前端关键流程：>70%
- E2E 核心场景：注册、登录、创建行程、费用管理

### 11.4 Mock 策略
- LLM API：使用本地 mock 服务避免 CI 中调用真实 API
- 地图 API：预定义响应数据
- 语音识别：模拟转写结果

## 12. 技术债务与改进方向

### 12.1 当前已知的技术债务
1. **JWT 密钥硬编码**：JwtUtil.java 中的密钥应从环境变量读取
2. **错误处理不够细化**：需要区分更多业务错误类型（如密码强度不足、邮箱格式错误）
3. **缺少请求验证**：输入参数验证不够完善（如密码最小长度、邮箱格式）
4. **缺少日志系统**：需要集成结构化日志（SLF4J + Logback for Java，Winston for Node）
5. **缺少 API 文档**：应集成 Swagger/OpenAPI 自动生成 API 文档

### 12.2 下一步开发计划（优先级排序）

**P0 - 核心功能**
1. 行程 CRUD API 实现（Java trip-service）
2. 行程数据模型与数据库表创建
3. 前端行程列表与详情页面

**P1 - 重要功能**
4. LLM 集成（行程生成）
5. 地图集成（显示行程地点）
6. 预算计算与可视化

**P2 - 增强功能**
7. 语音录制与转写
8. 行程导出（JSON/PDF）
9. 用户偏好设置

**P3 - 优化与完善**
10. 单元测试与集成测试
11. 性能优化（缓存、查询优化）
12. API 文档生成
13. CI/CD 流程完善

### 12.3 代码质量改进
- [ ] 添加 ESLint/Prettier 配置（前端 + Gateway）
- [ ] 添加 Checkstyle/SpotBugs（Java）
- [ ] 统一错误码定义
- [ ] 添加 API 速率限制
- [ ] 实现请求日志记录
- [ ] 添加监控与告警（Prometheus + Grafana）

## 14. 安全与隐私

### 14.1 已实现的安全措施
- **密码加密**：使用 BCrypt 加密存储（work factor 默认 10）
- **JWT 认证**：无状态 token，24 小时有效期
- **CORS 配置**：防止未授权的跨域访问
- **SQL 注入防护**：使用 JPA/Hibernate 参数化查询
- **Spring Security**：配置安全过滤链，公开路径白名单

### 14.2 待实现的安全措施
- [ ] **HTTPS**：生产环境强制使用 HTTPS
- [ ] **密钥管理**：JWT 密钥从环境变量读取，支持密钥轮换
- [ ] **速率限制**：API 请求频率限制（防止暴力破解）
- [ ] **输入验证**：更严格的参数校验（邮箱格式、密码强度）
- [ ] **CSRF 防护**：虽然无状态 API 通常不需要，但可考虑添加
- [ ] **XSS 防护**：前端输出转义，CSP 头部配置
- [ ] **敏感数据脱敏**：日志中不记录密码、token 等敏感信息

### 14.3 隐私保护
- **数据最小化**：只收集必要的用户信息
- **第三方 API key**：由后端管理，前端不直接持有
- **用户数据导出**：支持用户导出自己的所有数据（GDPR 合规）
- **数据删除**：支持用户删除账号及所有关联数据

### 14.4 合规性
- 在用户注册时明确告知数据使用方式
- 提供隐私政策和服务条款
- 第三方 API 使用需用户授权

### 13.1 已实现的错误处理
- **认证错误**：
  - 邮箱重复：返回 400 + "该邮箱已被注册"
  - 登录失败：返回 401 + "邮箱或密码错误"
  - 网络错误：前端显示 "无法连接到服务器，请确保后端服务正在运行"
- **CORS 错误**：已配置全局 CORS 支持
- **统一错误响应格式**：`{ message: string, status: number }`

### 13.2 规划中的错误处理策略
- **LLM 超时**：返回"生成中"状态，允许用户稍后查看或选择简化生成（基于模板规则）
- **语音/地图失败**：提示用户切换到文本输入
- **API 密钥缺失**：在设置页面提供清晰提示，并阻止调用需要 key 的功能
- **数据验证失败**：返回详细的字段级错误信息
- **并发冲突**：使用乐观锁检测并提示用户

### 13.3 日志与监控
- 应用日志：记录所有 API 请求、错误和关键业务操作
- 错误追踪：集成 Sentry 或类似服务
- 性能监控：记录 API 响应时间、数据库查询时间
- 不在仓库保存真实 keys；后端不记录明文第三方 key（在数据库仅保存 metadata 与最后使用时间）。
- 所有流量使用 HTTPS；用户敏感信息加密存储（如需）。
- 在 README 与设置页明确告知用户 key 的使用方式与撤销建议。

## 15. 快速参考

### 15.1 端口分配
- **5173**：前端开发服务器（Vite）
- **8080**：Gateway（Node.js）
- **8081**：trip-service（Java Spring Boot）
- **5432**：PostgreSQL 数据库

### 15.2 关键命令速查

```powershell
# 启动前端
cd frontend && npm run dev

# 启动 Gateway
cd backend\gateway && npm run dev

# 启动 trip-service
cd backend\services\trip-service && mvn spring-boot:run

# Docker 方式启动全部服务
cd infra && docker-compose -f docker-compose.dev.yml up

# 运行诊断
.\diagnose.ps1

# 清理数据库
.\clean-db.ps1
```

### 15.3 常用 API 测试

```powershell
# 健康检查
curl http://localhost:8080/api/v1/health

# 注册用户
$body = @{ email='user@example.com'; password='pass123'; displayName='User' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/auth/register' -Method Post -Body $body -ContentType 'application/json'

# 登录
$body = @{ email='user@example.com'; password='pass123' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/auth/login' -Method Post -Body $body -ContentType 'application/json'
```

### 15.4 技术栈速查

| 层级 | 技术栈 |
|------|--------|
| 前端 | React 18.2 + Vite 5.x + TypeScript 5.0 |
| Gateway | Node.js 18 + Express + TypeScript |
| 业务服务 | Java 17 + Spring Boot 3.2.0 |
| 数据库 | PostgreSQL 15 (via Supabase 或本地) |
| 认证 | JWT + BCrypt |
| 构建工具 | npm (前端/Gateway) + Maven (Java) |
| 容器化 | Docker + Docker Compose |

### 15.5 项目状态总览

**已完成** ✅
- 项目骨架与基础设施
- 用户认证系统（注册、登录）
- 前后端通信与 CORS 配置
- 数据库集成与 JPA 配置

**进行中** 🚧
- 行程管理功能
- LLM 集成

**待开发** ⏳
- 语音转写
- 地图集成
- 预算管理
- 行程导出

---

**最后更新**：2025年11月2日  
**当前版本**：v0.1.0-alpha（认证系统完成）

