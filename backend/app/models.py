from sqlalchemy import Column, Integer, String, Text

from .database import Base


class Doctor(Base):
    """
    Bác sĩ / tài khoản hiển thị trên các cột:
    - group: lanhdao, cot1, cot2, cot3, partime, khac, ...
    """

    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # Họ và tên đầy đủ
    display_name = Column(String, nullable=False)  # Tên hiển thị ngắn gọn
    phone = Column(String, nullable=True)
    group = Column(String, index=True, nullable=False)


class AppStorage(Base):
    """
    Lưu trữ key-value cho toàn bộ dữ liệu ứng dụng (thay thế localStorage).
    key: tên giống localStorage (doctorsLanhdao, accounts, leaveSubmissions, ...)
    value_json: chuỗi JSON của giá trị.
    """

    __tablename__ = "app_storage"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(128), unique=True, nullable=False, index=True)
    value_json = Column(Text, nullable=True)  # JSON string

