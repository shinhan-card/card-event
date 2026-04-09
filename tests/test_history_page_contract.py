from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


def test_history_page_exposes_meta_and_evidence_sections():
    html = (ROOT / "showcase-site" / "history" / "index.html").read_text(encoding="utf-8")

    assert "이 페이지 기준 정보" in html
    assert "참고한 자료" in html
    assert 'id="meta-panel"' in html


def test_history_page_uses_friendly_korean_labels():
    html = (ROOT / "showcase-site" / "history" / "index.html").read_text(encoding="utf-8")

    assert "이력 보는 법" in html
    assert "커밋/문서 확인" in html
    assert "파일 기준 추정" in html
    assert "reconstructed" not in html
    assert "direct" not in html


def test_history_page_title_aligns_with_main_project_name():
    html = (ROOT / "showcase-site" / "history" / "index.html").read_text(encoding="utf-8")

    assert "<title>페이먼트그룹 시장 모니터링 인텔리전스 — 작업 히스토리</title>" in html
    assert "페이먼트그룹 시장 모니터링 인텔리전스 작업 히스토리" in html
