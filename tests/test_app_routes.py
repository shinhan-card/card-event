"""Smoke tests for core route registration after router split."""

import asyncio
import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import app


async def _run_requests():
    transport = httpx.ASGITransport(app=app.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        for path in (
            "/",
            "/api/events",
            "/api/analytics/company-overview",
            "/api/analytics/objective-scoreboard",
            "/api/briefing/logs",
            "/api/pipeline/progress",
            "/api/rag/stats",
            "/api/disclosures/stats",
            "/health",
        ):
            response = await client.get(path)
            assert response.status_code == 200, f"{path} returned {response.status_code}"


def test_core_routes_respond():
    asyncio.run(_run_requests())


async def _run_root_page_contract():
    transport = httpx.ASGITransport(app=app.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/")
        assert response.status_code == 200, f"/ returned {response.status_code}"
        html = response.text
        for anchor in (
            "opsBriefingStatusGrid",
            "opsBriefingWarnings",
            "opsBriefingActions",
            "opsBriefingLogTable",
        ):
            assert anchor in html, f"missing briefing shell anchor: {anchor}"


def test_root_page_contains_briefing_console_shell():
    asyncio.run(_run_root_page_contract())


if __name__ == "__main__":
    test_core_routes_respond()
    print("Done.")
