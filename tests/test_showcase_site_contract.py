from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


def test_showcase_entry_removes_platform_intro_secondary_button():
    html = (ROOT / "showcase-site" / "index.html").read_text(encoding="utf-8")

    assert "플랫폼 소개" not in html
    assert 'btn btn--ghost' not in html


def test_showcase_metrics_uses_mobile_safe_behavior():
    script = (ROOT / "showcase-site" / "assets" / "entry-page" / "script.js").read_text(encoding="utf-8")
    start = script.index("function initMetrics()")
    end = script.index("/* ── Process section", start)
    block = script[start:end]

    assert "if (!isDesktop())" in block
    assert "animateCountup(big)" in block
    assert "pin: \".metrics__wrap\"" in block


def test_showcase_architecture_links_history_page():
    html = (ROOT / "showcase-site" / "architecture" / "index.html").read_text(encoding="utf-8")

    assert "작업 히스토리 보기" in html
    assert "Project History" in html
    assert 'href="/history/"' in html
