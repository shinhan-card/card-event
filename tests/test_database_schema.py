"""단위 테스트: init_db가 신규 컬럼을 자동 추가하는지 검증"""

import importlib
import os
import sqlite3
import sys
import tempfile
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


@pytest.fixture(autouse=True)
def _restore_database_import_state():
    original_database_url = os.environ.get("DATABASE_URL")
    original_database_module = sys.modules.get("database")
    try:
        yield
    finally:
        if original_database_url is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = original_database_url

        if original_database_module is None:
            sys.modules.pop("database", None)
        else:
            sys.modules["database"] = original_database_module


def test_init_db_adds_new_event_columns():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "schema_test.db"
        os.environ["DATABASE_URL"] = f"sqlite:///{db_path.as_posix()}"
        if "database" in sys.modules:
            del sys.modules["database"]
        database = importlib.import_module("database")
        database.init_db()

        inspector = importlib.import_module("sqlalchemy").inspect(database.engine)
        columns = {column["name"] for column in inspector.get_columns("events")}
        tables = set(inspector.get_table_names())

        for expected in (
            "detail_quality_score",
            "needs_review",
            "review_reason",
            "classification_confidence",
            "classification_source",
            "classification_reason_json",
            "condition_flags_json",
            "is_curated",
            "linked_cards",
        ):
            assert expected in columns
        assert "briefing_logs" in tables
        assert "event_product_links" in tables
        assert "event_condition_facts" in tables
        database.engine.dispose()


def _create_legacy_briefing_logs_table(db_path: Path):
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            CREATE TABLE briefing_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                briefing_type VARCHAR NOT NULL,
                recipient_count INTEGER DEFAULT 0,
                new_events_count INTEGER DEFAULT 0,
                high_threat_count INTEGER DEFAULT 0,
                ending_soon_count INTEGER DEFAULT 0,
                status VARCHAR DEFAULT 'sent',
                error_msg TEXT,
                sent_at DATETIME
            )
            """
        )
        conn.commit()


def test_init_db_adds_briefing_log_columns():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "schema_test.db"
        _create_legacy_briefing_logs_table(db_path)
        os.environ["DATABASE_URL"] = f"sqlite:///{db_path.as_posix()}"
        if "database" in sys.modules:
            del sys.modules["database"]
        database = importlib.import_module("database")
        try:
            database.init_db()

            inspector = importlib.import_module("sqlalchemy").inspect(database.engine)
            columns = {column["name"] for column in inspector.get_columns("briefing_logs")}

            for expected in (
                "period_label",
                "source_event_count",
                "source_product_count",
                "warning_count",
                "warning_json",
                "ai_summary_status",
                "delivery_mode",
                "template_version",
            ):
                assert expected in columns
        finally:
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
