"""
Import dữ liệu từ file backup (JSON export từ trình duyệt) vào database.
Chỉ dùng một lần khi chuyển từ localStorage sang DB.
"""
import json
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models

router = APIRouter(tags=["migration"])

# Ánh xạ key trong backup -> key lưu trong app_storage (doctors được tách thành nhiều key)
DOCTORS_KEYS = ["lanhdao", "cot1", "cot2", "cot3", "partime", "khac"]


def _flatten_backup_to_storage(backup: Dict[str, Any]) -> Dict[str, str]:
    """Chuyển backup (có doctors là object) thành dict key -> value_json cho bảng app_storage."""
    out = {}
    doctors = backup.get("doctors") or {}
    mapping = {
        "lanhdao": "doctorsLanhdao",
        "cot1": "doctorscot1",
        "cot2": "doctorscot2",
        "cot3": "doctorscot3",
        "partime": "doctorsPartime",
        "khac": "doctorsKhac",
    }
    for g in DOCTORS_KEYS:
        storage_key = mapping.get(g, f"doctors{g}")
        val = doctors.get(g)
        out[storage_key] = json.dumps(val if val is not None else [])

    # Các key còn lại giữ nguyên tên (top-level trong backup)
    skip = {"doctors", "version", "exportDate"}
    for key, value in backup.items():
        if key in skip:
            continue
        out[key] = json.dumps(value) if value is not None else "null"
    return out


@router.post("/import")
def import_backup(body: Dict[str, Any], db: Session = Depends(get_db)):
    """
    Import dữ liệu từ file backup (format export của ứng dụng).
    Gửi body JSON đúng format export (có doctors, accounts, leaveSubmissions, ...).
    Sẽ ghi đè toàn bộ dữ liệu hiện có trong app_storage.
    """
    if not body:
        raise HTTPException(status_code=400, detail="Body rỗng")
    if "doctors" not in body and "accounts" not in body:
        raise HTTPException(
            status_code=400,
            detail="Thiếu doctors hoặc accounts. File backup không đúng định dạng.",
        )

    flat = _flatten_backup_to_storage(body)
    for key, value_json in flat.items():
        row = db.query(models.AppStorage).filter(models.AppStorage.key == key).first()
        if row:
            row.value_json = value_json
        else:
            row = models.AppStorage(key=key, value_json=value_json)
            db.add(row)
    db.commit()
    return {"ok": True, "keys_imported": len(flat)}
