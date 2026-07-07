from datetime import datetime, timedelta

import pytest

from tests.test_patients import login_user, register_user


async def create_patient(client, headers, name: str = "Glucose Patient") -> int:
    response = await client.post(
        "/api/patients",
        json={
            "name": name,
            "gender": 2,
            "age": 61,
            "phone": "13600000000",
            "diagnosis_type": "Type2",
            "severity": "Moderate",
            "status": "following",
            "notes": "glucose tracking",
        },
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()["data"]["id"]


@pytest.mark.asyncio
async def test_glucose_record_list_trend_and_stats(client):
    await register_user(
        client,
        username="doctor_glucose",
        password="secret123",
        real_name="Glucose Doctor",
    )
    token = await login_user(client, "doctor_glucose", "secret123")
    headers = {"Authorization": f"Bearer {token}"}
    patient_id = await create_patient(client, headers)

    today = datetime.now().replace(hour=7, minute=30, second=0, microsecond=0)
    payloads = [
        {"value": "5.80", "measure_time": today.isoformat(), "category": "fasting", "notes": "ok"},
        {
            "value": "9.20",
            "measure_time": (today + timedelta(hours=5)).isoformat(),
            "category": "postprandial",
            "notes": "after lunch",
        },
    ]
    for payload in payloads:
        response = await client.post(
            f"/api/patients/{patient_id}/blood-glucose",
            json=payload,
            headers=headers,
        )
        assert response.status_code == 201

    list_response = await client.get(
        f"/api/patients/{patient_id}/blood-glucose?page=1&size=20",
        headers=headers,
    )
    assert list_response.status_code == 200
    list_data = list_response.json()["data"]
    assert list_data["total"] == 2
    assert list_data["items"][0]["category"] == "postprandial"
    assert list_data["items"][0]["is_abnormal"] is True

    trend_response = await client.get(
        f"/api/patients/{patient_id}/glucose-trend?days=7",
        headers=headers,
    )
    assert trend_response.status_code == 200
    trend_data = trend_response.json()["data"]
    assert trend_data["compliance_rate"] == 50.0
    assert len(trend_data["points"]) == 7
    assert trend_data["points"][-1]["fasting_avg"] == 5.8

    stats_response = await client.get(
        f"/api/patients/{patient_id}/glucose-stats?days=30",
        headers=headers,
    )
    assert stats_response.status_code == 200
    stats_data = stats_response.json()["data"]
    assert stats_data["total_records"] == 2
    assert stats_data["abnormal_count"] == 1
    assert stats_data["postprandial_avg"] == 9.2

    overview_response = await client.get("/api/glucose/overview?days=7", headers=headers)
    assert overview_response.status_code == 200
    overview_data = overview_response.json()["data"]
    assert overview_data["patient_count"] == 1
    assert overview_data["total_records"] == 2
    assert overview_data["recent_abnormal_records"][0]["patient_name"] == "Glucose Patient"


@pytest.mark.asyncio
async def test_glucose_data_isolation_for_doctors(client):
    await register_user(client, username="doctor_owner", password="secret123", real_name="Owner")
    await register_user(client, username="doctor_other", password="secret123", real_name="Other")

    owner_token = await login_user(client, "doctor_owner", "secret123")
    other_token = await login_user(client, "doctor_other", "secret123")
    owner_headers = {"Authorization": f"Bearer {owner_token}"}
    other_headers = {"Authorization": f"Bearer {other_token}"}
    patient_id = await create_patient(client, owner_headers, "Private Glucose")

    create_response = await client.post(
        f"/api/patients/{patient_id}/blood-glucose",
        json={
            "value": "6.40",
            "measure_time": datetime.now().isoformat(),
            "category": "fasting",
        },
        headers=owner_headers,
    )
    assert create_response.status_code == 201

    other_list_response = await client.get(
        f"/api/patients/{patient_id}/blood-glucose?page=1&size=20",
        headers=other_headers,
    )
    assert other_list_response.status_code == 404

    other_create_response = await client.post(
        f"/api/patients/{patient_id}/blood-glucose",
        json={
            "value": "5.60",
            "measure_time": datetime.now().isoformat(),
            "category": "fasting",
        },
        headers=other_headers,
    )
    assert other_create_response.status_code == 404
