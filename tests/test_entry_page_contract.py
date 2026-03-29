"""Contract tests for the cinematic entry page."""

import asyncio
import sys
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import app


async def _fetch_entry_soup():
    transport = httpx.ASGITransport(app=app.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/entry")
        assert response.status_code == 200
        return BeautifulSoup(response.text, "html.parser")


def test_entry_page_exposes_cinematic_sections():
    soup = asyncio.run(_fetch_entry_soup())

    expected_sections = [
        "hero",
        "signal",
        "intelligence",
        "metrics",
        "process",
        "proof",
        "cta",
    ]

    for section_id in expected_sections:
        section = soup.select_one(f"#{section_id}")
        assert section is not None, f"missing section: {section_id}"
        assert section.get("data-section"), f"missing data-section hook on {section_id}"


def test_entry_page_hero_has_primary_cta_linking_to_dashboard():
    soup = asyncio.run(_fetch_entry_soup())

    hero = soup.select_one("#hero")
    assert hero is not None

    primary_btn = hero.select_one(".btn--primary")
    assert primary_btn is not None
    assert primary_btn.get("href") == "/"


def test_entry_page_intelligence_cards_cover_four_axes():
    soup = asyncio.run(_fetch_entry_soup())

    cards = soup.select(".intel__card")
    assert len(cards) == 4, "intelligence section should have exactly 4 cards"


def test_entry_page_process_has_five_steps():
    soup = asyncio.run(_fetch_entry_soup())

    steps = soup.select(".process__card")
    assert len(steps) == 5, "process section should have exactly 5 step cards"


def test_entry_page_has_countup_elements():
    soup = asyncio.run(_fetch_entry_soup())

    countups = soup.select("[data-countup]")
    assert len(countups) >= 5, "page should have multiple countup elements"


def test_entry_page_loads_gsap_and_scrolltrigger():
    soup = asyncio.run(_fetch_entry_soup())

    scripts = [s.get("src", "") for s in soup.select("script[src]")]
    assert any("gsap" in s for s in scripts), "GSAP CDN script missing"
    assert any("ScrollTrigger" in s for s in scripts), "ScrollTrigger CDN script missing"


def test_entry_page_script_includes_reduced_motion_guard():
    script_text = (ROOT / "entry-page" / "script.js").read_text(encoding="utf-8")

    assert "prefers-reduced-motion" in script_text
    assert "IntersectionObserver" in script_text
    assert "mousemove" in script_text


def test_entry_page_references_vertical_ai_platform():
    soup = asyncio.run(_fetch_entry_soup())
    text = soup.get_text()
    assert "VERTICAL AI PLATFORM" in text


def test_entry_page_css_and_js_assets_linked():
    soup = asyncio.run(_fetch_entry_soup())

    links = [l.get("href", "") for l in soup.select("link[rel='stylesheet']")]
    assert any("/entry-page/style.css" in l for l in links)

    scripts = [s.get("src", "") for s in soup.select("script[src]")]
    assert any("/entry-page/script.js" in s for s in scripts)
