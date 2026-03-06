import json
from typing import Any, Dict

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models
from ..deps import get_current_user


router = APIRouter(tags=["bangma"])

BANGMA_KEY = "bangmaCodes"


class BangmaPayload(BaseModel):
    """Payload lưu toàn bộ bảng mã trong trang Bangma."""

    staff: Dict[str, Dict[str, Any]] | None = None
    surgery: Dict[str, Dict[str, Any]] | None = None
    packages: Dict[str, Dict[str, Any]] | None = None
    nutrition: Dict[str, Dict[str, Any]] | None = None


def _get_bangma_codes(db: Session) -> Dict[str, Any]:
    row = (
        db.query(models.AppStorage)
        .filter(models.AppStorage.key == BANGMA_KEY)
        .first()
    )
    if not row or not row.value_json:
        return {}
    try:
        data = json.loads(row.value_json)
        if isinstance(data, dict):
            return data
        return {}
    except Exception:
        return {}


def _save_bangma_codes(db: Session, data: Dict[str, Any]) -> None:
    value_json = json.dumps(data, ensure_ascii=False)
    row = (
        db.query(models.AppStorage)
        .filter(models.AppStorage.key == BANGMA_KEY)
        .first()
    )
    if row:
        row.value_json = value_json
    else:
        row = models.AppStorage(key=BANGMA_KEY, value_json=value_json)
        db.add(row)
    db.commit()


@router.get("/export")
def get_bangma_export(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Lấy toàn bộ dữ liệu bảng mã của trang Bangma:
    - staff:  Mã nhân viên
    - surgery: Mã phẫu thuật
    - packages: Mã gói mổ + đẻ
    - nutrition: Mã dinh dưỡng
    """

    data = _get_bangma_codes(db)
    # Đảm bảo luôn trả về đủ 4 khóa để frontend dễ xử lý
    return {
        "staff": data.get("staff") or {},
        "surgery": data.get("surgery") or {},
        "packages": data.get("packages") or {},
        "nutrition": data.get("nutrition") or {},
    }


@router.put("/export")
def put_bangma_export(
    body: BangmaPayload,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Ghi đè toàn bộ dữ liệu bảng mã của trang Bangma.
    Được gọi từ frontend mỗi khi người dùng chỉnh sửa / thêm / xóa.
    """

    data = _get_bangma_codes(db)
    # Cập nhật từng phần, nếu body nào None thì giữ nguyên dữ liệu cũ (nếu có)
    if body.staff is not None:
        data["staff"] = body.staff
    if body.surgery is not None:
        data["surgery"] = body.surgery
    if body.packages is not None:
        data["packages"] = body.packages
    if body.nutrition is not None:
        data["nutrition"] = body.nutrition

    _save_bangma_codes(db, data)
    return {"success": True}

