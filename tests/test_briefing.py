import json
import importlib
import os
import sys
import tempfile
from datetime import date, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace

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
