from datetime import date, timedelta

import pytest

from app.services.push_service import PushService
from tests.test_glucose import create_patient
from tests.test_patients import login_user, register_user


def template_payload():
    return {
        "name": "Reminder Template",
        "description": "Template for auto reminders",
        "applicable_type": "Type2",
        "is_public": True,
        "stages": [
            {
                "stage_order": 1,
                "stage_name": "Stage 1",
                "start_day_offset": 0,
                "duration_days": 7,
                "tasks": [
                    {
                        "task_type": "blood_glucose",
                        "executor": "patient",
                        "frequency": "daily",
                        "remind_before_minutes": 30,
                        "description": "Record glucose",
                    }
                ],
            }
        ],
    }


@pytest.mark.asyncio
async def test_auto_reminder_respects_patient_switch(client, monkeypatch):
    async def fake_push(self, send_key, title, body):
        return True, None

    monkeypatch.setattr(PushService, "send_server_chan", fake_push)

    await register_user(client, username="admin_reminder", password="secret123", real_name="Admin Reminder", role_code="admin")
    await register_user(client, username="doctor_reminder", password="secret123", real_name="Doctor Reminder")

    admin_token = await login_user(client, "admin_reminder", "secret123")
    doctor_token = await login_user(client, "doctor_reminder", "secret123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    doctor_headers = {"Authorization": f"Bearer {doctor_token}"}

    enabled_patient_id = await create_patient(client, doctor_headers, "Enabled Reminder")
    disabled_patient_id = await create_patient(client, doctor_headers, "Disabled Reminder")

    enabled_update = await client.put(
        f"/api/patients/{enabled_patient_id}",
        json={
            "name": "Enabled Reminder",
            "gender": 2,
            "age": 61,
            "phone": "13600000001",
            "diagnosis_type": "Type2",
            "severity": "Moderate",
            "status": "following",
            "auto_push_enabled": True,
            "notes": "enabled",
            "tag_ids": [],
        },
        headers=doctor_headers,
    )
    assert enabled_update.status_code == 200

    disabled_update = await client.put(
        f"/api/patients/{disabled_patient_id}",
        json={
            "name": "Disabled Reminder",
            "gender": 2,
            "age": 62,
            "phone": "13600000002",
            "diagnosis_type": "Type2",
            "severity": "Moderate",
            "status": "following",
            "auto_push_enabled": False,
            "notes": "disabled",
            "tag_ids": [],
        },
        headers=doctor_headers,
    )
    assert disabled_update.status_code == 200

    template_response = await client.post("/api/followup/templates", json=template_payload(), headers=doctor_headers)
    assert template_response.status_code == 201
    template_id = template_response.json()["data"]["id"]

    for patient_id in [enabled_patient_id, disabled_patient_id]:
        plan_response = await client.post(
            "/api/followup/plans",
            json={"patient_id": patient_id, "template_id": template_id, "start_date": date.today().isoformat()},
            headers=doctor_headers,
        )
        assert plan_response.status_code == 201

    run_response = await client.post("/api/system/reminders/run", headers=admin_headers)
    assert run_response.status_code == 200
    summary = run_response.json()["data"]
    assert summary["glucose_due"] >= 1
    assert summary["glucose_sent"] >= 1
    assert summary["followup_due"] >= 1
    assert summary["followup_sent"] >= 1

    enabled_notifications = await client.get(
        f"/api/h5/api/patient/notifications?token={((await client.get(f'/api/patients/{enabled_patient_id}/h5-access', headers=doctor_headers)).json()['data']['access_token'])}&phone_last4=0001"
    )
    assert enabled_notifications.status_code == 200
    enabled_items = enabled_notifications.json()["data"]
    assert any('"notification_type": "glucose_daily_reminder"' in item["content"] for item in enabled_items)
    assert any('"notification_type": "followup_task_reminder"' in item["content"] for item in enabled_items)

    disabled_notifications = await client.get(
        f"/api/h5/api/patient/notifications?token={((await client.get(f'/api/patients/{disabled_patient_id}/h5-access', headers=doctor_headers)).json()['data']['access_token'])}&phone_last4=0002"
    )
    assert disabled_notifications.status_code == 200
    assert disabled_notifications.json()["data"] == []

    second_run = await client.post("/api/system/reminders/run", headers=admin_headers)
    assert second_run.status_code == 200
    second_summary = second_run.json()["data"]
    assert second_summary["glucose_sent"] == 0
    assert second_summary["followup_sent"] == 0
