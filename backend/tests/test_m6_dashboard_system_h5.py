from datetime import datetime

import pytest

from tests.test_glucose import create_patient
from tests.test_patients import login_user, register_user


@pytest.mark.asyncio
async def test_dashboard_system_and_h5_flow(client):
    await register_user(client, username="admin_m6", password="secret123", real_name="Admin M6", role_code="admin")
    await register_user(client, username="doctor_m6", password="secret123", real_name="Doctor M6", role_code="doctor")

    admin_token = await login_user(client, "admin_m6", "secret123")
    doctor_token = await login_user(client, "doctor_m6", "secret123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    doctor_headers = {"Authorization": f"Bearer {doctor_token}"}

    patient_id = await create_patient(client, doctor_headers, "H5 Patient")

    dashboard_stats = await client.get("/api/dashboard/stats", headers=doctor_headers)
    assert dashboard_stats.status_code == 200
    assert dashboard_stats.json()["data"]["patient_count"] == 1

    create_user_response = await client.post(
        "/api/system/users",
        json={
            "username": "nurse_m6",
            "password": "secret123",
            "real_name": "Nurse M6",
            "department": "Endocrinology",
            "role_code": "nurse",
            "status": 1,
        },
        headers=admin_headers,
    )
    assert create_user_response.status_code == 201

    list_config_response = await client.put(
        "/api/system/config",
        json=[
            {"config_key": "server_chan_key", "config_value": "SCTTEST", "description": "push key"},
            {"config_key": "glucose_target", "config_value": "fasting<=6.1", "description": "target"},
        ],
        headers=admin_headers,
    )
    assert list_config_response.status_code == 200
    assert len(list_config_response.json()["data"]) == 2

    access_response = await client.get(f"/api/patients/{patient_id}/h5-access", headers=doctor_headers)
    assert access_response.status_code == 200
    h5_token = access_response.json()["data"]["access_token"]
    phone_last4 = "0000"

    patient_info_response = await client.get(f"/api/h5/api/patient/info?token={h5_token}&phone_last4={phone_last4}")
    assert patient_info_response.status_code == 200
    assert patient_info_response.json()["data"]["name"] == "H5 Patient"

    tasks_response = await client.get(f"/api/h5/api/patient/tasks?token={h5_token}&phone_last4={phone_last4}")
    assert tasks_response.status_code == 200
    assert tasks_response.json()["data"][0]["key"] == "glucose"

    glucose_response = await client.post(
        "/api/h5/api/patient/glucose",
        json={
            "value": "6.20",
            "measure_time": datetime.now().isoformat(),
            "category": "fasting",
            "notes": "h5 submit",
        },
        headers={"X-H5-Token": h5_token, "X-H5-Phone-Last4": phone_last4},
    )
    assert glucose_response.status_code == 201
    assert glucose_response.json()["data"]["source"] == "patient"
    record_id = glucose_response.json()["data"]["id"]

    recent_response = await client.get(
        f"/api/h5/api/patient/glucose/recent?token={h5_token}&phone_last4={phone_last4}&limit=5"
    )
    assert recent_response.status_code == 200
    assert recent_response.json()["data"][0]["id"] == record_id
    assert recent_response.json()["data"][0]["editable"] is True

    update_response = await client.put(
        f"/api/h5/api/patient/glucose/{record_id}",
        json={
            "value": "5.80",
            "measure_time": datetime.now().isoformat(),
            "category": "postprandial",
            "notes": "edited by h5",
        },
        headers={"X-H5-Token": h5_token, "X-H5-Phone-Last4": phone_last4},
    )
    assert update_response.status_code == 200
    assert update_response.json()["data"]["category"] == "postprandial"
    assert update_response.json()["data"]["notes"] == "edited by h5"

    trend_response = await client.get("/api/dashboard/glucose-trend?days=7", headers=doctor_headers)
    assert trend_response.status_code == 200
    assert len(trend_response.json()["data"]["points"]) == 7
