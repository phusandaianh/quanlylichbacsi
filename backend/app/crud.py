from typing import List, Optional

from sqlalchemy.orm import Session

from . import models, schemas


def get_doctors(db: Session, group: Optional[str] = None) -> List[models.Doctor]:
    query = db.query(models.Doctor)
    if group:
        query = query.filter(models.Doctor.group == group)
    return query.order_by(models.Doctor.id).all()


def get_doctor(db: Session, doctor_id: int) -> Optional[models.Doctor]:
    return db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()


def create_doctor(db: Session, doctor_in: schemas.DoctorCreate) -> models.Doctor:
    doctor = models.Doctor(
        name=doctor_in.name.strip(),
        display_name=doctor_in.display_name.strip(),
        phone=(doctor_in.phone or "").strip() or None,
        group=doctor_in.group.strip(),
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor


def update_doctor(
    db: Session,
    doctor: models.Doctor,
    doctor_in: schemas.DoctorUpdate,
) -> models.Doctor:
    data = doctor_in.dict(exclude_unset=True)
    for field, value in data.items():
        setattr(doctor, field, value)
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor


def delete_doctor(db: Session, doctor: models.Doctor) -> None:
    db.delete(doctor)
    db.commit()

