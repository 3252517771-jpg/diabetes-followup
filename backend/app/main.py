from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.config import get_settings
from app.database import AsyncSessionLocal, engine
from app.middlewares.error_handler import register_exception_handlers
from app.models.user import Role, User, UserRole
from app.routers.auth import router as auth_router
from app.routers.patients import router as patients_router
from app.utils.security import get_password_hash

settings = get_settings()


async def ensure_dev_user() -> None:
    async with AsyncSessionLocal() as session:
        role = await session.scalar(select(Role).where(Role.role_code == "doctor"))
        if role is None:
            role = Role(role_name="医生", role_code="doctor", description="默认医生角色")
            session.add(role)
            await session.flush()

        user = await session.scalar(select(User).where(User.username == "doctor01"))
        if user is None:
            user = User(
                username="doctor01",
                password_hash=get_password_hash("secret123"),
                real_name="张医生",
                department="内分泌科",
                status=1,
            )
            session.add(user)
            await session.flush()
            session.add(UserRole(user_id=user.id, role_id=role.id))

        await session.commit()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await ensure_dev_user()
    yield
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


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
