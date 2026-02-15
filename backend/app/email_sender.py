"""
Gửi email qua SMTP. Cấu hình qua biến môi trường.
Dùng cho Gmail: SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_USER=email, SMTP_PASSWORD=App Password.
"""
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, Tuple

# Load biến môi trường từ .env (nếu có)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Cấu hình SMTP (mặc định Gmail)
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
# Một số người đặt tên biến là SMTP_APP_PASSWORD
if not SMTP_PASSWORD:
    SMTP_PASSWORD = os.getenv("SMTP_APP_PASSWORD", "").strip()


def is_smtp_configured() -> bool:
    """Kiểm tra đã cấu hình SMTP đủ để gửi email chưa."""
    return bool(SMTP_USER and SMTP_PASSWORD)


def send_email(
    to_email: str,
    subject: str,
    body_text: str,
    body_html: Optional[str] = None,
) -> Tuple[bool, str]:
    """
    Gửi email qua SMTP.
    Returns: (success: bool, message: str)
    """
    if not is_smtp_configured():
        return False, "Chưa cấu hình SMTP (SMTP_USER, SMTP_PASSWORD trong .env)."

    to_email = (to_email or "").strip()
    if not to_email:
        return False, "Email người nhận trống."

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SMTP_USER
    msg["To"] = to_email
    msg.attach(MIMEText(body_text, "plain", "utf-8"))
    if body_html:
        msg.attach(MIMEText(body_html, "html", "utf-8"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
        return True, "Đã gửi email thành công."
    except smtplib.SMTPAuthenticationError as e:
        return False, f"Lỗi xác thực SMTP (kiểm tra user/mật khẩu App Password): {e}"
    except Exception as e:
        return False, str(e)
