from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.common import ApiResponse, PageData
from app.schemas.glucose import (
    BloodGlucoseRecordCreate,
    BloodGlucoseRecordRead,
    GlucoseOverview,
    GlucoseStats,
    GlucoseTrend,
)
from app.services.glucose_service import GlucoseService
from app.utils.dependencies import get_current_user

router = APIRouter(tags=["glucose"])


def get_glucose_service(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> GlucoseService:
    return GlucoseService(db, current_user)


@router.get("/glucose/overview", response_model=ApiResponse[GlucoseOverview])
async def get_glucose_overview(
    days: int = Query(default=7, ge=1, le=90),
    service: GlucoseService = Depends(get_glucose_service),
) -> ApiResponse[GlucoseOverview]:
    data = await service.get_overview(days=days)
    return ApiResponse(code=200, message="ok", data=data)


@router.get(
    "/patients/{patient_id}/blood-glucose",
    response_model=ApiResponse[PageData[BloodGlucoseRecordRead]],
)
async def list_blood_glucose_records(
    patient_id: int,
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    measured_date: date | None = Query(default=None, alias="date"),
    category: str | None = None,
    service: GlucoseService = Depends(get_glucose_service),
) -> ApiResponse[PageData[BloodGlucoseRecordRead]]:
    data = await service.list_records(
        patient_id=patient_id,
        page=page,
        size=size,
        measured_date=measured_date,
        category=category,
    )
    return ApiResponse(code=200, message="ok", data=data)


@router.post(
    "/patients/{patient_id}/blood-glucose",
    response_model=ApiResponse[BloodGlucoseRecordRead],
    status_code=status.HTTP_201_CREATED,
)
async def create_blood_glucose_record(
    patient_id: int,
    payload: BloodGlucoseRecordCreate,
    service: GlucoseService = Depends(get_glucose_service),
) -> ApiResponse[BloodGlucoseRecordRead]:
    data = await service.create_record(patient_id=patient_id, payload=payload)
    return ApiResponse(code=201, message="created", data=data)


@router.get("/patients/{patient_id}/glucose-trend", response_model=ApiResponse[GlucoseTrend])
async def get_glucose_trend(
    patient_id: int,
    days: int = Query(default=7, ge=1, le=90),
    service: GlucoseService = Depends(get_glucose_service),
) -> ApiResponse[GlucoseTrend]:
    data = await service.get_trend(patient_id=patient_id, days=days)
    return ApiResponse(code=200, message="ok", data=data)


@router.get("/patients/{patient_id}/glucose-stats", response_model=ApiResponse[GlucoseStats])
async def get_glucose_stats(
    patient_id: int,
    days: int = Query(default=30, ge=1, le=180),
    service: GlucoseService = Depends(get_glucose_service),
) -> ApiResponse[GlucoseStats]:
    data = await service.get_stats(patient_id=patient_id, days=days)
    return ApiResponse(code=200, message="ok", data=data)
