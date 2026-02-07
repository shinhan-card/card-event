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
당신은 **카드 산업 마케팅 전문 애널리스트**입니다.
경쟁사 카드 이벤트의 상세 내용을 분석하고, 마케팅 전략 관점에서 인사이트를 제공합니다.

아래 JSON 형식으로 *정확히* 응답하세요. JSON 외 다른 텍스트는 절대 출력하지 마세요.

{
  "one_line_summary": "마케팅 담당자가 3초 안에 파악할 수 있는 한줄 요약 (50자 이내)",
  "category": "카테고리 (쇼핑/여행/식음료/교통/문화/생활/금융/통신/기타 중 택1)",
  "threat_level": "경쟁 위협도 (High/Mid/Low)",
  "threat_reason": "위협도 판단 근거 (1문장)",
  "benefit_level": "혜택 수준 (높음/중상/보통/낮음)",
  "target_clarity": "타겟 명확도 (높음/보통/낮음)",
  "competitive_points": ["경쟁력 포인트 1", "경쟁력 포인트 2"],
  "promo_strategies": ["프로모션 전략 1", "프로모션 전략 2"],
  "marketing_takeaway": "우리 마케팅팀이 참고할 핵심 시사점 (2~3문장)"
}

**판단 기준**:
- threat_level High: 파격적 혜택 + 넓은 타겟 + 장기 운영
- benefit_level 높음: 10만원↑ 또는 30%↑ 할인
- target_clarity 높음: 특정 카드/연령/조건이 명시된 경우
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
[카드사] {company}
[제목] {title}
[기간] {period}
[혜택] {benefit[:500]}
[조건] {conditions[:400]}
[대상] {target[:200]}
[마케팅 내용]
{chr(10).join(mc_lines[:20])}
[본문 발췌]
{raw[:2000]}
"""

    text = _generate_text_with_gemini(
        f"{SYSTEM_PROMPT}\n\n{user_prompt}",
        generation_config={
            "temperature": 0.3,
            "top_p": 0.8,
            "max_output_tokens": 1024,
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
당신은 카드사 마케팅 전략가다.
입력된 카드사 상태 스냅샷을 요약해 '현재 상태 개요'를 작성하라.
아래 JSON만 출력하고, 다른 텍스트를 절대 포함하지 마라.

{
  "overview": "한 문단 요약 (120자 이내)",
  "focus_points": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
  "watchouts": ["주의 포인트 1", "주의 포인트 2"],
  "action_hint": "실행 제안 1문장"
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
            "top_p": 0.8,
            "max_output_tokens": 512,
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
    focus_points = obj.get("focus_points") if isinstance(obj.get("focus_points"), list) else []
    watchouts = obj.get("watchouts") if isinstance(obj.get("watchouts"), list) else []
    action_hint = str(obj.get("action_hint") or "").strip()

    focus_points = [str(x).strip() for x in focus_points if str(x).strip()][:3]
    watchouts = [str(x).strip() for x in watchouts if str(x).strip()][:2]
    if not overview:
        return None

    return {
        "overview": overview,
        "focus_points": focus_points,
        "watchouts": watchouts,
        "action_hint": action_hint,
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
