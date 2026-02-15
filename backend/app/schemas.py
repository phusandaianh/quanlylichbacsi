from typing import Optional, List

from pydantic import BaseModel, Field


class DoctorBase(BaseModel):
    name: str = Field(..., min_length=1)
    display_name: str = Field(..., min_length=1)
    phone: Optional[str] = None
    group: str = Field(..., min_length=1, description="lanhdao, cot1, cot2, cot3, partime, khac, ...")


class DoctorCreate(DoctorBase):
    pass


class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    phone: Optional[str] = None
    group: Optional[str] = None


class Doctor(DoctorBase):
    id: int

    class Config:
        orm_mode = True


class DoctorsResponse(BaseModel):
    items: List[Doctor]

