import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models
from ..deps import get_current_user


router = APIRouter(tags=["pathology"])

PATHOLOGY_KEY = "pathologyData"
PATHOLOGY_GPB_KEY = "pathologyGpbData"


class PathologyItem(BaseModel):
    loai: str = Field(..., min_length=1)
    maSo: str = Field(..., min_length=1)
    tenDichVu: str = Field(..., min_length=1)
    gia: int = Field(..., ge=0)


class PathologyGpbPayload(BaseModel):
    items: List[PathologyItem] = Field(default_factory=list)
    fav: dict = Field(default_factory=dict)


def _get_pathology_list(db: Session) -> List[dict]:
    row = (
        db.query(models.AppStorage)
        .filter(models.AppStorage.key == PATHOLOGY_KEY)
        .first()
    )
    if not row or not row.value_json:
        return []
    try:
        data = json.loads(row.value_json)
        if isinstance(data, list):
            return data
        return []
    except Exception:
        return []


def _save_pathology_list(db: Session, items: List[dict]) -> None:
    value_json = json.dumps(items, ensure_ascii=False)
    row = (
        db.query(models.AppStorage)
        .filter(models.AppStorage.key == PATHOLOGY_KEY)
        .first()
    )
    if row:
        row.value_json = value_json
    else:
        row = models.AppStorage(key=PATHOLOGY_KEY, value_json=value_json)
        db.add(row)
    db.commit()


def _get_json_dict(db: Session, key: str) -> dict:
    row = db.query(models.AppStorage).filter(models.AppStorage.key == key).first()
    if not row or not row.value_json:
        return {}
    try:
        data = json.loads(row.value_json)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _save_json_dict(db: Session, key: str, data: dict) -> None:
    value_json = json.dumps(data, ensure_ascii=False)
    row = db.query(models.AppStorage).filter(models.AppStorage.key == key).first()
    if row:
        row.value_json = value_json
    else:
        row = models.AppStorage(key=key, value_json=value_json)
        db.add(row)
    db.commit()


@router.get("/export")
def get_pathology_export(db: Session = Depends(get_db)) -> List[dict]:
    """
    Lấy toàn bộ danh sách dịch vụ xét nghiệm mô bệnh học đã lưu trên server.
    Trả về mảng [{loai, maSo, tenDichVu, gia}, ...].
    """

    return _get_pathology_list(db)


@router.put("/export")
def put_pathology_export(
    body: List[PathologyItem],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Ghi đè toàn bộ danh sách mô bệnh học trên server bằng dữ liệu từ client.
    Tự động đồng bộ giống tab Mã ICD (Bangma) - gọi mỗi khi thêm/sửa/xóa.
    Cho phép mảng rỗng để xóa hết dữ liệu trên server.
    """
    body = body or []

    unique_codes = set()
    for item in body:
        code = item.maSo.strip().lower()
        if code in unique_codes:
            raise HTTPException(
                status_code=400,
                detail=f"Mã số trùng lặp: {item.maSo}",
            )
        unique_codes.add(code)

    items = [item.dict() for item in body]
    _save_pathology_list(db, items)
    return {"success": True, "count": len(items)}


@router.get("/gpb/export")
def get_pathology_gpb_export(db: Session = Depends(get_db)) -> dict:
    """
    Dữ liệu tab "Giải phẫu bệnh" (tách khỏi mô bệnh học):
    - items: [{loai, maSo, tenDichVu, gia}, ...]
    - fav: { maSo: true, ... }
    """
    data = _get_json_dict(db, PATHOLOGY_GPB_KEY)
    items = data.get("items") if isinstance(data, dict) else None
    fav = data.get("fav") if isinstance(data, dict) else None
    return {
        "items": items if isinstance(items, list) else [],
        "fav": fav if isinstance(fav, dict) else {},
    }


@router.put("/gpb/export")
def put_pathology_gpb_export(
    body: PathologyGpbPayload,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Ghi đè dữ liệu tab "Giải phẫu bệnh" trên server.
    """
    items_in = body.items or []

    unique_codes = set()
    for item in items_in:
        code = item.maSo.strip().lower()
        if code in unique_codes:
            raise HTTPException(
                status_code=400,
                detail=f"Mã số trùng lặp: {item.maSo}",
            )
        unique_codes.add(code)

    items = [item.dict() for item in items_in]
    fav = body.fav or {}
    # Chỉ giữ favorite dạng {string: truthy}
    fav_clean = {str(k): True for k, v in fav.items() if v}
    _save_json_dict(db, PATHOLOGY_GPB_KEY, {"items": items, "fav": fav_clean})
    return {"success": True, "count": len(items), "fav_count": len(fav_clean)}

