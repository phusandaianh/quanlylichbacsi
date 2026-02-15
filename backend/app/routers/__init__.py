from fastapi import APIRouter

from . import auth, doctors, migration, storage

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth")
api_router.include_router(doctors.router, prefix="/doctors")
api_router.include_router(migration.router, prefix="/migration")
api_router.include_router(storage.router, prefix="/storage")

