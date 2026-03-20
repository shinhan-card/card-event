"""Unit tests for canonical event-product link matching."""

import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import modules.product_links as product_links


def _write_catalog_files(base_dir: Path):
    manifest_path = base_dir / "manifest.json"
    disclosures_path = base_dir / "product_disclosures.json"

    manifest_path.write_text(
        json.dumps(
            {
                "products": {
                    "\uc2e0\ud55c\uce74\ub4dc::\uc2e0\ud55c\uce74\ub4dc Simple Plan": {
                        "company": "\uc2e0\ud55c\uce74\ub4dc",
                        "card_name": "\uc2e0\ud55c\uce74\ub4dc Simple Plan",
                        "annual_fee_display": "\uad6d\ub0b4 1\ub9cc\uc6d0",
                        "spend_requirement": "\uc804\uc6d4 30\ub9cc\uc6d0 \uc774\uc0c1",
                        "benefit_highlights": ["\uad6d\ub0b4 1% \ud560\uc778"],
                    },
                    "KB\uad6d\ubbfc\uce74\ub4dc::KB All \uce74\ub4dc": {
                        "company": "KB\uad6d\ubbfc\uce74\ub4dc",
                        "card_name": "KB All \uce74\ub4dc",
                        "annual_fee_display": "\uad6d\ub0b4 2\ub9cc\uc6d0",
                        "benefit_highlights": ["\uc0dd\ud65c 5% \ud560\uc778"],
                    },
                }
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    disclosures_path.write_text(
        json.dumps(
            {
                "products": {
                    "\uc2e0\ud55c\uce74\ub4dc::\uc2e0\ud55c\uce74\ub4dc Simple Plan": {
                        "company": "\uc2e0\ud55c\uce74\ub4dc",
                        "card_name": "\uc2e0\ud55c\uce74\ub4dc Simple Plan",
                        "launch_date": "2026.02.11",
                        "revision_type": "\uc2e0\uaddc\ucd9c\uc2dc",
                        "status": "active",
                    }
                }
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    return manifest_path, disclosures_path


def test_match_linked_cards_resolves_canonical_products():
    with tempfile.TemporaryDirectory() as tmpdir:
        manifest_path, disclosures_path = _write_catalog_files(Path(tmpdir))
        original_manifest = product_links._MANIFEST_PATH
        original_disclosures = product_links._DISCLOSURES_PATH
        original_cache = dict(product_links._CATALOG_CACHE)
        product_links._MANIFEST_PATH = manifest_path
        product_links._DISCLOSURES_PATH = disclosures_path
        product_links._CATALOG_CACHE = {"stamp": None, "catalog": {}}
        try:
            links = product_links.match_linked_cards(
                ["Simple Plan", "\uc2e0\ud55c\uce74\ub4dc \uc601\uc5c5\uc815\ucc45", "KB All\uce74\ub4dc"],
                company="\uc2e0\ud55c\uce74\ub4dc",
            )
        finally:
            product_links._MANIFEST_PATH = original_manifest
            product_links._DISCLOSURES_PATH = original_disclosures
            product_links._CATALOG_CACHE = original_cache

        assert len(links) == 1
        assert links[0]["product_key"] == "\uc2e0\ud55c\uce74\ub4dc::\uc2e0\ud55c\uce74\ub4dc Simple Plan"
        assert links[0]["matched_text"] == "Simple Plan"
        assert links[0]["confidence"] >= 0.84


def test_build_product_link_payloads_merges_catalog_fields():
    with tempfile.TemporaryDirectory() as tmpdir:
        manifest_path, disclosures_path = _write_catalog_files(Path(tmpdir))
        original_manifest = product_links._MANIFEST_PATH
        original_disclosures = product_links._DISCLOSURES_PATH
        original_cache = dict(product_links._CATALOG_CACHE)
        product_links._MANIFEST_PATH = manifest_path
        product_links._DISCLOSURES_PATH = disclosures_path
        product_links._CATALOG_CACHE = {"stamp": None, "catalog": {}}
        try:
            rows = [
                type(
                    "LinkRow",
                    (),
                    {
                        "product_key": "\uc2e0\ud55c\uce74\ub4dc::\uc2e0\ud55c\uce74\ub4dc Simple Plan",
                        "company": "\uc2e0\ud55c\uce74\ub4dc",
                        "card_name": "\uc2e0\ud55c\uce74\ub4dc Simple Plan",
                        "matched_text": "Simple Plan",
                        "match_method": "contains",
                        "confidence": 0.91,
                    },
                )()
            ]
            items = product_links.build_product_link_payloads(rows)
        finally:
            product_links._MANIFEST_PATH = original_manifest
            product_links._DISCLOSURES_PATH = original_disclosures
            product_links._CATALOG_CACHE = original_cache

        assert items[0]["annual_fee_display"] == "\uad6d\ub0b4 1\ub9cc\uc6d0"
        assert items[0]["launch_date"] == "2026.02.11"
        assert items[0]["revision_type"] == "\uc2e0\uaddc\ucd9c\uc2dc"
        assert items[0]["benefit_highlights"] == ["\uad6d\ub0b4 1% \ud560\uc778"]
