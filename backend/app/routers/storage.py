"""
API đọc/ghi dữ liệu ứng dụng (thay localStorage).
Format trả về giống backup export để frontend dùng thay cho load từ localStorage.
"""
import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models

router = APIRouter(tags=["storage"])

STORAGE_KEYS_ORDER = [
    "doctorsLanhdao", "doctorscot1", "doctorscot2", "doctorscot3", "doctorsPartime", "doctorsKhac",
    "accounts", "passwordRequests", "leaveSubmissions", "permissions", "permissionTabs",
    "quanlynghiphepData", "maxCountByWeekday", "fixedScheduleData", "holidayMarkedDates", "holidayLabels",
    "cvcot1Data", "cvcot23Data", "khamhotropkData", "khamsomData", "khamcaugiay20hData",
    "khamsanvipData", "sieuamvipData", "tructruaData", "tieuphauData", "livetreamData", "livetreamDoctorList",
    "tang4Data", "tang4Notes", "hoichancot1ScheduleData",     "phumoData", "tructhuongtruData", "tructhuongtruDoctorList",
    "lamviechangngayData", "lamviechangngayDoctorList", "lichlamviecData", "quydinhData",
]


def _storage_to_export_shape(rows: List[models.AppStorage]) -> Dict[str, Any]:
    """Chuyển danh sách row app_storage thành object giống backup (có doctors: { lanhdao, cot1, ... })."""
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
            out[key] = json.loads(by_key[key] or "null")
        except Exception:
            out[key] = None
    return out


def _export_shape_to_storage(data: Dict[str, Any]) -> Dict[str, str]:
    """Chuyển object dạng backup thành key -> value_json cho app_storage."""
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


@router.put("/export")
def put_full_export(body: Dict[str, Any], db: Session = Depends(get_db)):
    """
    Ghi toàn bộ dữ liệu (format giống backup).
    Frontend gọi khi cần lưu (thay cho ghi localStorage).
    """
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
