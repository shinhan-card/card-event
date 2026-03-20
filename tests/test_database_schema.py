"""단위 테스트: init_db가 신규 컬럼을 자동 추가하는지 검증"""

import importlib
import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


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


def test_init_db_adds_briefing_log_columns():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "schema_test.db"
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
