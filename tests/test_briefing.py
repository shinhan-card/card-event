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

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import app
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


def test_daily_payload_defaults_to_supported_four_issuers_without_coverage_block():
    session = _FakeSession(
        [
            _make_event(
                4,
                company="신한카드",
                created_at=datetime.now(),
                one_line_summary="Shinhan coverage evidence.",
                evidence=["Shinhan evidence"],
            ),
            _make_event(
                5,
                company="삼성카드",
                created_at=datetime.now(),
                one_line_summary="Samsung coverage evidence.",
                evidence=["Samsung evidence"],
            ),
            _make_event(
                6,
                company="현대카드",
                created_at=datetime.now(),
                one_line_summary="Hyundai coverage evidence.",
                evidence=["Hyundai evidence"],
            ),
            _make_event(
                7,
                company="KB국민카드",
                created_at=datetime.now(),
                one_line_summary="KB coverage evidence.",
                evidence=["KB evidence"],
            ),
        ]
    )

    payload = briefing.build_daily_briefing_data(session)
    snapshot = briefing.build_briefing_status_snapshot(payload)

    assert all(warning["code"] != "company_coverage_low" for warning in payload["quality_warnings"])
    assert payload["warning_count"] == 0
    assert snapshot["readiness_status"] == "ready"


def test_daily_payload_ignores_stale_historical_issuer_rows_for_coverage(monkeypatch):
    monkeypatch.setattr(
        briefing,
        "EXPECTED_COMPANIES",
        ("신한카드", "삼성카드", "현대카드", "KB국민카드"),
        raising=False,
    )
    session = _FakeSession(
        [
            _make_event(
                8,
                company="신한카드",
                created_at=datetime.now(),
                one_line_summary="Fresh Shinhan evidence.",
                evidence=["Shinhan evidence"],
            ),
            _make_event(
                9,
                company="삼성카드",
                created_at=datetime.now(),
                one_line_summary="Fresh Samsung evidence.",
                evidence=["Samsung evidence"],
            ),
            _make_event(
                10,
                company="현대카드",
                created_at=datetime.now(),
                one_line_summary="Fresh Hyundai evidence.",
                evidence=["Hyundai evidence"],
            ),
            _make_event(
                11,
                company="KB국민카드",
                created_at=datetime.now() - timedelta(days=30),
                period_end=date.today() - timedelta(days=20),
                status="ended",
                one_line_summary="Stale KB history.",
                evidence=["Historical KB evidence"],
            ),
        ]
    )

    payload = briefing.build_daily_briefing_data(session)
    coverage_warning = next(
        warning for warning in payload["quality_warnings"] if warning["code"] == "company_coverage_low"
    )

    assert "KB국민카드" in coverage_warning["missing_companies"]
    assert payload["source_event_count"] == 3


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


def test_daily_executive_summary_omits_internal_warning_codes(monkeypatch):
    monkeypatch.setattr(briefing, "_build_quality_warnings", lambda *args, **kwargs: [
        {"code": "company_coverage_low", "severity": "high"},
        {"code": "insufficient_evidence_events", "severity": "high"},
    ])
    monkeypatch.setattr(briefing, "EXPECTED_COMPANIES", ("Alpha Card",), raising=False)
    session = _FakeSession(
        [
            _make_event(
                14,
                company="Alpha Card",
                one_line_summary="Daily offer summary.",
                evidence=["Daily evidence"],
            )
        ]
    )

    payload = briefing.build_daily_briefing_data(session)

    assert "Warnings:" not in payload["executive_summary"]
    assert "company_coverage_low" not in payload["executive_summary"]
    assert "insufficient_evidence_events" not in payload["executive_summary"]


def test_weekly_executive_summary_omits_internal_warning_codes(monkeypatch):
    monkeypatch.setattr(briefing, "_build_quality_warnings", lambda *args, **kwargs: [
        {"code": "company_coverage_low", "severity": "high"},
        {"code": "insufficient_evidence_events", "severity": "high"},
    ])
    monkeypatch.setattr(briefing, "EXPECTED_COMPANIES", ("Alpha Card",), raising=False)
    session = _FakeSession(
        [
            _make_event(
                15,
                company="Alpha Card",
                one_line_summary="Weekly offer summary.",
                evidence=["Weekly evidence"],
            )
        ]
    )

    payload = briefing.build_weekly_briefing_data(session)

    assert "Warnings:" not in payload["executive_summary"]
    assert "company_coverage_low" not in payload["executive_summary"]
    assert "insufficient_evidence_events" not in payload["executive_summary"]


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


def test_weekly_payload_includes_company_narratives_and_catalog_summary(monkeypatch):
    monkeypatch.setattr(briefing, "EXPECTED_COMPANIES", ("Alpha Card",), raising=False)
    monkeypatch.setattr(
        briefing,
        "load_product_catalog",
        lambda: {
            "alpha-prime": {
                "company": "Alpha Card",
                "card_name": "Alpha Prime",
                "annual_fee_display": "KRW 20k",
                "spend_requirement": "Monthly spend KRW 300k",
                "benefit_highlights": ["Airport lounge", "Miles"],
                "summary_text": "Travel-focused rewards card.",
                "preview": "Airport lounge and miles",
                "launch_date": "2026-03-01",
                "url": "https://example.com/alpha-prime",
            },
            "alpha-launch": {
                "company": "Alpha Card",
                "card_name": "Alpha Launch",
                "annual_fee_display": "KRW 12k",
                "spend_requirement": "Monthly spend KRW 200k",
                "benefit_highlights": ["Streaming", "Coffee"],
                "summary_text": "Freshly launched lifestyle card.",
                "preview": "Streaming and coffee",
                "launch_date": date.today().isoformat(),
                "revision_type": "launch",
                "url": "https://example.com/alpha-launch",
            },
        },
        raising=False,
    )
    monkeypatch.setattr(
        briefing,
        "summarize_weekly_company_trend",
        lambda company, snapshot: {
            "company": company,
            "narrative": f"{company} stayed travel-led with Alpha Prime in weekly exposure.",
            "source": "gemini",
        },
        raising=False,
    )
    session = _FakeSession(
        [
            _make_event(
                16,
                company="Alpha Card",
                created_at=datetime.now() - timedelta(days=2),
                linked_cards=["Alpha Prime"],
                category="Travel",
                one_line_summary="Alpha Prime weekly push.",
            ),
            _make_event(
                17,
                company="Alpha Card",
                created_at=datetime.now() - timedelta(days=8),
                period_end=date.today() - timedelta(days=1),
                status="ended",
                linked_cards=["Alpha Core"],
                category="Travel",
                one_line_summary="Alpha Core weekly close.",
            ),
        ]
    )

    payload = briefing.build_weekly_briefing_data(session)

    narrative = payload["company_weekly_narratives"][0]
    assert narrative["company"] == "Alpha Card"
    assert narrative["source"] == "gemini"
    assert "travel-led" in narrative["narrative"]

    catalog_names = {
        item["product_name"] for item in payload["weekly_product_catalog_summary"]
    }
    assert "Alpha Prime" in catalog_names
    assert "Alpha Launch" in catalog_names

    alpha_prime = next(
        item
        for item in payload["weekly_product_catalog_summary"]
        if item["product_name"] == "Alpha Prime"
    )
    assert alpha_prime["annual_fee_display"] == "KRW 20k"
    assert alpha_prime["spend_requirement"] == "Monthly spend KRW 300k"
    assert alpha_prime["benefit_highlights"] == ["Airport lounge", "Miles"]
    assert alpha_prime["event_count"] == 1

    alpha_launch = next(
        item
        for item in payload["weekly_product_changes"]
        if item["product_name"] == "Alpha Launch"
    )
    assert alpha_launch["revision_type"] == "launch"
    assert alpha_launch["product_url"] == "https://example.com/alpha-launch"


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
    original_database_url = os.environ.get("DATABASE_URL")
    original_database_module = sys.modules.get("database")
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "briefing_test.db"
        try:
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
        finally:
            if original_database_url is None:
                os.environ.pop("DATABASE_URL", None)
            else:
                os.environ["DATABASE_URL"] = original_database_url

            if original_database_module is None:
                sys.modules.pop("database", None)
            else:
                sys.modules["database"] = original_database_module


def test_build_briefing_status_snapshot_infers_readiness_from_warnings():
    snapshot = briefing.build_briefing_status_snapshot(
        {
            "report_type": "daily",
            "period_label": "2026-03-20",
            "generated_at": "2026-03-20T09:00:00",
            "warning_count": 2,
            "quality_warnings": [
                {"code": "company_coverage_low", "severity": "high", "message": "Coverage needs review."}
            ],
            "ai_summary_status": "rule",
            "source_event_count": 12,
            "source_product_count": 4,
        }
    )

    assert snapshot["report_type"] == "daily"
    assert snapshot["period_label"] == "2026-03-20"
    assert snapshot["warning_count"] == 2
    assert snapshot["warnings"][0]["code"] == "company_coverage_low"
    assert snapshot["ai_summary_status"] == "rule"
    assert snapshot["source_event_count"] == 12
    assert snapshot["source_product_count"] == 4
    assert snapshot["readiness_status"] == "blocked"


def test_send_now_briefing_route_returns_mode_and_metadata(monkeypatch):
    sample_payload = {
        "report_type": "daily",
        "generated_at": "2026-03-20T09:00:00",
        "period_label": "2026-03-20",
        "date_label": "2026-03-20",
        "week_label": "",
        "warning_count": 1,
        "quality_warnings": [{"code": "no_new_events", "severity": "medium"}],
        "ai_summary_status": "rule",
        "source_event_count": 5,
        "source_product_count": 2,
        "notable_count": 3,
        "ending_soon_count": 1,
        "template_version": "v3",
    }
    captured_log = {}

    monkeypatch.setattr(briefing, "build_daily_briefing_data", lambda _session: sample_payload)
    monkeypatch.setattr(briefing, "get_dashboard_url", lambda: "https://example.com/dashboard")
    monkeypatch.setattr(briefing, "render_briefing_html", lambda *args, **kwargs: "<html></html>")
    monkeypatch.setattr(briefing, "get_recipients", lambda mode="production": ["tester@example.com"])
    monkeypatch.setattr(briefing, "send_briefing_email", lambda *args, **kwargs: (True, ""))

    import routers.briefing as briefing_router

    monkeypatch.setattr(
        briefing_router.db,
        "create_briefing_log",
        lambda _session, **kwargs: captured_log.update(kwargs),
    )

    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.post("/api/briefing/send-now?type=daily&mode=test")
            assert response.status_code == 200
            body = response.json()
            assert body["delivery_mode"] == "test"
            assert body["warning_count"] == 1
            assert body["ai_summary_status"] == "rule"
            assert body["period_label"] == "2026-03-20"
            assert body["source_event_count"] == 5
            assert body["source_product_count"] == 2
            assert body["warning_json"] == sample_payload["quality_warnings"]

    asyncio.run(_run())

    assert captured_log["delivery_mode"] == "test"
    assert captured_log["warning_count"] == 1
    assert captured_log["ai_summary_status"] == "rule"
    assert captured_log["period_label"] == "2026-03-20"
    assert captured_log["source_event_count"] == 5
    assert captured_log["source_product_count"] == 2
    assert captured_log["template_version"] == "v3"
    assert captured_log["warning_json"] == sample_payload["quality_warnings"]


def test_send_now_briefing_route_uses_test_recipients_for_test_mode(monkeypatch):
    sample_payload = {
        "report_type": "daily",
        "generated_at": "2026-03-20T09:00:00",
        "period_label": "2026-03-20",
        "date_label": "2026-03-20",
        "week_label": "",
        "warning_count": 0,
        "quality_warnings": [],
        "ai_summary_status": "rule",
        "source_event_count": 5,
        "source_product_count": 2,
        "notable_count": 3,
        "ending_soon_count": 1,
        "template_version": "v3",
    }
    captured = {}

    monkeypatch.setenv("EMAIL_RECIPIENTS", "production@example.com")
    monkeypatch.setenv("EMAIL_TEST_RECIPIENTS", "test-a@example.com,test-b@example.com")
    monkeypatch.setattr(briefing, "build_daily_briefing_data", lambda _session: sample_payload)
    monkeypatch.setattr(briefing, "get_dashboard_url", lambda: "https://example.com/dashboard")
    monkeypatch.setattr(briefing, "render_briefing_html", lambda *args, **kwargs: "<html></html>")

    def _capture_send(_html, _subject, recipients):
        captured["recipients"] = list(recipients)
        return True, ""

    monkeypatch.setattr(briefing, "send_briefing_email", _capture_send)

    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.post("/api/briefing/send-now?type=daily&mode=test")
            assert response.status_code == 200
            body = response.json()
            assert body["delivery_mode"] == "test"
            assert body["recipients"] == ["test-a@example.com", "test-b@example.com"]

    asyncio.run(_run())

    assert captured["recipients"] == ["test-a@example.com", "test-b@example.com"]
    assert "production@example.com" not in captured["recipients"]


def test_send_now_briefing_route_blocks_production_when_readiness_is_blocked(monkeypatch):
    sample_payload = {
        "report_type": "daily",
        "generated_at": "2026-03-20T09:00:00",
        "period_label": "2026-03-20",
        "date_label": "2026-03-20",
        "week_label": "",
        "warning_count": 1,
        "quality_warnings": [{"code": "company_coverage_low", "severity": "high"}],
        "ai_summary_status": "rule",
        "source_event_count": 5,
        "source_product_count": 2,
        "notable_count": 3,
        "ending_soon_count": 1,
        "template_version": "v3",
    }
    called = {"send": False, "log": False}

    monkeypatch.setattr(briefing, "build_daily_briefing_data", lambda _session: sample_payload)
    monkeypatch.setattr(briefing, "get_dashboard_url", lambda: "https://example.com/dashboard")
    monkeypatch.setattr(briefing, "render_briefing_html", lambda *args, **kwargs: "<html></html>")
    monkeypatch.setattr(
        briefing,
        "send_briefing_email",
        lambda *args, **kwargs: called.__setitem__("send", True) or (True, ""),
    )

    import routers.briefing as briefing_router

    monkeypatch.setattr(
        briefing_router.db,
        "create_briefing_log",
        lambda *args, **kwargs: called.__setitem__("log", True),
    )

    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.post("/api/briefing/send-now?type=daily&mode=production")
            assert response.status_code == 409
            body = response.json()
            assert body["detail"] == "briefing readiness is blocked"
            assert body["readiness_status"] == "blocked"

    asyncio.run(_run())

    assert called["send"] is False
    assert called["log"] is False


def test_send_daily_briefing_job_skips_blocked_readiness(monkeypatch):
    sample_payload = {
        "report_type": "daily",
        "generated_at": "2026-03-20T09:00:00",
        "period_label": "2026-03-20",
        "date_label": "2026-03-20",
        "warning_count": 1,
        "quality_warnings": [{"code": "company_coverage_low", "severity": "high"}],
        "new_events_count": 0,
        "notable_count": 0,
    }
    called = {"render": False, "recipients": False, "send": False, "log": False, "closed": False}

    class _FakeJobSession:
        def close(self):
            called["closed"] = True

    monkeypatch.setattr(briefing.db, "SessionLocal", lambda: _FakeJobSession())
    monkeypatch.setattr(briefing, "build_daily_briefing_data", lambda _session: sample_payload)
    monkeypatch.setattr(briefing, "get_dashboard_url", lambda: "https://example.com/dashboard")
    monkeypatch.setattr(
        briefing,
        "render_briefing_html",
        lambda *args, **kwargs: called.__setitem__("render", True) or "<html></html>",
    )
    monkeypatch.setattr(
        briefing,
        "get_recipients",
        lambda mode="production": called.__setitem__("recipients", True) or ["ops@example.com"],
    )
    monkeypatch.setattr(
        briefing,
        "send_briefing_email",
        lambda *args, **kwargs: called.__setitem__("send", True) or (True, ""),
    )
    monkeypatch.setattr(
        briefing.db,
        "create_briefing_log",
        lambda *args, **kwargs: called.__setitem__("log", True),
    )

    asyncio.run(briefing.send_daily_briefing_job())

    assert called["render"] is False
    assert called["recipients"] is False
    assert called["send"] is False
    assert called["log"] is False
    assert called["closed"] is True


def test_send_weekly_briefing_job_skips_blocked_readiness(monkeypatch):
    sample_payload = {
        "report_type": "weekly",
        "generated_at": "2026-03-20T09:00:00",
        "period_label": "03/13 ~ 03/20",
        "week_label": "03/13 ~ 03/20",
        "warning_count": 1,
        "quality_warnings": [{"code": "company_coverage_low", "severity": "high"}],
        "new_events_count": 0,
        "notable_count": 0,
    }
    called = {"render": False, "recipients": False, "send": False, "log": False, "closed": False}

    class _FakeJobSession:
        def close(self):
            called["closed"] = True

    monkeypatch.setattr(briefing.db, "SessionLocal", lambda: _FakeJobSession())
    monkeypatch.setattr(briefing, "build_weekly_briefing_data", lambda _session: sample_payload)
    monkeypatch.setattr(briefing, "get_dashboard_url", lambda: "https://example.com/dashboard")
    monkeypatch.setattr(
        briefing,
        "render_briefing_html",
        lambda *args, **kwargs: called.__setitem__("render", True) or "<html></html>",
    )
    monkeypatch.setattr(
        briefing,
        "get_recipients",
        lambda mode="production": called.__setitem__("recipients", True) or ["ops@example.com"],
    )
    monkeypatch.setattr(
        briefing,
        "send_briefing_email",
        lambda *args, **kwargs: called.__setitem__("send", True) or (True, ""),
    )
    monkeypatch.setattr(
        briefing.db,
        "create_briefing_log",
        lambda *args, **kwargs: called.__setitem__("log", True),
    )

    asyncio.run(briefing.send_weekly_briefing_job())

    assert called["render"] is False
    assert called["recipients"] is False
    assert called["send"] is False
    assert called["log"] is False
    assert called["closed"] is True


def test_briefing_logs_route_exposes_richer_metadata(monkeypatch):
    import routers.briefing as briefing_router

    rows = [
        SimpleNamespace(
            id=7,
            briefing_type="weekly",
            sent_at=datetime(2026, 3, 20, 9, 15, 0),
            recipient_count=3,
            new_events_count=2,
            high_threat_count=1,
            ending_soon_count=4,
            period_label="03/13 ~ 03/20",
            source_event_count=18,
            source_product_count=6,
            warning_count=2,
            warning_json=json.dumps(
                [{"code": "company_coverage_low", "severity": "high"}],
                ensure_ascii=False,
            ),
            ai_summary_status="rule",
            delivery_mode="production",
            template_version="v3",
            status="sent",
            error_msg=None,
        )
    ]

    monkeypatch.setattr(briefing_router.db, "get_briefing_logs", lambda _session, limit=20: rows)

    async def _run():
        transport = httpx.ASGITransport(app=app.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/api/briefing/logs?limit=1")
            assert response.status_code == 200
            body = response.json()
            assert body[0]["period_label"] == "03/13 ~ 03/20"
            assert body[0]["source_event_count"] == 18
            assert body[0]["source_product_count"] == 6
            assert body[0]["warning_count"] == 2
            assert body[0]["ai_summary_status"] == "rule"
            assert body[0]["delivery_mode"] == "production"
            assert body[0]["template_version"] == "v3"
            assert body[0]["warning_json"][0]["code"] == "company_coverage_low"

    asyncio.run(_run())


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


def test_render_weekly_briefing_uses_company_narratives_and_product_summary_contract():
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


def test_preview_routes_render_briefings_without_breaking(monkeypatch):
    monkeypatch.setattr(briefing, "_build_quality_warnings", lambda *args, **kwargs: [
        {"code": "company_coverage_low", "severity": "high"},
        {"code": "insufficient_evidence_events", "severity": "high"},
    ])

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
                assert "Warnings:" not in response.text
                assert "company_coverage_low" not in response.text
                assert "insufficient_evidence_events" not in response.text

    asyncio.run(_run())


def test_weekly_payload_ended_events_still_feed_evidence_events(monkeypatch):
    monkeypatch.setattr(briefing, "EXPECTED_COMPANIES", ("Alpha Card",), raising=False)
    session = _FakeSession(
        [
            _make_event(
                16,
                company="Alpha Card",
                created_at=datetime.now() - timedelta(days=10),
                period_end=date.today() - timedelta(days=1),
                status="ended",
                one_line_summary="Ended-week offer summary.",
                evidence=["Ended-week evidence"],
            )
        ]
    )

    payload = briefing.build_weekly_briefing_data(session)

    assert payload["evidence_events"]
    assert payload["evidence_events"][0]["title"] == "Alpha Card Travel Event 16"
    assert "Ended-week evidence" in payload["evidence_events"][0]["evidence"]


def _weekly_render_payload_contract() -> dict:
    return {
        "generated_at": "2026-03-20T09:00:00",
        "period_label": "03/13 ~ 03/20",
        "week_label": "03/13 ~ 03/20",
        "executive_summary": "이번 주는 여행과 생활형 혜택이 동시에 확대되었습니다.",
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
                        "match_method": "name",
                        "confidence": 0.88,
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
                        "match_method": "alias",
                        "confidence": 0.71,
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
                "company": "Alpha Card",
                "product_name": "Alpha Sky",
                "event_count": 2,
                "match_method": "name",
                "confidence": 0.88,
            },
            {
                "company": "Beta Card",
                "product_name": "Beta Live",
                "event_count": 1,
                "match_method": "alias",
                "confidence": 0.71,
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
                "match_method": "name",
                "confidence": 0.88,
            },
            {
                "company": "Beta Card",
                "product_name": "Beta Live",
                "match_method": "alias",
                "confidence": 0.71,
            },
        ],
        "new_events_count": 3,
        "ending_soon_count": 1,
        "ended_events_count": 1,
    }


def test_render_weekly_briefing_uses_company_narratives_and_product_summary_contract():
    html = briefing.render_briefing_html(
        _sample_briefing_payload(report_type="weekly"),
        report_type="weekly",
        dashboard_url="https://example.com/dashboard",
    )

    assert "주간 경쟁 인텔리전스 브리핑" in html
    assert "주간 핵심 요약" in html
    assert "회사별 주간 서술" in html
    assert "제품/공시 요약" in html
    assert "근거 블록" in html
    assert "테마 변화" not in html
    assert "class=\"pill\"" not in html
    assert "class=\"metric\"" not in html
    assert "dashboard" not in html.lower()
    assert "companies" not in html
    assert "example_event" not in html
    assert "link_text" not in html
    assert "benefit_summary" not in html
    assert "warning" not in html.lower()
    assert "delivery_mode" not in html
    assert "template_version" not in html


def test_render_weekly_briefing_uses_company_narratives_and_product_summary():
    html = briefing.render_briefing_html(
        _weekly_render_payload_contract(),
        report_type="weekly",
        dashboard_url="https://example.com/dashboard",
    )

    assert "주간 경쟁 인텔리전스 브리핑" in html
    assert "주간 핵심 요약" in html
    assert "회사별 주간 서술" in html
    assert "테마 변화" in html
    assert "제품/공시 요약" in html
    assert "근거 블록" in html
    assert "Alpha Card · Alpha Sky" in html
    assert "Beta Card · Beta Live" in html
    assert "연결 방식 name" in html
    assert "신뢰도 88%" in html
    assert "신뢰도 71%" in html
    assert "class=\"pill\"" not in html
    assert "class=\"metric\"" not in html
    assert "대시보드에서 전체 보기" not in html
    assert "companies" not in html
    assert "example_event" not in html
    assert "link_text" not in html
    assert "benefit_summary" not in html
    assert "warning" not in html.lower()
    assert "delivery_mode" not in html
    assert "template_version" not in html


def test_render_weekly_briefing_handles_products_without_confidence():
    payload = _weekly_render_payload_contract()
    payload["product_summary"][0].pop("confidence", None)
    payload["evidence_products"][0].pop("confidence", None)

    html = briefing.render_briefing_html(
        payload,
        report_type="weekly",
        dashboard_url="https://example.com/dashboard",
    )

    assert "Alpha Card · Alpha Sky" in html
    assert "Beta Card · Beta Live" in html
    assert "신뢰도" in html
    assert "연결 방식 name" in html
    assert "연결 방식 alias" in html
    assert "Traceback" not in html
    assert "confidence" not in html


def test_weekly_builder_render_supports_linked_cards_without_confidence(monkeypatch):
    monkeypatch.setattr(briefing, "EXPECTED_COMPANIES", ("Alpha Card",), raising=False)
    session = _FakeSession(
        [
            _make_event(
                17,
                company="Alpha Card",
                created_at=datetime.now() - timedelta(days=2),
                linked_cards=["Alpha Sky"],
                one_line_summary="Weekly linked-card offer.",
                evidence=["Linked-card evidence"],
            ),
            _make_event(
                18,
                company="Alpha Card",
                created_at=datetime.now() - timedelta(days=11),
                period_end=date.today() - timedelta(days=1),
                status="ended",
                linked_cards=["Alpha Sky"],
                one_line_summary="Ended linked-card offer.",
                evidence=["Ended linked-card evidence"],
            ),
        ]
    )

    payload = briefing.build_weekly_briefing_data(session)
    html = briefing.render_briefing_html(
        payload,
        report_type="weekly",
        dashboard_url="https://example.com/dashboard",
    )

    assert payload["product_summary"]
    assert all("confidence" not in item or item["confidence"] is None for item in payload["product_summary"])
    assert "Alpha Card · Alpha Sky" in html
    assert "주간 핵심 요약" in html
    assert "Traceback" not in html


def _weekly_render_payload_contract() -> dict:
    return {
        "generated_at": "2026-03-20T09:00:00",
        "period_label": "03/13 ~ 03/20",
        "week_label": "03/13 ~ 03/20",
        "executive_summary": "Weekly briefing focused on issuer-by-issuer movement and product disclosures.",
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
                        "one_line_summary": "Airport lounge and miles stayed visible.",
                        "evidence": ["Airport lounge", "Instant discount"],
                        "period_start": "2026-03-18",
                        "period_end": "2026-03-25",
                    }
                ],
                "evidence_products": [
                    {
                        "company": "Alpha Card",
                        "product_name": "Alpha Sky",
                        "match_method": "name",
                        "confidence": 0.88,
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
                        "one_line_summary": "Lifestyle retention stayed concentrated.",
                        "evidence": ["Streaming", "Weekend usage"],
                        "period_start": "2026-03-16",
                        "period_end": "2026-03-24",
                    }
                ],
                "evidence_products": [
                    {
                        "company": "Beta Card",
                        "product_name": "Beta Live",
                        "match_method": "alias",
                        "confidence": 0.71,
                    }
                ],
            },
        ],
        "company_weekly_narratives": [
            {
                "company": "Alpha Card",
                "narrative": "Alpha Card kept travel bundles centered on Alpha Sky this week.",
                "source": "gemini",
                "new_events_count": 2,
                "ended_events_count": 0,
                "ending_soon_count": 1,
                "top_categories": ["Travel", "Dining"],
            },
            {
                "company": "Beta Card",
                "narrative": "Beta Card concentrated lifestyle retention around Beta Live.",
                "source": "rule",
                "new_events_count": 1,
                "ended_events_count": 1,
                "ending_soon_count": 0,
                "top_categories": ["Lifestyle"],
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
                "company": "Alpha Card",
                "product_name": "Alpha Sky",
                "event_count": 2,
                "match_method": "name",
                "confidence": 0.88,
            },
            {
                "company": "Beta Card",
                "product_name": "Beta Live",
                "event_count": 1,
                "match_method": "alias",
                "confidence": 0.71,
            },
        ],
        "weekly_product_catalog_summary": [
            {
                "company": "Alpha Card",
                "product_name": "Alpha Sky",
                "event_count": 2,
                "match_method": "name",
                "confidence": 0.88,
                "annual_fee_display": "KRW 20k",
                "spend_requirement": "Monthly spend KRW 300k",
                "benefit_highlights": ["Airport lounge", "Miles"],
                "summary_text": "Travel-focused rewards card.",
                "preview": "Airport lounge and miles",
                "product_url": "https://example.com/alpha-sky",
                "pdf_url": "https://example.com/alpha-sky.pdf",
                "launch_date": "2026-03-18",
                "revision_type": "launch",
            },
            {
                "company": "Beta Card",
                "product_name": "Beta Live",
                "event_count": 1,
                "match_method": "alias",
                "confidence": 0.71,
                "annual_fee_display": "KRW 12k",
                "spend_requirement": "Monthly spend KRW 200k",
                "benefit_highlights": ["Streaming", "Coffee"],
                "summary_text": "Lifestyle retention card.",
                "preview": "Streaming and coffee",
                "product_url": "https://example.com/beta-live",
                "pdf_url": "",
                "launch_date": "2026-03-16",
                "revision_type": "refresh",
            },
        ],
        "weekly_product_changes": [
            {
                "company": "Alpha Card",
                "product_name": "Alpha Sky",
                "event_count": 2,
                "revision_type": "launch",
                "launch_date": "2026-03-18",
                "product_url": "https://example.com/alpha-sky",
            },
            {
                "company": "Beta Card",
                "product_name": "Beta Live",
                "event_count": 1,
                "revision_type": "refresh",
                "launch_date": "2026-03-16",
                "product_url": "https://example.com/beta-live",
            },
        ],
        "evidence_events": [
            {
                "company": "Alpha Card",
                "title": "Alpha Card Travel Event",
                "category": "Travel",
                "one_line_summary": "Airport lounge and miles stayed visible.",
                "evidence": ["Airport lounge", "Instant discount"],
                "period_start": "2026-03-18",
                "period_end": "2026-03-25",
            },
            {
                "company": "Beta Card",
                "title": "Beta Card Lifestyle Event",
                "category": "Lifestyle",
                "one_line_summary": "Lifestyle retention stayed concentrated.",
                "evidence": ["Streaming", "Weekend usage"],
                "period_start": "2026-03-16",
                "period_end": "2026-03-24",
            },
        ],
        "evidence_products": [
            {
                "company": "Alpha Card",
                "product_name": "Alpha Sky",
                "match_method": "name",
                "confidence": 0.88,
            },
            {
                "company": "Beta Card",
                "product_name": "Beta Live",
                "match_method": "alias",
                "confidence": 0.71,
            },
        ],
        "new_events_count": 3,
        "ending_soon_count": 1,
        "ended_events_count": 1,
    }


def test_render_weekly_briefing_uses_company_narratives_and_product_summary():
    html = briefing.render_briefing_html(
        _weekly_render_payload_contract(),
        report_type="weekly",
        dashboard_url="https://example.com/dashboard",
    )

    assert "Weekly briefing focused on issuer-by-issuer movement and product disclosures." in html
    assert "Alpha Card kept travel bundles centered on Alpha Sky this week." in html
    assert "Beta Card concentrated lifestyle retention around Beta Live." in html
    assert "Alpha Card 쨌 Alpha Sky" in html
    assert "Beta Card 쨌 Beta Live" in html
    assert "KRW 20k" in html
    assert "Monthly spend KRW 300k" in html
    assert "Airport lounge" in html
    assert "Miles" in html
    assert "https://example.com/alpha-sky" in html
    assert "launch" in html
    assert "refresh" in html
    assert "class=\"pill\"" not in html
    assert "class=\"metric\"" not in html
    assert "companies" not in html
    assert "example_event" not in html
    assert "link_text" not in html
    assert "benefit_summary" not in html
    assert "warning" not in html.lower()
    assert "delivery_mode" not in html
    assert "template_version" not in html


def test_render_weekly_briefing_handles_products_without_confidence():
    payload = _weekly_render_payload_contract()
    payload["product_summary"][0].pop("confidence", None)
    payload["weekly_product_catalog_summary"][0].pop("confidence", None)
    payload["evidence_products"][0].pop("confidence", None)

    html = briefing.render_briefing_html(
        payload,
        report_type="weekly",
        dashboard_url="https://example.com/dashboard",
    )

    assert "Alpha Card 쨌 Alpha Sky" in html
    assert "Beta Card 쨌 Beta Live" in html
    assert "KRW 20k" in html
    assert "Monthly spend KRW 300k" in html
    assert "https://example.com/alpha-sky" in html
    assert "Traceback" not in html
    assert "confidence" not in html


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                params = list(inspect.signature(fn).parameters.values())
                if not params:
                    fn()
                elif len(params) == 1 and params[0].name == "monkeypatch":
                    class _DirectMonkeyPatch:
                        def __init__(self):
                            self._changes = []

                        def setattr(self, target, name, value=None, raising=True):
                            if isinstance(target, str):
                                module_name, attr_name = target.rsplit(".", 1)
                                target_obj = importlib.import_module(module_name)
                                attr_name = name
                                new_value = value
                            else:
                                target_obj = target
                                attr_name = name
                                new_value = value

                            if not hasattr(target_obj, attr_name):
                                if raising:
                                    raise AttributeError(f"{target_obj!r} has no attribute {attr_name!r}")
                                original = None
                                existed = False
                            else:
                                original = getattr(target_obj, attr_name)
                                existed = True

                            self._changes.append((target_obj, attr_name, existed, original))
                            setattr(target_obj, attr_name, new_value)

                        def undo(self):
                            while self._changes:
                                target_obj, attr_name, existed, original = self._changes.pop()
                                if existed:
                                    setattr(target_obj, attr_name, original)
                                else:
                                    delattr(target_obj, attr_name)

                    monkeypatch = _DirectMonkeyPatch()
                    try:
                        fn(monkeypatch)
                    finally:
                        monkeypatch.undo()
                else:
                    raise TypeError(
                        f"Unsupported direct-run fixtures for {name}: "
                        f"{', '.join(param.name for param in params)}"
                    )
                print(f"  PASS {name}")
            except AssertionError as exc:
                print(f"  FAIL {name}: {exc}")
                raise
    print("Done.")
