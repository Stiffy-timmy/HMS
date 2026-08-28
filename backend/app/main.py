import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import Base, engine, get_db
from app.models.user import User
from app.models.bed import Bed
from app.routes import auth, beds, stays, billing, labs, conflicts, activity, dashboard, websocket

# Lifespan event to guarantee database creation & demo seeder on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    try:
        from app.seed.seed_data import seed_if_empty
        seed_if_empty()
        print("[LIFESPAN] Database tables and demo accounts verified.")
    except Exception as e:
        print(f"[LIFESPAN] Startup seeder note: {e}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Unified Hospital Operations Platform — Phase 1 (Auth + Dashboards + Real-Time DB)",
    version="1.0.0",
    lifespan=lifespan
)

# Robust CORS Configuration:
# - No wildcard '*' with allow_credentials=True (fixes browser preflight rejection)
# - Dynamic regex allows all Vercel production & preview deployments and localhost ports
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+|http://127\.0\.0\.1:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include Routers under /api
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(beds.router, prefix=settings.API_V1_STR)
app.include_router(stays.router, prefix=settings.API_V1_STR)
app.include_router(billing.router, prefix=settings.API_V1_STR)
app.include_router(labs.router, prefix=settings.API_V1_STR)
app.include_router(conflicts.router, prefix=settings.API_V1_STR)
app.include_router(activity.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)

# Include WebSocket router directly
app.include_router(websocket.router)

@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "status": "online",
        "docs": "/docs",
        "realtime_ws": "/ws/updates"
    }

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    user_count = db.query(User).count()
    bed_count = db.query(Bed).count()
    demo_admin = db.query(User).filter(User.email == "admin@medicover.com").first()
    return {
        "status": "healthy",
        "users_count": user_count,
        "beds_count": bed_count,
        "demo_admin_active": demo_admin is not None
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    reload_mode = os.getenv("ENVIRONMENT", "production") == "development"
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=reload_mode)
