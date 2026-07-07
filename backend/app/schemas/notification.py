from datetime import datetime

from pydantic import BaseModel, Field


class NotificationRead(BaseModel):
    id: int
    title: str
    body: str
    notification_type: str
    channel: str
    status: str
    recipient_type: str
    recipient_id: int
    action_label: str | None = None
    action_path: str | None = None
    fail_reason: str | None = None
    sent_at: datetime


class NotificationUnreadCount(BaseModel):
    unread_count: int = Field(ge=0)
