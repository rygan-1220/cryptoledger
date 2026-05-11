# CryptoLedger

Sprint 1 foundation scaffold for the CryptoLedger FYP project.

## What is included
- Frontend: Vite + Vue 3 + Tailwind
- Backend: Express + pg + Redis client scaffold
- Database: Postgres migrations + seed placeholders
- Docker: Postgres 16 + Redis 7

## Quick start
1. Start local services

```
docker compose up -d
```

2. Backend setup

```
cd backend
copy .env.example .env
npm install
npm run dev
```

3. Frontend setup

```
cd frontend
npm install
npm run dev
```

## Notes
- SQL migrations are stored in database/migrations.
- Department seeds are placeholders until K_system is configured.
- Design styling is included in the initial Vue landing screen.
