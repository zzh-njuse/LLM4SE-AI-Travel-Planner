Gateway (Node.js + TypeScript)

Quick start (dev):

1. cd backend/gateway
2. npm install
3. npm run dev

Notes:
- This gateway proxies requests to Java services and validates Supabase auth tokens.
- Configure environment variables in `.env` (SUPABASE_URL, SUPABASE_KEY, TRIP_SERVICE_URL).
