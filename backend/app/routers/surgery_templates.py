from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models


router = APIRouter(tags=["surgery_templates"])


CATEGORY_NAMES: Dict[str, str] = {
    "moLayThai": "Phẫu thuật mổ lấy thai",
    "moPhuKhoa": "Phẫu thuật mổ phụ khoa",
    "moVoSinh": "Phẫu thuật mổ vô sinh",
    "thuThuat": "Thủ thuật",
}


class TemplateBase(BaseModel):
    name: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)


class TemplateCreate(TemplateBase):
    category: str = Field(..., min_length=1)


def _seed_default_templates(db: Session) -> None:
    """
    Nếu bảng surgery_templates đang trống thì tự động khởi tạo các mẫu mặc định
    (giống nội dung trang 'Quản lý các mẫu protocol phẫu thuật').
    """

    if db.query(models.SurgeryTemplate).count() > 0:
        return

    templates: List[Dict[str, str]] = [
        # Phẫu thuật mổ lấy thai
        {
            "category": "moLayThai",
            "name": "Mổ lấy thai lần đầu",
            "content": (
                "Phẫu thuật mổ lấy thai lần đầu:\n"
                "- Rạch da đường ngang trên vệ vào ổ bụng.\n"
                "- Rạch ngang đoạn dưới tử cung lấy ra 01 trai cân nặng 3300g, APGAR 9 - 10 điểm.\n"
                "- Bóc rau, kiểm soát tử cung bằng tay, tử cung bình thường, tử cung co hồi kém, tăng co bằng thuốc tử cung co hồi được\n"
                "- Khâu cơ tử cung 01 lớp mũi vắt bằng chỉ Vicryl số 1.0.\n"
                "- Lau ổ bụng.\n"
                "- Kiểm tra không chảy máu, phần phụ hai bên bình thường\n"
                "- Đếm gạc ấu đủ.\n"
                "- Đóng bụng, dán da bằng Dermabond."
            ),
        },
        {
            "category": "moLayThai",
            "name": "Mổ lấy thai lần hai trở lên",
            "content": (
                "Phẫu thuật mổ lấy thai lần hai trở lên:\n"
                "- Cắt bỏ sẹo cũ đường ngang trên vệ vào ổ bụng\n"
                "- Rạch ngang đoạn dưới tử cung lấy ra 01 bé g, APGAR 9-10 điểm\n"
                "- Bóc rau, kiểm soát tử cung bằng tay, tử cung bình thường, co hồi kém, tăng co bằng thuốc tử cung co hồi được\n"
                "- Khâu cơ tử cung 02 lớp mũi vắt bằng chỉ Vicryl 1.0.\n"
                "- Lau ổ bụng.\n"
                "- Ổ bụng có mạc nối lớn dính vào tử cung và thành bụng, tiến hành gỡ dính.\n"
                "- Kiểm tra không chảy máu, 2 phần phụ bình thường.\n"
                "- Đếm gạc ấu đủ.\n"
                "- Đóng bụng 04 lớp, khâu da bằng chỉ Rapid 3.0.\n"
                "- Đóng bụng, khâu da bằng chỉ Rapid 3.0."
            ),
        },
        # Phẫu thuật mổ phụ khoa
        {
            "category": "moPhuKhoa",
            "name": "Nội soi cắt tử cung",
            "content": (
                "Phẫu thuật nội soi cắt tử cung (001):\n"
                "- Chọc 01 Trocar 10, đưa đèn soi, bơm CO2, chọc 3 Trocar 5.\n"
                "- Ổ bụng không có dịch, gan bình thường.\n"
                "- Tử cung kích thước lớn hơn bình thường, 2 phần phụ bình thường.\n"
                "- Mặt sau tử cung có quai đại tràng dính vào, tiến hành gỡ dính.\n"
                "- Tiến hành cắt tử cung bán phần để 2 buồng trứng\n"
                "- Cầm máu các dây chằng và cuống mạch bằng dao điện 2 cực.\n"
                "- Cầm máu mỏm cắt bằng dao điện 2 cực.\n"
                "- Lấy bệnh phẩm bằng Morcellator, gửi GPB.\n"
                "- Kiểm tra không chảy máu, 2 niệu quản nhu động bình thường.\n"
                "- Rửa ổ bụng, xả CO2, rút Trocar, khâu lỗ chọc.\n"
                "- Đóng bụng, ."
            ),
        },
        {
            "category": "moPhuKhoa",
            "name": "Mổ cắt tử cung hoàn toàn",
            "content": (
                "Phẫu thuật cắt tử cung hoàn toàn:\n"
                "- Rạch da đường ngang trên vệ vào ổ bụng.\n"
                "- Ổ bụng khô, gan bình thường.\n"
                "- Tử cung to bằng TC có thai 3 tháng, nhiều nhân xơ lổn nhổn, 2 phần phụ teo nhỏ.\n"
                "- Tiến hành cắt TCHT và 2 phần phụ gửi GPB.\n"
                "- Khâu các cuống mạch, dây chằng và mỏm ÂĐ bằng chỉ Vicryl 1.0.\n"
                "- Lau ổ bụng.\n"
                "- Kiểm tra không chảy máu, 2 niệu quản nhu động bình thường.\n"
                "- Đếm gạc ấu đủ.\n"
                "- Đóng bụng 03 lớp, khâu da bằng chỉ Rapid 3.0."
            ),
        },
        {
            "category": "moPhuKhoa",
            "name": "Crossen",
            "content": (
                "Phẫu thuật Crossen:\n"
                "- Rạch vòng quanh cổ tử cung, rạch dọc thành trước âm đạo.\n"
                "- Phẫu tích tách và đẩy đáy BQ lên cao.\n"
                "- Vào cùng đồ sau và cùng đồ trước.\n"
                "- Lộn tử cung qua cùng đồ sau, cặp cắt các dây chằng, cuống mạch, cắt tử cung hoàn toàn để lại hai phần phụ.\n"
                "- Khâu cầm máu các cuống mạch và dây chằng bằng chỉ Vicryl 1.0.\n"
                "- Khâu túi phúc mạc, buộc chéo các cuống mạch,dây chằng.\n"
                "- Khâu túi nâng bàng quang.\n"
                "- Cắt bớt và đóng lại thành trước âm đạo.\n"
                "- Cắt lọc thành sau âm đạo, cắt vát hình chữ V tầng sinh môn, bộc lộ cơ nâng hậu môn.\n"
                "- Khâu cơ nâng hậu môn, khâu phục hồi thành sau âm đạo và tầng sinh môn.\n"
                "- Kiểm tra không chảy máu.\n"
                "- Đặt sonde bàng quang, rút sau mổ 24h."
            ),
        },
        {
            "category": "moPhuKhoa",
            "name": "Cắt tử cung đường âm đạo",
            "content": (
                "Phẫu thuật cắt tử cung đường âm đạo:\n"
                "- Rạch vòng quanh cổ tử cung.\n"
                "- Bóc tách phúc mạc đẩy bàng quang lên cao.\n"
                "- Vào cùng đồ sau, vào cùng đồ trước.\n"
                "- Cắt dây chằng Mackenroth hai bên.\n"
                "- Cắt động mạch tử cung hai bên, cắt tử cung hoàn toàn để lại hai phần phụ gửi GPBL(tử cung kích thước bình thường, hai buồng trứng teo nhỏ).\n"
                "- Khâu cầm máu các dây chằng và cuống mạch bằng chỉ Vicryl 1.0.\n"
                "- Buộc tăng cường các cuống mạch. Kiểm tra không chảy máu.\n"
                "- Khâu mỏm cắt mũi vắt bằng chỉ Vicryl 1.0."
            ),
        },
        {
            "category": "moPhuKhoa",
            "name": "Nội soi cố định mỏm nhô",
            "content": (
                "Phẫu thuật nội soi cố định mỏm nhô:\n"
                "- Chọc trocart 10, đưa đèn soi, chọc 3 trocart 5. \n"
                "- Ổ bụng không có dịch, gan bình thường, tử cung bình thường. 2 phần phụ bình thường.\n"
                "- Khâu treo trực tràng vào thành bụng hố chậu (T).\n"
                "- Bóc tách bộc lộ mỏm nhô.\n"
                "- Bóc tách phúc mạc mặt trước tử cung đến cổ bàng quang.\n"
                "- Bóc tách phúc mạc cùng đồ sau qua hố cạnh trực tràng đến cơ nâng hậu môn.\n"
                "- Tạo 2 cửa sổ ở eo tử cung.\n"
                "- Cắt 2 vật liệu Prolene đưa vào ổ bụng.\n"
                "- Khâu cố định vạt sau vào cơ nâng hậu môn.\n"
                "- Cố định vạt trước vào thành trước âm đạo.\n"
                "- Luồn vạt trước qua hai cửa sổ, buộc cố định.\n"
                "- Khâu cố định vạt sau vào vạt trước và dây chằng tử cung cùng.\n"
                "- Phủ phúc mạc mặt trước và mặt sau tử cung.\n"
                "- Kéo và khâu cố định vật liệu thành sau vào mỏm nhô.\n"
                "- Phủ phúc mạc diện bóc tách mỏm nhô.\n"
                "- Kiểm tra không chảy máu, cổ tử cung ở 1/3 trên âm đạo.\n"
                "- Rút chỉ khâu treo trực tràng.\n"
                "- Rửa ổ bụng, xả CO2, rút trocart, khâu lỗ chọc."
            ),
        },
        # Phẫu thuật mổ vô sinh
        {
            "category": "moVoSinh",
            "name": "Nội soi GEU",
            "content": (
                "Phẫu thuật nội soi GEU:\n"
                "- Chọc 01 Trocar 10, đưa đèn soi, bơm CO2, chọc 2 Trocar 5.\n"
                "- Ổ bụng có khoảng 00ml máu loãng đen.\n"
                "- Gan bình thường, tử cung kích thước bình thường.\n"
                "- Phần phụ (P) bình thường.\n"
                "- Buồng trứng (T) bình thường, khối chửa đoạn bóng VTC (T) rỉ máu\n"
                "- Tiến hành cắt vòi tử cung (T), cầm máu bằng dao điện 2 cực.\n"
                "- Kiểm tra không chảy máu.\n"
                "- Lấy bệnh phẩm gửi GPBL.\n"
                "- Rửa ổ bụng, xả CO2, rút Trocar, khâu lỗ chọc."
            ),
        },
        {
            "category": "moVoSinh",
            "name": "Nội soi bóc u (170)",
            "content": (
                "Phẫu thuật nội soi bóc u (170):\n"
                "Thì 1:\n"
                "- Chọc 01 Trocar 5, đưa đèn soi, bơm CO2, chọc 2 Trocar 5\n"
                "- Ổ bụng khô, gan bình thường\n"
                "- Tử cung kích thước tương đương tử cung có thai 10 tuần\n"
                "- Hai phần phụ bình thường. Tiến hành triệt sản 2 vòi tử cung bằng dao điện.\n"
                "- Cầm máu bằng dao điện 2 cực.\n"
                "- Kiểm tra không chảy máu, xả CO2, rút Trocar.\n"
                "\n"
                "Thì 2:\n"
                "- Đặt mỏ vịt, kẹp Pozzi cổ tử cung\n"
                "- Tiến hành hút thai dưới siêu âm, ra tổ chức thai và máu cục\n"
                "- Tăng co tử cung.\n"
                "- Kiểm tra buồng tử cung toàn vẹn, không chảy máu"
            ),
        },
        {
            "category": "moVoSinh",
            "name": "Nội soi vô sinh",
            "content": (
                "Phẫu thuật nội soi vô sinh:\n"
                "Thì 1: Soi buồng tử cung\n"
                "- Sát trùng vùng âm hộ, âm đạo, kẹp cổ tử cung bằng kìm pozzi đưa đèn soi\n"
                "- Buồng tử cung kích thước bình thường, eo và ống cổ tử cung bình thường, nhìn rõ 2 lỗ vòi tử cung.\n"
                "\n"
                "Thì 2: Nội soi ổ bụng\n"
                "- Chọc 01 Trocar 5 ngay rốn, đưa đèn soi, bơm CO2, chọc 01 Trocar 5 hố chậu trái.\n"
                "- Ổ bụng không có dịch, gan bình thường, tử cung kích thước bình thường.\n"
                "- Hai buồng trứng bình thường, 2 vòi tử cung mềm mại, tự do.\n"
                "- Bơm xanh Methylen, hai vòi tử cung thông\n"
                "- Rửa ổ bụng, xả CO2, rút Trocar, băng lỗ chọc.\n"
                "\n"
                "Hướng xử trí: Hẹn ngày 2 chu kỳ kinh khám lại tại trung tâm hỗ trợ sinh sản"
            ),
        },
        # Thủ thuật
        {
            "category": "thuThuat",
            "name": "Khoét chóp cổ tử cung",
            "content": (
                "Thủ thuật khoét chóp cổ tử cung:\n"
                "- Sát trùng vùng âm hộ âm đạo. Đưa thước đo buồng tử cung 6cm.\n"
                "- Nong cổ tử cung đến số 8. Tiến hành khoét chóp cổ tử cung lỗ ngoài 1cm, sâu 1.5cm.\n"
                "- Khâu 2 mũi Sturmdorf. Kiểm tra không chảy máu.\n"
                "- Chèn 01 meche âm đạo."
            ),
        },
        {
            "category": "thuThuat",
            "name": "Làm lại TSM",
            "content": (
                "Thủ thuật làm lại TSM:\n"
                "- Sát trùng vùng âm hộ - âm đạo. Sẹo tầng sinh môn vị trí 7h.\n"
                "- Tiến hành cắt da tầng sinh môn hình chữ V.\n"
                "- Tách thành sau âm đạo tận cùng đồ sau, cắt bớt thành sau âm đạo rộng 2cm.\n"
                "- Khâu phục hồi thành âm đạo, khâu cơ nâng hậu môn.\n"
                "- Khâu phục hồi tầng sinh môn hai lớp. Kiểm tra không chảy máu, sát trùng âm đạo.\n"
                "- Đặt sonde bàng quang."
            ),
        },
        {
            "category": "thuThuat",
            "name": "Phẫu thuật TOT",
            "content": (
                "Phẫu thuật TOT:\n"
                "- Sát trùng âm hộ âm đạo.\n"
                "- Rạch dọc thành trước âm đạo cách lỗ niệu đạo 1cm và 2 vết rạch nhỏ 2 bên tương ứng 2 lỗ bịt.\n"
                "- Chọc kim từ lỗ bịt luồn dải lưới từ âm đạo đi 2 bên cạnh thành niệu đạo xuyên lên môi lớn vị trí lỗ bịt.\n"
                "- Điều chỉnh lưới niệu đạo không quá căng.\n"
                "- Bơm 300 ml nước muối vào bàng quang. Cho bệnh nhân ho không thấy són tiểu.\n"
                "- Cắt lưới dưới da.\n"
                "- Khâu âm đạo. Kiểm tra không chảy máu. Đặt 1 meche âm đạo.\n"
                "- Sonde tiểu rút sau 24h."
            ),
        },
        {
            "category": "thuThuat",
            "name": "Hội chứng truyền máu song thai",
            "content": (
                "Phẫu thuật hội chứng truyền máu song thai:\n"
                "- Sát trùng vùng bụng\n"
                "- Xác định vị trí chọc trocar, kiểm tra dưới siêu âm không quan sát thấy hình ảnh bàng quang thai cho ( hội chứng truyền máu gia đoạn II)\n"
                "- Tê tại chỗ bằng lidocain 2%, rạch da 3mm\n"
                "- Chọc seldinger qua da, thành bụng, cơ tử cung vào buồng ối thai nhận\n"
                "- Quan sát thấy dây rốn 2 thai, bánh rau bám mặt trước có nhiều vòng nối mạch máu\n"
                "- Tiến hành đốt 8 vòng nối mạch máu giữa hai thai\n"
                "- Rút 3000 ml nước ối buồng ối thai nhận\n"
                "- Rút seldinger, khâu lỗ chọc bằng chỉ rapid 4.0 \n"
                "- Sau phẫu thuật kiểm tra màng ối toàn vẹn, tim thai (+) 2 thai."
            ),
        },
    ]

    for t in templates:
        obj = models.SurgeryTemplate(
            category=t["category"],
            name=t["name"],
            content=t["content"],
        )
        db.add(obj)

    db.commit()


def _serialize_template(t: models.SurgeryTemplate) -> Dict[str, Any]:
    return {
        "id": f"{t.category}_{t.id}",
        "name": t.name,
        "content": t.content,
    }


def _parse_template_id(template_id: str) -> int:
    """
    Chuyển id dạng 'moLayThai_1' thành id số trong DB (1).
    """

    try:
        _, raw_id = template_id.rsplit("_", 1)
        return int(raw_id)
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=404, detail="Template not found")


def _get_or_clone_user_templates(db: Session, user_key: str) -> List[models.SurgeryTemplateUser]:
    """
    Lấy danh sách template dành riêng cho 1 user.
    Nếu chưa có, clone toàn bộ từ bảng surgery_templates (mẫu admin).
    """

    rows = (
        db.query(models.SurgeryTemplateUser)
        .filter(models.SurgeryTemplateUser.user_key == user_key)
        .order_by(models.SurgeryTemplateUser.category, models.SurgeryTemplateUser.id)
        .all()
    )
    if rows:
        return rows

    # Nếu chưa có bộ riêng, dùng mẫu admin làm gốc
    base_rows: List[models.SurgeryTemplate] = (
        db.query(models.SurgeryTemplate)
        .order_by(models.SurgeryTemplate.category, models.SurgeryTemplate.id)
        .all()
    )
    if not base_rows:
        _seed_default_templates(db)
        base_rows = (
            db.query(models.SurgeryTemplate)
            .order_by(models.SurgeryTemplate.category, models.SurgeryTemplate.id)
            .all()
        )

    for base in base_rows:
        obj = models.SurgeryTemplateUser(
            user_key=user_key,
            base_template_id=base.id,
            category=base.category,
            name=base.name,
            content=base.content,
        )
        db.add(obj)
    db.commit()

    return (
        db.query(models.SurgeryTemplateUser)
        .filter(models.SurgeryTemplateUser.user_key == user_key)
        .order_by(models.SurgeryTemplateUser.category, models.SurgeryTemplateUser.id)
        .all()
    )


def _serialize_user_template(t: models.SurgeryTemplateUser) -> Dict[str, Any]:
    return {
        "id": f"{t.category}_{t.id}",
        "name": t.name,
        "content": t.content,
    }


@router.get("")
def list_templates(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Trả về tất cả category + templates:
    {
        "moLayThai": { "name": "...", "templates": [ { id, name, content }, ... ] },
        ...
    }
    """

    categories: Dict[str, Dict[str, Any]] = {
        key: {"name": name, "templates": []} for key, name in CATEGORY_NAMES.items()
    }

    rows: List[models.SurgeryTemplate] = (
        db.query(models.SurgeryTemplate)
        .order_by(models.SurgeryTemplate.category, models.SurgeryTemplate.id)
        .all()
    )

    # Nếu chưa có dữ liệu thì tự seed các mẫu mặc định một lần
    if not rows:
        _seed_default_templates(db)
        rows = (
            db.query(models.SurgeryTemplate)
            .order_by(models.SurgeryTemplate.category, models.SurgeryTemplate.id)
            .all()
        )

    for t in rows:
        if t.category not in categories:
            categories[t.category] = {"name": t.category, "templates": []}
        categories[t.category]["templates"].append(_serialize_template(t))

    return categories


@router.get("/{category_id}")
def get_category(category_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Lấy 1 nhóm theo category_id (moLayThai, moPhuKhoa, ...).
    """

    name = CATEGORY_NAMES.get(category_id, category_id)

    rows: List[models.SurgeryTemplate] = (
        db.query(models.SurgeryTemplate)
        .where(models.SurgeryTemplate.category == category_id)
        .order_by(models.SurgeryTemplate.id)
        .all()
    )

    if not rows and category_id not in CATEGORY_NAMES:
        raise HTTPException(status_code=404, detail="Category not found")

    return {"name": name, "templates": [_serialize_template(t) for t in rows]}


@router.post("")
def create_template(body: TemplateCreate, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Tạo mẫu mới trong 1 nhóm.
    """

    obj = models.SurgeryTemplate(
        category=body.category.strip(),
        name=body.name.strip(),
        content=body.content.strip(),
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)

    return {"success": True, "template": _serialize_template(obj)}


@router.put("/{template_id}")
def update_template(
    template_id: str,
    body: TemplateBase,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Cập nhật tên + nội dung 1 mẫu.
    """

    db_id = _parse_template_id(template_id)
    obj = db.query(models.SurgeryTemplate).get(db_id)  # type: ignore[attr-defined]
    if not obj:
        raise HTTPException(status_code=404, detail="Template not found")

    obj.name = body.name.strip()
    obj.content = body.content.strip()

    db.add(obj)
    db.commit()
    db.refresh(obj)

    return {"success": True, "template": _serialize_template(obj)}


@router.delete("/{template_id}")
def delete_template(
    template_id: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Xóa 1 mẫu.
    """

    db_id = _parse_template_id(template_id)
    obj = db.query(models.SurgeryTemplate).get(db_id)  # type: ignore[attr-defined]
    if not obj:
        raise HTTPException(status_code=404, detail="Template not found")

    db.delete(obj)
    db.commit()

    return {"success": True}


# ====== API cho từng tài khoản (bác sĩ) sử dụng bộ mẫu riêng ======


@router.get("/user")
def list_templates_for_user(
    user_key: str = Query(..., description="Khóa định danh tài khoản (currentUser.key)"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Lấy toàn bộ templates cho riêng 1 tài khoản.
    Nếu user chưa có dữ liệu riêng, sẽ clone từ bảng surgery_templates (mẫu admin) một lần.
    """

    rows = _get_or_clone_user_templates(db, user_key)
    categories: Dict[str, Dict[str, Any]] = {}
    for t in rows:
        if t.category not in categories:
            categories[t.category] = {
                "name": CATEGORY_NAMES.get(t.category, t.category),
                "templates": [],
            }
        categories[t.category]["templates"].append(_serialize_user_template(t))
    return categories


@router.get("/user/{category_id}")
def get_category_for_user(
    category_id: str,
    user_key: str = Query(..., description="Khóa định danh tài khoản (currentUser.key)"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Lấy 1 nhóm template cho riêng 1 tài khoản.
    """

    rows = _get_or_clone_user_templates(db, user_key)
    name = CATEGORY_NAMES.get(category_id, category_id)
    filtered = [t for t in rows if t.category == category_id]
    return {"name": name, "templates": [_serialize_user_template(t) for t in filtered]}


@router.post("/user")
def create_template_for_user(
    body: TemplateCreate,
    user_key: str = Query(..., description="Khóa định danh tài khoản (currentUser.key)"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Tạo mẫu mới cho riêng 1 tài khoản.
    """

    obj = models.SurgeryTemplateUser(
        user_key=user_key,
        base_template_id=None,
        category=body.category.strip(),
        name=body.name.strip(),
        content=body.content.strip(),
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return {"success": True, "template": _serialize_user_template(obj)}


@router.put("/user/{template_id}")
def update_template_for_user(
    template_id: str,
    body: TemplateBase,
    user_key: str = Query(..., description="Khóa định danh tài khoản (currentUser.key)"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Cập nhật 1 mẫu cho riêng 1 tài khoản.
    """

    db_id = _parse_template_id(template_id)
    obj = (
        db.query(models.SurgeryTemplateUser)
        .filter(
            models.SurgeryTemplateUser.id == db_id,
            models.SurgeryTemplateUser.user_key == user_key,
        )
        .first()
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Template not found")

    obj.name = body.name.strip()
    obj.content = body.content.strip()
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return {"success": True, "template": _serialize_user_template(obj)}


@router.delete("/user/{template_id}")
def delete_template_for_user(
    template_id: str,
    user_key: str = Query(..., description="Khóa định danh tài khoản (currentUser.key)"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Xóa 1 mẫu trong bộ của tài khoản (không ảnh hưởng mẫu admin).
    """

    db_id = _parse_template_id(template_id)
    obj = (
        db.query(models.SurgeryTemplateUser)
        .filter(
            models.SurgeryTemplateUser.id == db_id,
            models.SurgeryTemplateUser.user_key == user_key,
        )
        .first()
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Template not found")

    db.delete(obj)
    db.commit()
    return {"success": True}


@router.post("/user/reset")
def reset_templates_for_user(
    user_key: str = Query(..., description="Khóa định danh tài khoản (currentUser.key)"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Reset bộ template của tài khoản về đúng mẫu admin hiện tại.
    """

    db.query(models.SurgeryTemplateUser).filter(
        models.SurgeryTemplateUser.user_key == user_key
    ).delete()
    db.commit()

    # Clone lại từ admin
    _get_or_clone_user_templates(db, user_key)
    return {"success": True}

