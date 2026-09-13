from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str
    SECRET_KEY: str
    SESSION_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    RESET_TOKEN_EXPIRE_MINUTES: int = 30
    FRONTEND_URL: str = "http://localhost:3000"
    ENVIRONMENT: str = "development"

    # AI provider for parent-update generation. "mock" (default) needs no key
    # and produces deterministic, template-based bilingual text from the real
    # classroom data — used automatically whenever no provider key is set, and
    # in tests, so nothing here ever depends on a live network call. Set
    # AI_PROVIDER to "openai" or "gemini" plus the matching API key to use a
    # real model instead; the key is read only here, server-side, and never
    # sent to the frontend.
    AI_PROVIDER: str = "mock"
    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # WhatsApp Business Cloud API (Phase 5). Backend-only — never sent to the
    # frontend. When WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID are
    # unset (the default), get_whatsapp_provider() falls back to a mock
    # provider that never makes a network call, so the feature works fully
    # offline and in tests. See docs/whatsapp-setup.md for how to obtain
    # real values from Meta Business Manager.
    WHATSAPP_ACCESS_TOKEN: str | None = None
    WHATSAPP_PHONE_NUMBER_ID: str | None = None
    WHATSAPP_BUSINESS_ACCOUNT_ID: str | None = None
    WHATSAPP_API_VERSION: str = "v21.0"
    # Verifies the GET webhook handshake (hub.verify_token) and, when set,
    # HMAC-signs the POST body (X-Hub-Signature-256) so a random caller can't
    # forge delivery-status updates.
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: str | None = None
    WHATSAPP_APP_SECRET: str | None = None
    # Optional template message support — only usable once this exact name/
    # language pair has been created and approved in Meta Business Manager.
    WHATSAPP_TEMPLATE_NAME: str | None = None
    WHATSAPP_TEMPLATE_LANGUAGE: str | None = None
    # Safety cap on recipients resolved for a single announcement send.
    WHATSAPP_MAX_RECIPIENTS: int = 100

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
