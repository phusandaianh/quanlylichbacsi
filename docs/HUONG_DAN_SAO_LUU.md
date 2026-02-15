# Hướng dẫn sao lưu dữ liệu (trước khi chuyển sang Database)

## Bước 1: Đăng nhập với tài khoản Admin

Mở ứng dụng (http://localhost:8000/), đăng nhập bằng tài khoản **admin**.

## Bước 2: Xuất toàn bộ dữ liệu

1. Vào tab **Quản Lý Tài Khoản**.
2. Kéo xuống mục **💾 Sao Lưu & Khôi Phục Dữ Liệu**.
3. Bấm nút **📥 Xuất Dữ Liệu (Export)**.
4. File JSON sẽ được tải về (tên dạng `backup_data_YYYY-MM-DD.json`).

## Bước 3: Lưu file an toàn

- Lưu file vào ổ đĩa hoặc USB, đặt tên rõ ràng ví dụ: `backup_truoc_khi_chuyen_db_2025-02-04.json`.
- Nếu có nhiều máy đang dùng, hãy xuất từ **máy có dữ liệu đầy đủ nhất** (máy chính).

## Bước 4: Dùng file này để import vào Database

Sau khi backend có endpoint **Import từ file backup**, bạn sẽ dùng chính file này để nạp dữ liệu vào database (Bước 3 trong phương án chuyển database).

---

**Lưu ý:** File export chứa **mật khẩu tài khoản** (dạng plain text trong JSON). Hãy bảo mật file, không gửi hoặc lưu ở nơi không an toàn. Khi chuyển sang database, mật khẩu sẽ được lưu dạng hash.
