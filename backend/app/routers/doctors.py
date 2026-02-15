from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter()


@router.get("/", response_model=List[schemas.Doctor])
def list_doctors(group: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Lấy danh sách bác sĩ.

    - Nếu truyền `group` (vd: `cot1`, `lanhdao`), chỉ trả về group đó.
    - Nếu không, trả về toàn bộ.
    """
    return crud.get_doctors(db, group=group)


@router.post(
    "/", response_model=schemas.Doctor, status_code=status.HTTP_201_CREATED
)
def create_doctor(doctor_in: schemas.DoctorCreate, db: Session = Depends(get_db)):
    return crud.create_doctor(db, doctor_in)


@router.put("/{doctor_id}", response_model=schemas.Doctor)
def update_doctor(
    doctor_id: int, doctor_in: schemas.DoctorUpdate, db: Session = Depends(get_db)
):
    doctor = crud.get_doctor(db, doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return crud.update_doctor(db, doctor, doctor_in)


@router.delete("/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doctor(doctor_id: int, db: Session = Depends(get_db)):
    doctor = crud.get_doctor(db, doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    crud.delete_doctor(db, doctor)
    return None

