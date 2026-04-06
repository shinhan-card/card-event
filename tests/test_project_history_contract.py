import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
HISTORY_JSON = ROOT / "showcase-site" / "data" / "project-history.json"
REBUILD_SCRIPT = ROOT / "scripts" / "rebuild_project_history.py"


def _load_history(path: Path = HISTORY_JSON) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def test_project_history_json_has_expected_structure_and_seed_groups():
    data = _load_history()
    raw_text = HISTORY_JSON.read_text(encoding="utf-8")

    assert {"meta", "workstreams", "versions", "items", "relationships"}.issubset(data)
    workstream_ids = {workstream["id"] for workstream in data["workstreams"]}
    assert {"architecture-docs", "entry-showcase", "dashboard-ops", "deployment-sharing"}.issubset(
        workstream_ids
    )

    version_labels = [version["label"] for version in data["versions"]]
    assert any("아키텍처 문서 콘솔" in label for label in version_labels)
    assert any("엔트리" in label for label in version_labels)
    assert any("쇼케이스 분리" in label for label in version_labels)

    micro_items = [item for item in data["items"] if item["granularity"] == "micro"]
    assert micro_items
    assert any(item["evidence"] for item in micro_items)
    assert all(item["confidence"] in {"high", "medium", "low"} for item in micro_items)
    micro_titles = {item["title"] for item in micro_items}
    assert "전체 이벤트 KPI 천 단위 콤마 포맷 적용" in micro_titles
    assert "주간 변화 카드사별 5개 + 더보기 구조 적용" in micro_titles
    assert any(version.get("branches") for version in data["versions"])
    assert any(relationship["type"] == "derived-copy" for relationship in data["relationships"])
    assert "복원한 이력입니다" not in raw_text
    assert "Git commit subject" not in raw_text
    assert "OMX turn log" not in raw_text


def test_rebuild_project_history_script_recreates_expected_groups(tmp_path):
    output_path = tmp_path / "project-history.json"
    result = subprocess.run(
        [sys.executable, str(REBUILD_SCRIPT), "--output", str(output_path)],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )

    assert result.returncode == 0, result.stderr or result.stdout
    data = _load_history(output_path)

    assert data["meta"]["local_source_of_truth"] == "showcase-site/architecture/index.html"
    assert any(version["workstream"] == "architecture-docs" for version in data["versions"])
    assert any(version["workstream"] == "entry-showcase" for version in data["versions"])
    assert any(version["workstream"] == "deployment-sharing" for version in data["versions"])
    assert any(item["granularity"] == "micro" and item["kind"] in {"ui-polish", "copy", "bugfix"} for item in data["items"])
    assert any(version.get("branches") for version in data["versions"])
