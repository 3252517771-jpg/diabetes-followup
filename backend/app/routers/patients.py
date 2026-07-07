from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.common import ApiResponse, PageData
from app.schemas.patient import (
    PatientCreate,
    PatientDetail,
    PatientListItem,
    PatientTagAssignRequest,
    PatientTagCreate,
    PatientTagRead,
    PatientTagUpdate,
    PatientUpdate,
)
from app.services.patient_service import PatientService
from app.utils.dependencies import get_current_user

router = APIRouter(tags=["patients"])


def get_patient_service(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> PatientService:
    return PatientService(db, current_user)


@router.get("/patients", response_model=ApiResponse[PageData[PatientListItem]])
async def list_patients(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    search: str | None = None,
    tag: int | None = None,
    status_value: str | None = Query(default=None, alias="status"),
    diagnosis_type: str | None = None,
    severity: str | None = None,
    service: PatientService = Depends(get_patient_service),
) -> ApiResponse[PageData[PatientListItem]]:
    data = await service.list_patients(
        page=page,
        size=size,
        search=search,
        tag=tag,
        status_value=status_value,
        diagnosis_type=diagnosis_type,
        severity=severity,
    )
    return ApiResponse(code=200, message="ok", data=data)


@router.post("/patients", response_model=ApiResponse[PatientDetail], status_code=status.HTTP_201_CREATED)
async def create_patient(
    payload: PatientCreate,
    service: PatientService = Depends(get_patient_service),
) -> ApiResponse[PatientDetail]:
    data = await service.create_patient(payload)
    return ApiResponse(code=201, message="created", data=data)


@router.get("/patients/{patient_id}", response_model=ApiResponse[PatientDetail])
async def get_patient(
    patient_id: int,
    service: PatientService = Depends(get_patient_service),
) -> ApiResponse[PatientDetail]:
    data = await service.get_patient_detail(patient_id)
    return ApiResponse(code=200, message="ok", data=data)


@router.put("/patients/{patient_id}", response_model=ApiResponse[PatientDetail])
async def update_patient(
    patient_id: int,
    payload: PatientUpdate,
    service: PatientService = Depends(get_patient_service),
) -> ApiResponse[PatientDetail]:
    data = await service.update_patient(patient_id, payload)
    return ApiResponse(code=200, message="updated", data=data)


@router.delete("/patients/{patient_id}", response_model=ApiResponse[dict[str, bool]])
async def delete_patient(
    patient_id: int,
    service: PatientService = Depends(get_patient_service),
) -> ApiResponse[dict[str, bool]]:
    await service.delete_patient(patient_id)
    return ApiResponse(code=200, message="deleted", data={"success": True})


@router.get("/patients/{patient_id}/tags", response_model=ApiResponse[list[PatientTagRead]])
async def list_patient_tags(
    patient_id: int,
    service: PatientService = Depends(get_patient_service),
) -> ApiResponse[list[PatientTagRead]]:
    data = await service.list_patient_tags(patient_id)
    return ApiResponse(code=200, message="ok", data=data)


@router.post("/patients/{patient_id}/tags", response_model=ApiResponse[list[PatientTagRead]])
async def assign_patient_tags(
    patient_id: int,
    payload: PatientTagAssignRequest,
    service: PatientService = Depends(get_patient_service),
) -> ApiResponse[list[PatientTagRead]]:
    data = await service.assign_patient_tags(patient_id, payload)
    return ApiResponse(code=200, message="updated", data=data)


@router.get("/tags", response_model=ApiResponse[list[PatientTagRead]])
async def list_tags(
    service: PatientService = Depends(get_patient_service),
) -> ApiResponse[list[PatientTagRead]]:
    data = await service.list_tags()
    return ApiResponse(code=200, message="ok", data=data)


@router.post("/tags", response_model=ApiResponse[PatientTagRead], status_code=status.HTTP_201_CREATED)
async def create_tag(
    payload: PatientTagCreate,
    service: PatientService = Depends(get_patient_service),
) -> ApiResponse[PatientTagRead]:
    data = await service.create_tag(payload)
    return ApiResponse(code=201, message="created", data=data)


@router.put("/tags/{tag_id}", response_model=ApiResponse[PatientTagRead])
async def update_tag(
    tag_id: int,
    payload: PatientTagUpdate,
    service: PatientService = Depends(get_patient_service),
) -> ApiResponse[PatientTagRead]:
    data = await service.update_tag(tag_id, payload)
    return ApiResponse(code=200, message="updated", data=data)
