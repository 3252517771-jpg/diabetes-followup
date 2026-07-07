import json
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import NotificationLog
from app.models.user import User
from app.schemas.common import PageData
from app.schemas.notification import NotificationRead


class NotificationService:
    def __init__(self, db: AsyncSession, current_user: User):
        self.db = db
        self.current_user = current_user

    async def list_notifications(
        self,
        *,
        page: int,
        size: int,
        type_filter: str | None = None,
    ) -> PageData[NotificationRead]:
        query = (
            select(NotificationLog)
            .where(
                NotificationLog.recipient_type == "user",
                NotificationLog.recipient_id == self.current_user.id,
            )
            .order_by(NotificationLog.sent_at.desc(), NotificationLog.id.desc())
        )
        rows = list((await self.db.execute(query)).scalars().all())
        items = [self._build_notification_read(row) for row in rows]
        if type_filter:
            items = [item for item in items if item.notification_type == type_filter]

        total = len(items)
        start = (page - 1) * size
        end = start + size
        return PageData(items=items[start:end], total=total, page=page, size=size)

    async def mark_read(self, notification_id: int) -> NotificationRead:
        notification = await self._get_user_notification(notification_id)
        notification.status = "read"
        await self.db.commit()
        return self._build_notification_read(notification)

    async def mark_all_read(self) -> dict[str, int]:
        result = await self.db.execute(
            select(NotificationLog).where(
                NotificationLog.recipient_type == "user",
                NotificationLog.recipient_id == self.current_user.id,
                NotificationLog.status == "unread",
            )
        )
        notifications = list(result.scalars().all())
        for item in notifications:
            item.status = "read"
        await self.db.commit()
        return {"updated": len(notifications)}

    async def unread_count(self) -> int:
        count = await self.db.scalar(
            select(func.count()).select_from(NotificationLog).where(
                NotificationLog.recipient_type == "user",
                NotificationLog.recipient_id == self.current_user.id,
                NotificationLog.status == "unread",
            )
        )
        return count or 0

    async def create_user_notification(
        self,
        *,
        recipient_id: int,
        title: str,
        body: str,
        notification_type: str,
        action_label: str | None = None,
        action_path: str | None = None,
        channel: str = "in_app",
    ) -> NotificationLog:
        log = NotificationLog(
            recipient_type="user",
            recipient_id=recipient_id,
            channel=channel,
            content_sent=self._encode_payload(
                title=title,
                body=body,
                notification_type=notification_type,
                action_label=action_label,
                action_path=action_path,
            ),
            status="unread",
            sent_at=datetime.now(),
        )
        self.db.add(log)
        await self.db.flush()
        await self.db.refresh(log)
        return log

    async def create_patient_push_log(
        self,
        *,
        patient_id: int,
        title: str,
        body: str,
        success: bool,
        notification_type: str = "notification",
        fail_reason: str | None = None,
        channel: str = "server_chan",
    ) -> NotificationLog:
        log = NotificationLog(
            recipient_type="patient",
            recipient_id=patient_id,
            channel=channel,
            content_sent=self._encode_payload(
                title=title,
                body=body,
                notification_type=notification_type,
            ),
            status="sent" if success else "failed",
            fail_reason=fail_reason,
            sent_at=datetime.now(),
        )
        self.db.add(log)
        await self.db.flush()
        await self.db.refresh(log)
        return log

    async def _get_user_notification(self, notification_id: int) -> NotificationLog:
        notification = await self.db.scalar(
            select(NotificationLog).where(
                NotificationLog.id == notification_id,
                NotificationLog.recipient_type == "user",
                NotificationLog.recipient_id == self.current_user.id,
            )
        )
        if notification is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
        return notification

    def _build_notification_read(self, row: NotificationLog) -> NotificationRead:
        payload = self._decode_payload(row.content_sent)
        return NotificationRead(
            id=row.id,
            title=payload["title"],
            body=payload["body"],
            notification_type=payload["notification_type"],
            channel=row.channel,
            status=row.status,
            recipient_type=row.recipient_type,
            recipient_id=row.recipient_id,
            action_label=payload.get("action_label"),
            action_path=payload.get("action_path"),
            fail_reason=row.fail_reason,
            sent_at=row.sent_at,
        )

    def _encode_payload(
        self,
        *,
        title: str,
        body: str,
        notification_type: str,
        action_label: str | None = None,
        action_path: str | None = None,
    ) -> str:
        return json.dumps(
            {
                "title": title,
                "body": body,
                "notification_type": notification_type,
                "action_label": action_label,
                "action_path": action_path,
            },
            ensure_ascii=False,
        )

    def _decode_payload(self, content: str) -> dict:
        try:
            payload = json.loads(content)
        except json.JSONDecodeError:
            payload = {"title": "系统消息", "body": content, "notification_type": "notification"}
        payload.setdefault("title", "系统消息")
        payload.setdefault("body", "")
        payload.setdefault("notification_type", "notification")
        return payload
