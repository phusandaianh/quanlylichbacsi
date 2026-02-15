# Giữ Web Không Bị Sleep Khi Deploy

Khi deploy lên Render (free tier), web sẽ **sleep** sau ~15 phút không có request. Các cách sau giúp giữ web luôn chạy.

---

## 1. GitHub Actions (Tự động – Đã cấu hình)

Workflow `.github/workflows/keep-alive.yml` ping `/health` **mỗi 5 phút**.

### Bật workflow
1. Push code lên GitHub (workflow đã có sẵn).
2. Vào **Actions** → chọn workflow **Keep Alive**.
3. Nếu chưa chạy: **Run workflow** thử.
4. Lịch chạy: mỗi 5 phút (cron `*/5 * * * *`).

### Đổi URL (nếu deploy khác domain)
1. **Settings** → **Secrets and variables** → **Actions**.
2. Thêm secret: `DEPLOY_URL` = `https://your-app.onrender.com` (không có `/` cuối).

---

## 2. Dịch vụ ping bên ngoài

### UptimeRobot (miễn phí)
1. Đăng ký: https://uptimerobot.com  
2. **Add New Monitor** → **Monitor Type:** HTTP(s)  
3. **URL:** `https://your-app.com/health`  
4. **Monitoring Interval:** 5 minutes  

### Cron-job.org (miễn phí)
1. Đăng ký: https://cron-job.org  
2. **Create Cronjob**  
3. **URL:** `https://your-app.com/health`  
4. **Schedule:** `*/5 * * * *` (mỗi 5 phút)  

---

## 3. Endpoint Health Check

**URL:** `https://your-app.com/health`  
**Method:** GET  
**Response:** `{"status":"ok","timestamp":"..."}`  

Endpoint này đã có trong `app.py`.

---

## Lưu ý

- **GitHub Actions** miễn phí với giới hạn 2000 phút/tháng (đủ cho ping 5 phút/lần).
- Nếu deploy trên **Render**, dùng đúng URL production khi cấu hình (ví dụ: `https://quanlylichbacsi.onrender.com`).
