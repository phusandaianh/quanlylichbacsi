"""
Reset mật khẩu tài khoản admin trong DB local (SQLite) `backend/app.db`.

Mục đích: khi không đăng nhập được vì admin đã đổi mật khẩu trước đó.

Usage:
  python scripts/reset_admin_password.py
  python scripts/reset_admin_password.py <new_password>
  python scripts/reset_admin_password.py <new_password> --db backend/app.db
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, Optional, Tuple


def _print(*args: object) -> None:
    # Tránh lỗi encoding trên Windows console
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    print(*args)


def _parse_args(argv: list[str]) -> Tuple[str, Path]:
    new_pw = "admin123"
    db_path = Path("backend") / "app.db"

    args = argv[1:]
    if args and not args[0].startswith("--"):
        new_pw = args.pop(0)

    i = 0
    while i < len(args):
        a = args[i]
        if a == "--db" and i + 1 < len(args):
            db_path = Path(args[i + 1])
            i += 2
            continue
        i += 1

    return new_pw, db_path


def _load_accounts(con) -> Tuple[Optional[int], Dict[str, Any]]:
    row = con.execute(
        "SELECT id, value_json FROM app_storage WHERE key=? LIMIT 1", ("accounts",)
    ).fetchone()
    if not row:
        return None, {}
    storage_id, value_json = row[0], (row[1] or "")
    try:
        data = json.loads(value_json) if value_json else {}
        return storage_id, data if isinstance(data, dict) else {}
    except Exception:
        return storage_id, {}


def _find_admin(accounts: Dict[str, Any]) -> Optional[str]:
    for k, v in (accounts or {}).items():
        if isinstance(v, dict) and v.get("role") == "admin":
            return k
    return None


def main() -> int:
    new_pw, db_path = _parse_args(sys.argv)
    db_path = db_path.resolve()

    if not new_pw:
        _print("❌ Mật khẩu mới trống. Hãy truyền <new_password>.")
        return 2

    if not db_path.exists():
        _print(f"❌ Không tìm thấy DB: {db_path}")
        _print("   Gợi ý: chạy app một lần để tạo DB, hoặc truyền đúng đường dẫn bằng --db.")
        return 2

    # Import hash_password từ backend để đồng bộ thuật toán / rounds
    try:
        # đảm bảo import được package `backend` khi chạy từ thư mục `scripts/`
        repo_root = Path(__file__).resolve().parent.parent
        if str(repo_root) not in sys.path:
            sys.path.insert(0, str(repo_root))
        os.chdir(repo_root)
        from backend.app.auth_utils import hash_password  # type: ignore
    except Exception as e:
        _print("❌ Không import được backend.app.auth_utils.hash_password:", e)
        return 2

    import sqlite3

    # Retry nhẹ nếu DB đang bị lock bởi app đang chạy
    last_err: Optional[Exception] = None
    for attempt in range(1, 6):
        try:
            con = sqlite3.connect(str(db_path), timeout=5)
            con.execute("PRAGMA busy_timeout = 5000")
            storage_id, accounts = _load_accounts(con)

            admin_key = _find_admin(accounts)
            if not admin_key:
                admin_key = "admin"
                accounts[admin_key] = {
                    "username": "admin",
                    "password": "",
                    "role": "admin",
                    "name": "Quản Trị Viên",
                }

            acc = accounts.get(admin_key)
            if not isinstance(acc, dict):
                acc = {"username": "admin", "role": "admin", "name": "Quản Trị Viên"}
            acc["username"] = acc.get("username") or "admin"
            acc["role"] = "admin"
            acc["name"] = acc.get("name") or "Quản Trị Viên"
            acc["password"] = hash_password(new_pw)
            accounts[admin_key] = acc

            value_json = json.dumps(accounts, ensure_ascii=False)
            if storage_id is None:
                con.execute(
                    "INSERT INTO app_storage(key, value_json) VALUES(?, ?)",
                    ("accounts", value_json),
                )
            else:
                con.execute(
                    "UPDATE app_storage SET value_json=? WHERE id=?",
                    (value_json, storage_id),
                )
            con.commit()
            con.close()

            _print("✅ Đã reset mật khẩu admin thành công.")
            _print(f"- DB: {db_path}")
            _print(f"- Username: admin")
            _print(f"- Mật khẩu mới: {new_pw}")
            return 0
        except Exception as e:
            last_err = e
            # sqlite lock
            time.sleep(0.6 * attempt)

    _print("❌ Reset mật khẩu thất bại sau nhiều lần thử.")
    if last_err:
        _print("Chi tiết lỗi:", last_err)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

