from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.user import Role, User, UserRole
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserRead
from app.utils.security import create_access_token, get_password_hash, verify_password


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.settings = get_settings()

    async def register(self, payload: RegisterRequest) -> TokenResponse:
        existing_user = await self.db.scalar(
            select(User).where(User.username == payload.username)
        )
        if existing_user:
            raise ValueError("用户名已存在")

        role = await self.db.scalar(select(Role).where(Role.role_code == payload.role_code))
        if role is None:
            role = Role(
                role_name=payload.role_code,
                role_code=payload.role_code,
                description=f"{payload.role_code} role",
            )
            self.db.add(role)
            await self.db.flush()

        user = User(
            username=payload.username,
            password_hash=get_password_hash(payload.password),
            real_name=payload.real_name,
            phone=payload.phone,
            department=payload.department,
            status=1,
        )
        self.db.add(user)
        await self.db.flush()

        self.db.add(UserRole(user_id=user.id, role_id=role.id))
        await self.db.commit()
        await self.db.refresh(user)
        return await self._build_token_response(user, [role.role_code])

    async def login(self, payload: LoginRequest) -> TokenResponse:
        user = await self.db.scalar(select(User).where(User.username == payload.username))
        if user is None or not verify_password(payload.password, user.password_hash):
            raise ValueError("用户名或密码错误")
        if user.status != 1:
            raise PermissionError("账号已禁用")

        roles = await self._get_role_codes(user.id)
        return await self._build_token_response(user, roles)

    async def get_user_roles(self, user_id: int) -> list[str]:
        return await self._get_role_codes(user_id)

    async def _get_role_codes(self, user_id: int) -> list[str]:
        result = await self.db.execute(
            select(Role.role_code)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(UserRole.user_id == user_id)
        )
        return list(result.scalars().all())

    async def _build_token_response(self, user: User, roles: list[str]) -> TokenResponse:
        expire_delta = timedelta(minutes=self.settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": str(user.id), "role": roles[0] if roles else "doctor"},
            expires_delta=expire_delta,
        )
        return TokenResponse(
            access_token=access_token,
            user=UserRead(
                id=user.id,
                username=user.username,
                real_name=user.real_name,
                department=user.department,
                status=user.status,
                roles=roles,
            ),
        )
