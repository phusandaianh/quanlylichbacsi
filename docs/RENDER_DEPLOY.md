# Deploy FastAPI lên Render.com

## Cấu hình đã chuẩn bị

| File | Mục đích |
|------|----------|
| `requirements.txt` | Dependencies (FastAPI, uvicorn, SQLAlchemy, psycopg2) |
| `runtime.txt` | Python 3.11 |
| `render.yaml` | Blueprint tự động (tùy chọn) |
| `/health` | Health check cho Render + ping |

---

## Bước 1: Tạo PostgreSQL Database (Render)

1. Vào [Render Dashboard](https://dashboard.render.com) → **New** → **PostgreSQL**
2. Đặt tên: `lich-truc-db`
3. Chọn **Free** plan
4. **Create Database**
5. Copy **Internal Database URL** (hoặc External nếu cần)

---

## Bước 2: Tạo Web Service

1. **New** → **Web Service**
2. Kết nối repo GitHub/GitLab hoặc **Deploy from existing code**
3. Cấu hình:

| Mục | Giá trị |
|-----|---------|
| **Name** | `lich-truc` |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | Free |

4. **Environment** → thêm biến:

| Key | Value |
|----|-------|
| `DATABASE_URL` | *(dán Connection String từ PostgreSQL vừa tạo)* |
| `RENDER` | `true` |

5. **Advanced** → **Health Check Path:** `/health`

6. **Create Web Service**

---

## Bước 3: (Tùy chọn) Dùng render.yaml

Nếu dùng Blueprint:

1. Uncomment phần `envVars` cho DATABASE_URL trong `render.yaml`
2. Đổi `lich-truc-db` thành tên database đã tạo
3. **New** → **Blueprint** → chọn repo

---

## Biến môi trường cần thiết

| Key | Bắt buộc | Mô tả |
|-----|----------|-------|
| `DATABASE_URL` | Có | PostgreSQL connection string từ Render |
| `RENDER` | Không | `true` – tắt reload khi chạy production |
| `ADMIN_RESET_EMAIL` | Không | Email admin reset mật khẩu |
| `SMTP_*` | Không | Gửi email mật khẩu tạm |

---

## Lưu ý

- **Free tier** sleep sau ~15 phút không có request → dùng UptimeRobot ping `/health` mỗi 5 phút
- **PostgreSQL**:  
  - Render dùng `postgres://`  
  - SQLAlchemy 1.4+ cần `postgresql://`  
  - Code đã tự chuyển đổi
- **Static files** (`/assets`, `/pages`) được phục vụ qua FastAPI `StaticFiles`
