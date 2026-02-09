"""
Gemini API를 활용한 마케팅 인사이트 고도화.
Playwright 추출 후 raw_text + marketing_content를 Gemini에 전달해
한줄요약, 카테고리, 위협도, 심층 마케팅 전략 분석을 얻는다.
"""

import json
import os
import logging
import time
from collections import deque
from threading import Lock
from typing import Optional

from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MAX_RPM = max(1, int(os.getenv("GEMINI_MAX_RPM", "5")))
GEMINI_WINDOW_SEC = max(1, int(os.getenv("GEMINI_WINDOW_SEC", "60")))
GEMINI_RATE_MODE = (os.getenv("GEMINI_RATE_MODE", "wait") or "wait").strip().lower()  # wait | skip
GEMINI_MAX_WAIT_SEC = max(0.0, float(os.getenv("GEMINI_MAX_WAIT_SEC", "180")))
GEMINI_COOLDOWN_SEC = max(1, int(os.getenv("GEMINI_COOLDOWN_SEC", "65")))
GEMINI_MODEL_PRIORITY = (
    os.getenv("GEMINI_MODEL_PRIORITY", "gemini-2.5-flash-lite,gemini-2.5-flash")
    or "gemini-2.5-flash-lite,gemini-2.5-flash"
)
_MODEL_CANDIDATES = [m.strip() for m in GEMINI_MODEL_PRIORITY.split(",") if m.strip()]
if not _MODEL_CANDIDATES:
    _MODEL_CANDIDATES = ["gemini-2.5-flash-lite", "gemini-2.5-flash"]

_model = None
_model_name = None
_model_index = 0
_request_timestamps = deque()
_rate_lock = Lock()
_cooldown_until = 0.0


def _prune_timestamps(now: float) -> None:
    while _request_timestamps and (now - _request_timestamps[0]) >= GEMINI_WINDOW_SEC:
        _request_timestamps.popleft()


def _mark_rate_cooldown(seconds: int = GEMINI_COOLDOWN_SEC) -> None:
    global _cooldown_until
    with _rate_lock:
        now = time.monotonic()
        _cooldown_until = max(_cooldown_until, now + max(1, seconds))


def _acquire_request_slot(allow_wait: bool = True) -> bool:
    """
    Gemini 요청 슬롯을 분당 제한(GEMINI_MAX_RPM)에 맞춰 획득.
    - wait 모드: 제한 해제까지 대기
    - skip 모드: 즉시 False 반환 (caller가 rule fallback)
    """
    wait_logged = False
    started_at = time.monotonic()

    while True:
        wait_for = 0.0
        now = time.monotonic()
        with _rate_lock:
            _prune_timestamps(now)

            if now < _cooldown_until:
                wait_for = max(wait_for, _cooldown_until - now)

            if len(_request_timestamps) >= GEMINI_MAX_RPM:
                window_wait = GEMINI_WINDOW_SEC - (now - _request_timestamps[0]) + 0.05
                wait_for = max(wait_for, window_wait)

            if wait_for <= 0:
                _request_timestamps.append(time.monotonic())
                return True

        if not allow_wait:
            return False

        if GEMINI_RATE_MODE == "skip":
            logger.info(
                "Gemini rate limit skip: mode=skip, rpm=%s, wait_for=%.2fs",
                GEMINI_MAX_RPM, wait_for,
            )
            return False

        elapsed = time.monotonic() - started_at
        if GEMINI_MAX_WAIT_SEC > 0 and (elapsed + wait_for) > GEMINI_MAX_WAIT_SEC:
            logger.warning(
                "Gemini rate limit wait exceeded max_wait=%.1fs (needed=%.2fs). Rule fallback.",
                GEMINI_MAX_WAIT_SEC, wait_for,
            )
            return False

        if not wait_logged:
            logger.info(
                "Gemini rate limiter active: rpm=%s, waiting %.2fs",
                GEMINI_MAX_RPM, wait_for,
            )
            wait_logged = True
        time.sleep(max(0.05, wait_for))


def _is_rate_limit_error(error: Exception) -> bool:
    msg = (str(error) or "").lower()
    return "429" in msg or "rate limit" in msg or "quota" in msg


def _is_model_unavailable_error(error: Exception) -> bool:
    msg = (str(error) or "").lower()
    return (
        "404" in msg
        or "not found" in msg
        or "unsupported model" in msg
        or "is not found" in msg
        or "does not exist" in msg
        or "model" in msg and "unavailable" in msg
    )


def _get_model():
    global _model, _model_name, _model_index
    if _model is not None:
        return _model
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        _model_index = max(0, min(_model_index, len(_MODEL_CANDIDATES) - 1))
        _model_name = _MODEL_CANDIDATES[_model_index]
        _model = genai.GenerativeModel(_model_name)
        logger.info("Gemini 모델 선택: %s", _model_name)
        return _model
    except Exception as e:
        logger.warning("Gemini 모델 초기화 실패: %s", e)
        return None


def _switch_to_next_model() -> bool:
    """
    현재 모델이 사용 불가일 때 다음 후보 모델로 전환.
    """
    global _model, _model_name, _model_index
    if _model_index >= len(_MODEL_CANDIDATES) - 1:
        return False
    _model_index += 1
    _model = None
    _model_name = None
    return _get_model() is not None


def _extract_json_text(raw_text: str) -> str:
    text = (raw_text or "").strip()
    if not text:
        return ""
    import re as _re
    md_match = _re.search(r"```(?:json)?\s*\n?(.*?)```", text, _re.DOTALL)
    if md_match:
        text = md_match.group(1).strip()
    elif text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    brace_start = text.find("{")
    brace_end = text.rfind("}")
    if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
        text = text[brace_start:brace_end + 1]
    return text.strip()


def _generate_text_with_gemini(
    prompt: str,
    generation_config: dict,
    max_attempts: int = 3,
    allow_wait: bool = True,
) -> Optional[str]:
    for attempt in range(max_attempts):
        if not _acquire_request_slot(allow_wait=allow_wait):
            return None

        model = _get_model()
        if model is None:
            return None
        current_model_name = _model_name or "unknown"

        try:
            response = model.generate_content(prompt, generation_config=generation_config)
            return (response.text or "").strip()
        except Exception as e:
            if _is_model_unavailable_error(e):
                switched = _switch_to_next_model()
                logger.warning(
                    "Gemini 모델 사용 불가(%s). fallback 모델 전환=%s next=%s",
                    current_model_name, switched, _model_name or "none",
                )
                if switched:
                    continue

            if _is_rate_limit_error(e):
                _mark_rate_cooldown()
                logger.warning(
                    "Gemini rate-limit 감지(429/쿼터). cooldown=%ss attempt=%s",
                    GEMINI_COOLDOWN_SEC, attempt + 1,
                )
                if attempt == 0:
                    continue

            logger.warning("Gemini API 호출 실패: %s", str(e)[:200])
            return None

    return None


SYSTEM_PROMPT = """
당신은 **신한카드 마케팅팀 소속 경쟁사 분석 전문가**입니다.
경쟁사 카드 이벤트를 읽고, 신한카드 마케터가 즉시 전략 판단에 활용할 수 있는 분석을 제공합니다.

아래 JSON 형식으로 *정확히* 응답하세요. JSON 외 다른 텍스트는 절대 출력하지 마세요.

{
  "one_line_summary": "마케팅 담당자가 3초 안에 파악할 수 있는 한줄 요약 (50자 이내, '~카드, ~혜택 제공' 형식)",
  "category": "카테고리 (쇼핑/여행/식음료/교통/문화/생활/금융/통신/기타 중 택1)",

  "threat_level": "경쟁 위협도 (High/Mid/Low)",
  "threat_reason": "위협도 판단 근거: 왜 위협인지 또는 왜 낮은지 구체적 수치/조건 근거 포함 (2문장)",

  "benefit_level": "혜택 수준 (높음/중상/보통/낮음)",
  "benefit_detail": "혜택 구체 내용: 할인율·캐시백 금액·적립률 등 숫자를 포함해 1~2문장 정리",

  "target_clarity": "타겟 명확도 (높음/보통/낮음)",
  "target_profile": "이 이벤트가 노리는 고객 프로필: 연령대, 소비 성향, 라이프스타일, 카드 사용 패턴 등 (1~2문장)",

  "conditions_summary": "참여 조건 요약: 최소 결제금액, 월 한도, 선착순 여부, 필수 등록 여부 등 핵심 조건 3줄 이내",
  "event_duration_type": "이벤트 기간 유형 (단기/중기/장기/상시) - 1개월 미만=단기, 1~3개월=중기, 3개월+=장기",

  "competitive_points": ["이 이벤트의 경쟁 우위 포인트 (구체적으로, 예: '무조건 5% 캐시백으로 조건 허들 없음') 2~4개"],
  "weaknesses": ["이 이벤트의 약점 또는 제약사항 (예: '선착순 1만명 한정으로 실질 혜택 도달률 낮음') 1~3개"],

  "promo_strategies": ["프로모션 전략 태그 (신규유치/리텐션/교차판매/업셀링/제휴확장/시즌마케팅/디지털전환 등) 1~3개"],
  "objective_tags": ["이벤트 목적 태그 1~3개"],
  "target_tags": ["타겟 태그 1~3개"],
  "channel_tags": ["채널 태그 (앱/웹/오프라인/간편결제 등) 1~2개"],

  "shinhan_response": "신한카드가 이 이벤트에 대응해야 하는 이유와 구체적 대응 방향 제안 (2~3문장, '~하면 ~할 수 있다' 형식으로 실행 가능하게)",
  "marketing_takeaway": "이 이벤트에서 얻을 수 있는 마케팅 인사이트 핵심 (2~3문장, 업계 트렌드와 연결)"
}

**판단 기준**:
- threat_level High: 파격적 혜택(10만원+/30%+) + 넓은 타겟(전 고객 또는 주요 세그먼트) + 장기(3개월+)
- threat_level Mid: 괜찮은 혜택이나 타겟/기간이 제한적
- threat_level Low: 소규모 혜택이거나 매우 좁은 타겟
- benefit_level 높음: 10만원+ 캐시백 또는 30%+ 할인 또는 적립률 5%+
- benefit_level 중상: 5~10만원 캐시백 또는 10~30% 할인
- target_clarity 높음: 특정 카드/연령/조건이 명시된 경우
- 모든 필드에서 구체적 숫자·금액·비율을 최대한 포함할 것
"""


def enrich_with_gemini(extracted: dict, company: str = "") -> Optional[dict]:
    """
    Playwright 추출 결과를 Gemini에 보내 AI 인사이트를 얻는다.

    Args:
        extracted: detail_extractor.extract_from_url() 반환값
        company: 카드사명

    Returns:
        dict with keys from SYSTEM_PROMPT, or None if API unavailable
    """
    title = extracted.get("title", "")
    period = extracted.get("period", "")
    benefit = extracted.get("benefit_value", "")
    conditions = extracted.get("conditions", "")
    target = extracted.get("target_segment", "")
    mc = extracted.get("marketing_content", {})
    raw = extracted.get("raw_text", "")

    # 마케팅 내용 섹션 요약
    mc_lines = []
    if isinstance(mc, dict):
        for key, items in mc.items():
            if isinstance(items, list) and items:
                mc_lines.append(f"[{key}] " + " / ".join(str(i)[:200] for i in items[:5]))

    user_prompt = f"""
=== 이벤트 핵심 요약 (구조화 추출 데이터) ===
- 카드사: {company}
- 이벤트명: {title}
- 기간: {period if period else '미추출'}
- 대상/타겟: {target[:300] if target else '미추출 (전체 고객 가능성)'}
- 주요 혜택: {benefit[:600] if benefit else '미추출'}
- 참여 조건: {conditions[:500] if conditions else '미추출'}

=== 추출된 마케팅 콘텐츠 (섹션별) ===
{chr(10).join(mc_lines[:20]) if mc_lines else '(섹션 데이터 없음)'}

=== 이벤트 페이지 원문 발췌 ===
{raw[:2500]}

위 구조화 요약과 원문을 모두 참고하여 분석하세요. 특히 '기간/대상/혜택/조건'에서 구체적 숫자와 금액을 최대한 반영하세요.
"""

    text = _generate_text_with_gemini(
        f"{SYSTEM_PROMPT}\n\n{user_prompt}",
        generation_config={
            "temperature": 0.25,
            "top_p": 0.85,
            "max_output_tokens": 2048,
        },
        max_attempts=3,
        allow_wait=True,
    )
    if not text:
        return None

    try:
        result = json.loads(_extract_json_text(text))
        logger.info("Gemini 인사이트 생성 완료: %s", title[:40])
        return result
    except Exception:
        logger.warning("Gemini 응답 JSON 파싱 실패: %s", text[:200])
        return None


COMPANY_BRIEF_PROMPT = """
당신은 신한카드 마케팅팀의 경쟁사 분석 전문가다.
입력된 카드사의 현재 이벤트 현황 스냅샷을 분석하고, 신한카드 마케터가 즉시 활용할 수 있는 전략 브리핑을 작성하라.
추출률/인사이트률 같은 시스템 운영 지표는 절대 언급하지 말고, 마케팅 전략 관점에서만 분석하라.

아래 JSON만 출력하라:
{
  "overview": "이 카드사의 현재 마케팅 전략 방향을 한 문단으로 요약 (카테고리 집중도, 혜택 강도, 타겟 특성 중심, 150자 이내)",
  "key_strategy": "이 카드사가 가장 공격적으로 밀고 있는 전략 1가지를 구체적으로 설명 (예: '20~30대 디지털 네이티브 대상 간편결제 캐시백 집중', 80자 이내)",
  "strongest_categories": ["가장 이벤트가 많거나 혜택이 강한 카테고리 2~3개"],
  "avg_benefit_assessment": "평균 혜택 수준 평가 (금액/비율 포함, 예: '평균 캐시백 2.5만원, 할인율 8% 수준으로 업계 중상위')",
  "target_focus": "주로 노리는 고객층 (연령/소비성향/라이프스타일 관점, 50자 이내)",
  "shinhan_threat": "신한카드 관점에서 이 카드사의 위협 요인 (구체적으로, 50자 이내)",
  "recommended_counter": "신한카드가 이 카드사에 대응하기 위한 구체적 액션 제안 1~2문장"
}
"""


def summarize_company_status(company: str, snapshot: dict) -> Optional[dict]:
    """
    메인 대시보드용 카드사 상태 개요를 Gemini로 생성.
    대시보드 체감 성능을 위해 allow_wait=False로 동작하며,
    슬롯이 없으면 즉시 None 반환 -> caller가 rule fallback 처리.
    """
    if not snapshot:
        return None

    payload = json.dumps(snapshot, ensure_ascii=False)
    text = _generate_text_with_gemini(
        f"{COMPANY_BRIEF_PROMPT}\n\n[회사명]\n{company}\n\n[스냅샷]\n{payload}",
        generation_config={
            "temperature": 0.25,
            "top_p": 0.85,
            "max_output_tokens": 1024,
        },
        max_attempts=2,
        allow_wait=False,
    )
    if not text:
        return None

    try:
        obj = json.loads(_extract_json_text(text))
    except Exception:
        logger.warning("Gemini 회사개요 JSON 파싱 실패: %s", text[:200])
        return None

    if not isinstance(obj, dict):
        return None

    overview = str(obj.get("overview") or "").strip()
    if not overview:
        return None

    strongest = obj.get("strongest_categories") if isinstance(obj.get("strongest_categories"), list) else []
    strongest = [str(x).strip() for x in strongest if str(x).strip()][:3]

    return {
        "overview": overview,
        "key_strategy": str(obj.get("key_strategy") or "").strip(),
        "strongest_categories": strongest,
        "avg_benefit_assessment": str(obj.get("avg_benefit_assessment") or "").strip(),
        "target_focus": str(obj.get("target_focus") or "").strip(),
        "shinhan_threat": str(obj.get("shinhan_threat") or "").strip(),
        "recommended_counter": str(obj.get("recommended_counter") or "").strip(),
        # 하위호환: 기존 필드도 매핑
        "focus_points": strongest,
        "watchouts": [obj.get("shinhan_threat", "")] if obj.get("shinhan_threat") else [],
        "action_hint": str(obj.get("recommended_counter") or "").strip(),
    }


QUAL_COMPARISON_PROMPT = """
당신은 카드사 마케팅 분석가다.
입력된 카드사별 스냅샷으로 4개 고정 지표의 비교표를 만든다.
출력은 반드시 JSON만 사용하고, 설명 문장은 reason/summary 안에서만 작성한다.

[레벨 규칙]
- 값은 반드시 다음 중 하나: "매우 높음", "높음", "중간", "낮음", "매우 낮음"

[고정 지표]
1) 고가 소비 비중(자동차·여행·할부)
2) 반복·계약 소비 비중(생활요금·보험·리텐션)
3) 카테고리 분산도(소비+관계 전체)
4) 이벤트 반복성(월/상시 구조)

[출력 JSON 스키마]
{
  "title": "카드 4사 비교 요약",
  "rows": [
    {
      "metric": "고가 소비 비중(자동차·여행·할부)",
      "values": {"신한카드":"중간","KB국민카드":"중간","삼성카드":"높음","현대카드":"높음"},
      "reason": "한 줄 근거"
    },
    {
      "metric": "반복·계약 소비 비중(생활요금·보험·리텐션)",
      "values": {"신한카드":"높음","KB국민카드":"매우 높음","삼성카드":"낮음","현대카드":"낮음"},
      "reason": "한 줄 근거"
    },
    {
      "metric": "카테고리 분산도(소비+관계 전체)",
      "values": {"신한카드":"높음","KB국민카드":"중간","삼성카드":"낮음","현대카드":"매우 낮음"},
      "reason": "한 줄 근거"
    },
    {
      "metric": "이벤트 반복성(월/상시 구조)",
      "values": {"신한카드":"중간","KB국민카드":"높음","삼성카드":"중간","현대카드":"높음"},
      "reason": "한 줄 근거"
    }
  ],
  "summary": ["핵심 요약 1", "핵심 요약 2", "핵심 요약 3"]
}
"""


def infer_qualitative_comparison(company_snapshots: list) -> Optional[dict]:
    """
    카드사 간 정성+정량 비교표를 Gemini로 생성.
    대시보드 응답성을 위해 allow_wait=False로 동작.
    """
    if not isinstance(company_snapshots, list) or not company_snapshots:
        return None

    payload = json.dumps(company_snapshots, ensure_ascii=False)
    text = _generate_text_with_gemini(
        f"{QUAL_COMPARISON_PROMPT}\n\n[입력 스냅샷]\n{payload}",
        generation_config={
            "temperature": 0.2,
            "top_p": 0.8,
            "max_output_tokens": 1024,
        },
        max_attempts=2,
        allow_wait=False,
    )
    if not text:
        return None

    try:
        obj = json.loads(_extract_json_text(text))
    except Exception:
        logger.warning("Gemini 정성 비교 JSON 파싱 실패: %s", text[:200])
        return None

    if not isinstance(obj, dict):
        return None

    title = str(obj.get("title") or "").strip() or "카드 4사 비교 요약"
    rows = obj.get("rows") if isinstance(obj.get("rows"), list) else []
    summary = obj.get("summary") if isinstance(obj.get("summary"), list) else []
    if len(rows) < 4:
        return None

    allowed_levels = {"매우 높음", "높음", "중간", "낮음", "매우 낮음"}
    normalized_rows = []
    for row in rows[:4]:
        if not isinstance(row, dict):
            continue
        metric = str(row.get("metric") or "").strip()
        values = row.get("values") if isinstance(row.get("values"), dict) else {}
        reason = str(row.get("reason") or "").strip()
        norm_values = {}
        for k, v in values.items():
            kk = str(k).strip()
            vv = str(v).strip()
            if kk and vv in allowed_levels:
                norm_values[kk] = vv
        if metric and norm_values:
            normalized_rows.append({
                "metric": metric,
                "values": norm_values,
                "reason": reason,
            })

    if len(normalized_rows) < 4:
        return None

    summary = [str(x).strip() for x in summary if str(x).strip()][:3]
    return {
        "title": title,
        "rows": normalized_rows,
        "summary": summary,
    }


TEXT_COMPARE_PROMPT = """당신은 카드 이벤트 마케팅 분석가입니다.
아래는 여러 카드사의 이벤트에서 추출된 텍스트 요약입니다.

{text_block}

위 텍스트를 분석하여 다음 JSON을 반환하세요:
{{
  "common_patterns": ["공통으로 사용되는 문구·패턴 5~10개 (예: 최소 결제금액, 선착순, 캐시백, 할인율 등)"],
  "differentiators": {{
    "카드사명1": ["해당 카드사만의 차별 포인트 3~5개"],
    "카드사명2": ["해당 카드사만의 차별 포인트 3~5개"]
  }},
  "condition_patterns": ["고빈도 조건 패턴 5~8개 (최소 결제금액 X만원, 월 N회 한도, 선착순 N명 등 구체적으로)"]
}}

JSON만 반환하세요.
"""


def compare_event_texts(company_texts: dict) -> Optional[dict]:
    """
    카드사별 추출 텍스트를 Gemini로 비교 분석.
    company_texts: {"삼성카드": "텍스트...", "KB국민카드": "텍스트...", ...}
    """
    if not GEMINI_API_KEY:
        return None

    text_block = ""
    for co, txt in company_texts.items():
        text_block += f"\n--- {co} ---\n{txt[:2000]}\n"

    if len(text_block.strip()) < 50:
        return None

    prompt = TEXT_COMPARE_PROMPT.replace("{text_block}", text_block)

    raw = _generate_text_with_gemini(
        prompt,
        generation_config={"temperature": 0.25, "top_p": 0.8, "max_output_tokens": 1024},
        max_attempts=2,
        allow_wait=True,
    )
    if not raw:
        return None

    json_text = _extract_json_text(raw)
    try:
        obj = json.loads(json_text)
    except Exception:
        logger.warning("텍스트 비교 JSON 파싱 실패: %s", json_text[:200])
        return None

    common = obj.get("common_patterns", [])
    diff = obj.get("differentiators", {})
    cond = obj.get("condition_patterns", [])
    if not isinstance(common, list):
        common = []
    if not isinstance(diff, dict):
        diff = {}
    if not isinstance(cond, list):
        cond = []
    return {"common_patterns": common, "differentiators": diff, "condition_patterns": cond}


def merge_gemini_insights(existing_insights: dict, gemini_result: dict) -> dict:
    """
    기존 키워드 기반 인사이트에 Gemini 결과를 병합.
    Gemini가 준 값이 있으면 우선, 없으면 기존 값 유지.
    """
    merged = dict(existing_insights)

    if gemini_result.get("benefit_level"):
        merged["혜택_수준"] = gemini_result["benefit_level"]
    if gemini_result.get("target_clarity"):
        merged["타겟_명확도"] = gemini_result["target_clarity"]
    if gemini_result.get("competitive_points"):
        merged["경쟁력_포인트"] = gemini_result["competitive_points"]
    if gemini_result.get("promo_strategies"):
        merged["프로모션_전략"] = gemini_result["promo_strategies"]
    if gemini_result.get("threat_level"):
        merged["위협도"] = gemini_result["threat_level"]
    if gemini_result.get("threat_reason"):
        merged["위협도_근거"] = gemini_result["threat_reason"]
    if gemini_result.get("marketing_takeaway"):
        merged["마케팅_시사점"] = gemini_result["marketing_takeaway"]

    return merged
