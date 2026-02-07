"""
정규화 모듈.
추출된 데이터를 DB 스키마에 맞게 정규화한다.
- period -> dates
- benefit_value -> amounts
- marketing_content -> sections 분해
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import parse_period_dates, parse_benefit_amount, compute_status


def normalize_extracted(extracted: dict, existing_event=None) -> dict:
    """
    detail_extractor 결과를 DB update_data로 정규화.
    existing_event가 있으면 빈 필드는 기존 값 유지.
    """
    def _or(new, old):
        return new if new else old

    ev = existing_event
    title = _or(extracted.get("title"), getattr(ev, "title", None) if ev else None) or ""
    period = _or(extracted.get("period"), getattr(ev, "period", None) if ev else None) or ""
    benefit_value = _or(extracted.get("benefit_value"), getattr(ev, "benefit_value", None) if ev else None) or ""

    ps, pe = parse_period_dates(period)
    aw, bp = parse_benefit_amount(benefit_value)

    return {
        "title": title,
        "period": period,
        "period_start": ps,
        "period_end": pe,
        "benefit_type": _or(extracted.get("benefit_type"), getattr(ev, "benefit_type", None) if ev else None),
        "benefit_value": benefit_value,
        "benefit_amount_won": aw,
        "benefit_pct": bp,
        "conditions": _or(extracted.get("conditions"), getattr(ev, "conditions", None) if ev else None),
        "target_segment": _or(extracted.get("target_segment"), getattr(ev, "target_segment", None) if ev else None),
        "one_line_summary": _or(extracted.get("one_line_summary"), getattr(ev, "one_line_summary", None) if ev else None),
        "raw_text": _or(extracted.get("raw_text"), getattr(ev, "raw_text", None) if ev else None),
        "marketing_content": extracted.get("marketing_content") or {},
        "status": compute_status(pe),
    }
