"""
Script import file backup (JSON) vào database qua API.
Chạy khi server đang chạy (python app.py hoặc uvicorn).

Cách dùng:
  python scripts/import_backup_to_db.py path/to/backup_data_2025-02-04.json

Hoặc từ thư mục gốc dự án:
  python -m scripts.import_backup_to_db backup_data_2025-02-04.json
"""
import json
import sys

try:
    import requests
except ImportError:
    print("Cần cài: pip install requests")
    sys.exit(1)

API_URL = "http://localhost:8000/api/migration/import"


def main():
    if len(sys.argv) < 2:
        print("Cách dùng: python scripts/import_backup_to_db.py <file_backup.json>")
        sys.exit(1)
    path = sys.argv[1]
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "doctors" not in data and "accounts" not in data:
        print("File không đúng định dạng backup (thiếu doctors hoặc accounts).")
        sys.exit(1)
    try:
        r = requests.post(API_URL, json=data, timeout=30)
        r.raise_for_status()
        out = r.json()
        print(f"✅ Đã import thành công. Số key: {out.get('keys_imported', 0)}")
    except requests.exceptions.ConnectionError:
        print("❌ Không kết nối được server. Hãy chạy server (python app.py) trước.")
        sys.exit(1)
    except requests.exceptions.HTTPError as e:
        print(f"❌ Lỗi API: {e.response.status_code} - {e.response.text}")
        sys.exit(1)


if __name__ == "__main__":
    main()
