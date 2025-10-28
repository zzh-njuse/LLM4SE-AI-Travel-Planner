AI Travel Planner — repository skeleton

This repo contains a minimal monorepo skeleton for the AI Travel Planner project.

Structure:
- frontend/ — React + Vite frontend (npm)
- backend/gateway/ — Node.js Gateway (TypeScript)
- backend/services/trip-service/ — Java Spring Boot service (Maven)
- infra/docker-compose.dev.yml — local compose for Postgres + services

Quick starts

Frontend
```
cd frontend
npm install
npm run dev
```

Gateway (dev)
```
cd backend/gateway
npm install
npm run dev
```

Trip service (Maven)
```
cd backend/services/trip-service
./mvnw spring-boot:run
```

Notes
- This is a skeleton for development. Configure environment variables (Supabase keys, TRIP_SERVICE_URL, etc.) before running integrations.
- For Supabase-specific workflows, consider using Supabase managed service or Supabase Local Dev setup.
