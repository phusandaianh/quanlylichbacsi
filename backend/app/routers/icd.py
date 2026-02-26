import json
import re
from html import unescape
from io import BytesIO
from pathlib import Path
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db, SessionLocal  # type: ignore
from .. import models


router = APIRouter(tags=["icd"])


ICD_FAVORITES_KEY = "icdFavorites"
ICD_MANUAL_KEY = "icdManual"
ICD_ALL_OVERRIDE_KEY = "icdAllOverride"

# Đường dẫn tới file HTML gốc chứa bảng mã ICD (ở root dự án)
BASE_DIR = Path(__file__).resolve().parents[3]
ICD_HTML_PATH = BASE_DIR / "Mã ICD.html"


def _get_icd_dict(db: Session, key: str) -> Dict[str, str]:
    row = db.query(models.AppStorage).filter(models.AppStorage.key == key).first()
    if not row or not row.value_json:
        return {}
    try:
        data = json.loads(row.value_json)
        if isinstance(data, dict):
            return {str(k): str(v) for k, v in data.items()}
        return {}
    except Exception:
        return {}


def _save_icd_dict(db: Session, key: str, data: Dict[str, str]) -> None:
    value_json = json.dumps(data, ensure_ascii=False)
    row = db.query(models.AppStorage).filter(models.AppStorage.key == key).first()
    if row:
        row.value_json = value_json
    else:
        row = models.AppStorage(key=key, value_json=value_json)
        db.add(row)
    db.commit()


class ICDCodeBody(BaseModel):
    code: str
    desc: str | None = None


def _extract_icd_from_html() -> Dict[str, str]:
    """
    Đọc file 'Mã ICD.html' và trích xuất { code: desc } từ các bảng .icd-table.
    Thực hiện đơn giản bằng regex, đủ dùng cho dữ liệu tĩnh hiện tại.
    """

    if not ICD_HTML_PATH.is_file():
        return {}

    html_text = ICD_HTML_PATH.read_text(encoding="utf-8", errors="ignore")
    out: Dict[str, str] = {}

    # Tìm tất cả <tr> trong bảng
    for row_match in re.finditer(r"<tr[^>]*>(.*?)</tr>", html_text, re.S | re.I):
        row_html = row_match.group(1)
        # Lấy tất cả ô <td>/<th> trong row
        cols = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row_html, re.S | re.I)
        if len(cols) < 3:
            continue
        # Bỏ hàng tiêu đề (thường có <th> hoặc chữ 'Mã ICD')
        header_check = "".join(cols).lower()
        if "mã icd" in header_check or "mã icd" in unescape(header_check):
            continue

        code_raw = cols[1]
        desc_raw = cols[2]

        # Loại bỏ thẻ HTML, unescape
        code = unescape(re.sub(r"<[^>]+>", "", code_raw)).strip()
        desc = unescape(re.sub(r"<[^>]+>", "", desc_raw)).strip()

        # Bỏ các dòng template JS còn sót (${highlightICD(...)})
        if "${" in code or "${" in desc:
            continue

        if code and desc and code not in out:
            out[code] = desc

    return out


@router.get("/all")
def get_all_icd() -> Dict[str, str]:
    """
    Lấy toàn bộ danh sách mã ICD chuẩn từ file 'Mã ICD.html'.
    Trả về dạng { code: desc }.
    """

    # Nếu có dữ liệu override từ Excel thì dùng, ngược lại đọc từ HTML gốc
    with SessionLocal() as db:  # type: ignore[call-arg]
        override = _get_icd_dict(db, ICD_ALL_OVERRIDE_KEY)

    if override:
        return override

    data = _extract_icd_from_html()
    # Nếu không còn file 'Mã ICD.html' hoặc file rỗng thì trả về dict rỗng
    # để frontend vẫn hoạt động (sử dụng favorites/manual/Excel upload).
    if not data:
        return {}
    return data


@router.get("/favorites")
def get_favorites(db: Session = Depends(get_db)) -> Dict[str, str]:
    """
    Trả về danh sách mã ICD yêu thích: { code: desc }.
    (desc được lưu lại tại thời điểm đánh dấu, để hiển thị nhanh).
    """

    return _get_icd_dict(db, ICD_FAVORITES_KEY)


@router.post("/favorites")
def add_favorite(body: ICDCodeBody, db: Session = Depends(get_db)) -> Dict[str, str]:
    """
    Đánh dấu 1 mã ICD là yêu thích. Cần gửi cả code và desc.
    """

    code = (body.code or "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="Thiếu mã ICD")
    desc = (body.desc or "").strip()

    fav = _get_icd_dict(db, ICD_FAVORITES_KEY)
    fav[code] = desc
    _save_icd_dict(db, ICD_FAVORITES_KEY, fav)
    return fav


@router.delete("/favorites")
def remove_favorite(body: ICDCodeBody, db: Session = Depends(get_db)) -> Dict[str, str]:
    """
    Bỏ đánh dấu yêu thích 1 mã ICD.
    """

    code = (body.code or "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="Thiếu mã ICD")

    fav = _get_icd_dict(db, ICD_FAVORITES_KEY)
    if code in fav:
        fav.pop(code)
        _save_icd_dict(db, ICD_FAVORITES_KEY, fav)
    return fav


@router.get("/manual")
def get_manual_icd(db: Session = Depends(get_db)) -> Dict[str, str]:
    """
    Trả về danh sách mã ICD thêm thủ công: { code: desc }.
    """

    return _get_icd_dict(db, ICD_MANUAL_KEY)


@router.post("/manual")
def add_manual_icd(body: ICDCodeBody, db: Session = Depends(get_db)) -> Dict[str, str]:
    """
    Thêm mới 1 mã ICD thủ công.
    """

    code = (body.code or "").strip()
    desc = (body.desc or "").strip()
    if not code or not desc:
        raise HTTPException(status_code=400, detail="Thiếu mã hoặc mô tả ICD")

    manual = _get_icd_dict(db, ICD_MANUAL_KEY)
    manual[code] = desc
    _save_icd_dict(db, ICD_MANUAL_KEY, manual)
    return {"success": True, "items": manual}


@router.put("/manual")
def update_manual_icd(body: ICDCodeBody, db: Session = Depends(get_db)) -> Dict[str, str]:
    """
    Cập nhật mô tả cho 1 mã ICD thủ công.
    """

    code = (body.code or "").strip()
    desc = (body.desc or "").strip()
    if not code or not desc:
        raise HTTPException(status_code=400, detail="Thiếu mã hoặc mô tả ICD")

    manual = _get_icd_dict(db, ICD_MANUAL_KEY)
    if code not in manual:
        raise HTTPException(status_code=404, detail="Không tìm thấy mã ICD thủ công")

    manual[code] = desc
    _save_icd_dict(db, ICD_MANUAL_KEY, manual)
    return {"success": True, "items": manual}


@router.delete("/manual")
def delete_manual_icd(body: ICDCodeBody, db: Session = Depends(get_db)) -> Dict[str, str]:
    """
    Xóa 1 mã ICD thủ công.
    """

    code = (body.code or "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="Thiếu mã ICD")

    manual = _get_icd_dict(db, ICD_MANUAL_KEY)
    if code in manual:
        manual.pop(code)
        _save_icd_dict(db, ICD_MANUAL_KEY, manual)
    return {"success": True, "items": manual}


@router.post("/upload-excel")
async def upload_icd_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> Dict[str, object]:
    """
    Cập nhật danh sách mã ICD chuẩn từ file Excel.
    - File phải có cột "Code" và "Description" (không phân biệt hoa/thường).
    - Dữ liệu mới sẽ ghi đè toàn bộ danh sách ICD chuẩn trước đó (override).
    """

    filename = (file.filename or "").lower()
    if not (filename.endswith(".xlsx") or filename.endswith(".xls")):
        raise HTTPException(
            status_code=400,
            detail="File phải là Excel (.xlsx hoặc .xls).",
        )

    try:
        import openpyxl  # type: ignore[import]
    except ImportError as e:  # pragma: no cover
        raise HTTPException(
            status_code=500,
            detail="Máy chủ chưa cài đặt thư viện 'openpyxl'. Vui lòng cài bằng: pip install openpyxl",
        ) from e

    content = await file.read()
    try:
        wb = openpyxl.load_workbook(BytesIO(content), data_only=True)
    except Exception as e:  # pragma: no cover
        raise HTTPException(
            status_code=400,
            detail=f"Không đọc được file Excel: {e}",
        ) from e

    ws = wb.active
    headers: Dict[str, int] = {}
    first_row = True
    data: Dict[str, str] = {}

    for row in ws.iter_rows(values_only=True):
        if first_row:
            for idx, val in enumerate(row or [], start=1):
                name = (str(val or "")).strip().lower()
                if name == "code":
                    headers["code"] = idx
                elif name in {"description", "desc", "mô tả", "mo ta"}:
                    headers["desc"] = idx
            first_row = False
            continue

        if "code" not in headers or "desc" not in headers:
            raise HTTPException(
                status_code=400,
                detail="Không tìm thấy cột 'Code' và 'Description' trong hàng đầu tiên của file Excel.",
            )

        code_val = row[headers["code"] - 1] if row and len(row) >= headers["code"] else None
        desc_val = row[headers["desc"] - 1] if row and len(row) >= headers["desc"] else None
        code = (str(code_val or "")).strip()
        desc = (str(desc_val or "")).strip()
        if code and desc:
            data[code] = desc

    if not data:
        raise HTTPException(
            status_code=400,
            detail="File Excel không chứa bản ghi hợp lệ (Code + Description).",
        )

    # Lưu override vào DB để /api/icd/all sử dụng
    _save_icd_dict(db, ICD_ALL_OVERRIDE_KEY, data)

    return {"success": True, "count": len(data)}

