from fastapi import APIRouter

from . import auth, doctors, migration, storage, surgery_templates, icd, pathology, bangma_codes

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth")
api_router.include_router(doctors.router, prefix="/doctors")
api_router.include_router(migration.router, prefix="/migration")
api_router.include_router(storage.router, prefix="/storage")
api_router.include_router(surgery_templates.router, prefix="/surgery_templates")
api_router.include_router(icd.router, prefix="/icd")
api_router.include_router(pathology.router, prefix="/pathology")
api_router.include_router(bangma_codes.router, prefix="/bangma_codes")

