from __future__ import annotations

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.database import AsyncSessionLocal
from app.services.auto_reminder_service import AutoReminderService


class ReminderScheduler:
    def __init__(self) -> None:
        self.scheduler = AsyncIOScheduler(timezone="Asia/Shanghai")
        self._configured = False

    def start(self) -> None:
        if not self._configured:
            self.scheduler.add_job(
                run_auto_reminders_job,
                CronTrigger(hour=8, minute=0),
                id="auto-reminders-daily",
                replace_existing=True,
            )
            self._configured = True
        if not self.scheduler.running:
            self.scheduler.start()

    def shutdown(self) -> None:
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)


async def run_auto_reminders_job() -> None:
    async with AsyncSessionLocal() as session:
        service = AutoReminderService(session)
        await service.run()


reminder_scheduler = ReminderScheduler()
