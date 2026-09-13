# ClassBridge AI

ClassBridge AI turns everyday classroom data — attendance, grades, and
teacher notes — into short, warm parent updates in **Simple English and
Roman Urdu**, and delivers them (along with important announcements) over
**WhatsApp**. Teachers and parents each get their own dashboard, kept
strictly isolated by role.

## Tech stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: FastAPI, SQLAlchemy, Alembic, Python
- **Database**: PostgreSQL (developed against [Neon](https://neon.tech))
- **Messaging**: Meta WhatsApp Business Cloud API (official HTTPS API only)
- **AI**: pluggable provider (OpenAI / Gemini / a deterministic offline mock)

## Features

- Real authentication with separate teacher/parent roles and session cookies
- Teacher: manage students, attendance, grades, and notes
- AI-generated bilingual parent updates (English + Roman Urdu), reviewed and
  edited by the teacher before approval
- Important announcements targeted by class, section, or specific students
- **WhatsApp delivery** for both approved parent updates and published
  announcements, with per-recipient delivery-status tracking
  (`pending → sent → delivered → read`, or `failed`) driven by Meta's webhook
- Parent dashboard showing only their own linked child's data

## Project layout

```
app/                Next.js pages (App Router)
components/          React components (teacher/, parent/, shared/, ui/)
lib/                 Frontend API clients and helpers
middleware.ts        Route protection (teacher/parent isolation)

backend/
  app/
    core/            Settings, DB session, security helpers
    models/          SQLAlchemy models
    schemas/         Pydantic request/response schemas
    services/        Business logic (one module per feature area)
    services/whatsapp/  WhatsApp provider abstraction (mock + Meta Cloud API)
    routers/         FastAPI route handlers
    dependencies/    FastAPI dependencies (auth, WhatsApp provider)
  alembic/           Database migrations
  tests/             pytest suite (FastAPI TestClient + in-memory SQLite)

docs/
  whatsapp-setup.md  Step-by-step Meta WhatsApp Business API configuration
```

## Getting started

### Prerequisites

- Node.js 18+
- Python 3.11+
- A PostgreSQL database (e.g. a free [Neon](https://neon.tech) project)

### Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # Windows; use `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt

cp .env.example .env          # then fill in DATABASE_URL, SECRET_KEY, etc.
alembic upgrade head          # applies all migrations

uvicorn app.main:app --reload # runs on http://localhost:8000
```

Run the backend test suite (uses an isolated in-memory SQLite database, no
external services touched):

```bash
pytest
```

### Frontend

From the repository root:

```bash
npm install
cp .env.example .env.local    # set NEXT_PUBLIC_API_URL if not the default
npm run dev                   # runs on http://localhost:3000
```

### WhatsApp integration

WhatsApp sending works out of the box against a **mock provider** — no Meta
account needed for local development or tests. To send real messages, follow
[docs/whatsapp-setup.md](docs/whatsapp-setup.md) to configure a Meta
WhatsApp Business account and set the `WHATSAPP_*` variables in
`backend/.env` (see `backend/.env.example` for the full list).

## Environment variables

Both `.env.example` (frontend, repo root) and `backend/.env.example`
(backend) list every variable the app reads, with empty placeholders. Real
values belong only in `.env` / `.env.local`, which are git-ignored and must
never be committed.

## Security notes

- All ownership checks (a teacher's students, a parent's linked children)
  are enforced server-side — never trust a client-supplied ID.
- WhatsApp access tokens and AI provider API keys live only in the backend
  environment and are never returned to the frontend or logged.
- The WhatsApp webhook validates Meta's signature (`WHATSAPP_APP_SECRET`)
  and verify token (`WHATSAPP_WEBHOOK_VERIFY_TOKEN`) before trusting any
  delivery-status update.
