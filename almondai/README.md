# AlmondAI - Segment 1

Production-grade foundation for AlmondAI medical education platform.

## Tech Stack

- Frontend: Next.js 14, TypeScript (strict), TailwindCSS, Zustand, TanStack Query v5, Axios, React Hook Form, Zod
- Backend: FastAPI, Supabase Python client, python-jose, pydantic-settings, uvicorn
- Database: PostgreSQL (Supabase) with SQL migration and RLS policies

## Quick Start

### Backend

1. Copy `backend/.env.example` to `backend/.env` and fill Supabase values.
2. Create and activate venv.
3. Install dependencies:
   - `pip install -r requirements.txt`
4. Start API:
   - `uvicorn app.main:app --reload --port 8000`

### Frontend

1. Copy `frontend/.env.local.example` to `frontend/.env.local` and fill values.
2. Install dependencies:
   - `npm install`
3. Start app:
   - `npm run dev`

## Database Migration

Apply SQL from `backend/database/migrations/001_initial_schema.sql` in Supabase SQL editor.
