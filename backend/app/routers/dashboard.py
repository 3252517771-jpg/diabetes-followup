from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.common import ApiResponse
from app.schemas.dashboard import DashboardGlucoseTrend, DashboardPatientOverview, DashboardStats
from app.services.dashboard_service import DashboardService
from app.utils.dependencies import get_current_user

router = APIRouter(tags=["dashboard"])


def get_dashboard_service(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> DashboardService:
    return DashboardService(db, current_user)


@router.get("/dashboard/stats", response_model=ApiResponse[DashboardStats])
async def get_dashboard_stats(
    service: DashboardService = Depends(get_dashboard_service),
) -> ApiResponse[DashboardStats]:
    return ApiResponse(code=200, message="ok", data=await service.get_stats())


@router.get("/dashboard/glucose-trend", response_model=ApiResponse[DashboardGlucoseTrend])
async def get_dashboard_glucose_trend(
    days: int = Query(default=7, ge=1, le=90),
    service: DashboardService = Depends(get_dashboard_service),
) -> ApiResponse[DashboardGlucoseTrend]:
    return ApiResponse(code=200, message="ok", data=await service.get_glucose_trend(days))


@router.get("/dashboard/patient-distribution", response_model=ApiResponse[DashboardPatientOverview])
async def get_dashboard_patient_distribution(
    service: DashboardService = Depends(get_dashboard_service),
) -> ApiResponse[DashboardPatientOverview]:
    return ApiResponse(code=200, message="ok", data=await service.get_patient_distribution())
