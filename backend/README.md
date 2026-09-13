# ClassBridge AI — backend

Real authentication: FastAPI + PostgreSQL + SQLAlchemy + Alembic + Argon2
password hashing + httpOnly session cookies. No mocks, no hardcoded users.

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
cp .env.example .env          # then fill in DATABASE_URL / SECRET_KEY
```

You need a real PostgreSQL database reachable at `DATABASE_URL`. Any of these work:

- Local install: create a database and user, e.g.
  `createuser classbridge -P` then `createdb -O classbridge classbridge`
- Docker: `docker run --name classbridge-db -e POSTGRES_USER=classbridge -e POSTGRES_PASSWORD=classbridge -e POSTGRES_DB=classbridge -p 5432:5432 -d postgres:16`
- A free hosted Postgres (Neon, Railway, Render, etc.) — just point `DATABASE_URL` at it.

## Migrate

```bash
alembic upgrade head
```

This creates `users`, `profiles`, `sessions`, `password_reset_tokens`. Whenever
a model changes, add a new revision (`alembic revision -m "..."`, or
`--autogenerate` once the DB is reachable) instead of hand-editing the schema.

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

Swagger UI: http://localhost:8000/docs (Authentication + Authorization demo tags).

## Seed the demo accounts

```bash
python -m scripts.seed_demo_users
```

Creates `sarah.teacher@classbridge.ai` / `demo1234` (teacher) and
`parent.ali@classbridge.ai` / `demo1234` (parent) through the real signup
path — hashed password, transactional user+profile row. Safe to re-run;
it skips accounts that already exist.

## Test

```bash
pytest
```

Tests run against an in-memory SQLite database (see `tests/conftest.py`),
not PostgreSQL — that's what keeps the suite fast and dependency-free in
CI/sandboxes. The application models are written to be dialect-agnostic
(see `app/models/types.py`) specifically so this works; production always
uses `DATABASE_URL` (PostgreSQL).

## How the auth model works

- **Password hashing**: Argon2 (`app/core/security.py`). Plaintext passwords
  are never stored or logged.
- **Sessions**: an opaque random token goes in the `cb_session` httpOnly
  cookie; only its SHA-256 hash is stored in the `sessions` table. Logout
  sets `revoked_at` — the session is dead server-side immediately, not just
  cookie-cleared client-side.
- **CSRF**: a non-httpOnly `cb_csrf` cookie is set alongside the session.
  State-changing requests (currently just `/api/auth/logout`) must echo its
  value back in an `X-CSRF-Token` header (double-submit pattern). Apply the
  same `verify_csrf` dependency to any future mutating endpoint.
- **Role is server truth**: `profiles.role` decides everything. The role
  selected in the frontend UI is only used to produce a friendly "this
  account is registered as a Teacher/Parent" message on mismatch — it's
  never trusted for authorization.
- **Authorization**: `require_teacher` / `require_parent` (in
  `app/dependencies/auth.py`) are FastAPI dependencies — attach them to any
  route that should be role-restricted, as done in `app/routers/protected.py`.
