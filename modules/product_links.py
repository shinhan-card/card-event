"""Helpers for matching extracted linked card names to canonical product manifests."""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path
from typing import Iterable


_PROJECT_ROOT = Path(__file__).resolve().parent.parent
_CARD_TERMS_DIR = _PROJECT_ROOT / "data" / "card_terms"
_MANIFEST_PATH = _CARD_TERMS_DIR / "manifest.json"
_DISCLOSURES_PATH = _CARD_TERMS_DIR / "product_disclosures.json"

_CATALOG_CACHE = {"stamp": None, "catalog": {}}

_COMPANY_ALIASES = {
    "\uc2e0\ud55c\uce74\ub4dc": ("\uc2e0\ud55c\uce74\ub4dc", "\uc2e0\ud55c", "shinhancard", "shinhan"),
    "\uc0bc\uc131\uce74\ub4dc": ("\uc0bc\uc131\uce74\ub4dc", "\uc0bc\uc131", "samsungcard", "samsung"),
    "KB\uad6d\ubbfc\uce74\ub4dc": ("kb\uad6d\ubbfc\uce74\ub4dc", "\uad6d\ubbfc\uce74\ub4dc", "kbcard", "kb"),
    "\ud604\ub300\uce74\ub4dc": ("\ud604\ub300\uce74\ub4dc", "\ud604\ub300", "hyundaicard", "hyundai"),
}
_GENERIC_LINK_TERMS = (
    "\uc601\uc5c5\uc815\ucc45",
    "\uc2b9\uc778\uc2dc\uac04",
    "\uace0\uac1d\uc13c\ud130",
    "\uac1c\uc778",
    "\ubc95\uc778",
    "\ud68c\uc6d0",
    "\uc774\uc6a9\uae08\uc561",
    "\ub300\uc0c1\uce74\ub4dc",
    "\ub300\uc0c1 \uce74\ub4dc",
    "\uce74\ub4dc\uc2b9\uc778",
    "\uce74\ub4dc\uc2b9\uc778\uc774",
)


def _load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _catalog_stamp() -> tuple[int, int]:
    return (
        _MANIFEST_PATH.stat().st_mtime_ns if _MANIFEST_PATH.exists() else 0,
        _DISCLOSURES_PATH.stat().st_mtime_ns if _DISCLOSURES_PATH.exists() else 0,
    )


def _normalize_text(value: str) -> str:
    text = unicodedata.normalize("NFKC", str(value or "")).lower().strip()
    return re.sub(r"[^0-9a-z\uac00-\ud7a3]+", "", text)


_GENERIC_CARD_KEYS = {
    _normalize_text("\uce74\ub4dc"),
    _normalize_text("\uccb4\ud06c\uce74\ub4dc"),
    _normalize_text("\uc2e0\uc6a9\uce74\ub4dc"),
    _normalize_text("\uac1c\uc778\uce74\ub4dc"),
    _normalize_text("\ubc95\uc778\uce74\ub4dc"),
    _normalize_text("\uac1c\uc778\uccb4\ud06c\uce74\ub4dc"),
    _normalize_text("\uac1c\uc778\uc2e0\uc6a9\uce74\ub4dc"),
}


def _company_aliases(company: str = "") -> tuple[str, ...]:
    aliases: list[str] = []
    if company:
        for key, items in _COMPANY_ALIASES.items():
            if company == key or company in items:
                aliases.extend(items)
    for items in _COMPANY_ALIASES.values():
        aliases.extend(items)
    return tuple(dict.fromkeys(_normalize_text(alias) for alias in aliases if alias))


def _build_match_keys(value: str, company: str = "") -> set[str]:
    base = _normalize_text(value)
    keys = {base} if base else set()
    if not base:
        return keys

    stripped = base
    for alias in _company_aliases(company):
        if alias:
            stripped = stripped.replace(alias, "")
    stripped = stripped.strip()
    if stripped:
        keys.add(stripped)
        if stripped.endswith("\uce74\ub4dc") and len(stripped) > 2:
            keys.add(stripped[:-2])

    if base.endswith("\uce74\ub4dc") and len(base) > 2:
        keys.add(base[:-2])

    return {key for key in keys if len(key) >= 3}


def _is_candidate_noise(value: str, company: str = "") -> bool:
    raw = str(value or "").strip()
    normalized = _normalize_text(raw)
    if len(normalized) < 4:
        return True
    if any(term in raw for term in _GENERIC_LINK_TERMS):
        return True
    candidate_keys = _build_match_keys(raw, company=company)
    if candidate_keys and candidate_keys.issubset(_GENERIC_CARD_KEYS):
        return True
    if normalized in _build_match_keys(company, company=company):
        return True
    return False


def _merge_catalog_entry(entry: dict, source: dict) -> None:
    for field in (
        "company",
        "card_name",
        "annual_fee",
        "annual_fee_display",
        "spend_requirement",
        "launch_date",
        "revision_type",
        "discontinue_date",
        "status",
        "url",
        "pdf_path",
        "pdf_url",
        "summary_text",
        "summary_preview",
        "preview",
        "card_type",
    ):
        if source.get(field) and not entry.get(field):
            entry[field] = source[field]

    if source.get("categories") and not entry.get("categories"):
        entry["categories"] = source.get("categories") or []
    if source.get("benefit_highlights") and not entry.get("benefit_highlights"):
        entry["benefit_highlights"] = source.get("benefit_highlights") or []


def load_product_catalog() -> dict[str, dict]:
    stamp = _catalog_stamp()
    if _CATALOG_CACHE["stamp"] == stamp:
        return _CATALOG_CACHE["catalog"]

    manifest_products = _load_json(_MANIFEST_PATH).get("products", {})
    disclosure_products = _load_json(_DISCLOSURES_PATH).get("products", {})

    merged: dict[str, dict] = {}
    for source_products in (manifest_products, disclosure_products):
        for raw_key, info in source_products.items():
            if not isinstance(info, dict):
                continue
            company = str(info.get("company") or "").strip()
            card_name = str(info.get("card_name") or "").strip()
            if not company or not card_name:
                if "::" in raw_key:
                    company, card_name = [part.strip() for part in str(raw_key).split("::", 1)]
            if not company or not card_name:
                continue

            product_key = f"{company}::{card_name}"
            entry = merged.setdefault(
                product_key,
                {
                    "product_key": product_key,
                    "company": company,
                    "card_name": card_name,
                    "categories": [],
                    "benefit_highlights": [],
                },
            )
            _merge_catalog_entry(entry, info)

    _CATALOG_CACHE["stamp"] = stamp
    _CATALOG_CACHE["catalog"] = merged
    return merged


def _iter_catalog_candidates(catalog: dict[str, dict], company: str = "") -> Iterable[dict]:
    if company:
        local = [entry for entry in catalog.values() if entry.get("company") == company]
        if local:
            return local
    return list(catalog.values())


def _score_match(source_keys: set[str], target_keys: set[str]) -> tuple[float, str]:
    if not source_keys or not target_keys:
        return 0.0, ""

    if source_keys & target_keys:
        return 1.0, "exact"

    best_score = 0.0
    best_method = ""
    for source in source_keys:
        for target in target_keys:
            shorter, longer = sorted((source, target), key=len)
            if len(shorter) >= 5 and shorter in longer:
                score = 0.9 - min(0.2, abs(len(longer) - len(shorter)) * 0.02)
                if score > best_score:
                    best_score = score
                    best_method = "contains"
    return best_score, best_method


def match_linked_cards(linked_cards, company: str = "") -> list[dict]:
    catalog = load_product_catalog()
    candidates = _iter_catalog_candidates(catalog, company=company)
    results: list[dict] = []
    seen_keys: set[str] = set()

    for raw_value in linked_cards or []:
        raw_text = str(raw_value or "").strip()
        if not raw_text or _is_candidate_noise(raw_text, company=company):
            continue

        source_keys = _build_match_keys(raw_text, company=company)
        if not source_keys:
            continue

        best_entry = None
        best_score = 0.0
        best_method = ""
        for entry in candidates:
            target_keys = _build_match_keys(entry.get("card_name", ""), company=entry.get("company", ""))
            score, method = _score_match(source_keys, target_keys)
            if score <= 0:
                continue
            if entry.get("company") == company:
                score += 0.03
            if score > best_score:
                best_entry = entry
                best_score = score
                best_method = method

        if not best_entry or best_score < 0.84:
            continue
        product_key = best_entry["product_key"]
        if product_key in seen_keys:
            continue
        seen_keys.add(product_key)
        results.append(
            {
                "product_key": product_key,
                "company": best_entry.get("company") or "",
                "card_name": best_entry.get("card_name") or "",
                "matched_text": raw_text,
                "match_method": best_method or "exact",
                "confidence": round(min(best_score, 0.99), 2),
            }
        )

    return results


def build_product_link_payloads(link_rows) -> list[dict]:
    catalog = load_product_catalog()
    items: list[dict] = []
    for row in link_rows or []:
        entry = catalog.get(getattr(row, "product_key", ""), {})
        items.append(
            {
                "product_key": getattr(row, "product_key", ""),
                "company": getattr(row, "company", "") or entry.get("company", ""),
                "card_name": getattr(row, "card_name", "") or entry.get("card_name", ""),
                "matched_text": getattr(row, "matched_text", ""),
                "match_method": getattr(row, "match_method", ""),
                "confidence": getattr(row, "confidence", None),
                "annual_fee_display": entry.get("annual_fee_display") or entry.get("annual_fee", ""),
                "spend_requirement": entry.get("spend_requirement", ""),
                "benefit_highlights": entry.get("benefit_highlights") or [],
                "categories": entry.get("categories") or [],
                "launch_date": entry.get("launch_date", ""),
                "revision_type": entry.get("revision_type", ""),
                "discontinue_date": entry.get("discontinue_date", ""),
                "status": entry.get("status", ""),
                "card_type": entry.get("card_type", ""),
                "product_url": entry.get("url", ""),
                "pdf_url": entry.get("pdf_url", ""),
                "pdf_path": entry.get("pdf_path", ""),
                "summary_text": entry.get("summary_text") or entry.get("preview") or "",
            }
        )
    return items
