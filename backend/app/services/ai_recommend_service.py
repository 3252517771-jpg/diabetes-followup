import json
import re

import httpx

from app.config import get_settings


class AIRecommendService:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def generate_recommendation(self, context: dict) -> dict:
        if not self.settings.enable_ai_recommend or not self.settings.ai_api_key:
            return self._build_fallback_recommendation(context)

        payload = {
            "model": self.settings.ai_model,
            "temperature": 0.4,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a clinical nutrition assistant for diabetes follow-up. "
                        "Return valid JSON only with this schema: "
                        '{"meals":[{"meal_type":"breakfast","foods":["..."],"tips":"..."}],'
                        '"total_calories":1800,"notes":"..."}'
                    ),
                },
                {
                    "role": "user",
                    "content": self._build_user_prompt(context),
                },
            ],
        }
        headers = {
            "Authorization": f"Bearer {self.settings.ai_api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(base_url=self.settings.ai_api_base_url, timeout=30.0) as client:
            response = await client.post("/chat/completions", headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()

        content = data["choices"][0]["message"]["content"]
        parsed = self._extract_json(content)
        return self._normalize_output(parsed)

    def _build_user_prompt(self, context: dict) -> str:
        return (
            "Generate a one-day diabetes diet recommendation in simplified Chinese.\n"
            f"Patient profile: {json.dumps(context, ensure_ascii=False)}\n"
            "Requirements:\n"
            "1. Keep foods practical for Chinese daily meals.\n"
            "2. Give breakfast/lunch/dinner and one snack if helpful.\n"
            "3. Notes should mention why the plan fits this patient.\n"
            "4. tips should be concise and actionable.\n"
        )

    def _extract_json(self, content: str) -> dict:
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", content, re.DOTALL)
            if not match:
                raise ValueError("AI response did not contain valid JSON")
            return json.loads(match.group(0))

    def _normalize_output(self, payload: dict) -> dict:
        meals = []
        for item in payload.get("meals", []):
            foods = [str(food).strip() for food in item.get("foods", []) if str(food).strip()]
            meals.append(
                {
                    "meal_type": str(item.get("meal_type", "meal")).strip() or "meal",
                    "foods": foods,
                    "tips": str(item.get("tips", "")).strip(),
                }
            )
        total_calories = int(payload.get("total_calories") or 0)
        return {
            "meals": meals,
            "total_calories": max(total_calories, 0),
            "notes": str(payload.get("notes", "")).strip(),
        }

    def _build_fallback_recommendation(self, context: dict) -> dict:
        target_calories = context.get("preferred_calories") or 1800
        diagnosis = context.get("diagnosis_type") or "Type2"
        return {
            "meals": [
                {
                    "meal_type": "breakfast",
                    "foods": ["燕麦 40g", "水煮鸡蛋 1 个", "无糖豆浆 250ml"],
                    "tips": "优先低 GI 主食，控制早餐精制糖。",
                },
                {
                    "meal_type": "lunch",
                    "foods": ["糙米饭 100g", "清蒸鱼 150g", "西兰花 200g"],
                    "tips": "午餐保证优质蛋白和蔬菜占比。",
                },
                {
                    "meal_type": "dinner",
                    "foods": ["杂粮粥 1 碗", "鸡胸肉 120g", "凉拌黄瓜 1 份"],
                    "tips": "晚餐稍清淡，避免高油高盐。",
                },
            ],
            "total_calories": target_calories,
            "notes": f"当前为本地兜底推荐，适用于 {diagnosis} 患者的基础控糖饮食安排。",
        }
