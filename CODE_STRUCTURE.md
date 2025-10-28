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

## 4. 建议的仓库文件树（高层）

`/` (repo root)
- `README.md` — 运行与密钥注入说明
- `CODE_STRUCTURE.md` —（本文件）
- `REQS.md` — 需求规格
- `docker/` — Docker 相关与 compose 示例
- `frontend/` — 前端应用
  - `src/` — 源码
    - `components/` — 可复用 UI 组件（Map, ItineraryCard, VoiceRecorder）
    - `pages/` — 页面（Home, CreateTrip, TripDetail, Settings）
    - `services/` — API clients（api.ts）与 hooks
    - `stores/` — 状态管理（React Context / Zustand / Redux）
    - `utils/` — 工具函数
  - `Dockerfile`、`package.json`
-- `backend/` — 后端相关代码（含 Gateway）
  - `gateway/` — Node.js (TypeScript) API Gateway
    - `src/`
      - `controllers/` — REST 路由
      - `middleware/` — auth、rate-limit、error handling
      - `clients/` — Supabase 客户端封装、调用 Java 服务的 HTTP client
    - `Dockerfile`、`package.json`
  - `services/` — Java Spring Boot 微服务集合（每个子服务为单独模块）
    - `trip-service/` — 行程生成与管理（Spring Boot 项目）
    - `llm-adapter/` — LLM 调用适配层（可与 trip-service 合并或独立）
    - `Dockerfile`、`pom.xml` / `build.gradle`（每个服务）
- `infra/` — CI/CD、Kubernetes manifest 或 GH Actions workflow
- `tests/` — e2e 与集成测试（Playwright / Cypress）

## 6. 关键模块说明（后端）
- Gateway （Node.js）
  - 负责对外的 REST 接口、鉴权（Supabase Auth 验证）、输入校验、基础速率限制以及把复杂请求路由到 Java 后端服务。
  - 提供对前端的轻量缓存与请求聚合（避免把复杂业务逻辑放到 Gateway）。
- TripService（Java）
  - 核心业务：行程 CRUD、预算计算、行程生成 orchestration（调用 LLMAdapter 与 MapAdapter）、导出 JSON/PDF。
- LLM Adapter（Java）
  - 负责与 LLM 提供方通信（OpenAI/Azure 等），包含重试、超时、限流与 prompt 管理。
- Map Adapter（Java）
  - 调用地图 API（逆/正地理编码、路线、POI 查询），并做统一的错误/速率处理。
- TranscriptionService
  - 可部署在 Java 或 Node 层，负责把上传的音频转为文本（调用第三方语音识别），并把结果回传给 Gateway/前端。
- 异步/调度
  - 移除 Redis/BullMQ 的默认依赖。对于需要异步或延时任务，可采用：
    - Java 内部的调度（Spring Scheduling）或消息中间件（若复杂可再引入），或
    - 使用 Supabase Functions / 边缘函数处理轻量任务。
- TripResultPage
  - 展示结构化行程，按日展开；包含地图视图与预算分解图表；支持保存与导出。
- MapWrapper
  - 抽象地图 SDK，提供统一接口（标记地点、画路线、聚焦坐标）。

## 7. API 设计（示例，REST）
- POST /api/v1/auth/register — 注册（通常由 Supabase Auth 处理，Gateway 做代理/验证）
- POST /api/v1/auth/login — 登录（由 Supabase Auth 或 Gateway 代理）
- GET /api/v1/trips — 列表（Gateway 转发到 trip-service）
- POST /api/v1/trips — 创建（payload 包含用户输入或 LLM 请求参数，Gateway 校验并转发）
- GET /api/v1/trips/:id — 获取行程
- POST /api/v1/trips/:id/generate — 请求后端通过 LLM 生成行程（建议同步返回若生成快，否则返回 202 + location/taskId）
- POST /api/v1/transcribe — 上传音频并返回转写文本（可直接由 Gateway 调用 TranscriptionService）
- POST /api/v1/expenses — 添加支出

请求/响应应使用 JSON，错误统一返回 { code, message, details? }。Gateway 负责统一鉴权与错误转换。

## 8. 数据模型映射（对应 REQS.md）
- User { id, email, displayName, authProvider, preferences, apiKeysMeta }
- Trip { id, userId, title, destination, startDate, endDate, participants, preferences, status }
- ItineraryItem { id, tripId, dayIndex, startTime, endTime, title, type, location, estimatedCost }
- ExpenseRecord { id, tripId, itemId?, amount, currency, category, date }

（使用 Supabase 的 Postgres 数据库；在 Node 层可使用 `@supabase/supabase-js`，在 Java 层使用 Spring Data JPA 与 PostgreSQL 驱动）

## 9. 开发与本地运行建议
- 前端：在 `frontend/` 下运行 `pnpm install`，`pnpm dev` 或 `npm run dev`。
- 后端：在 `backend/` 下使用 `.env` 提供 DB 与第三方 keys，运行 `pnpm install`，`pnpm start:dev`。
- 本地 DB：使用 Docker Compose 启动 Postgres（`infra/docker-compose.yml`），并把连接字符串注入后端 `.env`。
- 密钥：在 README 指示将需要的 API keys 写入本地 `.env`（示例 `.env.example`），切勿提交真实 keys。

## 10. 部署与 Docker
- 每个服务（frontend/backend）提供自己的 `Dockerfile`。
- 推荐提供根级 `docker/compose.dev.yml` 用于本地集成测试（frontend、backend、db、supabase-mock）。
- CI: GitHub Actions 在 push 时运行 lint/test，再构建并推送镜像到容器仓库（可选 push 至私有仓库）。

## 11. 测试策略映射（从 REQS）
- 单元测试：Java 的业务逻辑（行程合成、预算计算）、Node Gateway 的输入校验逻辑、前端纯函数。
- 集成/E2E：Playwright 覆盖登录、行程创建、保存、费用录入、转写流程。CI 中对第三方接口使用 mock。
- 重要：为 LLM、地图与语音识别编写契约测试与 mock 服务，避免 CI 调用真实 API。

## 12. 错误处理与回退策略（要点）
- LLM 超时：返回“生成中”状态并允许用户稍后查看或选择简化生成（基于模板规则）。
- 语音/地图失败：提示用户切换到文本输入。
- API 密钥缺失：在设置页面提供清晰提示，并阻止调用需要 key 的功能。Gateway/Java 服务在缺 key 时返回明确状态码（401/503）。

## 13. 安全与隐私要点
- 不在仓库保存真实 keys；后端不记录明文第三方 key（在数据库仅保存 metadata 与最后使用时间）。
- 所有流量使用 HTTPS；用户敏感信息加密存储（如需）。
- 在 README 与设置页明确告知用户 key 的使用方式与撤销建议。

## 14. 验收标准（如何衡量）
- 能够通过 REQS 中列出的 UT-01、UT-02 等验收测试。
- Docker 镜像能启动并提供最小功能（前端静态页面、后端健康检查、示例行程生成使用 mock）。

## 15. 边界情况与常见场景（3-5 个，工程师需关注）
1. 空/不完整输入（缺少日期或人数）——表单校验 + 引导补全。
2. LLM 生成包含虚假/不适当建议——强化提示词（prompt engineering）并在输出中标注可信度与来源。
3. 第三方 API 配额耗尽——退到缓存或替代服务，向用户提示并限制频次。
4. 多设备并发编辑同一行程——采用乐观锁/变更合并与冲突提示。
5. 大规模用户同时生成（LLM 成本高）——通过队列与速率限制分配生成请求，按优先级调度。

