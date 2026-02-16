# Giữ Web Không Bị Sleep Khi Deploy

Khi deploy lên Render (free tier), web sẽ **sleep** sau ~15 phút không có request. Các cách sau giúp giữ web luôn chạy.

> **Lưu ý:** Tính năng ping tự động qua GitHub Actions đã được gỡ bỏ.

---

## Dịch vụ ping bên ngoài

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

## Endpoint Health Check

**URL:** `https://your-app.com/health`  
**Method:** GET  
**Response:** `{"status":"ok","timestamp":"..."}`  

Endpoint này đã có trong `app.py`.

---

## Lưu ý

- Nếu deploy trên **Render**, dùng đúng URL production khi cấu hình (ví dụ: `https://quanlylichbacsi.onrender.com`).
