import pytest

from app.services.ai_recommend_service import AIRecommendService
from app.services.push_service import PushService
from tests.test_glucose import create_patient
from tests.test_patients import login_user, register_user


async def create_diet_recommendation(client, headers, patient_id: int) -> int:
    response = await client.post(
        "/api/diet/recommend",
        json={"patient_id": patient_id, "preferred_calories": 1700},
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()["data"]["id"]


@pytest.mark.asyncio
async def test_diet_recommendation_review_and_notifications_flow(client, monkeypatch):
    async def fake_generate(self, context):
        return {
            "meals": [
                {
                    "meal_type": "breakfast",
                    "foods": ["燕麦 40g", "鸡蛋 1 个"],
                    "tips": "控制早餐糖分。",
                },
                {
                    "meal_type": "lunch",
                    "foods": ["糙米饭 100g", "清蒸鱼 150g"],
                    "tips": "午餐补足蛋白。",
                },
            ],
            "total_calories": context.get("preferred_calories") or 1700,
            "notes": "测试用推荐内容",
        }

    async def fake_push(self, send_key, title, body):
        assert title.startswith("饮食推荐已通过")
        assert "总热量" in body
        return True, None

    monkeypatch.setattr(AIRecommendService, "generate_recommendation", fake_generate)
    monkeypatch.setattr(PushService, "send_server_chan", fake_push)

    await register_user(client, username="doctor_diet", password="secret123", real_name="Diet Doctor")
    await register_user(
        client,
        username="nutritionist_diet",
        password="secret123",
        real_name="Diet Reviewer",
        role_code="nutritionist",
    )
    doctor_token = await login_user(client, "doctor_diet", "secret123")
    nutritionist_token = await login_user(client, "nutritionist_diet", "secret123")
    doctor_headers = {"Authorization": f"Bearer {doctor_token}"}
    nutritionist_headers = {"Authorization": f"Bearer {nutritionist_token}"}
    patient_id = await create_patient(client, doctor_headers, "Diet Patient")

    recommendation_id = await create_diet_recommendation(client, doctor_headers, patient_id)

    list_response = await client.get("/api/diet/recommendations?page=1&size=20", headers=doctor_headers)
    assert list_response.status_code == 200
    assert list_response.json()["data"]["total"] == 1
    assert list_response.json()["data"]["items"][0]["review_status"] == "pending"

    notification_response = await client.get(
        "/api/notifications?type=todo&page=1&size=20",
        headers=nutritionist_headers,
    )
    assert notification_response.status_code == 200
    todo_items = notification_response.json()["data"]["items"]
    assert len(todo_items) == 1
    assert todo_items[0]["title"].startswith("AI饮食推荐待审核")

    approve_response = await client.put(
        f"/api/diet/recommendations/{recommendation_id}/approve",
        json={"review_comment": "适合当前血糖控制阶段"},
        headers=nutritionist_headers,
    )
    assert approve_response.status_code == 200
    approved = approve_response.json()["data"]
    assert approved["review_status"] == "approved"
    assert approved["push_status"] == "pushed"
    assert approved["reviewer_name"] == "Diet Reviewer"

    unread_response = await client.get("/api/notifications/unread-count", headers=doctor_headers)
    assert unread_response.status_code == 200
    assert unread_response.json()["data"]["unread_count"] >= 1

    doctor_messages = await client.get("/api/notifications?page=1&size=20", headers=doctor_headers)
    assert doctor_messages.status_code == 200
    approval_notice = doctor_messages.json()["data"]["items"][0]
    assert "饮食推荐已通过" in approval_notice["title"]

    mark_read_response = await client.put(
        f"/api/notifications/{approval_notice['id']}/read",
        headers=doctor_headers,
    )
    assert mark_read_response.status_code == 200
    assert mark_read_response.json()["data"]["status"] == "read"


@pytest.mark.asyncio
async def test_diet_recommendation_isolation_and_reject_flow(client, monkeypatch):
    async def fake_generate(self, context):
        return {
            "meals": [
                {
                    "meal_type": "dinner",
                    "foods": ["鸡胸肉 100g", "西兰花 150g"],
                    "tips": "晚餐清淡。",
                }
            ],
            "total_calories": 1500,
            "notes": "待驳回测试",
        }

    monkeypatch.setattr(AIRecommendService, "generate_recommendation", fake_generate)

    await register_user(client, username="doctor_diet_owner", password="secret123", real_name="Owner")
    await register_user(client, username="doctor_diet_other", password="secret123", real_name="Other")
    await register_user(
        client,
        username="nutritionist_reject",
        password="secret123",
        real_name="Reject Reviewer",
        role_code="nutritionist",
    )

    owner_token = await login_user(client, "doctor_diet_owner", "secret123")
    other_token = await login_user(client, "doctor_diet_other", "secret123")
    reviewer_token = await login_user(client, "nutritionist_reject", "secret123")
    owner_headers = {"Authorization": f"Bearer {owner_token}"}
    other_headers = {"Authorization": f"Bearer {other_token}"}
    reviewer_headers = {"Authorization": f"Bearer {reviewer_token}"}

    patient_id = await create_patient(client, owner_headers, "Private Diet")
    recommendation_id = await create_diet_recommendation(client, owner_headers, patient_id)

    other_response = await client.get(
        f"/api/diet/recommendations/{recommendation_id}",
        headers=other_headers,
    )
    assert other_response.status_code == 404

    reject_response = await client.put(
        f"/api/diet/recommendations/{recommendation_id}/reject",
        json={"review_comment": "需补充近期饮食偏好"},
        headers=reviewer_headers,
    )
    assert reject_response.status_code == 200
    rejected = reject_response.json()["data"]
    assert rejected["review_status"] == "rejected"
    assert rejected["push_status"] == "unpushed"

    read_all_response = await client.put("/api/notifications/read-all", headers=owner_headers)
    assert read_all_response.status_code == 200
    assert read_all_response.json()["data"]["updated"] >= 1
