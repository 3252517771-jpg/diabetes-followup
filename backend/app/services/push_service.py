import httpx


class PushService:
    async def send_server_chan(self, send_key: str, title: str, body: str) -> tuple[bool, str | None]:
        if not send_key:
            return False, "Missing ServerChan send key"

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"https://sctapi.ftqq.com/{send_key}.send",
                data={"title": title, "desp": body},
            )
            response.raise_for_status()
            payload = response.json()

        code = payload.get("code")
        if code == 0:
            return True, None
        return False, payload.get("message") or "ServerChan push failed"
