import json
import importlib
import inspect
import asyncio
import os
import re
import sys
import tempfile
from datetime import date, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace

import httpx

import app

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import modules.briefing as briefing


class _FakeQuery:
    def __init__(self, rows):
        self._rows = list(rows)

    def all(self):
        return list(self._rows)


class _FakeSession:
    def __init__(self, rows):
        self._rows = list(rows)

    def query(self, _model):
        return _FakeQuery(self._rows)


def _make_event(
    event_id: int,
    *,
    company: str,
    category: str = "Travel",
    created_at: datetime | None = None,
    period_end: date | None = None,
    status: str = "active",
    one_line_summary: str = "",
    marketing_takeaway: str | None = None,
    evidence: list[str] | None = None,
    linked_cards=None,
):
    today = date.today()
    insight = None
    if marketing_takeaway or evidence:
        insight = SimpleNamespace(
            marketing_takeaway=marketing_takeaway,
            evidence=json.dumps(evidence or [], ensure_ascii=False),
        )

    return SimpleNamespace(
        id=event_id,
        url=f"https://example.com/events/{event_id}",
        company=company,
        category=category,
        title=f"{company} {category} Event {event_id}",
        period_start=today - timedelta(days=1),
        period_end=period_end or (today + timedelta(days=14)),
        benefit_value="10% off",
        benefit_amount_won=10000,
        benefit_pct=10.0,
        one_line_summary=one_line_summary,
        insights=[insight] if insight else [],
        status=status,
        created_at=created_at or datetime.now(),
        linked_cards=linked_cards,
        product_links_rel=[],
    )


def _sample_briefing_payload(*, report_type: str) -> dict:
    base = {
        "generated_at": "2026-03-20T09:00:00",
        "period_label": "2026-03-20" if report_type == "daily" else "03/13 ~ 03/20",
        "executive_summary": "브랜드 공략과 제휴 전환 신호가 동시에 확대되고 있습니다.",
        "company_sections": [
            {
                "company": "Alpha Card",
                "new_events_count": 2,
                "active_events_count": 1,
                "ended_events_count": 0,
                "ending_soon_count": 1,
                "top_categories": ["Travel", "Dining"],
                "evidence_events": [
                    {
                        "company": "Alpha Card",
                        "title": "Alpha Card Travel Event",
                        "category": "Travel",
                        "one_line_summary": "공항 제휴 혜택이 전면에 배치되었습니다.",
                        "evidence": ["공항 제휴", "상시 혜택"],
                        "period_start": "2026-03-18",
                        "period_end": "2026-03-25",
                    }
                ],
                "evidence_products": [
                    {
                        "company": "Alpha Card",
                        "product_name": "Alpha Sky",
                        "link_text": "Alpha Sky",
                        "product_url": "https://example.com/alpha-sky",
                        "benefit_summary": "공항 라운지와 마일리지 적립",
                    }
                ],
            },
            {
                "company": "Beta Card",
                "new_events_count": 1,
                "active_events_count": 0,
                "ended_events_count": 1,
                "ending_soon_count": 0,
                "top_categories": ["Lifestyle"],
                "evidence_events": [
                    {
                        "company": "Beta Card",
                        "title": "Beta Card Lifestyle Event",
                        "category": "Lifestyle",
                        "one_line_summary": "생활형 혜택 중심으로 재구성되고 있습니다.",
                        "evidence": ["생활형 제휴", "주말 사용 증가"],
                        "period_start": "2026-03-16",
                        "period_end": "2026-03-24",
                    }
                ],
                "evidence_products": [
                    {
                        "company": "Beta Card",
                        "product_name": "Beta Live",
                        "link_text": "Beta Live",
                        "product_url": "https://example.com/beta-live",
                        "benefit_summary": "생활 할인과 구독 연계",
                    }
                ],
            },
        ],
        "theme_summary": [
            {
                "theme": "Travel",
                "event_count": 3,
                "companies": ["Alpha Card"],
            },
            {
                "theme": "Lifestyle",
                "event_count": 2,
                "companies": ["Beta Card"],
            },
        ],
        "product_summary": [
            {
                "product_name": "Alpha Sky",
                "company": "Alpha Card",
                "event_count": 2,
                "companies": ["Alpha Card"],
                "example_event": {
                    "company": "Alpha Card",
                    "title": "Alpha Card Travel Event",
                    "one_line_summary": "공항 제휴 혜택이 전면에 배치되었습니다.",
                },
            },
            {
                "product_name": "Beta Live",
                "company": "Beta Card",
                "event_count": 1,
                "companies": ["Beta Card"],
                "example_event": {
                    "company": "Beta Card",
                    "title": "Beta Card Lifestyle Event",
                    "one_line_summary": "생활형 혜택 중심으로 재구성되고 있습니다.",
                },
            },
        ],
        "evidence_events": [
            {
                "company": "Alpha Card",
                "title": "Alpha Card Travel Event",
                "category": "Travel",
                "one_line_summary": "공항 제휴 혜택이 전면에 배치되었습니다.",
                "evidence": ["공항 제휴", "상시 혜택"],
                "period_start": "2026-03-18",
                "period_end": "2026-03-25",
            },
            {
                "company": "Beta Card",
                "title": "Beta Card Lifestyle Event",
                "category": "Lifestyle",
                "one_line_summary": "생활형 혜택 중심으로 재구성되고 있습니다.",
                "evidence": ["생활형 제휴", "주말 사용 증가"],
                "period_start": "2026-03-16",
                "period_end": "2026-03-24",
            },
        ],
        "evidence_products": [
            {
                "company": "Alpha Card",
                "product_name": "Alpha Sky",
                "link_text": "Alpha Sky",
                "product_url": "https://example.com/alpha-sky",
                "benefit_summary": "공항 라운지와 마일리지 적립",
            },
            {
                "company": "Beta Card",
                "product_name": "Beta Live",
                "link_text": "Beta Live",
                "product_url": "https://example.com/beta-live",
                "benefit_summary": "생활 할인과 구독 연계",
            },
        ],
        "quality_warnings": [
            {"code": "no_new_events", "message": "No new events were found."}
        ],
        "warning_count": 1,
        "delivery_mode": "digest",
        "template_version": "v3",
        "date_label": "2026년 03월 20일",
        "new_events_count": 3,
        "ending_soon_count": 1,
        "week_label": "03/13 ~ 03/20",
        "ended_events_count": 1,
        "new_events": [
            {
                "company": "Alpha Card",
                "title": "Alpha Card Travel Event",
                "category": "Travel",
                "period_end": "2026-03-25",
                "benefit_value": "10% off",
                "benefit_amount_won": 10000,
                "benefit_pct": 10.0,
            },
            {
                "company": "Beta Card",
                "title": "Beta Card Lifestyle Event",
                "category": "Lifestyle",
                "period_end": "2026-03-24",
                "benefit_value": "5% off",
                "benefit_amount_won": 5000,
                "benefit_pct": 5.0,
            },
        ],
        "notable_events": [
            {
                "company": "Alpha Card",
                "title": "Alpha Card Travel Event",
                "category": "Travel",
                "one_line_summary": "공항 제휴 혜택이 전면에 배치되었습니다.",
                "notable_reasons": ["공항", "제휴"],
                "benefit_value": "10% off",
                "benefit_amount_won": 10000,
                "period_start": "2026-03-18",
                "period_end": "2026-03-25",
            }
        ],
        "ending_soon_events": [
            {
                "company": "Alpha Card",
                "title": "Alpha Card Travel Event",
                "period_end": "2026-03-25",
            }
        ],
        "ended_events": [
            {
                "company": "Beta Card",
                "title": "Beta Card Lifestyle Event",
                "period_end": "2026-03-18",
            }
        ],
        "company_stats": {
            "Alpha Card": {"new": 2, "ended": 0, "notable": 1},
            "Beta Card": {"new": 1, "ended": 1, "notable": 0},
        },
    }

    if report_type == "daily":
        base["period_label"] = "2026-03-20"
        base["date_label"] = "2026년 03월 20일"
    else:
        base["period_label"] = "03/13 ~ 03/20"
        base["week_label"] = "03/13 ~ 03/20"
    return base


def test_build_daily_briefing_payload_contains_company_sections(monkeypatch):
    monkeypatch.setattr(
        briefing,
        "EXPECTED_COMPANIES",
        ("Alpha Card", "Beta Card"),
        raising=False,
    )
    session = _FakeSession(
        [
            _make_event(
                1,
                company="Alpha Card",
                one_line_summary="Airport pickup for premium travelers.",
                evidence=["Airport pickup benefit evidence"],
                linked_cards=["Alpha Sky"],
            ),
            _make_event(
                2,
                company="Beta Card",
                category="Dining",
                marketing_takeaway="Dining demand is rising on weekends.",
                linked_cards='["Beta Dining"]',
            ),
        ]
    )

    payload = briefing.build_daily_briefing_data(session)

    assert "executive_summary" in payload
    assert "company_sections" in payload
    assert "quality_warnings" in payload
    assert any(section["company"] == "Alpha Card" for section in payload["company_sections"])


def test_daily_payload_warns_when_no_new_events(monkeypatch):
    monkeypatch.setattr(briefing, "EXPECTED_COMPANIES", ("Alpha Card",), raising=False)
    session = _FakeSession(
        [
            _make_event(
                3,
                company="Alpha Card",
                created_at=datetime.now() - timedelta(days=3),
                one_line_summary="Existing offer still active.",
                evidence=["Existing offer evidence"],
            )
        ]
    )

    payload = briefing.build_daily_briefing_data(session)

    assert any(warning["code"] == "no_new_events" for warning in payload["quality_warnings"])


def test_daily_payload_warns_when_company_coverage_is_missing(monkeypatch):
    monkeypatch.setattr(
        briefing,
        "EXPECTED_COMPANIES",
        ("Alpha Card", "Beta Card", "Gamma Card"),
        raising=False,
    )
    session = _FakeSession(
        [
            _make_event(4, company="Alpha Card", evidence=["Alpha evidence"]),
            _make_event(5, company="Beta Card", evidence=["Beta evidence"]),
        ]
    )

    payload = briefing.build_daily_briefing_data(session)

    coverage_warning = next(
        warning for warning in payload["quality_warnings"]
        if warning["code"] == "company_coverage_low"
    )
    assert "Gamma Card" in coverage_warning["missing_companies"]


def test_daily_payload_warns_when_evidence_events_are_missing(monkeypatch):
    monkeypatch.setattr(briefing, "EXPECTED_COMPANIES", ("Alpha Card",), raising=False)
    session = _FakeSession(
        [
            _make_event(
                6,
                company="Alpha Card",
                one_line_summary="",
                marketing_takeaway=None,
                evidence=None,
            )
        ]
    )

    payload = briefing.build_daily_briefing_data(session)

    assert any(
        warning["code"] == "insufficient_evidence_events"
        for warning in payload["quality_warnings"]
    )


def test_weekly_payload_falls_back_to_rule_summary(monkeypatch):
    monkeypatch.setattr(briefing, "EXPECTED_COMPANIES", ("Alpha Card",), raising=False)
    session = _FakeSession(
        [
            _make_event(
                7,
                company="Alpha Card",
                created_at=datetime.now() - timedelta(days=2),
                one_line_summary="Weekend travel card push.",
            )
        ]
    )

    payload = briefing.build_weekly_briefing_data(session)

    assert payload["ai_summary_status"] == "rule"
    assert isinstance(payload["executive_summary"], str)
    assert payload["executive_summary"]


def test_weekly_payload_includes_products_from_ended_events(monkeypatch):
    monkeypatch.setattr(briefing, "EXPECTED_COMPANIES", ("Alpha Card",), raising=False)
    session = _FakeSession(
        [
            _make_event(
                8,
                company="Alpha Card",
                created_at=datetime.now() - timedelta(days=2),
                linked_cards=["Alpha Fresh"],
                one_line_summary="Fresh weekly launch.",
            ),
            _make_event(
                9,
                company="Alpha Card",
                created_at=datetime.now() - timedelta(days=12),
                period_end=date.today() - timedelta(days=1),
                status="ended",
                linked_cards=["Alpha Legacy"],
                one_line_summary="Legacy weekly closeout.",
            ),
        ]
    )

    payload = briefing.build_weekly_briefing_data(session)

    summary_names = {item["product_name"] for item in payload["product_summary"]}
    evidence_names = {item["product_name"] for item in payload["evidence_products"]}

    assert payload["source_product_count"] == 2
    assert "Alpha Legacy" in summary_names
    assert "Alpha Legacy" in evidence_names


def test_weekly_product_summary_counts_repeated_product_activity(monkeypatch):
    monkeypatch.setattr(briefing, "EXPECTED_COMPANIES", ("Alpha Card",), raising=False)
    session = _FakeSession(
        [
            _make_event(
                10,
                company="Alpha Card",
                created_at=datetime.now() - timedelta(days=2),
                linked_cards=["Alpha Core"],
                one_line_summary="Fresh Alpha Core push.",
            ),
            _make_event(
                11,
                company="Alpha Card",
                created_at=datetime.now() - timedelta(days=10),
                period_end=date.today() - timedelta(days=2),
                status="ended",
                linked_cards=["Alpha Core"],
                one_line_summary="Alpha Core wrap-up.",
            ),
        ]
    )

    payload = briefing.build_weekly_briefing_data(session)

    alpha_core = next(
        item for item in payload["product_summary"]
        if item["product_name"] == "Alpha Core"
    )
    assert alpha_core["event_count"] == 2


def test_company_sections_prioritize_more_ending_soon_pressure(monkeypatch):
    monkeypatch.setattr(
        briefing,
        "EXPECTED_COMPANIES",
        ("Alpha Card", "Beta Card"),
        raising=False,
    )
    session = _FakeSession(
        [
            _make_event(
                12,
                company="Alpha Card",
                created_at=datetime.now() - timedelta(hours=4),
                period_end=date.today() + timedelta(days=14),
                linked_cards=["Alpha Stable"],
                one_line_summary="Alpha steady offer.",
            ),
            _make_event(
                13,
                company="Beta Card",
                created_at=datetime.now() - timedelta(hours=3),
                period_end=date.today() + timedelta(days=2),
                linked_cards=["Beta Urgent"],
                one_line_summary="Beta urgent offer.",
            ),
        ]
    )

    payload = briefing.build_daily_briefing_data(session)

    assert payload["company_sections"][0]["company"] == "Beta Card"


def test_daily_payload_uses_user_facing_date_label():
    payload = briefing.build_daily_briefing_data(_FakeSession([]))

    assert re.fullmatch(r"\d{4}년 \d{2}월 \d{2}일", payload["date_label"])
    assert payload["date_label"] != payload["period_label"]


def test_briefing_module_exports_single_daily_and_weekly_builder_definition():
    source = inspect.getsource(briefing)

    assert source.count("def build_daily_briefing_data(") == 1
    assert source.count("def build_weekly_briefing_data(") == 1


def test_create_briefing_log_persists_new_metadata():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "briefing_test.db"
        os.environ["DATABASE_URL"] = f"sqlite:///{db_path.as_posix()}"
        if "database" in sys.modules:
            del sys.modules["database"]
        database = importlib.import_module("database")
        database.init_db()

        session = database.SessionLocal()
        try:
            created = database.create_briefing_log(
                session,
                briefing_type="daily",
                recipient_count=3,
                new_events_count=1,
                high_threat_count=0,
                ending_soon_count=0,
                status="sent",
                error_msg=None,
                period_label="2026-03-20",
                source_event_count=5,
                source_product_count=2,
                warning_count=2,
                warning_json={"warnings": ["late_renewal"]},
                ai_summary_status="rule",
                delivery_mode="digest",
                template_version="v3",
            )

            persisted = session.query(database.BriefingLog).filter_by(id=created.id).one()
            assert persisted.period_label == "2026-03-20"
            assert persisted.source_event_count == 5
            assert persisted.source_product_count == 2
            assert persisted.ai_summary_status == "rule"
            assert persisted.template_version == "v3"
            assert persisted.warning_json == json.dumps({"warnings": ["late_renewal"]}, ensure_ascii=False)
            assert persisted.delivery_mode == "digest"
            assert persisted.warning_count == 2
        finally:
            session.close()
            database.engine.dispose()


def test_render_daily_briefing_uses_market_intelligence_sections():
    html = briefing.render_briefing_html(
        _sample_briefing_payload(report_type="daily"),
        report_type="daily",
        dashboard_url="https://example.com/dashboard",
    )

    assert "2026년 03월 20일" in html
    assert "경영진용 마케팅 인텔리전스 브리핑" in html
    assert "핵심 요약" in html
    assert "회사별 동향" in html
    assert "테마 신호" in html
    assert "전환 및 마감 임박" in html
    assert "근거 이벤트" in html
    assert "class=\"pill\"" not in html
    assert "class=\"metric\"" not in html
    assert "대시보드에서 전체 보기" not in html
    assert "카드 마케팅 인텔리전스 브리핑 ·" not in html
    assert "quality_warnings" not in html
    assert "delivery_mode" not in html
    assert "template_version" not in html


def test_render_weekly_briefing_uses_company_narratives_and_product_summary():
    html = briefing.render_briefing_html(
        _sample_briefing_payload(report_type="weekly"),
        report_type="weekly",
        dashboard_url="https://example.com/dashboard",
    )

    assert "주간 경쟁 인텔리전스 브리핑" in html
    assert "주간 핵심 요약" in html
    assert "회사별 주간 서술" in html
    assert "테마 변화" in html
    assert "제품/공시 요약" in html
    assert "근거 블록" in html
    assert "class=\"pill\"" not in html
    assert "class=\"metric\"" not in html
    assert "대시보드에서 전체 보기" not in html
    assert "주간 카드 마케팅 인텔리전스 리포트 ·" not in html
    assert "warning" not in html.lower()
    assert "delivery_mode" not in html
    assert "template_version" not in html


def test_preview_routes_render_briefings_without_breaking():
    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            for path, expected_text in (
                ("/api/briefing/preview?type=daily", "핵심 요약"),
                ("/api/briefing/preview?type=weekly", "주간 핵심 요약"),
                ("/report/weekly", "주간 카드 마케팅 인텔리전스 리포트"),
            ):
                response = await client.get(path)
                assert response.status_code == 200, f"{path} returned {response.status_code}"
                assert expected_text in response.text
                assert "대시보드에서 전체 보기" not in response.text

    asyncio.run(_run())


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"  PASS {name}")
            except AssertionError as exc:
                print(f"  FAIL {name}: {exc}")
                raise
    print("Done.")
