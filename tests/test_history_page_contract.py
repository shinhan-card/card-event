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
    assert "근거 충분" in html
    assert "추가 확인 필요" in html
    assert "reconstructed" not in html
    assert "direct" not in html
