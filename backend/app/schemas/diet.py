from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DietMealPlan(BaseModel):
    meal_type: str = Field(min_length=1, max_length=20)
    foods: list[str] = Field(default_factory=list)
    tips: str = Field(default="", max_length=300)


class DietRecommendationContent(BaseModel):
    meals: list[DietMealPlan] = Field(default_factory=list)
    total_calories: int = Field(ge=0, le=5000)
    notes: str = Field(default="", max_length=1000)


class DietRecommendationGenerateRequest(BaseModel):
    patient_id: int
    preferred_calories: int | None = Field(default=None, ge=800, le=3500)
    additional_prompt: str | None = Field(default=None, max_length=500)


class DietRecommendationReviewRequest(BaseModel):
    review_comment: str | None = Field(default=None, max_length=500)
    edited_content: DietRecommendationContent | None = None


class DietRecommendationRead(BaseModel):
    id: int
    patient_id: int
    patient_name: str | None = None
    generate_method: str
    content: DietRecommendationContent
    review_status: str
    reviewer_id: int | None = None
    reviewer_name: str | None = None
    review_comment: str | None = None
    push_status: str
    push_target_type: str
    push_target_label: str
    created_at: datetime
    reviewed_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
