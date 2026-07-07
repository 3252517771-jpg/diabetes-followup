from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class NotificationTemplate(Base):
    __tablename__ = "notification_template"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    trigger_event: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    channel: Mapped[str] = mapped_column(
        String(20), nullable=False, default="server_chan", server_default="server_chan"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )


class NotificationLog(Base):
    __tablename__ = "notification_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    recipient_type: Mapped[str] = mapped_column(String(10), nullable=False)
    recipient_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    plan_id: Mapped[int | None] = mapped_column(ForeignKey("followup_plan.id"), index=True)
    template_id: Mapped[int | None] = mapped_column(ForeignKey("notification_template.id"))
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    content_sent: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(10), nullable=False, default="pending", server_default="pending", index=True
    )
    fail_reason: Mapped[str | None] = mapped_column(String(200))
    sent_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
