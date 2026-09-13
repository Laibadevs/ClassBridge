from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import announcements, auth, parent, protected, teacher, webhooks

settings = get_settings()

app = FastAPI(title="ClassBridge AI API", version="0.1.0")

# allow_origins must be the exact frontend origin (not "*") because
# allow_credentials=True is required for the browser to send the auth cookie.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(protected.router)
app.include_router(teacher.router)
app.include_router(announcements.router)
app.include_router(parent.router)
app.include_router(webhooks.router)


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
