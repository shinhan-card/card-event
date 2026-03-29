"""Smoke tests for core route registration after router split."""

import asyncio
import importlib
import json
import re
import sys
from datetime import date, datetime
from pathlib import Path
from urllib.parse import unquote

import httpx
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import app
import modules.briefing as briefing


async def _run_requests():
    transport = httpx.ASGITransport(app=app.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        for path in (
            "/",
            "/entry",
            "/api/events",
            "/api/events/review-queue?limit=12",
            "/api/analytics/company-overview",
            "/api/analytics/objective-scoreboard",
            "/api/analytics/linked-card-ranking",
            "/api/analytics/workspace-bridge",
            "/api/briefing/logs",
            "/api/briefing/status",
            "/api/pipeline/progress",
            "/api/disclosures?new_only=false",
            "/api/rag/stats",
            "/api/rag/catalog?limit=5",
            "/api/disclosures/stats",
            "/static/favicon.svg",
            "/static/js/dashboard_extras.js?v=2",
            "/entry-page/style.css",
            "/entry-page/script.js",
            "/image/2-5.%20NAVER%20OpenAPI_c_ver.png",
            "/health",
        ):
            response = await client.get(path)
            assert response.status_code == 200, f"{path} returned {response.status_code}"


def test_core_routes_respond():
    asyncio.run(_run_requests())


def test_dashboard_snapshot_routes_expose_meta_and_tab_payloads(monkeypatch):
    import modules.dashboard_snapshot as snapshot_module

    with snapshot_module.snapshot_service._lock:
        snapshot_module.snapshot_service._tabs.clear()
        snapshot_module.snapshot_service._refresh_state = {
            "status": "idle",
            "tab": None,
            "started_at": None,
            "finished_at": None,
            "error": None,
        }

    monkeypatch.setattr(
        snapshot_module,
        "_build_dashboard_snapshot",
        lambda db_session: {"title": "dashboard", "deep_action": {"route": "/api/events/1/intelligence"}},
        raising=False,
    )
    monkeypatch.setattr(
        snapshot_module,
        "_build_events_snapshot",
        lambda db_session: {"title": "events"},
        raising=False,
    )
    monkeypatch.setattr(
        snapshot_module,
        "_build_products_snapshot",
        lambda db_session: {"title": "products"},
        raising=False,
    )
    monkeypatch.setattr(
        snapshot_module,
        "_build_insights_snapshot",
        lambda db_session: {"title": "insights"},
        raising=False,
    )

    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            meta_response = await client.get("/api/dashboard/snapshot/meta")
            assert meta_response.status_code == 200
            meta = meta_response.json()
            assert meta["tabs"] == ["dashboard", "events", "products", "insights"]

            dashboard_response = await client.get("/api/dashboard/snapshot/dashboard")
            assert dashboard_response.status_code == 200
            dashboard = dashboard_response.json()
            assert dashboard["tab"] == "dashboard"
            assert dashboard["payload"]["title"] == "dashboard"
            assert "deep_action" not in dashboard["payload"]
            assert dashboard["captured_at"]

            refresh_response = await client.post("/api/dashboard/snapshot/refresh?tab=dashboard")
            assert refresh_response.status_code == 200
            refreshed = refresh_response.json()
            assert refreshed["tab"] == "dashboard"
            assert refreshed["payload"]["title"] == "dashboard"
            assert "deep_action" not in refreshed["payload"]

    asyncio.run(_run())


def test_kosis_route_does_not_keep_serving_stale_failure(monkeypatch):
    app._SIMPLE_CACHE.pop("kosis_card_approvals", None)

    responses = [
        {"ok": False, "error": "데이터 없음", "sectors": [], "periods": [], "rows": []},
        {"ok": True, "latest_period": "2026.01", "sectors": [{"sector": "도매 및 소매업"}]},
    ]

    def fake_get_cached_analytics(force: bool = False):
        if force:
            return responses[-1]
        return responses.pop(0)

    monkeypatch.setattr(app.kosis_stats, "get_cached_analytics", fake_get_cached_analytics)

    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            first = await client.get("/api/analytics/kosis-card-approvals")
            assert first.status_code == 200
            assert first.json()["ok"] is False

            second = await client.get("/api/analytics/kosis-card-approvals")
            assert second.status_code == 200
            assert second.json()["ok"] is True

    asyncio.run(_run())


def test_dashboard_snapshot_routes_reject_unknown_tab():
    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/api/dashboard/snapshot/unknown")
            assert response.status_code == 404

            refresh_response = await client.post("/api/dashboard/snapshot/refresh?tab=unknown")
            assert refresh_response.status_code == 404

    asyncio.run(_run())


def test_app_lifespan_no_longer_boots_background_scheduler():
    source = (ROOT / "app.py").read_text(encoding="utf-8")
    start = source.index("@asynccontextmanager")
    end = source.index("app = FastAPI(", start)
    block = source[start:end]

    assert "AsyncIOScheduler" not in block
    assert "scheduler.add_job" not in block
    assert "scheduler.start()" not in block


def test_app_lifespan_does_not_block_startup_with_dashboard_refresh():
    source = (ROOT / "app.py").read_text(encoding="utf-8")
    start = source.index("@asynccontextmanager")
    end = source.index("app = FastAPI(", start)
    block = source[start:end]

    assert 'refresh_snapshot_tab("dashboard"' not in block
    assert "start_background_snapshot_warm(" in block
    assert '"dashboard"' in block or "'dashboard'" in block


def test_entry_page_route_links_back_to_project_root():
    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/entry")
            assert response.status_code == 200
            html = response.text
            assert 'href="/"' in html
            assert '/entry-page/style.css' in html
            assert '/entry-page/script.js' in html
            assert "VERTICAL AI PLATFORM" in html
            for anchor in (
                'id="hero"',
                'id="signal"',
                'id="intelligence"',
                'id="metrics"',
                'id="process"',
                'id="proof"',
                'id="cta"',
            ):
                assert anchor in html

    asyncio.run(_run())


def test_product_document_search_route_returns_rag_chunk_payload(monkeypatch):
    monkeypatch.setattr(
        app,
        "_search_product_document_chunks",
        lambda query, top_k=10, company="", category="": {
            "query": query,
            "source": "rag_chunks",
            "results": [
                {
                    "rank": 1,
                    "company": "KB국민카드",
                    "card_name": "HERITAGE Smart",
                    "section": "혜택",
                    "snippet": "해외 온오프라인 가맹점 이용 시 1.25% 포인트리 적립",
                    "pdf_url": "/api/rag/catalog/pdf?company=KB국민카드&card_name=HERITAGE%20Smart",
                    "product_key": "KB국민카드::HERITAGE Smart",
                }
            ],
        },
        raising=False,
    )

    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.post(
                "/api/products/document-search",
                json={"query": "해외 결제 포인트 적립", "top_k": 5, "company": "KB국민카드"},
            )
            assert response.status_code == 200
            payload = response.json()
            assert payload["query"] == "해외 결제 포인트 적립"
            assert payload["source"] == "rag_chunks"
            assert payload["results"][0]["company"] == "KB국민카드"
            assert payload["results"][0]["card_name"] == "HERITAGE Smart"
            assert payload["results"][0]["section"] == "혜택"
            assert payload["results"][0]["product_key"] == "KB국민카드::HERITAGE Smart"
            assert "distance" not in payload["results"][0]

    asyncio.run(_run())


def test_ops_page_contains_report_studio_shell():
    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/ops")
            assert response.status_code == 200, f"/ops returned {response.status_code}"
            html = response.text
            for anchor in (
                "reportStudioType",
                "reportStudioBasis",
                "reportStudioRecipients",
                "reportStudioPreviewBtn",
                "reportStudioPreviewFrame",
                "reportStudioHistoryTable",
            ):
                assert anchor in html, f"missing report studio shell anchor: {anchor}"

    asyncio.run(_run())


def test_template_keeps_report_studio_and_dashboard_boot_paths_single_sourced():
    template = (ROOT / "templates/simple_dashboard.html").read_text(encoding="utf-8")
    js = (ROOT / "static/js/dashboard.js").read_text(encoding="utf-8")
    ops_template = (ROOT / "templates/ops_dashboard.html").read_text(encoding="utf-8")

    assert "window.initTabs = function" not in template, "template should not own a legacy initTabs shim anymore"
    assert "function switchTab(" not in template, "template should not define tab switching logic inline"
    assert "sendBriefingNow" not in template, "old inline send helper should be removed"
    assert "loadBriefingStatus()" not in template, "template should not own briefing loading"
    assert ops_template.count("reportStudioType") == 1, "expected one report studio type control in ops template"
    assert ops_template.count("reportStudioPreviewFrame") == 1, "expected one report studio preview iframe in ops template"
    assert js.count("async function loadAll(") == 1, "dashboard.js should have one loadAll boot path"
    assert js.count("function initTabs(") == 1, "dashboard.js should have one initTabs boot path"
    assert js.count("function switchTab(") == 1, "dashboard.js should own the tab switching controller"


def test_dashboard_report_mode_uses_market_report_title_inside_iframe():
    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/?mode=report&report_type=weekly&basis=2026-03-25")
            assert response.status_code == 200
            assert "주간 페이먼트그룹 Market Report" in response.text
            assert "카드 이벤트 리포트" not in response.text

    asyncio.run(_run())


def test_template_does_not_duplicate_dashboard_inline_workspace_bootstrap():
    template = (ROOT / "templates/simple_dashboard.html").read_text(encoding="utf-8")

    for snippet in (
        "async function loadNewProductAnalysis",
        "async function renderDashboard",
        "async function loadProductsTab",
    ):
        assert template.count(snippet) == 1, f"template should define `{snippet}` exactly once"


def test_template_render_dashboard_only_targets_existing_ids():
    template = (ROOT / "templates/simple_dashboard.html").read_text(encoding="utf-8")
    ids = set(re.findall(r'id="([^"]+)"', template))
    start = template.index("async function renderDashboard()")
    end = template.index("async function loadProductsTab()", start)
    render_dashboard_block = template[start:end]
    refs = set(re.findall(r"getElementById\('([^']+)'\)", render_dashboard_block))
    missing = sorted(ref for ref in refs if ref not in ids)

    assert not missing, f"renderDashboard references missing template ids: {missing}"


def test_template_layout_restructure_uses_runtime_override():
    template = (ROOT / "templates/simple_dashboard.html").read_text(encoding="utf-8")
    assert "window.restructureDashboardLayout = function restructureDashboardLayoutFixed()" in template
    assert "scoreboardCard.remove()" in template


def test_briefing_console_js_has_failure_guardrails():
    # Briefing console guardrails now live in ops.js (ops page separation)
    ops_js = (ROOT / "static/js/ops.js").read_text(encoding="utf-8")

    for snippet in (
        "Promise.allSettled([",
        "briefingConsoleHasFailure()",
        "renderBriefingUnavailablePanel(",
        "BRIEFING_STATUS_ERROR",
        "BRIEFING_LOGS_ERROR",
        "if (BRIEFING_SEND_BUSY || !briefingConsoleIsReady()) return;",
        "briefing status JSON parse failed",
        "briefing logs JSON parse failed",
    ):
        assert snippet in ops_js, f"missing JS guardrail in ops.js: {snippet}"

    for snippet in (
        "statusR.value.json().catch(() => ({}))",
        "logsR.value.json().catch(() => [])",
    ):
        assert snippet not in ops_js, f"malformed JSON should not be treated as success: {snippet}"


def test_ops_js_does_not_treat_initial_sync_status_as_completed_refresh():
    ops_js = (ROOT / "static/js/ops.js").read_text(encoding="utf-8")

    assert "let DISCLOSURE_SYNC_HAS_SEEN_STATUS = false;" in ops_js

    start = ops_js.index("async function refreshAfterDisclosureSync(status)")
    end = ops_js.index("async function loadDisclosureSyncStatus", start)
    block = ops_js[start:end]

    for snippet in (
        "if (!DISCLOSURE_SYNC_HAS_SEEN_STATUS) {",
        "DISCLOSURE_SYNC_HAS_SEEN_STATUS = true;",
        "DISCLOSURE_SYNC_LAST_REFRESH_KEY = refreshKey;",
        "return;",
    ):
        assert snippet in block


def test_dashboard_js_supports_legacy_tab_shell_boot():
    template = (ROOT / "templates/simple_dashboard.html").read_text(encoding="utf-8")
    js = (ROOT / "static/js/dashboard.js").read_text(encoding="utf-8")

    assert 'id="tab-dashboard"' in template
    assert 'id="tab-events"' in template
    assert 'id="pageNav"' not in template

    for snippet in (
        "function hasModernPageShell() {",
        "const modernShell = hasModernPageShell();",
        "if (modernShell) {",
        "showEventTab(CURRENT_EVENT_TAB);",
        "} else {",
        "switchTab(getReportDefaultTab());",
        "if (!hasModernPageShell()) {",
        "switchTab(page || 'dashboard');",
    ):
        assert snippet in js, f"legacy shell boot guard missing: {snippet}"


def test_dashboard_js_retries_deferred_product_boot_when_catalog_is_empty():
    js = (ROOT / "static/js/dashboard.js").read_text(encoding="utf-8")

    for snippet in (
        "function ensureDeferredWorkspaceHydration(",
        "if (PRODUCT_STATS && Array.isArray(PRODUCT_CATALOG) && PRODUCT_CATALOG.length) return;",
        "setTimeout(() => {",
        "void loadDeferredWorkspaceData(progress || {});",
    ):
        assert snippet in js, f"deferred workspace retry guard missing: {snippet}"


def test_rag_catalog_route_returns_catalog_payload(monkeypatch):
    calls = {}

    def fake_catalog(limit=5000, company=None, query=None):
        calls.update({"limit": limit, "company": company, "query": query})
        return {
            "items": [
                {
                    "company": "신한카드",
                    "card_name": "신한카드 Simple Plan",
                    "annual_fee_display": "국내 1만원",
                    "benefit_highlights": ["국내 1% 할인"],
                }
            ],
            "products": [
                {
                    "company": "신한카드",
                    "card_name": "신한카드 Simple Plan",
                }
            ],
            "total": 1,
            "source": "chroma",
            "by_company": {"신한카드": {"count": 1}},
        }

    monkeypatch.setattr(app, "build_product_catalog_response", fake_catalog)

    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/api/rag/catalog?limit=5&company=신한카드&q=simple")
            assert response.status_code == 200
            body = response.json()
            assert body["total"] == 1
            assert body["items"][0]["card_name"] == "신한카드 Simple Plan"
            assert body["source"] == "chroma"
            assert calls == {"limit": 5, "company": "신한카드", "query": "simple"}

    asyncio.run(_run())


def test_disclosures_route_supports_new_only_filter(monkeypatch):
    def fake_catalog(limit=5000, company=None, query=None):
        return {
            "items": [
                {
                    "company": "?좏븳移대뱶",
                    "card_name": "All Product",
                    "revision_type": "?좉퇋異쒖떆",
                    "launch_date": "2026.03.01",
                    "pdf_path": "data/card_terms/test/test.pdf",
                },
                {
                    "company": "KB援?誘쇱쓣移대뱶",
                    "card_name": "Existing Product",
                    "revision_type": "媛쒖젙",
                    "launch_date": "2025.12.01",
                },
            ],
            "products": [
                {
                    "company": "?좏븳移대뱶",
                    "card_name": "All Product",
                    "revision_type": "?좉퇋異쒖떆",
                    "launch_date": "2026.03.01",
                    "pdf_path": "data/card_terms/test/test.pdf",
                },
                {
                    "company": "KB援?誘쇱쓣移대뱶",
                    "card_name": "Existing Product",
                    "revision_type": "媛쒖젙",
                    "launch_date": "2025.12.01",
                },
            ],
            "total": 2,
            "source": "hybrid",
            "by_company": {"?좏븳移대뱶": {"count": 1}, "KB援?誘쇱쓣移대뱶": {"count": 1}},
        }

    monkeypatch.setattr(app, "build_product_catalog_response", fake_catalog)

    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            all_response = await client.get("/api/disclosures?new_only=false")
            assert all_response.status_code == 200
            all_body = all_response.json()
            assert all_body["total"] == 2

            new_response = await client.get("/api/disclosures?new_only=true")
            assert new_response.status_code == 200
            new_body = new_response.json()
            assert new_body["total"] == 1
            assert new_body["products"][0]["card_name"] == "All Product"

    asyncio.run(_run())


def test_weekly_ai_insight_route_returns_gemini_lines(monkeypatch):
    events = [
        type(
            "Event",
            (),
            {
                "id": 101,
                "company": "\uc0bc\uc131\uce74\ub4dc",
                "title": "\uc0bc\uc131 iD STATION \uce90\uc2dc\ubc31",
                "category": "\uc8fc\uc720",
                "period_start": "2026-03-16",
                "period": "2026-03-16 ~ 2026-03-31",
            },
        )(),
        type(
            "Event",
            (),
            {
                "id": 102,
                "company": "\uc2e0\ud55c\uce74\ub4dc",
                "title": "SOL\ud2b8\ub798\ube14 \ud2b9\uac00",
                "category": "\uc5ec\ud589",
                "period_start": "2026-03-18",
                "period": "2026-03-18 ~ 2026-03-30",
            },
        )(),
    ]
    catalog = {
        "\uc0bc\uc131\uce74\ub4dc::iD GLOBAL": {
            "company": "\uc0bc\uc131\uce74\ub4dc",
            "card_name": "iD GLOBAL",
            "launch_date": "2026.03.17",
            "launch_date_source": "manual_override",
            "launch_date_source_ref": "ops",
        },
        "\uc2e0\ud55c\uce74\ub4dc::SOL Travel": {
            "company": "\uc2e0\ud55c\uce74\ub4dc",
            "card_name": "SOL Travel",
            "launch_date": "2026.03.19",
            "launch_date_source": "manual_override",
            "launch_date_source_ref": "ops",
        },
    }

    monkeypatch.setattr(app.db, "get_all_events", lambda session: events)
    monkeypatch.setattr(app, "load_product_catalog", lambda: catalog)
    monkeypatch.setattr(
        app,
        "_build_weekly_ai_insight_response",
        lambda db_session, force=False: {
            "generated_at": "2026-03-21T10:00:00",
            "ttl_sec": 600,
            "source": "gemini",
            "cached": False,
            "week_label": "3\uc6d4 4\uc8fc\ucc28",
            "range_label": "3/16 ~ 3/22",
            "event_count": 2,
            "product_count": 2,
            "lines": [
                "- \uc774\ubca4\ud2b8 : \uc0bc\uc131\uce74\ub4dc iD STATION \uc774\ubca4\ud2b8 \uc2dc\uc791.",
                "- \uc0c1\ud488 : iD GLOBAL, SOL Travel \ud3ec\ud568.",
            ],
        },
    )

    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/api/analytics/weekly-ai-insight")
            assert response.status_code == 200
            body = response.json()
            assert body["source"] == "gemini"
            assert body["event_count"] == 2
            assert body["product_count"] == 2
            assert body["lines"][0].startswith("- \uc774\ubca4\ud2b8 :")

    asyncio.run(_run())


def test_weekly_ai_insight_snapshot_includes_issuer_event_and_product_briefing(monkeypatch):
    events = [
        type(
            "Event",
            (),
            {
                "id": 201,
                "company": "삼성카드",
                "title": "삼성 iD STATION 주유 캐시백",
                "category": "주유",
                "benefit_type": "캐시백",
                "benefit_value": "주유 15만원 캐시백",
                "period_start": date(2026, 3, 16),
                "period_end": date(2026, 3, 31),
                "period": "2026-03-16 ~ 2026-03-31",
            },
        )(),
        type(
            "Event",
            (),
            {
                "id": 202,
                "company": "신한카드",
                "title": "신한 SOL트래블 공항 라운지 특가",
                "category": "여행",
                "benefit_type": "할인",
                "benefit_value": "라운지 30% 할인",
                "period_start": date(2026, 3, 18),
                "period_end": date(2026, 3, 30),
                "period": "2026-03-18 ~ 2026-03-30",
            },
        )(),
    ]
    catalog = {
        "삼성카드::iD GLOBAL": {
            "company": "삼성카드",
            "card_name": "iD GLOBAL",
            "launch_date": "2026.03.17",
            "launch_date_source": "manual_override",
            "launch_date_source_ref": "ops",
            "annual_fee_display": "국내 2만원",
            "benefit_highlights": ["해외 2% 적립", "공항 라운지 연 2회"],
        },
        "신한카드::SOL Travel": {
            "company": "신한카드",
            "card_name": "SOL Travel",
            "launch_date": "2026.03.19",
            "launch_date_source": "manual_override",
            "launch_date_source_ref": "ops",
            "annual_fee_display": "국내 1만5천원",
            "benefit_highlights": ["해외 결제 1.5% 적립", "공항 라운지 무료"],
        },
    }

    monkeypatch.setattr(app, "_build_current_week_window", lambda reference=None: (date(2026, 3, 16), date(2026, 3, 22)))
    monkeypatch.setattr(app.db, "get_all_events", lambda session: events)
    monkeypatch.setattr(app, "load_product_catalog", lambda: catalog)

    snapshot = app._build_weekly_ai_insight_snapshot(None)

    assert snapshot["event_count"] == 2
    assert snapshot["product_count"] == 2
    assert snapshot["events"][0]["benefit_value"]
    assert snapshot["products"][0]["benefit_highlights"]
    assert snapshot["events_by_company"][0]["event_briefs"]
    assert snapshot["products_by_company"][0]["product_briefs"]
    assert snapshot["issuer_briefings"][0]["company"] in {"삼성카드", "신한카드"}
    assert "external_signals" in snapshot
    assert "company_signal_summary" in snapshot
    assert "top_theme_signal" in snapshot


def test_weekly_ai_insight_snapshot_excludes_catalog_seed_only_products(monkeypatch):
    monkeypatch.setattr(app, "_build_current_week_window", lambda reference=None: (date(2026, 3, 23), date(2026, 3, 29)))
    monkeypatch.setattr(app.db, "get_all_events", lambda session: [])
    monkeypatch.setattr(
        app,
        "load_product_catalog",
        lambda: {
            "현대카드::현대 기본교통 체크카드": {
                "company": "현대카드",
                "card_name": "현대 기본교통 체크카드",
                "launch_date": "2026.03.23",
                "launch_date_source": "catalog_seed",
                "launch_date_source_ref": "source_catalog",
                "status": "active",
            },
            "현대카드::the Orange": {
                "company": "현대카드",
                "card_name": "the Orange",
                "launch_date": "2026.03.23",
                "launch_date_source": "manual_override",
                "launch_date_source_ref": "ops",
                "status": "active",
            },
        },
    )

    snapshot = app._build_weekly_ai_insight_snapshot(None)

    assert snapshot["product_count"] == 1
    assert snapshot["products"][0]["card_name"] == "the Orange"


def test_naver_signal_refresh_route_returns_started_snapshot(monkeypatch):
    monkeypatch.setattr(
        app,
        "_start_naver_signal_sync",
        lambda source="datalab": {
            "run_id": "naver-signal-1234",
            "active": True,
            "state": "running",
            "source": source,
            "message": "네이버 시장신호 동기화를 시작했습니다.",
            "stages": [{"key": "fetch", "label": "네이버 조회", "state": "running", "message": "진행 중"}],
        },
        raising=False,
    )

    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.post("/api/integrations/naver-signals/refresh?source=datalab")
            assert response.status_code == 200
            body = response.json()
            assert body["active"] is True
            assert body["source"] == "datalab"

    asyncio.run(_run())


def test_naver_signal_status_route_returns_payload(monkeypatch):
    monkeypatch.setattr(
        app,
        "_get_naver_signal_sync_status",
        lambda: {
            "run_id": None,
            "active": False,
            "state": "idle",
            "source": "datalab",
            "message": "대기 중입니다.",
            "stages": [{"key": "fetch", "label": "네이버 조회", "state": "idle", "message": "아직 시작 전"}],
        },
        raising=False,
    )

    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/api/integrations/naver-signals/sync-status")
            assert response.status_code == 200
            body = response.json()
            assert body["state"] == "idle"
            assert body["stages"][0]["key"] == "fetch"

    asyncio.run(_run())


def test_get_naver_signal_sync_status_uses_persisted_cursor_summary(monkeypatch):
    class _Cursor:
        last_run_id = "naver-signal-persisted"
        last_status = "success"
        last_run_at = datetime(2026, 3, 23, 6, 10, 0)
        items_processed = 128
        items_new = 24
        cursor_data = json.dumps(
            {
                "theme_count": 12,
                "card_count": 92,
                "latest_bucket_date": "2026-03-23",
            },
            ensure_ascii=False,
        )

    class _Session:
        def close(self):
            return None

    monkeypatch.setattr(app, "_NAVER_SIGNAL_SYNC_STATUS", app._default_naver_signal_sync_status(), raising=False)
    monkeypatch.setattr(app.db, "SessionLocal", lambda: _Session(), raising=False)
    monkeypatch.setattr(app.db, "get_sync_cursor", lambda session, pipeline, company='': _Cursor(), raising=False)
    monkeypatch.setattr(app.naver_signals, "is_naver_signal_enabled", lambda: True, raising=False)

    snapshot = app._get_naver_signal_sync_status()

    assert snapshot["run_id"] == "naver-signal-persisted"
    assert snapshot["state"] == "success"
    assert snapshot["summary"]["snapshot_count"] == 128
    assert snapshot["summary"]["card_count"] == 92
    assert snapshot["summary"]["theme_count"] == 12
    assert snapshot["summary"]["latest_bucket_date"] == "2026-03-23"


def test_naver_signal_schedule_config_uses_env_override(monkeypatch):
    monkeypatch.setenv("NAVER_SIGNAL_SCHEDULE_HOUR", "7")
    monkeypatch.setenv("NAVER_SIGNAL_SCHEDULE_MINUTE", "25")

    hour, minute = app._get_naver_signal_schedule()

    assert hour == 7
    assert minute == 25


def test_naver_signal_analytics_route_supports_scope_and_month(monkeypatch):
    monkeypatch.setattr(
        app,
        "_build_naver_signal_analytics",
        lambda db_session, scope="active", month=None: {
            "provider": "naver_datalab",
            "scope": scope,
            "month": month,
            "keyword_groups": [{"label": "여행", "delta": 12.0}],
            "card_groups": [{"company": "신한카드", "label": "Mr.Life", "delta": 8.0}],
        },
        raising=False,
    )

    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            active_response = await client.get("/api/analytics/naver-signals?scope=active")
            month_response = await client.get("/api/analytics/naver-signals?scope=month&month=2026-03")
            assert active_response.status_code == 200
            assert month_response.status_code == 200
            assert active_response.json()["scope"] == "active"
            assert month_response.json()["month"] == "2026-03"

    asyncio.run(_run())


def test_rule_weekly_ai_insight_compacts_noisy_event_titles():
    snapshot = {
        "week_label": "3월 4주차",
        "range_label": "3/23 ~ 3/29",
        "event_count": 2,
        "product_count": 0,
        "events_by_company": [
            {
                "company": "삼성카드",
                "count": 1,
                "event_briefs": [
                    "TIP모니모 홈 LINK 추가 누르면 10 포인트 2026.03.20~2026.03.31 참여방법 STEP 1 응모하기 STEP 2 마이삼성 LINK 자세히 보기"
                ],
            },
            {
                "company": "KB국민카드",
                "count": 1,
                "event_briefs": [
                    "기간한정 해외이용하면 최대 100만 포인트리 자세히 보기 URL 바로가기"
                ],
            },
        ],
        "products_by_company": [],
        "events": [
            {
                "company": "삼성카드",
                "title": "TIP모니모 홈 LINK 추가 누르면 10 포인트 2026.03.20~2026.03.31 참여방법 STEP 1 응모하기 STEP 2 마이삼성 LINK 자세히 보기",
                "category": "금융",
                "benefit_value": "10 포인트",
                "benefit_type": "포인트",
            },
            {
                "company": "KB국민카드",
                "title": "기간한정 해외이용하면 최대 100만 포인트리 자세히 보기 URL 바로가기",
                "category": "여행",
                "benefit_value": "최대 100만 포인트리",
                "benefit_type": "적립",
            },
        ],
        "products": [],
        "issuer_briefings": [],
    }

    result = app._rule_weekly_ai_insight(snapshot)

    assert result["lines"]
    assert all(len(line) <= 90 for line in result["lines"])
    assert all("STEP" not in line for line in result["lines"])
    assert all("자세히 보기" not in line for line in result["lines"])


def test_finalize_weekly_ai_insight_lines_builds_sectioned_briefing_layout():
    snapshot = {
        "issuer_briefings": [
            {"company": "삼성카드"},
            {"company": "KB국민카드"},
        ],
        "events_by_company": [
            {"company": "삼성카드"},
            {"company": "KB국민카드"},
        ],
        "products_by_company": [],
    }

    lines = app._finalize_weekly_ai_insight_lines(
        [
            "이번 주는 여행과 금융 이벤트가 중심이었다.",
            "신규 출시 상품은 없고 기존 카드 혜택이 강화됐다.",
            "해외 결제 시 최대 100만 포인트리를 제공한다.",
            "모니모 앱 LINK 추가 시 10포인트를 지급한다.",
            "카드사: KB국민카드: 대상 카드가 6종으로 넓게 묶였다.",
            "카드사: 삼성카드: 앱 편집 기능을 통해 참여할 수 있다.",
            "여행형 혜택과 앱 활성화 프로모션이 동시에 보였다.",
        ],
        snapshot,
    )

    assert lines[0].startswith("- 이벤트 : ")
    assert lines[1].startswith("- 상품 : ")
    assert lines[2] == "----------"
    assert lines[3] == "[카드사별 요약]"
    assert lines[4] == "- 신한카드 : 신규 이벤트 없음."
    assert lines[5].startswith("- 삼성카드 : ")
    assert lines[6] == "- 현대카드 : 신규 이벤트 없음."
    assert lines[7].startswith("- KB국민카드 : ")
    assert lines[8] == "----------"
    assert lines[9].startswith("[정리] ")


def test_weekly_ai_supplementary_prefix_prefers_benefit_over_schedule_words():
    assert app._weekly_ai_supplementary_prefix(
        "KB국민카드: 해외 이용 이벤트는 3월 23일부터 진행되며 대상 카드는 총 6종입니다."
    ) == "혜택"
    assert app._weekly_ai_supplementary_prefix(
        "삼성카드: 모니모 홈 편집 이벤트는 3월 24일부터 31일까지 진행됩니다."
    ) == "참여"


def test_weekly_ai_insight_response_does_not_reuse_rule_cache(monkeypatch):
    snapshot = {
        "week_label": "3월 4주차",
        "range_label": "3/23 ~ 3/29",
        "event_count": 2,
        "product_count": 0,
        "issuer_briefings": [
            {"company": "KB국민카드"},
            {"company": "삼성카드"},
        ],
        "events_by_company": [
            {"company": "KB국민카드"},
            {"company": "삼성카드"},
        ],
        "products_by_company": [],
    }
    gemini_insight = importlib.import_module("gemini_insight")

    monkeypatch.setattr(app, "_build_weekly_ai_insight_snapshot", lambda session: snapshot)
    monkeypatch.setattr(app, "_make_snapshot_key", lambda value: "same-snapshot")
    monkeypatch.setattr(
        gemini_insight,
        "summarize_weekly_dashboard_insight",
        lambda payload: {
            "source": "gemini",
            "lines": [
                "이벤트: 카드업계는 여행·금융 이벤트가 중심입니다.",
                "상품: 이번 주 신규 출시는 없습니다.",
                "신한카드: 신규 이벤트 없습니다.",
                "삼성카드: 모니모 LINK 포인트 이벤트를 시작했습니다.",
                "현대카드: 신규 이벤트 없습니다.",
                "KB국민카드: 해외 포인트리 이벤트를 시작했습니다.",
                "정리: 여행형·앱 활성화 프로모션이 동시에 보였습니다.",
            ],
        },
    )
    app._WEEKLY_AI_INSIGHT_CACHE = {
        "snapshot_key": "same-snapshot",
        "response": {
            "source": "rule",
            "cached": False,
            "lines": ["핵심: 오래된 rule 캐시"],
        },
        "updated_at": app.datetime.now(),
    }

    result = app._build_weekly_ai_insight_response(None, force=False)

    assert result["source"] == "gemini"
    assert result["cached"] is False
    assert result["lines"][0].startswith("- 이벤트 :")
    assert result["lines"][4] == "- 신한카드 : 신규 이벤트 없음."
    assert result["lines"][6] == "- 현대카드 : 신규 이벤트 없음."


def test_weekly_ai_insight_response_reuses_gemini_cache(monkeypatch):
    snapshot = {
        "week_label": "3월 4주차",
        "range_label": "3/23 ~ 3/29",
        "event_count": 2,
        "product_count": 0,
        "issuer_briefings": [],
        "events_by_company": [],
        "products_by_company": [],
    }
    gemini_insight = importlib.import_module("gemini_insight")

    monkeypatch.setattr(app, "_build_weekly_ai_insight_snapshot", lambda session: snapshot)
    monkeypatch.setattr(app, "_make_snapshot_key", lambda value: "same-snapshot")

    def _should_not_run(_payload):
        raise AssertionError("gemini should not be called when gemini cache is warm")

    monkeypatch.setattr(gemini_insight, "summarize_weekly_dashboard_insight", _should_not_run)
    app._WEEKLY_AI_INSIGHT_CACHE = {
        "snapshot_key": "same-snapshot",
        "response": {
            "source": "gemini",
            "cached": False,
            "lines": ["핵심: warm gemini cache"],
        },
        "updated_at": app.datetime.now(),
    }

    result = app._build_weekly_ai_insight_response(None, force=False)

    assert result["source"] == "gemini"
    assert result["cached"] is True
    assert result["lines"] == ["핵심: warm gemini cache"]


def test_weekly_ai_insight_response_returns_unavailable_instead_of_rule(monkeypatch):
    snapshot = {
        "week_label": "3월 4주차",
        "range_label": "3/23 ~ 3/29",
        "event_count": 2,
        "product_count": 0,
        "issuer_briefings": [],
        "events_by_company": [],
        "products_by_company": [],
    }
    gemini_insight = importlib.import_module("gemini_insight")

    monkeypatch.setattr(app, "_build_weekly_ai_insight_snapshot", lambda session: snapshot)
    monkeypatch.setattr(app, "_make_snapshot_key", lambda value: "same-snapshot")
    monkeypatch.setattr(gemini_insight, "summarize_weekly_dashboard_insight", lambda payload: None)
    app._WEEKLY_AI_INSIGHT_CACHE = {
        "snapshot_key": "same-snapshot",
        "response": {
            "source": "rule",
            "cached": False,
            "lines": ["핵심: stale rule cache"],
        },
        "updated_at": app.datetime.now(),
    }

    result = app._build_weekly_ai_insight_response(None, force=False)

    assert result["source"] == "unavailable"
    assert result["cached"] is False
    assert result["lines"] == []


def test_weekly_ai_insight_response_includes_external_signals(monkeypatch):
    snapshot = {
        "week_label": "3월 4주차",
        "range_label": "3/23 ~ 3/29",
        "event_count": 2,
        "product_count": 1,
        "issuer_briefings": [{"company": "신한카드"}],
        "events_by_company": [{"company": "신한카드"}],
        "products_by_company": [{"company": "신한카드"}],
        "external_signals": {
            "top_theme_signal": {
                "keyword_group": "AI 구독",
                "trend_label": "상승",
                "delta": 22.5,
            },
            "company_signal_summary": {
                "신한카드": {
                    "keyword_group": "Mr.Life",
                    "trend_label": "상승",
                    "delta": 18.0,
                }
            },
        },
    }
    gemini_insight = importlib.import_module("gemini_insight")

    monkeypatch.setattr(app, "_build_weekly_ai_insight_snapshot", lambda session: snapshot)
    monkeypatch.setattr(app, "_make_snapshot_key", lambda value: "signal-snapshot")
    monkeypatch.setattr(
        gemini_insight,
        "summarize_weekly_dashboard_insight",
        lambda payload: {
            "source": "gemini",
            "lines": [
                "핵심: AI 구독 관심이 상승했습니다.",
                "상품: 신규 카드는 1건입니다.",
                "신한카드: 신규 이벤트 없음.",
                "KB국민카드: 신규 이벤트 없음.",
                "삼성카드: 신규 이벤트 없음.",
                "현대카드: 신규 이벤트 없음.",
                "정리: 외부 관심도는 AI 구독에 집중됩니다.",
            ],
        },
    )
    app._WEEKLY_AI_INSIGHT_CACHE = None

    result = app._build_weekly_ai_insight_response(None, force=False)

    assert result["source"] == "gemini"
    assert result["external_signals"]["top_theme_signal"]["keyword_group"] == "AI 구독"
    assert result["external_signals"]["company_signal_summary"]["신한카드"]["keyword_group"] == "Mr.Life"


def test_weekly_ai_insight_response_includes_related_news_groups(monkeypatch):
    snapshot = {
        "week_label": "3월 4주차",
        "range_label": "3/23 ~ 3/29",
        "event_count": 1,
        "product_count": 1,
        "events": [{"id": 11, "company": "삼성카드", "title": "모니모 LINK 추가 이벤트"}],
        "products": [{"product_key": "현대카드::the Orange", "company": "현대카드", "card_name": "the Orange"}],
        "issuer_briefings": [{"company": "삼성카드"}],
        "events_by_company": [{"company": "삼성카드"}],
        "products_by_company": [{"company": "현대카드"}],
        "external_signals": {},
    }
    gemini_insight = importlib.import_module("gemini_insight")

    monkeypatch.setattr(app, "_build_weekly_ai_insight_snapshot", lambda session: snapshot)
    monkeypatch.setattr(app, "_make_snapshot_key", lambda value: "news-snapshot")
    monkeypatch.setattr(
        app.naver_news,
        "build_event_news_groups",
        lambda events: [
            {
                "event_key": "11",
                "company": "삼성카드",
                "label": "모니모 LINK 추가 이벤트",
                "items": [{"title": "삼성카드 모니모 이벤트", "press": "이데일리", "published_date": "2026-03-24", "url": "https://example.com/e1"}],
            }
        ],
        raising=False,
    )
    monkeypatch.setattr(
        app.naver_news,
        "build_product_news_groups",
        lambda products: [
            {
                "product_key": "현대카드::the Orange",
                "company": "현대카드",
                "label": "the Orange",
                "items": [{"title": "현대카드 the Orange 출시", "press": "조선비즈", "published_date": "2026-03-23", "url": "https://example.com/p1"}],
            }
        ],
        raising=False,
    )
    monkeypatch.setattr(
        gemini_insight,
        "summarize_weekly_dashboard_insight",
        lambda payload: {
            "source": "gemini",
            "lines": [
                "이벤트: 신규 이벤트 1건이 시작됨.",
                "상품: 신규 상품 1건이 확인됨.",
                "신한카드: 신규 이벤트 없음.",
                "삼성카드: 모니모 LINK 추가 이벤트 시작.",
                "현대카드: 신규 이벤트 없음.",
                "KB국민카드: 신규 이벤트 없음.",
                "정리: 삼성 이벤트와 현대 상품이 주간 변화를 이끔.",
            ],
        },
    )
    app._WEEKLY_AI_INSIGHT_CACHE = None

    result = app._build_weekly_ai_insight_response(None, force=False)

    assert result["source"] == "gemini"
    assert result["event_news_groups"][0]["event_key"] == "11"
    assert result["product_news_groups"][0]["product_key"] == "현대카드::the Orange"
    assert result["event_news_groups"][0]["items"][0]["published_date"] == "2026-03-24"
    assert result["product_news_groups"][0]["items"][0]["url"] == "https://example.com/p1"


def test_weekly_ai_insight_response_keeps_empty_news_groups_on_failure(monkeypatch):
    snapshot = {
        "week_label": "3월 4주차",
        "range_label": "3/23 ~ 3/29",
        "event_count": 1,
        "product_count": 0,
        "events": [{"id": 11, "company": "삼성카드", "title": "모니모 LINK 추가 이벤트"}],
        "products": [],
        "issuer_briefings": [{"company": "삼성카드"}],
        "events_by_company": [{"company": "삼성카드"}],
        "products_by_company": [],
        "external_signals": {},
    }
    gemini_insight = importlib.import_module("gemini_insight")

    monkeypatch.setattr(app, "_build_weekly_ai_insight_snapshot", lambda session: snapshot)
    monkeypatch.setattr(app, "_make_snapshot_key", lambda value: "news-fail-snapshot")
    monkeypatch.setattr(
        app.naver_news,
        "build_event_news_groups",
        lambda events: (_ for _ in ()).throw(RuntimeError("timeout")),
        raising=False,
    )
    monkeypatch.setattr(
        app.naver_news,
        "build_product_news_groups",
        lambda products: (_ for _ in ()).throw(RuntimeError("timeout")),
        raising=False,
    )
    monkeypatch.setattr(
        gemini_insight,
        "summarize_weekly_dashboard_insight",
        lambda payload: {
            "source": "gemini",
            "lines": [
                "이벤트: 신규 이벤트 1건이 시작됨.",
                "상품: 신규 상품 없음.",
                "신한카드: 신규 이벤트 없음.",
                "삼성카드: 모니모 LINK 추가 이벤트 시작.",
                "현대카드: 신규 이벤트 없음.",
                "KB국민카드: 신규 이벤트 없음.",
                "정리: 삼성 이벤트 중심 주간 변화.",
            ],
        },
    )
    app._WEEKLY_AI_INSIGHT_CACHE = None

    result = app._build_weekly_ai_insight_response(None, force=False)

    assert result["event_news_groups"] == []
    assert result["product_news_groups"] == []


def test_finalize_weekly_ai_insight_lines_shortens_no_activity_phrases():
    snapshot = {
        "issuer_briefings": [{"company": "신한카드"}],
        "events_by_company": [],
        "products_by_company": [],
    }

    lines = app._finalize_weekly_ai_insight_lines(
        [
            "핵심: 이번 주 신규 변화는 제한적이었다.",
            "상품: 신규 시작 이벤트는 없고 출시 상품도 확인되지 않았다.",
            "신한카드: 신규 시작 이벤트 및 출시 상품 정보 없음.",
            "KB국민카드: 신규 시작 이벤트 및 출시 상품 정보 없음.",
            "삼성카드: 신규 시작 이벤트 및 출시 상품 정보 없음.",
            "현대카드: 신규 시작 이벤트 및 출시 상품 정보 없음.",
            "정리: 이번 주는 신규 변화가 크지 않았다.",
        ],
        snapshot,
    )

    assert lines[4] == "- 신한카드 : 신규 이벤트 없음."
    assert lines[5] == "- 삼성카드 : 신규 이벤트 없음."
    assert lines[6] == "- 현대카드 : 신규 이벤트 없음."
    assert lines[7] == "- KB국민카드 : 신규 이벤트 없음."


def test_select_events_for_scope_filters_active_and_month(monkeypatch):
    events = [
        type("Event", (), {"id": 1, "status": "active", "period_start": date(2026, 1, 10), "period_end": date(2026, 1, 20)})(),
        type("Event", (), {"id": 2, "status": "active", "period_start": date(2026, 2, 5), "period_end": date(2026, 2, 28)})(),
        type("Event", (), {"id": 3, "status": "ended", "period_start": date(2026, 1, 1), "period_end": date(2026, 1, 15)})(),
        type("Event", (), {"id": 4, "status": "active", "period_start": date(2025, 12, 28), "period_end": date(2026, 1, 3)})(),
    ]

    monkeypatch.setattr(app.db, "get_all_events", lambda session, filters=None: events)

    active = app._select_events_for_scope(None, scope="active")
    january = app._select_events_for_scope(None, scope="month", month="2026-01")

    assert {event.id for event in active} == {1, 2, 4}
    assert {event.id for event in january} == {1, 3, 4}


def test_naver_signals_analytics_route_returns_active_payload(monkeypatch):
    payload = {
        "provider": "naver_datalab",
        "scope": "active",
        "generated_at": "2026-03-23T06:10:00",
        "summary": {"theme_count": 13, "card_count": 92},
        "themes": [
            {"keyword_group": "AI 구독", "trend_label": "상승", "delta": 21.0},
        ],
        "cards": [
            {"company": "현대카드", "keyword_group": "the Orange", "trend_label": "상승", "delta": 17.4},
        ],
        "by_company": {
            "현대카드": [
                {"keyword_group": "the Orange", "trend_label": "상승", "delta": 17.4},
            ]
        },
    }
    monkeypatch.setattr(app, "_build_naver_signal_analytics_payload", lambda db_session, scope="active", month=None: payload)

    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/api/analytics/naver-signals?scope=active")
            assert response.status_code == 200
            body = response.json()
            assert body["scope"] == "active"
            assert body["themes"][0]["keyword_group"] == "AI 구독"
            assert body["cards"][0]["keyword_group"] == "the Orange"

    asyncio.run(_run())


def test_compare_matrix_route_accepts_scope_and_month(monkeypatch):
    monkeypatch.setattr(
        app,
        "build_compare_matrix",
        lambda session, axis="category", scope="all", month=None: {
            "axis": axis,
            "scope": scope,
            "month": month,
            "heatmap": {"신한카드": {"쇼핑": 2}},
        },
    )

    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/api/analytics/compare-matrix?axis=category&scope=month&month=2026-02")
            assert response.status_code == 200
            body = response.json()
            assert body["axis"] == "category"
            assert body["scope"] == "month"
            assert body["month"] == "2026-02"

    asyncio.run(_run())


def test_disclosures_route_normalizes_compact_launch_dates(monkeypatch):
    def fake_catalog(limit=5000, company=None, query=None):
        return {
            "items": [
                {
                    "company": "삼성카드",
                    "card_name": "Compact Product",
                    "launch_date": "20260321",
                    "published_date": "20260321",
                }
            ],
            "products": [
                {
                    "company": "삼성카드",
                    "card_name": "Compact Product",
                    "launch_date": "20260321",
                    "published_date": "20260321",
                }
            ],
            "total": 1,
            "source": "hybrid",
            "by_company": {"삼성카드": {"count": 1}},
        }

    monkeypatch.setattr(app, "build_product_catalog_response", fake_catalog)

    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/api/disclosures?new_only=false")
            assert response.status_code == 200
            body = response.json()
            product = body["products"][0]
            assert product["launch_date"] == "2026.03.21"
            assert product["published_date"] == "2026.03.21"

    asyncio.run(_run())


def test_disclosures_route_preserves_launch_and_publication_dates(monkeypatch):
    def fake_catalog(limit=5000, company=None, query=None):
        return {
            "items": [
                {
                    "company": "?쇱꽦移대뱶",
                    "card_name": "Separated Dates Product",
                    "launch_date": "",
                    "published_date": "2026.03.21",
                    "effective_date": "2026.03.20",
                }
            ],
            "products": [
                {
                    "company": "?쇱꽦移대뱶",
                    "card_name": "Separated Dates Product",
                    "launch_date": "",
                    "published_date": "2026.03.21",
                    "effective_date": "2026.03.20",
                }
            ],
            "total": 1,
            "source": "hybrid",
            "by_company": {"?쇱꽦移대뱶": {"count": 1}},
        }

    monkeypatch.setattr(app, "build_product_catalog_response", fake_catalog)

    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/api/disclosures?new_only=false")
            assert response.status_code == 200
            body = response.json()
            product = body["products"][0]
            assert product["launch_date"] == ""
            assert product["published_date"] == "2026.03.21"
            assert product["effective_date"] == "2026.03.20"

    asyncio.run(_run())


def test_template_legacy_products_loader_skips_when_modern_catalog_shell_exists():
    template = (ROOT / "templates/simple_dashboard.html").read_text(encoding="utf-8")
    assert "if (document.getElementById('productsCatalogList')) return;" in template


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


def test_report_studio_routes_preview_generate_send_list_and_open_html(monkeypatch, tmp_path):
    import modules.report_studio as report_studio

    artifact_root = tmp_path / "output" / "briefings"
    html_path = artifact_root / "daily" / "2026-03-25" / "pinned-report.html"
    pdf_path = artifact_root / "daily" / "2026-03-25" / "report.pdf"
    html_path.parent.mkdir(parents=True, exist_ok=True)
    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    html_path.write_text("<html><body><main>Pinned report DOM</main></body></html>", encoding="utf-8")
    pdf_path.write_bytes(b"pdf")

    manifest = {
        "report_type": "daily",
        "basis_kind": "date",
        "basis_value": "2026-03-25",
        "basis_label": "2026-03-25",
        "final_data_basis_text": "2026. 3. 25. 오전 11시 33분 52초",
        "preview_route_url": "http://dashboard.local/?mode=report&report_type=daily&basis=2026-03-25",
        "html_path": str(html_path),
        "pdf_path": str(pdf_path),
    }

    monkeypatch.setattr(
        report_studio,
        "_artifact_root",
        lambda: artifact_root,
        raising=False,
    )
    monkeypatch.setattr(
        report_studio,
        "render_report_preview",
        lambda _db_session, report_type, basis_value, dashboard_url="": f"<html><body>{report_type}:{basis_value}</body></html>",
        raising=False,
    )
    monkeypatch.setattr(
        report_studio,
        "save_report_pdf_artifact",
        lambda _db_session, report_type, basis_value, dashboard_url="": {
            "report_id": 41,
            "report_type": report_type,
            "basis_value": basis_value,
            "basis_kind": "date",
            "period_label": "2026-03-25",
            "final_data_basis_text": "2026. 3. 25. 오전 11시 33분 52초",
            "preview_url": "/api/briefing/reports/41/html",
            "open_report_url": "/api/briefing/reports/41/html",
            "html_path": str(html_path),
            "pdf_path": str(pdf_path),
            "download_url": "/api/briefing/reports/41/pdf",
            "status": "saved",
            "snapshot_manifest": manifest,
        },
        raising=False,
    )
    monkeypatch.setattr(
        report_studio,
        "send_report_artifact_email",
        lambda _db_session, report_type, basis_value, recipients, dashboard_url="": {
            "report_id": 42,
            "report_type": report_type,
            "basis_value": basis_value,
            "basis_kind": "date",
            "period_label": "2026-03-25",
            "final_data_basis_text": "2026. 3. 25. 오전 11시 33분 52초",
            "preview_url": "/api/briefing/reports/42/html",
            "open_report_url": "/api/briefing/reports/42/html",
            "html_path": str(html_path),
            "pdf_path": str(pdf_path),
            "recipient_count": len(recipients),
            "status": "sent",
            "snapshot_manifest": manifest,
        },
        raising=False,
    )
    monkeypatch.setattr(
        report_studio,
        "list_report_artifacts",
        lambda _db_session, limit=20: {
            "items": [
                {
                    "id": 41,
                    "report_type": "daily",
                    "basis_kind": "date",
                    "basis_value": "2026-03-25",
                    "period_label": "2026-03-25",
                    "final_data_basis_text": "2026. 3. 25. 오전 11시 33분 52초",
                    "preview_url": "/api/briefing/reports/41/html",
                    "open_report_url": "/api/briefing/reports/41/html",
                    "html_path": str(html_path),
                    "pdf_path": str(pdf_path),
                    "status": "saved",
                    "download_url": "/api/briefing/reports/41/pdf",
                    "snapshot_manifest": manifest,
                }
            ],
            "total": 1,
        },
        raising=False,
    )

    row = SimpleNamespace(
        id=41,
        report_type="daily",
        basis_kind="date",
        basis_value="2026-03-25",
        period_label="2026-03-25",
        final_data_basis_text="2026. 3. 25. 오전 11시 33분 52초",
        snapshot_captured_at="2026-03-25T11:33:52",
        snapshot_manifest_json=json.dumps(manifest),
        preview_image_path=str(tmp_path / "preview.png"),
        html_path=str(html_path),
        pdf_path=str(pdf_path),
        status="saved",
        last_recipient_summary="ops@example.com",
        created_at=None,
        last_sent_at=None,
    )
    monkeypatch.setattr(report_studio, "get_report_artifact", lambda _db_session, report_id: row if report_id == 41 else None, raising=False)

    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            preview = await client.get("/api/briefing/report-preview?type=daily&basis=2026-03-25")
            assert preview.status_code == 200
            assert preview.headers["content-type"].startswith("text/html")
            assert "daily:2026-03-25" in preview.text

            generated = await client.post("/api/briefing/report-pdf", json={"type": "daily", "basis": "2026-03-25"})
            assert generated.status_code == 200
            generated_body = generated.json()
            assert generated_body["preview_url"] == "/api/briefing/reports/41/html"
            assert generated_body["open_report_url"] == "/api/briefing/reports/41/html"
            assert generated_body["download_url"] == "/api/briefing/reports/41/pdf"
            assert generated_body["final_data_basis_text"] == "2026. 3. 25. 오전 11시 33분 52초"

            sent = await client.post(
                "/api/briefing/report-send",
                json={"type": "daily", "basis": "2026-03-25", "recipients": ["alpha@example.com", "beta@example.com"]},
            )
            assert sent.status_code == 200
            sent_body = sent.json()
            assert sent_body["recipient_count"] == 2
            assert sent_body["preview_url"] == "/api/briefing/reports/42/html"
            assert sent_body["open_report_url"] == "/api/briefing/reports/42/html"

            listed = await client.get("/api/briefing/reports?limit=5")
            assert listed.status_code == 200
            body = listed.json()
            assert body["total"] == 1
            assert body["items"][0]["basis_kind"] == "date"
            assert body["items"][0]["final_data_basis_text"] == "2026. 3. 25. 오전 11시 33분 52초"
            assert body["items"][0]["preview_url"] == "/api/briefing/reports/41/html"
            assert body["items"][0]["open_report_url"] == "/api/briefing/reports/41/html"
            assert body["items"][0]["download_url"] == "/api/briefing/reports/41/pdf"

            open_response = await client.get("/api/briefing/reports/41/html")
            assert open_response.status_code == 200
            assert open_response.headers["content-type"].startswith("text/html")
            assert "Pinned report DOM" in open_response.text
            assert "report-preview" not in open_response.text

            pdf_response = await client.get("/api/briefing/reports/41/pdf")
            assert pdf_response.status_code == 200
            assert pdf_response.headers["content-type"].startswith("application/pdf")
            assert "일간 페이먼트그룹 Market Report (26.03.25).pdf" in unquote(
                pdf_response.headers.get("content-disposition", "")
            )
            assert pdf_response.content == b"pdf"

    asyncio.run(_run())


def test_report_studio_routes_open_html_and_pdf_fall_back_to_manifest_paths(monkeypatch, tmp_path):
    import modules.report_studio as report_studio

    artifact_root = tmp_path / "output" / "briefings"
    html_path = artifact_root / "monthly" / "2026-03" / "manifest-report.html"
    pdf_path = artifact_root / "monthly" / "2026-03" / "manifest-report.pdf"
    html_path.parent.mkdir(parents=True, exist_ok=True)
    html_path.write_text("<html><body>Manifest fallback</body></html>", encoding="utf-8")
    pdf_path.write_bytes(b"manifest-pdf")

    row = SimpleNamespace(
        id=51,
        report_type="monthly",
        basis_kind="month",
        basis_value="2026-03",
        period_label="2026-03",
        final_data_basis_text="2026. 3. 31. 오후 11시 59분 59초",
        snapshot_captured_at="2026-03-31T23:59:59",
        snapshot_manifest_json=json.dumps(
            {
                "report_type": "monthly",
                "basis_kind": "month",
                "basis_value": "2026-03",
                "basis_label": "2026-03",
                "final_data_basis_text": "2026. 3. 31. 오후 11시 59분 59초",
                "html_path": str(html_path),
                "pdf_path": str(pdf_path),
            }
        ),
        preview_image_path=str(artifact_root / "monthly" / "2026-03" / "preview.png"),
        html_path="",
        pdf_path="",
        status="saved",
        last_recipient_summary="",
        created_at=None,
        last_sent_at=None,
    )

    monkeypatch.setattr(report_studio, "_artifact_root", lambda: artifact_root, raising=False)
    monkeypatch.setattr(report_studio, "get_report_artifact", lambda _db_session, report_id: row if report_id == 51 else None, raising=False)

    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            html_response = await client.get("/api/briefing/reports/51/html")
            assert html_response.status_code == 200
            assert html_response.headers["content-type"].startswith("text/html")
            assert "Manifest fallback" in html_response.text

            pdf_response = await client.get("/api/briefing/reports/51/pdf")
            assert pdf_response.status_code == 200
            assert pdf_response.headers["content-type"].startswith("application/pdf")
            assert pdf_response.content == b"manifest-pdf"

    asyncio.run(_run())


def test_report_studio_routes_rejects_artifact_paths_outside_root(monkeypatch, tmp_path):
    import modules.report_studio as report_studio

    artifact_root = tmp_path / "output" / "briefings"
    artifact_root.mkdir(parents=True, exist_ok=True)
    outside_html = tmp_path / "outside" / "traversal.html"
    outside_pdf = tmp_path / "outside" / "traversal.pdf"
    outside_html.parent.mkdir(parents=True, exist_ok=True)
    outside_html.write_text("<html><body>Outside root</body></html>", encoding="utf-8")
    outside_pdf.write_bytes(b"outside")

    row = SimpleNamespace(
        id=52,
        report_type="daily",
        basis_kind="date",
        basis_value="2026-03-25",
        period_label="2026-03-25",
        final_data_basis_text="2026. 3. 25. 오전 11시 33분 52초",
        snapshot_captured_at="2026-03-25T11:33:52",
        snapshot_manifest_json=json.dumps(
            {
                "report_type": "daily",
                "basis_kind": "date",
                "basis_value": "2026-03-25",
                "basis_label": "2026-03-25",
                "final_data_basis_text": "2026. 3. 25. 오전 11시 33분 52초",
                "html_path": str(outside_html),
                "pdf_path": str(outside_pdf),
            }
        ),
        preview_image_path=str(tmp_path / "preview.png"),
        html_path="",
        pdf_path="",
        status="saved",
        last_recipient_summary="",
        created_at=None,
        last_sent_at=None,
    )

    monkeypatch.setattr(report_studio, "_artifact_root", lambda: artifact_root, raising=False)
    monkeypatch.setattr(report_studio, "get_report_artifact", lambda _db_session, report_id: row if report_id == 52 else None, raising=False)

    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            html_response = await client.get("/api/briefing/reports/52/html")
            assert html_response.status_code == 404
            assert html_response.json()["detail"] == "report HTML not found"

            pdf_response = await client.get("/api/briefing/reports/52/pdf")
            assert pdf_response.status_code == 404
            assert pdf_response.json()["detail"] == "report PDF not found"

    asyncio.run(_run())


def test_report_studio_routes_open_html_and_pdf_return_404_for_missing_resources(monkeypatch, tmp_path):
    import modules.report_studio as report_studio

    artifact_root = tmp_path / "output" / "briefings"
    existing_html = artifact_root / "daily" / "2026-03-25" / "existing.html"
    existing_html.parent.mkdir(parents=True, exist_ok=True)
    existing_html.write_text("<html><body>Existing</body></html>", encoding="utf-8")
    missing_html = artifact_root / "daily" / "2026-03-25" / "missing.html"
    missing_pdf = artifact_root / "daily" / "2026-03-25" / "missing.pdf"

    existing_row = SimpleNamespace(
        id=41,
        report_type="daily",
        basis_kind="date",
        basis_value="2026-03-25",
        period_label="2026-03-25",
        final_data_basis_text="2026. 3. 25. 오전 11시 33분 52초",
        snapshot_captured_at="2026-03-25T11:33:52",
        snapshot_manifest_json=json.dumps(
            {
                "report_type": "daily",
                "basis_kind": "date",
                "basis_value": "2026-03-25",
                "basis_label": "2026-03-25",
                "final_data_basis_text": "2026. 3. 25. 오전 11시 33분 52초",
                "html_path": str(existing_html),
                "pdf_path": str(missing_pdf),
            }
        ),
        preview_image_path=str(tmp_path / "preview.png"),
        html_path=str(existing_html),
        pdf_path=str(missing_pdf),
        status="saved",
        last_recipient_summary="",
        created_at=None,
        last_sent_at=None,
    )

    missing_file_row = SimpleNamespace(
        id=42,
        report_type="daily",
        basis_kind="date",
        basis_value="2026-03-25",
        period_label="2026-03-25",
        final_data_basis_text="2026. 3. 25. 오전 11시 33분 52초",
        snapshot_captured_at="2026-03-25T11:33:52",
        snapshot_manifest_json=json.dumps(
            {
                "report_type": "daily",
                "basis_kind": "date",
                "basis_value": "2026-03-25",
                "basis_label": "2026-03-25",
                "final_data_basis_text": "2026. 3. 25. 오전 11시 33분 52초",
                "html_path": str(missing_html),
                "pdf_path": str(missing_pdf),
            }
        ),
        preview_image_path=str(tmp_path / "preview-2.png"),
        html_path=str(missing_html),
        pdf_path=str(missing_pdf),
        status="saved",
        last_recipient_summary="",
        created_at=None,
        last_sent_at=None,
    )

    def fake_get_report_artifact(_db_session, report_id):
        if report_id == 41:
            return existing_row
        if report_id == 42:
            return missing_file_row
        return None

    monkeypatch.setattr(report_studio, "_artifact_root", lambda: artifact_root, raising=False)
    monkeypatch.setattr(report_studio, "get_report_artifact", fake_get_report_artifact, raising=False)

    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            missing_row = await client.get("/api/briefing/reports/99/html")
            assert missing_row.status_code == 404
            assert missing_row.json()["detail"] == "report not found"

            missing_html_response = await client.get("/api/briefing/reports/42/html")
            assert missing_html_response.status_code == 404
            assert missing_html_response.json()["detail"] == "report HTML not found"

            missing_pdf_response = await client.get("/api/briefing/reports/42/pdf")
            assert missing_pdf_response.status_code == 404
            assert missing_pdf_response.json()["detail"] == "report PDF not found"

    asyncio.run(_run())


def test_report_studio_routes_prefer_request_origin_over_configured_dashboard_url(monkeypatch):
    import modules.report_studio as report_studio
    import modules.briefing as briefing

    captured = {"preview": None, "pdf": None, "send": None}

    monkeypatch.setattr(briefing, "get_dashboard_url", lambda: "http://localhost:8000", raising=False)
    monkeypatch.setattr(
        report_studio,
        "render_report_preview",
        lambda _db_session, report_type, basis_value, dashboard_url="": (
            captured.__setitem__("preview", dashboard_url) or f"<html><body>{dashboard_url}</body></html>"
        ),
        raising=False,
    )
    monkeypatch.setattr(
        report_studio,
        "save_report_pdf_artifact",
        lambda _db_session, report_type, basis_value, dashboard_url="": (
            captured.__setitem__("pdf", dashboard_url) or {"ok": True, "preview_url": "/api/briefing/reports/41/html"}
        ),
        raising=False,
    )
    monkeypatch.setattr(
        report_studio,
        "send_report_artifact_email",
        lambda _db_session, report_type, basis_value, recipients, dashboard_url="": (
            captured.__setitem__("send", dashboard_url) or {"ok": True, "status": "sent"}
        ),
        raising=False,
    )

    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://127.0.0.1:8000") as client:
            preview = await client.get("/api/briefing/report-preview?type=daily&basis=2026-03-25")
            assert preview.status_code == 200
            pdf = await client.post("/api/briefing/report-pdf", json={"type": "daily", "basis": "2026-03-25"})
            assert pdf.status_code == 200
            send = await client.post(
                "/api/briefing/report-send",
                json={"type": "daily", "basis": "2026-03-25", "recipients": ["ops@example.com"]},
            )
            assert send.status_code == 200

    asyncio.run(_run())

    assert captured["preview"] == "http://127.0.0.1:8000"
    assert captured["pdf"] == "http://127.0.0.1:8000"
    assert captured["send"] == "http://127.0.0.1:8000"


def test_report_studio_open_html_rewrites_base_href_to_request_origin(monkeypatch, tmp_path):
    import modules.report_studio as report_studio

    artifact_root = tmp_path / "output" / "briefings"
    html_path = artifact_root / "weekly" / "2026-03-25" / "pinned-report.html"
    html_path.parent.mkdir(parents=True, exist_ok=True)
    html_path.write_text(
        "<html><head><base href=\"http://localhost:8000/\"></head><body>Pinned report</body></html>",
        encoding="utf-8",
    )
    row = SimpleNamespace(
        id=61,
        report_type="weekly",
        basis_kind="week",
        basis_value="2026-03-25",
        period_label="03/19 ~ 03/25",
        snapshot_manifest_json=json.dumps({"html_path": str(html_path)}),
        preview_image_path="",
        html_path=str(html_path),
        pdf_path="",
        status="saved",
    )

    monkeypatch.setattr(report_studio, "_artifact_root", lambda: artifact_root, raising=False)
    monkeypatch.setattr(report_studio, "get_report_artifact", lambda _db_session, report_id: row if report_id == 61 else None, raising=False)

    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://127.0.0.1:8000") as client:
            response = await client.get("/api/briefing/reports/61/html")
            assert response.status_code == 200
            assert '<base href="http://127.0.0.1:8000/">' in response.text
            assert 'http://localhost:8000/' not in response.text

    asyncio.run(_run())


if __name__ == "__main__":
    test_core_routes_respond()
    print("Done.")
