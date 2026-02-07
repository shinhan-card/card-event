"""
상세 페이지(iframe 내부와 동일 URL) 내용 추출
실제 이벤트 화면에 보이는 제목·기간·혜택·조건 등을 구조화하여 DB에 반영
"""

import asyncio
import re
from typing import Dict, List, Tuple

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async

# 알림/헤더 제외용 (4사 공통)
_HEADER_LIKE = (
    '삼성카드', '삼성 카드', 'samsungcard', 'Samsung',
    '신한카드', '신한 카드', 'shinhancard', 'Shinhan',
    '현대카드', '현대 카드', 'hyundaicard', 'Hyundai',
    'KB국민카드', 'KB 국민카드', 'KB카드', 'kbcard',
    '로그인', '마이페이지', '이벤트 목록', '전체메뉴', '고객센터',
    '회원가입', '빠른메뉴', '사이트맵',
)
_NOTIFICATION_PREFIXES = (
    '이벤트에 응모되었습니다', '이벤트에 응모 되었습니다', '이벤트에 응모됐습니다',
    '이벤트 참여가 완료되었습니다', '응모가 완료되었습니다',
    '이미 참여하셨습니다', '이미 응모하셨습니다',
)
_NON_MARKETING_NOISE = (
    "개인(신용)정보",
    "개인정보",
    "고유식별정보",
    "수집·이용",
    "수집이용",
    "수집 이용",
    "수집·이용 목적",
    "제3자 제공",
    "동의를 거부할",
    "주민등록번호",
    "개인정보처리방침",
    "신용정보",
    "법정대리인",
    "동의하지 않으실 경우",
    "소득세법",
    "과세 처리",
    "과세처리",
    "법령",
    "보유기간",
    "파기",
)

_DOMAIN_TEXT_SELECTORS = {
    "samsungcard.com": [".event-detail", ".evt_cont", ".cont", "#container"],
    "shinhancard.com": [
        ".event-view", ".event_detail", ".view_cont",
        "#container", "#contents", "#eventContentsWrap", "#eventContents", "section.evt_detail",
    ],
    "hyundaicard.com": [
        ".eventView", ".event-view", ".eventDetail", ".evt-wrap",
        "#container", "#contentWrap", ".content.w792", ".event_content",
    ],
    "kbcard.com": [
        ".event_detail", ".event-view", ".board_view", "#container", "#contents",
        "#main_contents", ".eventViewWrap", "#eventBodyRE", "iframe",
    ],
}

_SECTION_KEYWORDS = {
    "혜택_상세": ["혜택", "할인", "캐시백", "적립", "포인트", "무료", "증정", "할부", "무이자", "리워드", "보너스", "청구할인", "즉시할인"],
    "참여방법": ["참여", "응모", "신청", "등록", "접수", "가입", "다운로드", "설치", "앱", "온라인", "오프라인", "방법", "절차", "결제"],
    "유의사항": ["유의", "주의", "안내", "필수", "반드시", "확인", "주의사항", "필수사항", "고지", "참고"],
    "제한사항": ["제한", "제외", "불가", "불가능", "한도", "최대", "최소", "월", "1회", "횟수", "선착순", "제한사항"],
    "파트너십": ["제휴", "파트너", "협력", "브랜드", "스타벅스", "CGV", "롯데", "신세계", "이마트", "올리브영", "GS25", "CU", "배달의민족", "요기요"],
    "마케팅_메시지": ["특별", "프리미엄", "VIP", "신규", "첫", "한정", "오직", "단독", "이벤트", "프로모션", "웰컴", "한시적"],
    "타겟_고객": ["신규", "기존", "VIP", "프리미엄", "일반", "전체", "20대", "30대", "40대", "고객", "회원", "대상카드", "대상 카드"],
}


def _is_header_like(text: str) -> bool:
    if not text or len(text) <= 5:
        return True
    t = text.strip()
    for h in _HEADER_LIKE:
        if t == h or t.startswith(h + ' ') or t.endswith(' ' + h):
            return True
    return False


def _is_notification_banner(text: str) -> bool:
    if not text or len(text) < 10:
        return False
    t = text.strip()
    if any(t.startswith(p) for p in _NOTIFICATION_PREFIXES):
        return True
    if '마이홈 앱의' in t and '자산 연결' in t:
        return True
    return False


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip()


def _normalize_key(text: str) -> str:
    compact = re.sub(r"[^0-9A-Za-z가-힣]", "", (text or "")).lower()
    return compact[:140]


def _is_non_marketing_noise(text: str) -> bool:
    t = _normalize_text(text)
    if not t:
        return True

    if not any(noise in t for noise in _NON_MARKETING_NOISE):
        return False

    # 혜택 직접 문맥은 유지 (개인정보 고지 문구는 제외)
    explicit_marketing = ("혜택", "할인", "캐시백", "적립", "무이자", "청구할인", "즉시할인", "참여방법", "이벤트 기간", "대상카드")
    if any(k in t for k in explicit_marketing) and "개인정보" not in t and "동의" not in t:
        return False
    return True


def _push_unique(items: List[str], value: str) -> None:
    if value and value not in items:
        items.append(value)


def _detect_domain_key(url: str) -> str:
    if not url:
        return ""
    lowered = url.lower()
    for domain in _DOMAIN_TEXT_SELECTORS.keys():
        if domain in lowered:
            return domain
    return ""


def _split_raw_text(raw_text: str) -> List[str]:
    """raw_text를 줄/문장 단위로 분해해 키워드 분류에 사용할 후보군 생성."""
    if not raw_text:
        return []

    chunks: List[str] = []
    for raw_line in raw_text.replace("\r", "\n").split("\n"):
        line = _normalize_text(raw_line)
        if not line:
            continue
        chunks.append(line)
        # 한 줄이 긴 경우 문장 단위로 추가 분해
        sentence_parts = re.split(r"(?<=[.!?])\s+|(?<=다\.)\s+|(?<=요\.)\s+", line)
        for part in sentence_parts:
            part = _normalize_text(part)
            if part and part != line:
                chunks.append(part)
        # 불릿/구분자 분해
        for marker in ("·", "•", "※", "|"):
            if marker in line:
                for part in line.split(marker):
                    part = _normalize_text(part)
                    if part and part != line:
                        chunks.append(part)

    noise_words = ("로그인", "회원가입", "전체메뉴", "고객센터", "마이페이지", "개인사업자", "개인정보처리방침")
    seen = set()
    lines: List[str] = []
    for chunk in chunks:
        if len(chunk) < 6 or len(chunk) > 700:
            continue
        if _is_header_like(chunk) or _is_notification_banner(chunk):
            continue
        if _is_non_marketing_noise(chunk):
            continue
        if any(n in chunk for n in noise_words) and len(chunk) <= 35:
            continue
        key = _normalize_key(chunk)
        if not key or key in seen:
            continue
        seen.add(key)
        lines.append(chunk)
    return lines


def _append_scored_text(
    scored: Dict[str, List[Tuple[int, str]]],
    seen_by_section: Dict[str, set],
    section_name: str,
    text: str,
    score: int,
    max_items: int = 30,
) -> None:
    cleaned = _normalize_text(text)
    if not cleaned or len(cleaned) < 6:
        return
    if len(cleaned) > 500:
        cleaned = cleaned[:500]
    if _is_header_like(cleaned) or _is_notification_banner(cleaned):
        return
    if _is_non_marketing_noise(cleaned):
        return
    if len(scored[section_name]) >= max_items:
        return

    key = _normalize_key(cleaned)
    if not key or key in seen_by_section[section_name]:
        return

    seen_by_section[section_name].add(key)
    scored[section_name].append((score, cleaned))


def _score_line_for_keywords(line: str, keywords: List[str]) -> int:
    return sum(1 for kw in keywords if kw in line)


def _extract_title(soup: BeautifulSoup) -> str:
    """본문 이벤트 제목만 추출 (헤더/알림 제외)."""
    def _ok(t: str) -> bool:
        if not t or len(t) < 4:
            return False
        if _is_header_like(t) or _is_notification_banner(t):
            return False
        return True

    candidates = []
    for scope_sel in ['main', '.content', '.event-detail', '[class*="event"]', '[class*="detail"]', '[class*="campaign"]', 'article']:
        scope = soup.select_one(scope_sel)
        if not scope:
            continue
        for tag in scope.find_all(['h1', 'h2', 'h3']):
            t = tag.get_text(strip=True)
            if _ok(t):
                candidates.append((len(t), t))
    for tag in soup.find_all(['h1', 'h2', 'h3']):
        t = tag.get_text(strip=True)
        if _ok(t):
            candidates.append((len(t), t))
    for sel in ['.event-title', '.title', '.tit', '.campaign-title', '[class*="tit"]', '[class*="title"]']:
        try:
            el = soup.select_one(sel)
            if el:
                t = el.get_text(strip=True)
                if _ok(t):
                    candidates.append((len(t), t))
        except Exception:
            pass
    try:
        og = soup.find('meta', property='og:title')
        if og and og.get('content'):
            t = og['content'].strip()
            for suffix in (
                ' | 삼성카드', ' | Samsung', '- 삼성카드', '- Samsung',
                ' | 신한카드', ' | Shinhan', '- 신한카드', '- Shinhan',
                ' | 현대카드', ' | Hyundai', '- 현대카드', '- Hyundai',
                ' | KB국민카드', ' | KB카드', '- KB국민카드', '- KB카드',
                ' :: 삼성카드', ' :: 신한카드', ' :: 현대카드', ' :: KB국민카드',
            ):
                if t.endswith(suffix):
                    t = t[:-len(suffix)].strip()
                    break
            if _ok(t):
                candidates.append((len(t), t))
    except Exception:
        pass
    if not candidates:
        return ""
    seen = set()
    unique = []
    for _, t in sorted(candidates, key=lambda x: (-len(x[1]), x[1])):
        if t in seen or _is_notification_banner(t):
            continue
        seen.add(t)
        unique.append(t)
    for t in unique:
        if any(k in t for k in ('혜택', '할인', '캐시백', '프로모션', '할부', '등록금', '자동차')):
            return t
    return unique[0] if unique else ""


def _normalize_period_part(year: str, month: str, day: str) -> str:
    y = int(year)
    if len(year) == 2:
        y += 2000
    return f"{y:04d}.{int(month):02d}.{int(day):02d}"


def _extract_date_range(text: str) -> str:
    if not text:
        return ""

    normalized = _normalize_text(text)

    # 2026.02.11 ~ 2026.05.31 / 26-02-11 ~ 26-05-31
    m = re.search(
        r'(\d{2,4})[./-]\s*(\d{1,2})[./-]\s*(\d{1,2})\s*(?:\([^)]*\))?\s*'
        r'(?:~|～|-|–|∼)\s*'
        r'(\d{2,4})[./-]\s*(\d{1,2})[./-]\s*(\d{1,2})',
        normalized,
    )
    if m:
        s = _normalize_period_part(m.group(1), m.group(2), m.group(3))
        e = _normalize_period_part(m.group(4), m.group(5), m.group(6))
        return f"{s}~{e}"

    # 2026.02.11 ~ 02.28 (종료일 연도 생략)
    m = re.search(
        r'(\d{2,4})[./-]\s*(\d{1,2})[./-]\s*(\d{1,2})\s*(?:\([^)]*\))?\s*'
        r'(?:~|～|-|–|∼)\s*'
        r'(\d{1,2})[./-]\s*(\d{1,2})',
        normalized,
    )
    if m:
        s = _normalize_period_part(m.group(1), m.group(2), m.group(3))
        e = _normalize_period_part(m.group(1), m.group(4), m.group(5))
        return f"{s}~{e}"

    # 2026년 2월 11일 ~ 2026년 5월 31일
    m = re.search(
        r'(\d{2,4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일?\s*'
        r'(?:~|～|-|–|∼|부터)\s*'
        r'(\d{2,4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일?',
        normalized,
    )
    if m:
        s = _normalize_period_part(m.group(1), m.group(2), m.group(3))
        e = _normalize_period_part(m.group(4), m.group(5), m.group(6))
        return f"{s}~{e}"

    return ""


def _extract_period(soup: BeautifulSoup, raw_text: str = "") -> str:
    """기간 추출 (YYYY.MM.DD~YYYY.MM.DD 또는 26.02.11~26.05.31 등)."""
    body = f"{soup.get_text(separator=' ', strip=True)} {raw_text}".strip()

    # 상단 본문에서 먼저 탐색 (대개 제목 바로 아래 기간이 위치)
    raw_lines = _split_raw_text(raw_text)
    for line in raw_lines[:40]:
        period = _extract_date_range(line)
        if period:
            return period

    # 키워드가 있는 라인에서 우선 추출 (메뉴/푸터 날짜 노이즈 방지)
    keyword_lines = []
    for line in raw_lines:
        if any(kw in line for kw in ("기간", "이벤트 기간", "진행기간", "응모기간", "이용기간")):
            keyword_lines.append(line)
    for line in keyword_lines:
        period = _extract_date_range(line)
        if period:
            return period

    period = _extract_date_range(body)
    if period:
        return period

    for kw in ['기간', '이벤트 기간', '진행기간']:
        elem = soup.find(string=lambda t: t and kw in t)
        if elem:
            text = elem.parent.get_text(strip=True) if elem.parent else elem
            period = _extract_date_range(text)
            if period:
                return period
            if len(text) > 5 and len(text) < 120:
                return text[:100]

    for line in _split_raw_text(raw_text):
        if '기간' in line and len(line) <= 240:
            period = _extract_date_range(line)
            if period:
                return period
            return line

    return ""


def _collect_blocks(
    soup: BeautifulSoup,
    keywords: List[str],
    raw_text: str = "",
    max_len: int = 400,
    max_blocks: int = 20,
) -> List[str]:
    """키워드 포함 텍스트 블록 수집 (중복·짧은 문장 제외). 더 포괄적으로 수집."""
    seen = set()
    blocks: List[str] = []

    def _try_add(text: str) -> None:
        cleaned = _normalize_text(text)
        if not cleaned or len(cleaned) < 6 or len(cleaned) > max_len:
            return
        if _is_header_like(cleaned) or _is_notification_banner(cleaned):
            return
        if _is_non_marketing_noise(cleaned):
            return
        if not any(kw in cleaned for kw in keywords):
            return
        key = _normalize_key(cleaned)
        if not key or key in seen:
            return
        seen.add(key)
        blocks.append(cleaned)

    # 본문 영역 우선 (main, article, .content 등)
    main_areas = soup.select('main, article, .content, .event-detail, [class*="event"], [class*="detail"], [class*="campaign"]')
    if not main_areas:
        main_areas = [soup]

    for area in main_areas:
        for tag in area.find_all(['div', 'section', 'p', 'li', 'td', 'span', 'h2', 'h3', 'h4', 'dl', 'dd']):
            _try_add(tag.get_text(strip=True, separator=' '))
            if len(blocks) >= max_blocks:
                break
        if len(blocks) >= max_blocks:
            break

    # Playwright body inner_text 기반 문장 우선 보강
    if len(blocks) < max_blocks and raw_text:
        for line in _split_raw_text(raw_text):
            _try_add(line)
            if len(blocks) >= max_blocks:
                break

    # soup 전체 텍스트에서도 보강
    if len(blocks) < max_blocks:
        full_text = soup.get_text(separator='\n', strip=True)
        for line in _split_raw_text(full_text):
            _try_add(line)
            if len(blocks) >= max_blocks:
                break

    return blocks[:max_blocks]


def _extract_benefits(soup: BeautifulSoup, raw_text: str = "") -> str:
    """혜택 관련 문단 추출."""
    keywords = _SECTION_KEYWORDS["혜택_상세"]
    blocks = _collect_blocks(soup, keywords, raw_text=raw_text, max_len=320, max_blocks=10)
    return " | ".join(blocks) if blocks else ""


def _extract_conditions(soup: BeautifulSoup, raw_text: str = "") -> str:
    """참여 조건·유의사항 추출."""
    keywords = list(dict.fromkeys(_SECTION_KEYWORDS["참여방법"] + _SECTION_KEYWORDS["유의사항"] + _SECTION_KEYWORDS["제한사항"]))
    blocks = _collect_blocks(soup, keywords, raw_text=raw_text, max_len=320, max_blocks=10)
    return " | ".join(blocks) if blocks else ""


def _extract_target_card(soup: BeautifulSoup, raw_text: str = "") -> str:
    """대상 카드 추출."""
    for kw in ['대상카드', '해당카드', '적용카드', '대상 카드']:
        elem = soup.find(string=lambda t: t and kw in t)
        if elem:
            text = elem.parent.get_text(strip=True) if elem.parent else elem
            if 5 < len(text) < 150:
                return text[:120]

    for line in _split_raw_text(raw_text):
        if any(kw in line for kw in ("대상카드", "대상 카드", "해당카드", "적용카드", "대상 회원", "대상 고객")) and len(line) <= 160:
            return line

    return ""


def _infer_benefit_type(full_text: str) -> str:
    t = full_text.lower()
    if '할인' in t:
        return "할인"
    if '캐시백' in t:
        return "캐시백"
    if '포인트' in t or '적립' in t:
        return "포인트적립"
    if '무이자' in t or '할부' in t:
        return "무이자할부"
    if '증정' in t or '무료' in t:
        return "사은품"
    return "기타"


def _extract_amounts_and_percentages(text: str) -> dict:
    """금액(원, 만원) 및 비율(%) 추출."""
    amounts: List[str] = []
    percentages: List[str] = []

    if not text:
        return {"amounts": amounts, "percentages": percentages}

    # 금액: 3,000원 / 5만원 / 10 만 원
    amount_pattern = r'(\d[\d,]{0,8})\s*(만|천)?\s*원'
    for m in re.finditer(amount_pattern, text):
        value = f"{m.group(1)}{m.group(2) or ''}원"
        value = value.replace(" ", "")
        _push_unique(amounts, value)

    # 비율: 10% / 12.5%
    pct_pattern = r'(\d{1,3}(?:\.\d+)?)\s*(?:%|％|퍼센트)'
    for m in re.finditer(pct_pattern, text):
        value = f"{m.group(1)}%"
        _push_unique(percentages, value)

    return {"amounts": amounts, "percentages": percentages}


def _parse_amount_to_won(amount_text: str) -> int:
    m = re.search(r'(\d[\d,]{0,8})\s*(만|천)?\s*원', amount_text.replace(" ", ""))
    if not m:
        return 0

    value = int(m.group(1).replace(",", ""))
    unit = m.group(2)
    if unit == "만":
        value *= 10000
    elif unit == "천":
        value *= 1000
    return value


def _parse_percentage_value(pct_text: str) -> float:
    m = re.search(r'(\d{1,3}(?:\.\d+)?)', pct_text)
    return float(m.group(1)) if m else 0.0


def _extract_sections(soup: BeautifulSoup, raw_text: str = "") -> dict:
    """raw_text 중심 분류 + soup 보강으로 섹션별 마케팅 문구 구조화."""
    scored_sections: Dict[str, List[Tuple[int, str]]] = {name: [] for name in _SECTION_KEYWORDS}
    seen_by_section = {name: set() for name in _SECTION_KEYWORDS}

    candidate_lines = _split_raw_text(raw_text)
    if len(candidate_lines) < 40:
        candidate_lines.extend(_split_raw_text(soup.get_text(separator="\n", strip=True)))

    seen_candidates = set()
    merged_candidates: List[str] = []
    for line in candidate_lines:
        key = _normalize_key(line)
        if not key or key in seen_candidates:
            continue
        seen_candidates.add(key)
        merged_candidates.append(line)

    for line in merged_candidates:
        scores: Dict[str, int] = {}
        for section_name, keywords in _SECTION_KEYWORDS.items():
            score = _score_line_for_keywords(line, keywords)
            if score > 0:
                scores[section_name] = score

        if not scores:
            continue

        # 섹션 힌트 가중치
        if any(k in line for k in ("유의", "주의", "반드시", "필수")):
            scores["유의사항"] = scores.get("유의사항", 0) + 2
        if any(k in line for k in ("제한", "제외", "불가", "한도", "최대", "최소", "월", "횟수", "선착순")):
            scores["제한사항"] = scores.get("제한사항", 0) + 2
        if any(k in line for k in ("참여", "응모", "신청", "등록", "방법")):
            scores["참여방법"] = scores.get("참여방법", 0) + 2
        if any(k in line for k in ("대상", "회원", "고객", "카드")):
            scores["타겟_고객"] = scores.get("타겟_고객", 0) + 1

        ranked = sorted(scores.items(), key=lambda x: (x[1], len(line)), reverse=True)
        if not ranked:
            continue

        primary_section, primary_score = ranked[0]
        _append_scored_text(scored_sections, seen_by_section, primary_section, line, primary_score)

        # 고신뢰 추가 매칭만 허용해 노이즈 최소화
        for section_name, score in ranked[1:]:
            if score >= 2:
                _append_scored_text(scored_sections, seen_by_section, section_name, line, score)

    # 비어 있는 섹션은 soup/raw_text 블록 수집으로 보강
    for section_name, keywords in _SECTION_KEYWORDS.items():
        if scored_sections[section_name]:
            continue
        fallback_blocks = _collect_blocks(
            soup,
            keywords,
            raw_text=raw_text,
            max_len=500,
            max_blocks=15,
        )
        for block in fallback_blocks:
            _append_scored_text(scored_sections, seen_by_section, section_name, block, score=1)

    sections = {name: [] for name in _SECTION_KEYWORDS}
    for section_name, items in scored_sections.items():
        ranked_items = sorted(items, key=lambda x: (x[0], len(x[1])), reverse=True)
        sections[section_name] = [text for _, text in ranked_items[:25]]

    return sections


def _extract_marketing_insights(extracted_data: dict) -> dict:
    """추출된 데이터로부터 마케팅 인사이트 생성."""
    insights = {
        "혜택_수준": "보통",
        "경쟁력_포인트": [],
        "타겟_명확도": "보통",
        "프로모션_전략": [],
    }

    marketing_content = extracted_data.get("marketing_content") or {}
    if not isinstance(marketing_content, dict):
        marketing_content = {}

    section_text_chunks: List[str] = []
    for value in marketing_content.values():
        if isinstance(value, list):
            section_text_chunks.extend(str(v) for v in value if v)
        elif isinstance(value, str) and value:
            section_text_chunks.append(value)

    section_list = lambda k: marketing_content.get(k, []) if isinstance(marketing_content.get(k), list) else []
    benefit_pool = " ".join(
        filter(
            None,
            [
                extracted_data.get("benefit_value", ""),
                extracted_data.get("conditions", ""),
                " ".join(section_list("혜택_상세")),
                " ".join(section_list("참여방법")),
                " ".join(section_list("유의사항")),
                " ".join(section_list("제한사항")),
                " ".join(section_list("파트너십")),
                " ".join(section_list("마케팅_메시지")),
            ],
        )
    )
    text_pool = " ".join(
        filter(
            None,
            [
                extracted_data.get("title", ""),
                extracted_data.get("target_segment", ""),
                extracted_data.get("raw_text", ""),
                benefit_pool,
            ],
        )
    )

    amounts = _extract_amounts_and_percentages(benefit_pool)
    if not amounts["amounts"] and not amounts["percentages"]:
        amounts = _extract_amounts_and_percentages(text_pool)
    max_amount = max((_parse_amount_to_won(a) for a in amounts["amounts"]), default=0)
    max_pct = max((_parse_percentage_value(p) for p in amounts["percentages"]), default=0.0)

    # 혜택 수준 판단 (raw_text/섹션 기반)
    if max_amount >= 100000 or max_pct >= 30:
        insights["혜택_수준"] = "높음"
    elif max_amount >= 50000 or max_pct >= 20:
        insights["혜택_수준"] = "중상"
    elif max_amount >= 10000 or max_pct >= 10 or any(k in text_pool for k in ("캐시백", "무이자", "할부", "적립", "청구할인")):
        insights["혜택_수준"] = "보통"
    else:
        insights["혜택_수준"] = "낮음"

    # 경쟁력 포인트
    points = insights["경쟁력_포인트"]
    if "무이자" in text_pool or "할부" in text_pool:
        _push_unique(points, "무이자/할부 혜택")
    if max_pct >= 20:
        _push_unique(points, "높은 할인율")
    if max_amount >= 50000:
        _push_unique(points, "고액 혜택")
    if "캐시백" in text_pool:
        _push_unique(points, "즉시 체감형 캐시백")
    if "포인트" in text_pool or "적립" in text_pool:
        _push_unique(points, "포인트 적립형 혜택")
    if marketing_content.get("파트너십"):
        _push_unique(points, "제휴 파트너 연계")
    if any(k in text_pool for k in ("VIP", "프리미엄", "우수회원")):
        _push_unique(points, "프리미엄 고객 혜택")

    # 타겟 명확도
    target_text = " ".join(
        filter(
            None,
            [
                extracted_data.get("target_segment", ""),
                " ".join(marketing_content.get("타겟_고객", [])) if isinstance(marketing_content.get("타겟_고객"), list) else "",
            ],
        )
    )
    target_signals = ["신규", "기존", "VIP", "프리미엄", "회원", "고객", "직장인", "대학생", "법인", "개인", "대상카드", "대상 카드"]
    hit_count = sum(1 for sig in target_signals if sig in target_text)
    has_card_pattern = bool(re.search(r"[가-힣A-Za-z0-9\s]{2,25}카드", target_text))

    if not target_text.strip():
        insights["타겟_명확도"] = "낮음"
    elif ("전체" in target_text or "전 고객" in target_text or "전회원" in target_text) and hit_count <= 2:
        insights["타겟_명확도"] = "낮음"
    elif hit_count >= 3 or has_card_pattern:
        insights["타겟_명확도"] = "높음"
    else:
        insights["타겟_명확도"] = "보통"

    # 프로모션 전략
    strategies = insights["프로모션_전략"]
    if any(k in text_pool for k in ("신규", "첫", "웰컴", "처음")):
        _push_unique(strategies, "신규 고객 유치")
    if any(k in text_pool for k in ("기존", "재이용", "재구매", "재참여")):
        _push_unique(strategies, "기존 고객 리텐션")
    if any(k in text_pool for k in ("한정", "선착순", "마감", "기간한정", "월", "1회", "한도", "최대")):
        _push_unique(strategies, "한정/희소성 프로모션")
    if any(k in text_pool for k in ("응모", "추첨", "참여", "등록", "신청")):
        _push_unique(strategies, "참여 유도형 캠페인")
    if any(k in text_pool for k in ("앱", "온라인", "간편결제", "KB Pay", "삼성카드 앱", "신한SOL")):
        _push_unique(strategies, "디지털 채널 전환")
    if marketing_content.get("파트너십") or "제휴" in text_pool:
        _push_unique(strategies, "브랜드 제휴 확장")
    if max_amount >= 50000 or max_pct >= 20:
        _push_unique(strategies, "공격적 가격 프로모션")

    if not strategies:
        if insights["혜택_수준"] in ("높음", "중상"):
            _push_unique(strategies, "혜택 중심 인지도 강화")
        else:
            _push_unique(strategies, "기본 혜택 유지형")

    return insights


async def extract_from_url(url: str, wait_sec: float = 3) -> dict:
    """
    URL(상세 페이지)에서 iframe과 동일한 화면 내용을 추출하여 구조화.
    모든 마케팅 내용(혜택, 참여방법, 유의사항, 파트너십, 마케팅 메시지 등)을 섹션별로 추출.
    
    Returns:
        dict: 기본 필드 + marketing_content (구조화된 마케팅 정보) + insights (인사이트)
    """
    result = {
        "title": "",
        "period": "",
        "benefit_value": "",
        "conditions": "",
        "target_segment": "",
        "benefit_type": "기타",
        "one_line_summary": "",
        "raw_text": "",
        "marketing_content": {},  # 구조화된 마케팅 정보
        "insights": {},  # 마케팅 인사이트
    }
    if not url or not url.startswith("http"):
        return result

    html = ""
    body_text = ""
    domain_key = _detect_domain_key(url)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
        )
        page = await context.new_page()
        await stealth_async(page)
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=15000)
            await asyncio.sleep(wait_sec)
            for _ in range(3):
                try:
                    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                    await asyncio.sleep(0.8)
                except Exception:
                    pass

            # 본문 렌더링 안정화
            await asyncio.sleep(0.5)
            html = await page.content()

            # 핵심: 실제 렌더링된 body 텍스트를 우선 확보
            try:
                body_text = await page.inner_text("body")
            except Exception:
                body_text = ""

            # body가 빈 경우 주요 컨테이너 셀렉터로 재시도
            if len(_normalize_text(body_text)) < 120:
                base_selectors = [
                    "main", "article", "#content", ".content", ".event-detail", ".evt_cont", ".container",
                    "#main_contents", ".eventViewWrap", "#eventBodyRE", "#eventContents", "#eventContentsWrap",
                ]
                selectors = base_selectors + _DOMAIN_TEXT_SELECTORS.get(domain_key, [])
                for selector in selectors:
                    try:
                        # iframe selector가 잡히면 frame 본문 우선 시도
                        if selector == "iframe":
                            for frame in page.frames:
                                if frame == page.main_frame:
                                    continue
                                try:
                                    candidate = await frame.inner_text("body")
                                    if len(_normalize_text(candidate)) > len(_normalize_text(body_text)):
                                        body_text = candidate
                                except Exception:
                                    continue
                            continue
                        candidate = await page.inner_text(selector)
                        if len(_normalize_text(candidate)) > len(_normalize_text(body_text)):
                            body_text = candidate
                    except Exception:
                        continue

            # 메인 문서가 빈 경우 frame 본문도 시도
            if len(_normalize_text(body_text)) < 120:
                for frame in page.frames:
                    if frame == page.main_frame:
                        continue
                    try:
                        candidate = await frame.inner_text("body")
                        if len(_normalize_text(candidate)) > len(_normalize_text(body_text)):
                            body_text = candidate
                    except Exception:
                        continue

            # 마지막 JS 폴백
            if len(_normalize_text(body_text)) < 60:
                try:
                    candidate = await page.evaluate("() => (document.body && document.body.innerText) ? document.body.innerText : ''")
                    if len(_normalize_text(candidate)) > len(_normalize_text(body_text)):
                        body_text = candidate
                except Exception:
                    pass
        except Exception as e:
            result["raw_text"] = f"로드 실패: {str(e)[:200]}"
            return result
        finally:
            await browser.close()

    if "조회 결과가 없습니다" in html:
        result["raw_text"] = "조회 결과가 없습니다."
        return result

    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "nav", "footer"]):
        tag.decompose()
    for node in soup.select(".all_menu_container, #allMenuList, .siteList, .rect_list, #gnb, #header, #footer"):
        node.decompose()

    full_text = soup.get_text(separator="\n", strip=True)
    raw_text_source = _normalize_text(body_text)
    if not raw_text_source:
        raw_text_source = full_text
    elif len(raw_text_source) < len(_normalize_text(full_text)) * 0.5:
        # body inner_text가 지나치게 짧으면 soup 텍스트를 보강 결합
        raw_text_source = f"{raw_text_source}\n{full_text}"

    raw_lines = _split_raw_text(raw_text_source)
    result["raw_text"] = "\n".join(raw_lines)[:8000]

    result["title"] = _extract_title(soup) or (raw_lines[0][:100] if raw_lines else "")
    result["period"] = _extract_period(soup, result["raw_text"]) or ""
    result["benefit_value"] = _extract_benefits(soup, result["raw_text"]) or ""
    result["conditions"] = _extract_conditions(soup, result["raw_text"]) or ""
    result["target_segment"] = _extract_target_card(soup, result["raw_text"]) or ""
    result["benefit_type"] = _infer_benefit_type(full_text)
    result["one_line_summary"] = result["title"]

    # 구조화된 마케팅 내용 추출
    sections = _extract_sections(soup, raw_text=result["raw_text"])

    # 섹션 기반 fallback으로 핵심 필드 보강
    if not result["benefit_value"] and sections["혜택_상세"]:
        result["benefit_value"] = " | ".join(sections["혜택_상세"][:8])
    if not result["conditions"]:
        merged_conditions = sections["참여방법"][:3] + sections["유의사항"][:3] + sections["제한사항"][:3]
        if merged_conditions:
            result["conditions"] = " | ".join(merged_conditions[:8])
    if not result["target_segment"] and sections["타겟_고객"]:
        result["target_segment"] = " | ".join(sections["타겟_고객"][:3])

    amounts_info = _extract_amounts_and_percentages(
        " ".join(
            [
                result["benefit_value"],
                result["conditions"],
                result["raw_text"],
                full_text,
            ]
        )
    )

    result["marketing_content"] = {
        "혜택_상세": sections["혜택_상세"],
        "참여방법": sections["참여방법"],
        "유의사항": sections["유의사항"],
        "제한사항": sections["제한사항"],
        "파트너십": sections["파트너십"],
        "마케팅_메시지": sections["마케팅_메시지"],
        "타겟_고객": sections["타겟_고객"],
        "혜택_금액": amounts_info["amounts"],
        "혜택_비율": amounts_info["percentages"],
    }

    # 마케팅 인사이트 생성
    result["insights"] = _extract_marketing_insights(result)

    return result
