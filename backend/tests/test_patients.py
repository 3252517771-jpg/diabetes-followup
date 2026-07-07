import pytest


async def login_user(client, username: str, password: str) -> str:
    response = await client.post(
        "/api/auth/login",
        json={"username": username, "password": password},
    )
    assert response.status_code == 200
    return response.json()["data"]["access_token"]


async def register_user(
    client,
    *,
    username: str,
    password: str,
    real_name: str,
    role_code: str = "doctor",
):
    response = await client.post(
        "/api/auth/register",
        json={
            "username": username,
            "password": password,
            "real_name": real_name,
            "department": "Endocrinology",
            "role_code": role_code,
        },
    )
    assert response.status_code == 200
    return response.json()["data"]


@pytest.mark.asyncio
async def test_patient_crud_and_tag_assignment(client):
    await register_user(
        client,
        username="doctor_a",
        password="secret123",
        real_name="Doctor A",
    )
    token = await login_user(client, "doctor_a", "secret123")
    headers = {"Authorization": f"Bearer {token}"}

    create_tag_response = await client.post(
        "/api/tags",
        json={"name": "High Risk", "color": "#2563EB"},
        headers=headers,
    )
    assert create_tag_response.status_code == 201
    tag_id = create_tag_response.json()["data"]["id"]

    create_patient_response = await client.post(
        "/api/patients",
        json={
            "name": "Alice",
            "gender": 2,
            "age": 58,
            "phone": "13800000000",
            "diagnosis_type": "Type2",
            "severity": "Moderate",
            "status": "following",
            "notes": "Needs weekly follow-up",
            "tag_ids": [tag_id],
        },
        headers=headers,
    )
    assert create_patient_response.status_code == 201
    patient_data = create_patient_response.json()["data"]
    patient_id = patient_data["id"]
    assert patient_data["name"] == "Alice"
    assert patient_data["tags"][0]["name"] == "High Risk"

    list_response = await client.get("/api/patients?page=1&size=20&search=Ali", headers=headers)
    assert list_response.status_code == 200
    list_data = list_response.json()["data"]
    assert list_data["total"] == 1
    assert list_data["items"][0]["responsible_doctor"]["real_name"] == "Doctor A"

    detail_response = await client.get(f"/api/patients/{patient_id}", headers=headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["data"]["phone"] == "13800000000"

    update_response = await client.put(
        f"/api/patients/{patient_id}",
        json={
            "name": "Alice Zhang",
            "gender": 2,
            "age": 59,
            "phone": "13900000000",
            "diagnosis_type": "Type2",
            "severity": "Severe",
            "status": "following",
            "notes": "Updated note",
            "tag_ids": [],
        },
        headers=headers,
    )
    assert update_response.status_code == 200
    updated_data = update_response.json()["data"]
    assert updated_data["name"] == "Alice Zhang"
    assert updated_data["severity"] == "Severe"
    assert updated_data["tags"] == []

    assign_tags_response = await client.post(
        f"/api/patients/{patient_id}/tags",
        json={"tag_ids": [tag_id]},
        headers=headers,
    )
    assert assign_tags_response.status_code == 200
    assert assign_tags_response.json()["data"][0]["id"] == tag_id

    delete_response = await client.delete(f"/api/patients/{patient_id}", headers=headers)
    assert delete_response.status_code == 200
    assert delete_response.json()["data"]["success"] is True

    list_after_delete = await client.get("/api/patients?page=1&size=20", headers=headers)
    assert list_after_delete.status_code == 200
    assert list_after_delete.json()["data"]["total"] == 0


@pytest.mark.asyncio
async def test_patient_data_isolation_for_doctors(client):
    await register_user(
        client,
        username="doctor_b",
        password="secret123",
        real_name="Doctor B",
    )
    await register_user(
        client,
        username="doctor_c",
        password="secret123",
        real_name="Doctor C",
    )

    token_b = await login_user(client, "doctor_b", "secret123")
    token_c = await login_user(client, "doctor_c", "secret123")
    headers_b = {"Authorization": f"Bearer {token_b}"}
    headers_c = {"Authorization": f"Bearer {token_c}"}

    create_response = await client.post(
        "/api/patients",
        json={
            "name": "Private Patient",
            "gender": 1,
            "age": 50,
            "phone": "13700000000",
            "diagnosis_type": "Type1",
            "severity": "Mild",
            "status": "enrolled",
            "notes": "owned by doctor b",
        },
        headers=headers_b,
    )
    assert create_response.status_code == 201
    patient_id = create_response.json()["data"]["id"]

    own_list_response = await client.get("/api/patients?page=1&size=20", headers=headers_b)
    assert own_list_response.status_code == 200
    assert own_list_response.json()["data"]["total"] == 1

    other_list_response = await client.get("/api/patients?page=1&size=20", headers=headers_c)
    assert other_list_response.status_code == 200
    assert other_list_response.json()["data"]["total"] == 0

    other_detail_response = await client.get(f"/api/patients/{patient_id}", headers=headers_c)
    assert other_detail_response.status_code == 404
