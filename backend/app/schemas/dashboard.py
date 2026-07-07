from pydantic import BaseModel, Field


class DashboardStats(BaseModel):
    patient_count: int = Field(ge=0)
    following_count: int = Field(ge=0)
    compliance_rate: float = Field(ge=0)
    todo_count: int = Field(ge=0)


class DashboardTrendPoint(BaseModel):
    date: str
    fasting_avg: float | None = None
    postprandial_avg: float | None = None


class DashboardGlucoseTrend(BaseModel):
    days: int
    points: list[DashboardTrendPoint]


class DashboardDistributionItem(BaseModel):
    status: str
    count: int = Field(ge=0)


class DashboardPendingItem(BaseModel):
    key: str
    label: str
    count: int = Field(ge=0)


class DashboardPatientOverview(BaseModel):
    status_distribution: list[DashboardDistributionItem]
    pending_items: list[DashboardPendingItem]
