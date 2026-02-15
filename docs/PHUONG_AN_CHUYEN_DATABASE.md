# Phương án chuyển dữ liệu từ trình duyệt (localStorage) sang database

Mục tiêu: dùng dữ liệu trên nhiều máy, dễ bảo trì, dễ mở rộng, **giữ nguyên toàn bộ dữ liệu hiện tại**.

---

## 1. Tổng quan dữ liệu hiện lưu trên trình duyệt

| Key localStorage | Mô tả | Kiểu dữ liệu (JSON) | Ghi chú |
|-----------------|--------|---------------------|--------|
| **leaveSubmissions** | Đơn đăng ký nghỉ phép | `[]` mảng đơn | Core |
| **doctorsLanhdao**, **doctorscot1**, **doctorscot2**, **doctorscot3**, **doctorsPartime**, **doctorsKhac** | Danh sách bác sĩ theo cột| `[]` mảng `{id, name, displayName, phone}` | Đã có API /doctors (theo group) |
| **accounts** | Tài khoản đăng nhập | `{}` key=username, value={name, password, role, notifications} | Nhạy cảm, cần mã hóa mật khẩu |
| **passwordRequests** | Yêu cầu đổi mật khẩu | `[]` | |
| **currentUser** | Phiên đăng nhập hiện tại | `{name, role}` hoặc null | Session, có thể vẫn lưu cookie/token |
| **permissions** | Phân quyền theo bác sĩ/tab | `{}` | |
| **permissionTabs** | Danh sách tab dùng cho phân quyền | `[]` | Cấu hình |
| **quanlynghiphepData** | Dữ liệu lịch nghỉ phép (đã duyệt theo ngày) | `{}` | Phức tạp |
| **maxCountByWeekday** | Số BS được nghỉ tối đa theo thứ | `{}` | |
| **fixedScheduleData** | Lịch nghỉ cố định theo cột/thứ | `{}` | |
| **lichlamviecData** | Lịch làm việc 10 ngày | `{}` | |
| **quydinhData** | Nội dung quy định chung (tabs, nội dung) | `{}` | |
| **cvcot1Data**, **cvcot23Data** | Lịch cv cột1, cột2+3 | `[]` | |
| **khamhotropkData** | Khám hỗ trợ PK | `[]` | |
| **khamsomData**, **khamcaugiay20hData**, **khamsanvipData**, **sieuamvipData** | Lịch theo ngày (1 hoặc 2 ca/ngày) | `{}` key=YYYY-MM-DD | |
| **tructruaData**, **tieuphauData** | Lịch trực trưa, tiểu phẫu | `{}` | |
| **tructhuongtruData**, **lamviechangngayData** | Lịch trực thường trú, khám chủ nhật | `{}` | |
| **phumoData** | Lịch phụ mổ (theo thứ + notes) | `{thu2..thu7, notes}` | |
| **livetreamData**, **tang4Data** | Lịch livetream, tầng 4 | `[]` | |
| **tang4Notes** | Ghi chú tầng 4 | string | |
| **hoichancot1ScheduleData** | Lịch hội chẩn cột1 (schedule + notes) | `{schedule: [], notes: ""}` | |

---

## 2. Kiến trúc đề xuất

### 2.1 Backend (giữ/ mở rộng)

- **Công nghệ:** Python 3, FastAPI, SQLAlchemy, SQLite (có thể đổi PostgreSQL sau).
- **Vị trí:** Thư mục `backend/` (đã có), chạy cùng app gốc qua `app.py` (mount `/api`).

### 2.2 Database

- **File:** `backend/app.db` (SQLite) hoặc kết nối PostgreSQL khi triển khai server.
- **Schema:** Bảng quan hệ cho từng nhóm dữ liệu; một số bảng “key-value” hoặc JSON cho dữ liệu dạng object linh hoạt.

### 2.3 API

- REST API dưới `/api/...`.
- Frontend: gọi API khi có mạng; có thể hỗ trợ **offline** (localStorage) tùy chọn sau.
- **Bảo mật:** Đăng nhập → JWT hoặc session; API cần kiểm tra quyền (admin / bác sĩ).

---

## 3. Thiết kế bảng database (gợi ý)

### 3.1 Đã có

- **doctors** – id, name, display_name, phone, group (lanhdao, cot1, cot2, cot3, partime, khac).

### 3.2 Cần thêm

| Bảng | Mục đích | cộtchính |
|------|----------|-----------|
| **accounts** | Tài khoản đăng nhập | id, username (unique), password_hash, full_name, role, created_at |
| **password_requests** | Yêu cầu đổi mật khẩu | id, username, requested_at, resolved |
| **leave_submissions** | Đơn nghỉ phép | id, doctor_name, date, period (morning/afternoon/full), status, notes, created_at |
| **permissions** | Phân quyền theo bác sĩ/tab | id, doctor_key, tab_id, can_edit (bool) |
| **permission_tabs** | Danh sách tab phân quyền | id, tab_id, name, sort_order |
| **schedule_config** | Cấu hình lịch (max count, fixed schedule, v.v.) | id, key (unique), value_json |
| **schedule_data** | Lịch theo ngày (khám sớm, trực trưa, cầu giấy 20h, VIP…) | id, schedule_type, date (YYYY-MM-DD), shift (optional: morning/afternoon), value_json |
| **schedule_tables** | Lịch dạng bảng (cv cột1/2+3, phụ mổ, livetream, tầng 4, …) | id, table_type, row_data_json, sort_order |
| **quydinh** | Quy định chung | id, key, value_json |
| **notifications** | Thông báo theo user | id, username, message, read, created_at |

- **schedule_type** (trong `schedule_data`): ví dụ `khamsom`, `khamcaugiay20h`, `khamsanvip`, `sieuamvip`, `tructrua`, `tieuphau`, `tructhuongtru`, `lamviechangngay`.
- **table_type** (trong `schedule_tables`): ví dụ `cvcot1`, `cvcot23`, `khamhotropk`, `phumo`, `livetream`, `tang4`, `hoichancot1`, `lichlamviec`.

Dữ liệu phức tạp (object/array) lưu trong cột**value_json** / **row_data_json** (JSON string) để giảm thay đổi schema khi thêm tính năng.

---

## 4. API đề xuất (REST)

| Nhóm | Method | Endpoint (gợi ý) | Mô tả |
|------|--------|-------------------|--------|
| Doctors | GET/POST/PUT/DELETE | `/api/doctors` | Đã có |
| Auth | POST | `/api/auth/login` | Đăng nhập, trả token/session |
| Auth | POST | `/api/auth/logout` | Đăng xuất |
| Accounts | GET/POST/PUT | `/api/accounts` | CRUD tài khoản (admin) |
| Leave | GET/POST/PUT | `/api/leave/submissions` | Đơn nghỉ phép |
| Leave | GET/PUT | `/api/leave/config` | maxCountByWeekday, fixedScheduleData, quanlynghiphepData |
| Permissions | GET/PUT | `/api/permissions` | permissions + permissionTabs |
| Schedules (theo ngày) | GET/PUT | `/api/schedules/{type}?from=&to=` | khamsom, tructrua, khamsanvip, … |
| Schedules (bảng) | GET/POST/PUT/DELETE | `/api/schedules/tables/{table_type}` | cvcot1, phumo, tang4, … |
| Config | GET/PUT | `/api/config/quydinh` | quydinhData |
| Config | GET/PUT | `/api/config/schedule_config` | Các config key-value khác |
| Migration | POST | `/api/migration/import` | Nhận JSON export từ trình duyệt, ghi vào DB (một lần) |

---

## 5. Các bước thực hiện (giữ nguyên dữ liệu)

### Bước 1: Sao lưu dữ liệu hiện tại

1. Trên mỗi máy đang dùng: vào **Quản Lý Tài Khoản → Sao Lưu → Xuất Dữ Liệu (Export)**.
2. Lưu file JSON an toàn (ví dụ `backup_YYYY-MM-DD_may_A.json`). Nếu có nhiều máy, export từng máy một.
3. Có thể merge nhiều file (ưu tiên máy “chính”) bằng script nhỏ hoặc import lần lượt (ghi đè theo quy tắc rõ ràng).

### Bước 2: Mở rộng backend và database

1. Tạo thêm **models** (SQLAlchemy) cho các bảng ở mục 3.
2. Tạo **migration** (hoặc `create_all`) để tạo bảng mới; giữ bảng `doctors` hiện có.
3. Viết API theo mục 4 (từng nhóm: auth → accounts → leave → permissions → schedules → config).
4. Thêm endpoint **POST /api/migration/import**: nhận body JSON đúng format export hiện tại, parse và ghi vào các bảng tương ứng (accounts hash mật khẩu trước khi lưu).

### Bước 3: Import dữ liệu vào database (một lần)

1. Chọn một file backup đầy đủ nhất (đã xuất ở Bước 1).
2. **Cách 1 – Script:** Đảm bảo server đang chạy (`python app.py`), rồi chạy:
   ```bash
   pip install requests
   python scripts/import_backup_to_db.py path/to/backup_data_YYYY-MM-DD.json
   ```
3. **Cách 2 – API trực tiếp:** Gửi POST đến `http://localhost:8000/api/migration/import`, body là nội dung JSON của file backup.
4. Kiểm tra: gọi GET `http://localhost:8000/api/storage/export` để xem dữ liệu đã vào đủ chưa.

### Bước 4: Chuyển frontend sang dùng API (đã thực hiện)

1. **Load từ server:** Trong `app.js`, bật `USE_DATABASE_BACKEND = true`. Khi mở trang, app gọi GET `/api/storage/export`; nếu thành công thì gán dữ liệu vào các biến (doctors, accounts, submissions, …), nếu lỗi thì giữ dữ liệu đã đọc từ localStorage.
2. **Ghi lên server:** Trong Quản Lý Tài Khoản → Sao Lưu & Khôi Phục, có nút **☁️ Đồng bộ lên server**. Bấm để gửi toàn bộ dữ liệu hiện tại lên PUT `/api/storage/export`. Nên bấm sau khi chỉnh sửa xong để nhiều máy dùng chung DB thấy dữ liệu mới.
3. **Fallback:** Nếu không kết nối được server (chưa chạy server hoặc mạng lỗi), app vẫn dùng dữ liệu từ localStorage; khi có server lại, load trang hoặc bấm Đồng bộ để đồng bộ.

### Bước 5: Tắt ghi localStorage (trừ session/tùy chọn)

1. Sau khi mọi tính năng chạy ổn với API: bỏ (hoặc comment) các chỗ `localStorage.setItem` / `StorageUtil.saveJson` cho dữ liệu đã chuyển.
2. Có thể giữ `currentUser` trong sessionStorage hoặc cookie do server quản lý; hoặc JWT trong memory + refresh.

### Bước 6: Bảo trì và mở rộng

1. **Backup DB:** Định kỳ copy `app.db` (hoặc dump PostgreSQL) ra nơi an toàn.
2. **Thêm tính năng:** Thêm bảng/cộthoặc endpoint mới, frontend gọi API mới; không phụ thuộc thêm key localStorage.
3. **Nhiều máy:** Đặt backend + DB trên một server (hoặc cloud); mọi máy dùng chung URL (ví dụ `https://your-server/api`). Cấu hình `API_BASE_URL` trong frontend (hoặc file env) trỏ tới server đó.

---

## 6. Lưu ý bảo mật và an toàn dữ liệu

- **Mật khẩu:** Không lưu plain text. Dùng bcrypt (hoặc argon2) hash trước khi ghi vào `accounts.password_hash`.
- **HTTPS:** Khi triển khai thật, dùng HTTPS để bảo vệ cookie/token và dữ liệu.
- **Phân quyền API:** Mỗi endpoint kiểm tra role (admin / bác sĩ) và chỉ trả về / cho phép sửa đúng phạm vi.
- **Import một lần:** Endpoint `/api/migration/import` nên bảo vệ (chỉ admin, hoặc tắt sau lần import đầu) để tránh ghi đè dữ liệu.

---

## 7. Tóm tắt lợi ích

| Hiện tại (localStorage) | Sau khi chuyển (database + API) |
|-------------------------|----------------------------------|
| Mỗi máy một bản dữ liệu | Một nguồn dữ liệu, dùng chung nhiều máy |
| Khó backup tập trung | Backup một file DB hoặc dump định kỳ |
| Thêm tính năng = thêm key, dễ lộn xộn | Thêm bảng/endpoint, schema rõ ràng |
| Dữ liệu có thể mất khi xóa cache | Dữ liệu nằm trên server, không phụ thuộc cache trình duyệt |

Dữ liệu hiện tại được **giữ nguyên** nhờ export → import vào DB qua bước 1 và 3; frontend chỉ đổi từ đọc/ghi localStorage sang gọi API tương ứng.
