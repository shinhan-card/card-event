"""단위 테스트: 인사이트 스코어링"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules.insights import generate_rule_insight, _infer_objective_tags, _calc_section_coverage


def test_rule_insight_basic():
    extracted = {
        "title": "삼성카드 해외여행 최대 30% 할인",
        "benefit_value": "최대 30만원",
        "conditions": "Platinum/VVIP 카드, 해외 호텔 예약",
        "target_segment": "40대 이상 프리미엄",
        "raw_text": "삼성카드 Platinum으로 해외 호텔 예약 시 최대 30만원 할인",
        "marketing_content": {"혜택_상세": ["최대 30% 할인"], "참여방법": ["예약 시 자동 적용"]},
    }
    insight = generate_rule_insight(extracted)
    assert insight["benefit_level"] in ("높음", "중상", "보통", "낮음")
    assert isinstance(insight["competitive_points"], list)
    assert isinstance(insight["benefit_score"], float)


def test_objective_tags():
    tags = _infer_objective_tags({"title": "신규 가입 시 5만원 캐시백", "raw_text": "앱에서 가입"})
    assert "신규유치" in tags
    assert "디지털전환" in tags


def test_section_coverage_full():
    mc = {k: ["x"] for k in ["혜택_상세", "참여방법", "유의사항", "제한사항", "파트너십", "마케팅_메시지", "타겟_고객"]}
    assert _calc_section_coverage({"marketing_content": mc}) == 1.0


def test_section_coverage_empty():
    assert _calc_section_coverage({"marketing_content": {}}) == 0.0


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"  PASS {name}")
            except AssertionError as e:
                print(f"  FAIL {name}: {e}")
    print("Done.")
