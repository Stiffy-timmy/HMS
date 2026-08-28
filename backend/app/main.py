from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine
from app.routes import auth, beds, stays, billing, labs, conflicts, activity, dashboard, websocket

# Create database tables automatically
Base.metadata.create_all(bind=engine)

# Auto-seed database if empty (useful for fresh Render deployment)
try:
    from app.seed.seed_data import seed_if_empty
    seed_if_empty()
except Exception as e:
    print(f"[WARN] Startup seeder note: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Unified Hospital Operations Platform — Phase 1 (Auth + Dashboards + Real-Time DB)",
    version="1.0.0"
)

# CORS Configuration - Allows local dev, Vercel deployments, and production origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
