from fastapi import APIRouter, Depends, Header, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.common import ApiResponse
from app.schemas.glucose import BloodGlucoseRecordRead
from app.schemas.h5 import (
    H5AccessLinkRead,
    H5GlucoseCreate,
    H5GlucoseUpdate,
    H5NotificationItemRead,
    H5PatientInfo,
    H5RecentGlucoseRecordRead,
    H5TaskItem,
)
from app.services.h5_service import H5Service
from app.utils.dependencies import get_current_user

router = APIRouter(tags=["h5"])


def get_h5_service(db: AsyncSession = Depends(get_db)) -> H5Service:
    return H5Service(db)


@router.get("/patients/{patient_id}/h5-access", response_model=ApiResponse[H5AccessLinkRead])
async def create_h5_access_link(
    patient_id: int,
    _: object = Depends(get_current_user),
    service: H5Service = Depends(get_h5_service),
) -> ApiResponse[H5AccessLinkRead]:
    return ApiResponse(code=200, message="ok", data=await service.create_access_link(patient_id))


@router.get("/h5/api/patient/info", response_model=ApiResponse[H5PatientInfo])
async def get_h5_patient_info(
    token: str = Query(...),
    phone_last4: str = Query(..., min_length=4, max_length=4),
    service: H5Service = Depends(get_h5_service),
) -> ApiResponse[H5PatientInfo]:
    return ApiResponse(code=200, message="ok", data=await service.get_patient_info(token, phone_last4))


@router.get("/h5/api/patient/tasks", response_model=ApiResponse[list[H5TaskItem]])
async def get_h5_patient_tasks(
    token: str = Query(...),
    phone_last4: str = Query(..., min_length=4, max_length=4),
    service: H5Service = Depends(get_h5_service),
) -> ApiResponse[list[H5TaskItem]]:
    return ApiResponse(code=200, message="ok", data=await service.get_tasks(token, phone_last4))


@router.post("/h5/api/patient/glucose", response_model=ApiResponse[BloodGlucoseRecordRead], status_code=status.HTTP_201_CREATED)
async def create_h5_glucose_record(
    payload: H5GlucoseCreate,
    x_h5_token: str = Header(..., alias="X-H5-Token"),
    x_h5_phone_last4: str = Header(..., alias="X-H5-Phone-Last4"),
    service: H5Service = Depends(get_h5_service),
) -> ApiResponse[BloodGlucoseRecordRead]:
    return ApiResponse(
        code=201,
        message="created",
        data=await service.create_glucose_record(x_h5_token, x_h5_phone_last4, payload),
    )


@router.get("/h5/api/patient/glucose/recent", response_model=ApiResponse[list[H5RecentGlucoseRecordRead]])
async def list_h5_recent_glucose_records(
    token: str = Query(...),
    phone_last4: str = Query(..., min_length=4, max_length=4),
    limit: int = Query(default=5, ge=1, le=20),
    service: H5Service = Depends(get_h5_service),
) -> ApiResponse[list[H5RecentGlucoseRecordRead]]:
    return ApiResponse(
        code=200,
        message="ok",
        data=await service.list_recent_glucose_records(token, phone_last4, limit=limit),
    )


@router.put("/h5/api/patient/glucose/{record_id}", response_model=ApiResponse[BloodGlucoseRecordRead])
async def update_h5_glucose_record(
    record_id: int,
    payload: H5GlucoseUpdate,
    x_h5_token: str = Header(..., alias="X-H5-Token"),
    x_h5_phone_last4: str = Header(..., alias="X-H5-Phone-Last4"),
    service: H5Service = Depends(get_h5_service),
) -> ApiResponse[BloodGlucoseRecordRead]:
    return ApiResponse(
        code=200,
        message="ok",
        data=await service.update_glucose_record(x_h5_token, x_h5_phone_last4, record_id, payload),
    )


@router.get("/h5/api/patient/notifications", response_model=ApiResponse[list[H5NotificationItemRead]])
async def get_h5_notifications(
    token: str = Query(...),
    phone_last4: str = Query(..., min_length=4, max_length=4),
    service: H5Service = Depends(get_h5_service),
) -> ApiResponse[list[H5NotificationItemRead]]:
    return ApiResponse(code=200, message="ok", data=await service.list_notifications(token, phone_last4))


@router.put("/h5/api/patient/notifications/{notification_id}/read", response_model=ApiResponse[H5NotificationItemRead])
async def mark_h5_notification_read(
    notification_id: int,
    x_h5_token: str = Header(..., alias="X-H5-Token"),
    x_h5_phone_last4: str = Header(..., alias="X-H5-Phone-Last4"),
    service: H5Service = Depends(get_h5_service),
) -> ApiResponse[H5NotificationItemRead]:
    return ApiResponse(
        code=200,
        message="updated",
        data=await service.mark_notification_read(x_h5_token, x_h5_phone_last4, notification_id),
    )
