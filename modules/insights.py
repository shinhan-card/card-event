"""
인사이트 엔진.
rule-based + Gemini AI 하이브리드.
Gemini 실패 시 rule-based fallback 100% 보장.
"""

import sys
import os
import json
import logging
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logger = logging.getLogger(__name__)

# 표준 태그 집합
OBJECTIVE_TAGS = ["신규유치", "리텐션", "객단가증대", "디지털전환", "제휴확장", "브랜드강화"]
TARGET_TAGS = ["신규", "기존", "VIP", "프리미엄", "20대", "30대", "40대", "전연령", "법인"]
CHANNEL_TAGS = ["앱", "웹", "오프라인", "간편결제", "QR", "온라인"]

BENEFIT_SCORE_MAP = {"높음": 4.0, "중상": 3.0, "보통": 2.0, "낮음": 1.0}


def generate_rule_insight(extracted: dict) -> dict:
    """
    rule-based 인사이트 생성.
    기존 detail_extractor._extract_marketing_insights 로직을 표준 스키마로 래핑.
    """
    from detail_extractor import _extract_marketing_insights
    raw = _extract_marketing_insights(extracted)

    # 표준 스키마로 변환
    benefit_level = raw.get("혜택_수준", "보통")
    insight = {
        "benefit_level": benefit_level,
        "benefit_score": BENEFIT_SCORE_MAP.get(benefit_level, 2.0),
        "target_clarity": raw.get("타겟_명확도", "보통"),
        "competitive_points": raw.get("경쟁력_포인트", []),
        "promo_strategies": raw.get("프로모션_전략", []),
        "objective_tags": _infer_objective_tags(extracted),
        "target_tags": _infer_target_tags(extracted),
        "channel_tags": _infer_channel_tags(extracted),
        "threat_level": None,
        "threat_reason": None,
        "marketing_takeaway": None,
        "evidence": [],
        "insight_confidence": 0.5,
        "section_coverage": _calc_section_coverage(extracted),
    }
    return insight


def generate_gemini_insight(extracted: dict, company: str = "") -> Optional[dict]:
    """
    Gemini AI 인사이트 생성.
    실패 시 None 반환 -> caller가 rule fallback 사용.
    """
    try:
        from gemini_insight import enrich_with_gemini
        result = enrich_with_gemini(extracted, company=company)
        if not result:
            return None
        # 표준 스키마로 매핑
        benefit_level = result.get("benefit_level", "보통")
        return {
            "benefit_level": benefit_level,
            "benefit_score": BENEFIT_SCORE_MAP.get(benefit_level, 2.0),
            "target_clarity": result.get("target_clarity", "보통"),
            "competitive_points": result.get("competitive_points", []),
            "promo_strategies": result.get("promo_strategies", []),
            "objective_tags": result.get("objective_tags", []),
            "target_tags": result.get("target_tags", []),
            "channel_tags": result.get("channel_tags", []),
            "threat_level": result.get("threat_level"),
            "threat_reason": result.get("threat_reason"),
            "marketing_takeaway": result.get("marketing_takeaway"),
            "evidence": result.get("evidence", []),
            "insight_confidence": 0.85,
            "section_coverage": _calc_section_coverage(extracted),
            # Gemini 부가 필드
            "one_line_summary": result.get("one_line_summary"),
            "category": result.get("category"),
        }
    except Exception as e:
        logger.debug("Gemini 인사이트 실패: %s", str(e)[:200])
        return None


def generate_hybrid_insight(extracted: dict, company: str = "") -> dict:
    """
    하이브리드: Gemini 시도 -> 실패 시 rule fallback.
    반환: (insight_dict, source_str)
    """
    gemini = generate_gemini_insight(extracted, company)
    if gemini:
        return gemini, "gemini"

    rule = generate_rule_insight(extracted)
    return rule, "rule"


# ---------------------------------------------------------------------------
# 내부 헬퍼
# ---------------------------------------------------------------------------

def _infer_objective_tags(extracted: dict) -> list:
    text = " ".join(filter(None, [
        extracted.get("title", ""),
        extracted.get("benefit_value", ""),
        extracted.get("conditions", ""),
        extracted.get("raw_text", ""),
    ]))
    tags = []
    if any(k in text for k in ("신규", "첫", "웰컴", "가입")):
        tags.append("신규유치")
    if any(k in text for k in ("기존", "재이용", "재구매")):
        tags.append("리텐션")
    if any(k in text for k in ("최대", "이상", "결제금액")):
        tags.append("객단가증대")
    if any(k in text for k in ("앱", "온라인", "디지털", "간편결제", "Pay")):
        tags.append("디지털전환")
    if any(k in text for k in ("제휴", "파트너", "스타벅스", "CGV", "배달")):
        tags.append("제휴확장")
    if any(k in text for k in ("프리미엄", "VIP", "브랜드", "한정")):
        tags.append("브랜드강화")
    return tags


def _infer_target_tags(extracted: dict) -> list:
    text = " ".join(filter(None, [
        extracted.get("target_segment", ""),
        extracted.get("conditions", ""),
    ]))
    tags = []
    for tag in TARGET_TAGS:
        if tag in text:
            tags.append(tag)
    if not tags:
        tags.append("전연령")
    return tags


def _infer_channel_tags(extracted: dict) -> list:
    text = " ".join(filter(None, [
        extracted.get("conditions", ""),
        extracted.get("raw_text", ""),
    ]))
    tags = []
    if any(k in text for k in ("앱", "App", "APP")):
        tags.append("앱")
    if any(k in text for k in ("온라인", "웹", "사이트")):
        tags.append("웹")
    if any(k in text for k in ("오프라인", "매장", "점포")):
        tags.append("오프라인")
    if any(k in text for k in ("간편결제", "Pay", "페이")):
        tags.append("간편결제")
    return tags


def _calc_section_coverage(extracted: dict) -> float:
    mc = extracted.get("marketing_content") or {}
    if not isinstance(mc, dict):
        return 0.0
    possible = ["혜택_상세", "참여방법", "유의사항", "제한사항", "파트너십", "마케팅_메시지", "타겟_고객"]
    filled = sum(1 for k in possible if mc.get(k))
    return round(filled / len(possible), 2)
