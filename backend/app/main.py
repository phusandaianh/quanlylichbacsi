from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .database import engine
from .routers import api_router

# Tạo bảng DB nếu chưa có
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Lich truc backend",
    description="Backend FastAPI cho ứng dụng Quản lý lịch làm việc & nghỉ phép bác sĩ.",
)

# Cho phép frontend gọi API từ http://localhost:8000
origins = [
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(api_router, prefix="/api")

