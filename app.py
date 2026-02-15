from datetime import datetime
from pathlib import Path

try:
    from dotenv import load_dotenv
    BASE_DIR = Path(__file__).resolve().parent
    load_dotenv(BASE_DIR / ".env")
except ImportError:
    pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from backend.app import models
from backend.app.database import engine
from backend.app.routers import api_router


BASE_DIR = Path(__file__).resolve().parent

# Khởi tạo DB (nếu chưa có bảng)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Quan ly lich truc",
    description="Backend + phục vụ file tĩnh cho ứng dụng lịch trực bác sĩ.",
)

# CORS: cho phép frontend gọi API từ nhiều nguồn (dev, production, Render)
import os as _os
_cors_origins = [
    "http://localhost:8000",
    "http://localhost:3000",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:3000",
    "https://lich-truc.onrender.com",
    "https://quanlylichbacsi.onrender.com",
]
# Render set RENDER_EXTERNAL_URL = https://<service>.onrender.com
if _os.environ.get("RENDER_EXTERNAL_URL"):
    _cors_origins.append(_os.environ["RENDER_EXTERNAL_URL"].rstrip("/"))
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

INDEX_HTML = BASE_DIR / "QuanlynhanlucBS.html"


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint cho dịch vụ ping (UptimeRobot, Cron-job.org, v.v.).
    Gọi mỗi 5 phút để giữ web không bị sleep.
    """
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


@app.get("/", include_in_schema=False)
async def root():
    """Trang chính: file QuanlynhanlucBS.html."""
    if INDEX_HTML.is_file():
        return FileResponse(INDEX_HTML)
    return RedirectResponse(url="/docs")


@app.get("/QuanlynhanlucBS.html", include_in_schema=False)
async def serve_index_html():
    """Phục vụ đúng file tên QuanlynhanlucBS.html (để redirect từ pages/*.html hoạt động)."""
    if INDEX_HTML.is_file():
        return FileResponse(INDEX_HTML)
    return RedirectResponse(url="/")


# Phục vụ thư mục tĩnh
app.mount(
    "/assets",
    StaticFiles(directory=str(BASE_DIR / "assets")),
    name="assets",
)

app.mount(
    "/pages",
    StaticFiles(directory=str(BASE_DIR / "pages")),
    name="pages",
)


# API backend (FastAPI)
app.include_router(api_router, prefix="/api")


if __name__ == "__main__":
    import os
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    is_production = os.environ.get("RENDER") == "true"
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        reload=not is_production,
    )

