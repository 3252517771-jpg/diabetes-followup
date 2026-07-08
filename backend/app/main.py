from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.config import get_settings
from app.database import AsyncSessionLocal, engine
from app.middlewares.error_handler import register_exception_handlers
from app.models.user import Role, User, UserRole
from app.routers.auth import router as auth_router
from app.routers.dashboard import router as dashboard_router
from app.routers.diet import router as diet_router
from app.routers.followup import router as followup_router
from app.routers.glucose import router as glucose_router
from app.routers.h5 import router as h5_router
from app.routers.notifications import router as notifications_router
from app.routers.patients import router as patients_router
from app.routers.system import router as system_router
from app.tasks.scheduler import reminder_scheduler
from app.utils.security import get_password_hash

settings = get_settings()


async def ensure_dev_user() -> None:
    async with AsyncSessionLocal() as session:
        doctor_role = await session.scalar(select(Role).where(Role.role_code == "doctor"))
        if doctor_role is None:
            doctor_role = Role(role_name="医生", role_code="doctor", description="默认医生角色")
            session.add(doctor_role)
            await session.flush()

        admin_role = await session.scalar(select(Role).where(Role.role_code == "admin"))
        if admin_role is None:
            admin_role = Role(role_name="管理员", role_code="admin", description="默认管理员角色")
            session.add(admin_role)
            await session.flush()

        doctor_user = await session.scalar(select(User).where(User.username == "doctor01"))
        if doctor_user is None:
            doctor_user = User(
                username="doctor01",
                password_hash=get_password_hash("secret123"),
                real_name="张医生",
                department="内分泌科",
                status=1,
            )
            session.add(doctor_user)
            await session.flush()
            session.add(UserRole(user_id=doctor_user.id, role_id=doctor_role.id))

        admin_user = await session.scalar(select(User).where(User.username == "admin01"))
        if admin_user is None:
            admin_user = User(
                username="admin01",
                password_hash=get_password_hash("secret123"),
                real_name="系统管理员",
                department="信息科",
                status=1,
            )
            session.add(admin_user)
            await session.flush()
            session.add(UserRole(user_id=admin_user.id, role_id=admin_role.id))

        await session.commit()


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.seed_default_users:
        await ensure_dev_user()
    reminder_scheduler.start()
    yield
    reminder_scheduler.shutdown()
    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)
app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(patients_router, prefix=settings.api_prefix)
app.include_router(glucose_router, prefix=settings.api_prefix)
app.include_router(followup_router, prefix=settings.api_prefix)
app.include_router(diet_router, prefix=settings.api_prefix)
app.include_router(notifications_router, prefix=settings.api_prefix)
app.include_router(dashboard_router, prefix=settings.api_prefix)
app.include_router(system_router, prefix=settings.api_prefix)
app.include_router(h5_router, prefix=settings.api_prefix)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
