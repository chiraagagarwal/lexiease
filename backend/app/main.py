from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import profile, ai, document

from app.core.config import settings

app = FastAPI(title="LexiEase API")

cors_origins_raw = getattr(settings, "CORS_ORIGINS", "*")
if cors_origins_raw.strip() == "*":
    origins = ["*"]
else:
    origins = [orig.strip() for orig in cors_origins_raw.split(",") if orig.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(ai.router)
app.include_router(document.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
