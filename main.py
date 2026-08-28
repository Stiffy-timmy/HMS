import os
import sys

# Ensure backend directory is in python path
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    reload_mode = os.getenv("ENVIRONMENT", "production") == "development"
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=reload_mode)
