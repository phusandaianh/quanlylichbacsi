# Deploy lên Render — xử lý lỗi 503

## 1. Kiểm tra Logs (quan trọng nhất)

- Vào **Dashboard Render** → chọn **Web Service** → tab **Logs**.
- Lỗi 503 thường do **ứng dụng crash khi khởi động**. Log sẽ có traceback Python (ví dụ lỗi kết nối DB, thiếu thư viện, v.v.).

## 2. Cấu hình bắt buộc

| Mục | Giá trị |
|-----|--------|
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app:app --host 0.0.0.0 --port $PORT` |
| **Root Directory** | Để trống (repo gốc chứa `app.py`) |

## 3. Biến môi trường (Environment)

Trong **Environment** của Web Service, cần có:

- `RENDER` = `true`
- `DATABASE_URL` = chuỗi kết nối PostgreSQL (nếu dùng database):
  - Tạo **PostgreSQL** trong Render (Dashboard → New + PostgreSQL).
  - Trong Web Service → Environment → **Add from Database** → chọn database → chọn **connectionString** (internal).

**Lưu ý:** Nếu không có database, ứng dụng sẽ dùng SQLite (file local). Trên Render, ổ đĩa là tạm, nên **nên dùng PostgreSQL** để dữ liệu không mất khi restart.

## 4. Lỗi thường gặp

- **503 + log "Khởi tạo DB thất bại"**  
  → Kiểm tra `DATABASE_URL` đúng, database đã được tạo và Web Service cùng region với database (dùng Internal Database URL).

- **503 + không thấy log ứng dụng**  
  → Build hoặc Start Command sai. Kiểm tra Build Logs và Start Command đúng như bảng trên.

- **Service tên khác (vd: quanlylichbacsi)**  
  → Nếu không dùng file `render.yaml` (Blueprint), cần tự thêm env và Start Command như trên. CORS trong `app.py` đã hỗ trợ thêm origin từ `RENDER_EXTERNAL_URL`.

## 5. Sau khi sửa

1. Commit và push code (có `runtime.txt`, sửa `database.py`, `app.py`).
2. Render sẽ tự build lại. Xem tab **Logs** ngay sau khi deploy.
3. Gọi thử `https://<tên-service>.onrender.com/health` — nếu trả về `{"status":"ok",...}` là ứng dụng đã chạy.
