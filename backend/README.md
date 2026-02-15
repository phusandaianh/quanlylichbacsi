# Backend cho ứng dụng Quản lý lịch bác sĩ & nghỉ phép

## Công nghệ

- Python 3.9+
- FastAPI
- Uvicorn
- SQLite (qua SQLAlchemy)

## Cài đặt

```bash
cd backend
pip install -r requirements.txt
```

## Chạy server

```bash
uvicorn app.main:app --reload --port 8001
```

Sau đó frontend (đang chạy bằng `python -m http.server 8000`) có thể gọi API qua địa chỉ:

- `http://localhost:8001/api/...`

