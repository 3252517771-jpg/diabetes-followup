from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.common import ApiResponse, PageData
from app.schemas.system import (
    SystemConfigRead,
    SystemConfigUpdateItem,
    SystemUserCreate,
    SystemUserRead,
    SystemUserUpdate,
)
from app.services.system_service import SystemService
from app.services.auto_reminder_service import AutoReminderService
from app.utils.dependencies import require_admin

router = APIRouter(tags=["system"])


def get_system_service(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
) -> SystemService:
    return SystemService(db)


def get_auto_reminder_service(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
) -> AutoReminderService:
    return AutoReminderService(db)


@router.get("/system/users", response_model=ApiResponse[PageData[SystemUserRead]])
async def list_users(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    role: str | None = None,
    department: str | None = None,
    service: SystemService = Depends(get_system_service),
) -> ApiResponse[PageData[SystemUserRead]]:
    return ApiResponse(code=200, message="ok", data=await service.list_users(page=page, size=size, role=role, department=department))


@router.post("/system/users", response_model=ApiResponse[SystemUserRead], status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: SystemUserCreate,
    service: SystemService = Depends(get_system_service),
) -> ApiResponse[SystemUserRead]:
    return ApiResponse(code=201, message="created", data=await service.create_user(payload))


@router.put("/system/users/{user_id}", response_model=ApiResponse[SystemUserRead])
async def update_user(
    user_id: int,
    payload: SystemUserUpdate,
    service: SystemService = Depends(get_system_service),
) -> ApiResponse[SystemUserRead]:
    return ApiResponse(code=200, message="updated", data=await service.update_user(user_id, payload))


@router.get("/system/config", response_model=ApiResponse[list[SystemConfigRead]])
async def list_configs(
    service: SystemService = Depends(get_system_service),
) -> ApiResponse[list[SystemConfigRead]]:
    return ApiResponse(code=200, message="ok", data=await service.list_configs())


@router.put("/system/config", response_model=ApiResponse[list[SystemConfigRead]])
async def update_configs(
    payload: list[SystemConfigUpdateItem],
    service: SystemService = Depends(get_system_service),
) -> ApiResponse[list[SystemConfigRead]]:
    return ApiResponse(code=200, message="updated", data=await service.update_configs(payload))


@router.post("/system/reminders/run", response_model=ApiResponse[dict[str, int]])
async def run_auto_reminders(
    service: AutoReminderService = Depends(get_auto_reminder_service),
) -> ApiResponse[dict[str, int]]:
    summary = await service.run()
    return ApiResponse(code=200, message="ok", data=summary.to_dict())
