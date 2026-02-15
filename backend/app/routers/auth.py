"""
API xác thực: đặt lại mật khẩu admin qua email.
Chỉ cho phép email admin đã đăng ký (hangocdai.pkq3@gmail.com).
Gửi mật khẩu tạm qua SMTP (Gmail) nếu cấu hình .env.
"""
import json
import os
import random
import string

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models
from ..email_sender import is_smtp_configured, send_email

router = APIRouter(tags=["auth"])

# Email admin được phép đặt lại mật khẩu (có thể ghi đè bằng biến môi trường)
ADMIN_RESET_EMAIL = os.getenv("ADMIN_RESET_EMAIL", "hangocdai.pkq3@gmail.com").strip().lower()


class RequestAdminResetBody(BaseModel):
    email: str


def _get_accounts_from_db(db: Session) -> dict:
    """Lấy object accounts từ bảng app_storage."""
    row = db.query(models.AppStorage).filter(models.AppStorage.key == "accounts").first()
    if not row or not row.value_json:
        return {}
    try:
        return json.loads(row.value_json)
    except Exception:
        return {}


def _save_accounts_to_db(db: Session, accounts: dict) -> None:
    """Lưu object accounts vào app_storage."""
    row = db.query(models.AppStorage).filter(models.AppStorage.key == "accounts").first()
    value_json = json.dumps(accounts)
    if row:
        row.value_json = value_json
    else:
        row = models.AppStorage(key="accounts", value_json=value_json)
        db.add(row)
    db.commit()


def _generate_temp_password(length: int = 8) -> str:
    """Tạo mật khẩu tạm (chữ + số)."""
    chars = string.ascii_letters + string.digits
    return "".join(random.choice(chars) for _ in range(length))


@router.post("/request-admin-reset")
def request_admin_reset(body: RequestAdminResetBody, db: Session = Depends(get_db)):
    """
    Admin quên mật khẩu: chỉ khi email trùng với email đăng ký admin mới được đặt lại.
    Mật khẩu tạm sẽ được gửi qua email (nếu cấu hình SMTP) hoặc trả về trong response (chế độ dev).
    """
    email = (body.email or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Vui lòng nhập email.")

    if email != ADMIN_RESET_EMAIL:
        raise HTTPException(
            status_code=400,
            detail="Email không được phép đặt lại mật khẩu admin. Chỉ email admin đã đăng ký mới được sử dụng.",
        )

    accounts = _get_accounts_from_db(db)
    if not accounts:
        raise HTTPException(
            status_code=404,
            detail="Chưa có dữ liệu tài khoản. Vui lòng đăng nhập một lần từ ứng dụng trước.",
        )

    # Tìm tài khoản admin (role = 'admin')
    admin_key = None
    for key, acc in accounts.items():
        if isinstance(acc, dict) and acc.get("role") == "admin":
            admin_key = key
            break

    if not admin_key:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy tài khoản admin trong hệ thống.",
        )

    temp_password = _generate_temp_password()
    accounts[admin_key]["password"] = temp_password
    _save_accounts_to_db(db, accounts)

    # Gửi mật khẩu tạm qua email nếu đã cấu hình SMTP
    email_sent = False
    if is_smtp_configured():
        subject = "⚠️ Đặt lại mật khẩu Admin - Quản lý lịch bác sĩ"
        warning = (
            "⚠️ CẢNH BÁO: Nếu KHÔNG phải bạn yêu cầu đặt lại mật khẩu, có thể ai đó đã nhấn nhầm. "
            "Mật khẩu cũ sẽ không dùng được nữa. Nếu bạn không yêu cầu, hãy bỏ qua email này và liên hệ quản trị."
        )
        body_text = (
            f"Xin chào,\n\n"
            f"{warning}\n\n"
            f"---\n\n"
            f"Mật khẩu tạm cho tài khoản Admin đã được tạo:\n\n"
            f"  Mật khẩu tạm: {temp_password}\n\n"
            f"Tên đăng nhập: admin\n\n"
            f"Sau khi đặt lại, mật khẩu cũ KHÔNG thể dùng lại — chỉ mật khẩu tạm trên mới hợp lệ.\n\n"
            f"Vui lòng đăng nhập bằng mật khẩu tạm và đổi mật khẩu ngay trong ứng dụng.\n\n"
            f"Trân trọng."
        )
        body_html = (
            f"<p>Xin chào,</p>"
            f"<p style='background:#fff3cd;padding:10px;border-left:4px solid #ffc107;border-radius:4px;'><strong>{warning}</strong></p>"
            f"<hr/>"
            f"<p>Mật khẩu tạm cho tài khoản <strong>Admin</strong> đã được tạo:</p>"
            f"<p><strong>Mật khẩu tạm:</strong> <code style='background:#f0f0f0;padding:4px 8px;'>{temp_password}</code></p>"
            f"<p><strong>Tên đăng nhập:</strong> admin</p>"
            f"<p><small>Sau khi đặt lại, mật khẩu cũ <strong>không thể dùng lại</strong> — chỉ mật khẩu tạm trên mới hợp lệ.</small></p>"
            f"<p>Vui lòng đăng nhập bằng mật khẩu tạm và đổi mật khẩu ngay trong ứng dụng.</p>"
            f"<p>Trân trọng.</p>"
        )
        success, err_msg = send_email(to_email=email, subject=subject, body_text=body_text, body_html=body_html)
        email_sent = success
        if not success:
            # Vẫn trả về tempPassword để admin có thể đăng nhập khi gửi email lỗi
            return {
                "ok": True,
                "message": f"Mật khẩu tạm đã được tạo nhưng gửi email thất bại: {err_msg}. Sử dụng mật khẩu tạm bên dưới để đăng nhập.",
                "tempPassword": temp_password,
            }

    if email_sent:
        return {
            "ok": True,
            "message": "Mật khẩu tạm đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư (và thư mục spam). Đăng nhập bằng mật khẩu tạm rồi đổi mật khẩu ngay.",
        }
    # Không cấu hình SMTP: trả về mật khẩu tạm trong response
    return {
        "ok": True,
        "message": "Mật khẩu tạm đã được tạo. Chưa cấu hình gửi email — sử dụng mật khẩu tạm bên dưới để đăng nhập, sau đó đổi mật khẩu.",
        "tempPassword": temp_password,
    }
