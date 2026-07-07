from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.common import ApiResponse, PageData
from app.schemas.followup import (
    FollowupPlanCreate,
    FollowupPlanRead,
    FollowupPlanUpdate,
    FollowupTemplateCreate,
    FollowupTemplateRead,
    FollowupTemplateUpdate,
)
from app.services.followup_service import FollowupService
from app.utils.dependencies import get_current_user

router = APIRouter(tags=["followup"])


def get_followup_service(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> FollowupService:
    return FollowupService(db, current_user)


@router.get("/followup/templates", response_model=ApiResponse[PageData[FollowupTemplateRead]])
async def list_templates(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    scope: str | None = None,
    search: str | None = None,
    service: FollowupService = Depends(get_followup_service),
) -> ApiResponse[PageData[FollowupTemplateRead]]:
    data = await service.list_templates(page=page, size=size, scope=scope, search=search)
    return ApiResponse(code=200, message="ok", data=data)


@router.post("/followup/templates", response_model=ApiResponse[FollowupTemplateRead], status_code=status.HTTP_201_CREATED)
async def create_template(
    payload: FollowupTemplateCreate,
    service: FollowupService = Depends(get_followup_service),
) -> ApiResponse[FollowupTemplateRead]:
    data = await service.create_template(payload)
    return ApiResponse(code=201, message="created", data=data)


@router.get("/followup/templates/{template_id}", response_model=ApiResponse[FollowupTemplateRead])
async def get_template(
    template_id: int,
    service: FollowupService = Depends(get_followup_service),
) -> ApiResponse[FollowupTemplateRead]:
    data = await service.get_template(template_id)
    return ApiResponse(code=200, message="ok", data=data)


@router.put("/followup/templates/{template_id}", response_model=ApiResponse[FollowupTemplateRead])
async def update_template(
    template_id: int,
    payload: FollowupTemplateUpdate,
    service: FollowupService = Depends(get_followup_service),
) -> ApiResponse[FollowupTemplateRead]:
    data = await service.update_template(template_id, payload)
    return ApiResponse(code=200, message="updated", data=data)


@router.delete("/followup/templates/{template_id}", response_model=ApiResponse[dict[str, bool]])
async def delete_template(
    template_id: int,
    service: FollowupService = Depends(get_followup_service),
) -> ApiResponse[dict[str, bool]]:
    await service.delete_template(template_id)
    return ApiResponse(code=200, message="deleted", data={"success": True})


@router.post("/followup/templates/{template_id}/copy", response_model=ApiResponse[FollowupTemplateRead], status_code=status.HTTP_201_CREATED)
async def copy_template(
    template_id: int,
    service: FollowupService = Depends(get_followup_service),
) -> ApiResponse[FollowupTemplateRead]:
    data = await service.copy_template(template_id)
    return ApiResponse(code=201, message="created", data=data)


@router.get("/followup/plans", response_model=ApiResponse[PageData[FollowupPlanRead]])
async def list_plans(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    patient_id: int | None = None,
    status_value: str | None = Query(default=None, alias="status"),
    service: FollowupService = Depends(get_followup_service),
) -> ApiResponse[PageData[FollowupPlanRead]]:
    data = await service.list_plans(
        page=page,
        size=size,
        patient_id=patient_id,
        status_value=status_value,
    )
    return ApiResponse(code=200, message="ok", data=data)


@router.post("/followup/plans", response_model=ApiResponse[FollowupPlanRead], status_code=status.HTTP_201_CREATED)
async def create_plan(
    payload: FollowupPlanCreate,
    service: FollowupService = Depends(get_followup_service),
) -> ApiResponse[FollowupPlanRead]:
    data = await service.create_plan(payload)
    return ApiResponse(code=201, message="created", data=data)


@router.get("/followup/plans/{plan_id}", response_model=ApiResponse[FollowupPlanRead])
async def get_plan(
    plan_id: int,
    service: FollowupService = Depends(get_followup_service),
) -> ApiResponse[FollowupPlanRead]:
    data = await service.get_plan(plan_id)
    return ApiResponse(code=200, message="ok", data=data)


@router.put("/followup/plans/{plan_id}", response_model=ApiResponse[FollowupPlanRead])
async def update_plan(
    plan_id: int,
    payload: FollowupPlanUpdate,
    service: FollowupService = Depends(get_followup_service),
) -> ApiResponse[FollowupPlanRead]:
    data = await service.update_plan(plan_id, payload)
    return ApiResponse(code=200, message="updated", data=data)
