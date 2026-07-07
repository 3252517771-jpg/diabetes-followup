from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system import SystemConfig
from app.models.user import Role, User, UserRole
from app.schemas.common import PageData
from app.schemas.system import (
    SystemConfigRead,
    SystemConfigUpdateItem,
    SystemUserCreate,
    SystemUserRead,
    SystemUserUpdate,
)
from app.utils.security import get_password_hash


class SystemService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_users(self, *, page: int, size: int, role: str | None = None, department: str | None = None) -> PageData[SystemUserRead]:
        result = await self.db.execute(select(User).order_by(User.created_at.desc(), User.id.desc()))
        users = list(result.scalars().all())
        items = []
        for user in users:
            role_code = await self._get_role_code(user.id)
            if role and role_code != role:
                continue
            if department and user.department != department:
                continue
            items.append(await self._build_user_read(user, role_code))
        total = len(items)
        start = (page - 1) * size
        end = start + size
        return PageData(items=items[start:end], total=total, page=page, size=size)

    async def create_user(self, payload: SystemUserCreate) -> SystemUserRead:
        user = User(
            username=payload.username,
            password_hash=get_password_hash(payload.password),
            real_name=payload.real_name,
            phone=payload.phone,
            department=payload.department,
            status=payload.status,
        )
        self.db.add(user)
        await self.db.flush()
        role = await self._get_or_create_role(payload.role_code)
        self.db.add(UserRole(user_id=user.id, role_id=role.id))
        await self.db.commit()
        await self.db.refresh(user)
        return await self._build_user_read(user, role.role_code)

    async def update_user(self, user_id: int, payload: SystemUserUpdate) -> SystemUserRead:
        user = await self.db.get(User, user_id)
        if user is None:
            raise ValueError("User not found")
        user.real_name = payload.real_name
        user.phone = payload.phone
        user.department = payload.department
        user.status = payload.status
        role = await self._get_or_create_role(payload.role_code)
        await self.db.execute(select(UserRole))
        existing = await self.db.scalar(select(UserRole).where(UserRole.user_id == user_id))
        if existing is None:
            self.db.add(UserRole(user_id=user_id, role_id=role.id))
        else:
            existing.role_id = role.id
        await self.db.commit()
        await self.db.refresh(user)
        return await self._build_user_read(user, role.role_code)

    async def list_configs(self) -> list[SystemConfigRead]:
        result = await self.db.execute(select(SystemConfig).order_by(SystemConfig.config_key.asc()))
        return [SystemConfigRead.model_validate(item) for item in result.scalars().all()]

    async def update_configs(self, payload: list[SystemConfigUpdateItem]) -> list[SystemConfigRead]:
        for item in payload:
            config = await self.db.scalar(select(SystemConfig).where(SystemConfig.config_key == item.config_key))
            if config is None:
                config = SystemConfig(
                    config_key=item.config_key,
                    config_value=item.config_value,
                    description=item.description,
                )
                self.db.add(config)
            else:
                config.config_value = item.config_value
                config.description = item.description
        await self.db.commit()
        return await self.list_configs()

    async def _get_role_code(self, user_id: int) -> str:
        role = await self.db.scalar(
            select(Role.role_code)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(UserRole.user_id == user_id)
        )
        return role or "doctor"

    async def _get_or_create_role(self, role_code: str) -> Role:
        role = await self.db.scalar(select(Role).where(Role.role_code == role_code))
        if role is None:
            role = Role(role_name=role_code, role_code=role_code, description=f"{role_code} role")
            self.db.add(role)
            await self.db.flush()
        return role

    async def _build_user_read(self, user: User, role_code: str) -> SystemUserRead:
        return SystemUserRead(
            id=user.id,
            username=user.username,
            real_name=user.real_name,
            phone=user.phone,
            department=user.department,
            status=user.status,
            role_code=role_code,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )
