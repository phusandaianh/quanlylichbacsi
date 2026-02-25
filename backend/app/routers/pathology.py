import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models


router = APIRouter(tags=["pathology"])

PATHOLOGY_KEY = "pathologyData"


class PathologyItem(BaseModel):
    loai: str = Field(..., min_length=1)
    maSo: str = Field(..., min_length=1)
    tenDichVu: str = Field(..., min_length=1)
    gia: int = Field(..., ge=0)


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
) -> dict:
    """
    Ghi đè toàn bộ danh sách mô bệnh học trên server bằng dữ liệu từ client.
    Dùng cho chức năng "Đồng bộ server" từ trang pathology.html.
    """

    if not body:
        raise HTTPException(
            status_code=400,
            detail="Danh sách gửi lên đang rỗng.",
        )

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

