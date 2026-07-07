from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.common import ApiResponse, PageData
from app.schemas.diet import (
    DietRecommendationGenerateRequest,
    DietRecommendationRead,
    DietRecommendationReviewRequest,
)
from app.services.diet_service import DietService
from app.utils.dependencies import get_current_user

router = APIRouter(tags=["diet"])


def get_diet_service(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> DietService:
    return DietService(db, current_user)


@router.post("/diet/recommend", response_model=ApiResponse[DietRecommendationRead], status_code=status.HTTP_201_CREATED)
async def generate_recommendation(
    payload: DietRecommendationGenerateRequest,
    service: DietService = Depends(get_diet_service),
) -> ApiResponse[DietRecommendationRead]:
    data = await service.generate_recommendation(payload)
    return ApiResponse(code=201, message="created", data=data)


@router.get("/diet/recommendations", response_model=ApiResponse[PageData[DietRecommendationRead]])
async def list_recommendations(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    patient_id: int | None = None,
    status_value: str | None = Query(default=None, alias="status"),
    service: DietService = Depends(get_diet_service),
) -> ApiResponse[PageData[DietRecommendationRead]]:
    data = await service.list_recommendations(
        page=page,
        size=size,
        patient_id=patient_id,
        status_value=status_value,
    )
    return ApiResponse(code=200, message="ok", data=data)


@router.get("/diet/recommendations/{recommendation_id}", response_model=ApiResponse[DietRecommendationRead])
async def get_recommendation(
    recommendation_id: int,
    service: DietService = Depends(get_diet_service),
) -> ApiResponse[DietRecommendationRead]:
    data = await service.get_recommendation(recommendation_id)
    return ApiResponse(code=200, message="ok", data=data)


@router.put("/diet/recommendations/{recommendation_id}/approve", response_model=ApiResponse[DietRecommendationRead])
async def approve_recommendation(
    recommendation_id: int,
    payload: DietRecommendationReviewRequest,
    service: DietService = Depends(get_diet_service),
) -> ApiResponse[DietRecommendationRead]:
    data = await service.approve_recommendation(recommendation_id, payload)
    return ApiResponse(code=200, message="updated", data=data)


@router.put("/diet/recommendations/{recommendation_id}/reject", response_model=ApiResponse[DietRecommendationRead])
async def reject_recommendation(
    recommendation_id: int,
    payload: DietRecommendationReviewRequest,
    service: DietService = Depends(get_diet_service),
) -> ApiResponse[DietRecommendationRead]:
    data = await service.reject_recommendation(recommendation_id, payload)
    return ApiResponse(code=200, message="updated", data=data)
