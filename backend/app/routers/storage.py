"""
API đọc/ghi dữ liệu ứng dụng (thay localStorage).
- GET: công khai (strip mật khẩu khỏi accounts)
- PUT: yêu cầu JWT (hash mật khẩu trước khi lưu)
"""
import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth_utils import hash_accounts_passwords, strip_passwords_from_accounts
from ..database import get_db
from .. import models
from ..deps import get_current_user_optional

router = APIRouter(tags=["storage"])

STORAGE_KEYS_ORDER = [
    "doctorsLanhdao", "doctorscot1", "doctorscot2", "doctorscot3", "doctorsPartime", "doctorsKhac",
    "accounts", "passwordRequests", "leaveSubmissions", "permissions", "permissionTabs",
    "quanlynghiphepData", "maxCountByWeekday", "fixedScheduleData", "holidayMarkedDates", "holidayLabels",
    "cvcot1Data", "cvcot23Data", "khamhotropkData", "khamsomData", "khamcaugiayData", "khamcaugiay20hData", "khamlongbienData",
    "khamsanvipData", "sieuamvipData", "tructruaData", "tieuphauData", "livetreamData", "livetreamDoctorList",
    "tang4Data", "tang4Notes", "hoichancot1ScheduleData",     "phumoData", "phumoDoctorList", "tructhuongtruData", "tructhuongtruDoctorList",
    "lamviechangngayData", "lamviechangngayDoctorList", "lichlamviecData", "quydinhData",
]


def _storage_to_export_shape(rows: List[models.AppStorage], strip_passwords: bool = True) -> Dict[str, Any]:
    """Chuyển danh sách row app_storage thành object giống backup. strip_passwords: loại mật khẩu khỏi accounts."""
    by_key = {r.key: r.value_json for r in rows}
    out = {}
    doctors = {}
    doctor_keys = [
        ("doctorsLanhdao", "lanhdao"),
        ("doctorscot1", "cot1"),
        ("doctorscot2", "cot2"),
        ("doctorscot3", "cot3"),
        ("doctorsPartime", "partime"),
        ("doctorsKhac", "khac"),
    ]
    for storage_key, doc_key in doctor_keys:
        if storage_key in by_key:
            try:
                doctors[doc_key] = json.loads(by_key[storage_key] or "[]")
            except Exception:
                doctors[doc_key] = []
    if doctors:
        out["doctors"] = doctors

    doctor_storage_keys = {k for k, _ in doctor_keys}
    for key in by_key:
        if key in doctor_storage_keys:
            continue
        try:
            val = json.loads(by_key[key] or "null")
            if key == "accounts" and strip_passwords and isinstance(val, dict):
                val = strip_passwords_from_accounts(val)
            out[key] = val
        except Exception:
            out[key] = None
    return out


def _export_shape_to_storage(data: Dict[str, Any]) -> Dict[str, str]:
    """Chuyển object dạng backup thành key -> value_json. Hash mật khẩu trong accounts trước khi lưu."""
    out = {}
    doctors = data.get("doctors") or {}
    for g, storage_key in [
        ("lanhdao", "doctorsLanhdao"),
        ("cot1", "doctorscot1"),
        ("cot2", "doctorscot2"),
        ("cot3", "doctorscot3"),
        ("partime", "doctorsPartime"),
        ("khac", "doctorsKhac"),
    ]:
        val = doctors.get(g)
        out[storage_key] = json.dumps(val if val is not None else [])
    skip = {"doctors"}
    for key, value in data.items():
        if key in skip:
            continue
        if key == "accounts" and isinstance(value, dict):
            value = hash_accounts_passwords(value)
        out[key] = json.dumps(value) if value is not None else "null"
    return out


@router.get("/export")
def get_full_export(db: Session = Depends(get_db)):
    """
    Lấy toàn bộ dữ liệu ứng dụng (format giống backup).
    Frontend gọi một lần khi load trang, gán vào các biến thay vì đọc localStorage.
    """
    rows = db.query(models.AppStorage).all()
    return _storage_to_export_shape(rows)


def _has_any_accounts(db: Session) -> bool:
    """Kiểm tra DB đã có accounts chưa."""
    row = db.query(models.AppStorage).filter(models.AppStorage.key == "accounts").first()
    if not row or not row.value_json:
        return False
    try:
        data = json.loads(row.value_json)
        return isinstance(data, dict) and len(data) > 0
    except Exception:
        return False


@router.put("/export")
def put_full_export(
    body: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    Ghi toàn bộ dữ liệu (format giống backup).
    Yêu cầu JWT (trừ lần bootstrap đầu tiên khi DB chưa có accounts).
    Mật khẩu trong accounts được hash trước khi lưu.
    """
    if not current_user and _has_any_accounts(db):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Chưa đăng nhập. Vui lòng đăng nhập để đồng bộ dữ liệu.",
        )
    try:
        flat = _export_shape_to_storage(body)
        for key, value_json in flat.items():
            row = db.query(models.AppStorage).filter(models.AppStorage.key == key).first()
            if row:
                row.value_json = value_json
            else:
                row = models.AppStorage(key=key, value_json=value_json)
                db.add(row)
        db.commit()
        return {"ok": True, "keys_saved": len(flat)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
