"""
Dependencies FastAPI: xác thực JWT, kiểm tra quyền.
"""
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .auth_utils import decode_token

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """
    Lấy user từ JWT trong header Authorization.
    Trả về dict {key, username, role, name} hoặc raise 401.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {
        "key": payload.get("sub", ""),
        "username": payload.get("username", ""),
        "role": payload.get("role", "doctor"),
        "name": payload.get("name", ""),
    }


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """Lấy user nếu có token, không thì trả về None."""
    if not credentials or not credentials.credentials:
        return None
    payload = decode_token(credentials.credentials)
    if not payload:
        return None
    return {
        "key": payload.get("sub", ""),
        "username": payload.get("username", ""),
        "role": payload.get("role", "doctor"),
        "name": payload.get("name", ""),
    }


def require_admin(current_user: dict = Depends(get_current_user)):
    """Chỉ cho phép admin."""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ admin mới có quyền thực hiện thao tác này.",
        )
    return current_user
