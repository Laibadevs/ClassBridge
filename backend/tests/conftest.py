import os

# Test-only config, set before any `app.*` import touches get_settings().
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("ENVIRONMENT", "development")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app

# SQLite in-memory, one shared connection for the whole test session (via
# StaticPool) so every request in a test sees the same tables/rows — a real
# app talks to PostgreSQL via DATABASE_URL, this is purely a fast, isolated
# stand-in for the test suite.
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture(autouse=True)
def _fresh_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def _reset_whatsapp_provider_override():
    """Tests that install a FakeWhatsAppProvider (see whatsapp_helpers.py)
    must not leak that override into unrelated tests."""
    from app.dependencies.whatsapp import get_whatsapp_provider

    yield
    app.dependency_overrides.pop(get_whatsapp_provider, None)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db_session():
    """Direct DB access for tests that need to set up state the public API
    can't reach (e.g. a NULL column a create/update schema disallows).
    Deliberately not importable as `tests.conftest` from a test module —
    that would re-run this file's module-level code against a second,
    empty in-memory engine and silently break app.dependency_overrides[get_db]
    for every other test in the run."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def make_user(client):
    """Signs a user up through the real API and returns (client-with-cookies, body)."""

    def _make(full_name: str, email: str, password: str, role: str):
        res = client.post(
            "/api/auth/signup",
            json={"full_name": full_name, "email": email, "password": password, "role": role},
        )
        return res

    return _make
