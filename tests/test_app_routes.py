"""Smoke tests for core route registration after router split."""

import asyncio
import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import app
import modules.briefing as briefing


async def _run_requests():
    transport = httpx.ASGITransport(app=app.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        for path in (
            "/",
            "/api/events",
            "/api/analytics/company-overview",
            "/api/analytics/objective-scoreboard",
            "/api/briefing/logs",
            "/api/briefing/status",
            "/api/pipeline/progress",
            "/api/rag/stats",
            "/api/disclosures/stats",
            "/health",
        ):
            response = await client.get(path)
            assert response.status_code == 200, f"{path} returned {response.status_code}"


def test_core_routes_respond():
    asyncio.run(_run_requests())


def test_briefing_status_route_returns_daily_and_weekly(monkeypatch):
    monkeypatch.setattr(
        briefing,
        "build_daily_briefing_data",
        lambda _session: {
            "report_type": "daily",
            "period_label": "2026-03-20",
            "generated_at": "2026-03-20T09:00:00",
            "warning_count": 2,
            "quality_warnings": [{"code": "coverage", "severity": "high"}],
            "ai_summary_status": "rule",
            "source_event_count": 12,
            "source_product_count": 4,
        },
    )
    monkeypatch.setattr(
        briefing,
        "build_weekly_briefing_data",
        lambda _session: {
            "report_type": "weekly",
            "period_label": "03/13 ~ 03/20",
            "generated_at": "2026-03-20T09:00:00",
            "warning_count": 0,
            "quality_warnings": [],
            "ai_summary_status": "ai",
            "source_event_count": 44,
            "source_product_count": 11,
        },
    )

    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/api/briefing/status")
            assert response.status_code == 200
            body = response.json()
            assert set(body) == {"daily", "weekly"}
            assert body["daily"]["report_type"] == "daily"
            assert body["daily"]["readiness_status"] == "blocked"
            assert body["weekly"]["report_type"] == "weekly"
            assert body["weekly"]["readiness_status"] == "ready"

    asyncio.run(_run())


if __name__ == "__main__":
    test_core_routes_respond()
    print("Done.")
