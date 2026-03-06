"""
Tiện ích bảo mật: hash mật khẩu (bcrypt), JWT.
"""
import os
import re
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

# JWT: dùng biến môi trường hoặc secret mặc định (nên đổi trong production)
JWT_SECRET = os.environ.get("JWT_SECRET", "quanlylichbacsi-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.environ.get("JWT_EXPIRE_HOURS", "24"))


def normalize_key(name: str) -> str:
    """Chuẩn hóa tên: bỏ dấu, khoảng trắng, lowercase."""
    import unicodedata
    s = (name or "").strip().lower()
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", "", s)


def hash_password(plain: str) -> str:
    """Hash mật khẩu bằng bcrypt."""
    if not plain:
        return ""
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """
    Xác minh mật khẩu. Hỗ trợ migration:
    - Nếu hashed là bcrypt ($2b$...) -> dùng passlib
    - Nếu plain text (chưa migrate) -> so sánh trực tiếp, trả về True nếu khớp
    """
    if not plain or not hashed:
        return False
    if hashed.startswith("$2b$") or hashed.startswith("$2a$"):
        return pwd_context.verify(plain, hashed)
    return plain == hashed


def hash_accounts_passwords(accounts: Dict[str, Any]) -> Dict[str, Any]:
    """
    Hash mật khẩu plain text trong accounts trước khi lưu DB.
    Nếu đã là hash (bắt đầu $2b$) thì giữ nguyên.
    """
    if not accounts or not isinstance(accounts, dict):
        return accounts
    out = {}
    for k, v in accounts.items():
        if isinstance(v, dict) and "password" in v:
            pw = v.get("password", "")
            if pw and not (pw.startswith("$2b$") or pw.startswith("$2a$")):
                v = {**v, "password": hash_password(pw)}
        out[k] = v
    return out


def strip_passwords_from_accounts(accounts: Dict[str, Any]) -> Dict[str, Any]:
    """Loại bỏ mật khẩu khỏi accounts khi trả về cho frontend."""
    if not accounts or not isinstance(accounts, dict):
        return accounts
    out = {}
    for k, v in accounts.items():
        if isinstance(v, dict):
            v = {kk: vv for kk, vv in v.items() if kk != "password"}
        out[k] = v
    return out


def create_access_token(key: str, username: str, role: str, name: str) -> str:
    """Tạo JWT token."""
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {
        "sub": key,
        "username": username,
        "role": role,
        "name": name,
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Optional[Dict]:
    """Giải mã JWT, trả về payload hoặc None nếu invalid."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        return None
