import pytest


@pytest.mark.asyncio
async def test_register_and_login(client):
    register_response = await client.post(
        "/api/auth/register",
        json={
            "username": "doctor01",
            "password": "secret123",
            "real_name": "张医生",
            "department": "内分泌科",
            "role_code": "doctor",
        },
    )
    assert register_response.status_code == 200
    register_data = register_response.json()["data"]
    assert register_data["user"]["username"] == "doctor01"
    assert register_data["token_type"] == "bearer"

    login_response = await client.post(
        "/api/auth/login",
        json={"username": "doctor01", "password": "secret123"},
    )
    assert login_response.status_code == 200
    login_data = login_response.json()["data"]
    assert login_data["user"]["real_name"] == "张医生"
    assert login_data["access_token"]
