from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.common import ApiResponse, PageData
from app.schemas.notification import NotificationRead, NotificationUnreadCount
from app.services.notification_service import NotificationService
from app.utils.dependencies import get_current_user

router = APIRouter(tags=["notifications"])


def get_notification_service(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> NotificationService:
    return NotificationService(db, current_user)


@router.get("/notifications", response_model=ApiResponse[PageData[NotificationRead]])
async def list_notifications(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    type_filter: str | None = Query(default=None, alias="type"),
    service: NotificationService = Depends(get_notification_service),
) -> ApiResponse[PageData[NotificationRead]]:
    data = await service.list_notifications(page=page, size=size, type_filter=type_filter)
    return ApiResponse(code=200, message="ok", data=data)


@router.put("/notifications/{notification_id}/read", response_model=ApiResponse[NotificationRead])
async def mark_notification_read(
    notification_id: int,
    service: NotificationService = Depends(get_notification_service),
) -> ApiResponse[NotificationRead]:
    data = await service.mark_read(notification_id)
    return ApiResponse(code=200, message="updated", data=data)


@router.put("/notifications/read-all", response_model=ApiResponse[dict[str, int]])
async def mark_all_notifications_read(
    service: NotificationService = Depends(get_notification_service),
) -> ApiResponse[dict[str, int]]:
    data = await service.mark_all_read()
    return ApiResponse(code=200, message="updated", data=data)


@router.get("/notifications/unread-count", response_model=ApiResponse[NotificationUnreadCount])
async def get_unread_count(
    service: NotificationService = Depends(get_notification_service),
) -> ApiResponse[NotificationUnreadCount]:
    data = NotificationUnreadCount(unread_count=await service.unread_count())
    return ApiResponse(code=200, message="ok", data=data)
