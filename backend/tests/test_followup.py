from datetime import date, timedelta

import pytest

from tests.test_glucose import create_patient
from tests.test_patients import login_user, register_user


def template_payload(name: str = "Type2 Followup"):
    return {
        "name": name,
        "description": "Two-stage followup template",
        "applicable_type": "Type2",
        "is_public": True,
        "stages": [
            {
                "stage_order": 1,
                "stage_name": "Initial stabilization",
                "start_day_offset": 0,
                "duration_days": 14,
                "tasks": [
                    {
                        "task_type": "blood_glucose",
                        "executor": "patient",
                        "frequency": "daily",
                        "remind_before_minutes": 30,
                        "description": "Record fasting glucose",
                    }
                ],
            },
            {
                "stage_order": 2,
                "stage_name": "Routine followup",
                "start_day_offset": 14,
                "duration_days": 14,
                "tasks": [
                    {
                        "task_type": "phone_visit",
                        "executor": "nurse",
                        "frequency": "weekly",
                        "remind_before_minutes": 120,
                        "description": "Phone check",
                    }
                ],
            },
        ],
    }


@pytest.mark.asyncio
async def test_followup_template_and_plan_flow(client):
    await register_user(client, username="doctor_followup", password="secret123", real_name="Followup Doctor")
    token = await login_user(client, "doctor_followup", "secret123")
    headers = {"Authorization": f"Bearer {token}"}
    patient_id = await create_patient(client, headers, "Followup Patient")

    create_template_response = await client.post(
        "/api/followup/templates",
        json=template_payload(),
        headers=headers,
    )
    assert create_template_response.status_code == 201
    template = create_template_response.json()["data"]
    assert template["stage_count"] == 2
    assert template["task_count"] == 2
    assert template["total_days"] == 28

    template_id = template["id"]
    detail_response = await client.get(f"/api/followup/templates/{template_id}", headers=headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["data"]["stages"][0]["tasks"][0]["task_type"] == "blood_glucose"

    copy_response = await client.post(f"/api/followup/templates/{template_id}/copy", headers=headers)
    assert copy_response.status_code == 201
    assert copy_response.json()["data"]["is_public"] is False

    start_date = date.today().isoformat()
    create_plan_response = await client.post(
        "/api/followup/plans",
        json={"patient_id": patient_id, "template_id": template_id, "start_date": start_date},
        headers=headers,
    )
    assert create_plan_response.status_code == 201
    plan = create_plan_response.json()["data"]
    assert plan["patient_id"] == patient_id
    assert plan["end_date"] == (date.today() + timedelta(days=27)).isoformat()
    assert plan["progress_percent"] > 0
    assert plan["template"]["id"] == template_id

    plan_id = plan["id"]
    update_response = await client.put(
        f"/api/followup/plans/{plan_id}",
        json={"status": "paused", "current_stage": 2},
        headers=headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()["data"]["status"] == "paused"

    list_response = await client.get(f"/api/followup/plans?patient_id={patient_id}", headers=headers)
    assert list_response.status_code == 200
    assert list_response.json()["data"]["total"] == 1


@pytest.mark.asyncio
async def test_followup_data_isolation_for_doctors(client):
    await register_user(client, username="doctor_follow_owner", password="secret123", real_name="Owner")
    await register_user(client, username="doctor_follow_other", password="secret123", real_name="Other")

    owner_token = await login_user(client, "doctor_follow_owner", "secret123")
    other_token = await login_user(client, "doctor_follow_other", "secret123")
    owner_headers = {"Authorization": f"Bearer {owner_token}"}
    other_headers = {"Authorization": f"Bearer {other_token}"}
    patient_id = await create_patient(client, owner_headers, "Private Followup")

    template_response = await client.post("/api/followup/templates", json=template_payload("Private Template"), headers=owner_headers)
    assert template_response.status_code == 201
    template_id = template_response.json()["data"]["id"]

    plan_response = await client.post(
        "/api/followup/plans",
        json={"patient_id": patient_id, "template_id": template_id, "start_date": date.today().isoformat()},
        headers=owner_headers,
    )
    assert plan_response.status_code == 201
    plan_id = plan_response.json()["data"]["id"]

    other_plan_response = await client.get(f"/api/followup/plans/{plan_id}", headers=other_headers)
    assert other_plan_response.status_code == 404

    other_create_response = await client.post(
        "/api/followup/plans",
        json={"patient_id": patient_id, "template_id": template_id, "start_date": date.today().isoformat()},
        headers=other_headers,
    )
    assert other_create_response.status_code == 404
