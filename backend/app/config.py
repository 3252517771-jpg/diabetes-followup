from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "糖尿病随访系统"
    debug: bool = True
    api_prefix: str = "/api"
    database_url: str = "sqlite+aiosqlite:///./diabetes_followup.db"
    secret_key: str = Field(..., alias="SECRET_KEY")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    cors_origins: str = (
        "http://localhost:5173,"
        "http://127.0.0.1:5173,"
        "http://localhost:3000,"
        "http://127.0.0.1:3000,"
        "http://localhost:4173,"
        "http://127.0.0.1:4173"
    )
    enable_ai_recommend: bool = True
    ai_api_key: str = ""
    ai_api_base_url: str = "https://api.deepseek.com"
    ai_model: str = "deepseek-chat"
    enable_push: bool = False
    server_chan_key: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
