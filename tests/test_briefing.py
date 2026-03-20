import importlib
import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


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
            assert persisted.delivery_mode == "digest"
            assert persisted.warning_count == 2
        finally:
            session.close()
            database.engine.dispose()
