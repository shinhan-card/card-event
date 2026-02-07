"""
카드사 커넥터 베이스 클래스.
모든 카드사 커넥터는 동일한 출력 스키마(RawEvent)를 반환한다.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
import re
from typing import List, Optional
from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit, urlunsplit


@dataclass
class RawEvent:
    """크롤러가 수집한 원시 이벤트 데이터"""
    url: str
    company: str
    title: str
    period: str = ""
    category: str = ""
    benefit_type: str = ""
    benefit_value: str = ""
    conditions: str = ""
    target_segment: str = ""
    threat_level: str = "Low"
    one_line_summary: str = ""
    raw_text: str = ""

    def to_dict(self) -> dict:
        return {k: v for k, v in self.__dict__.items() if v}


class BaseConnector(ABC):
    """카드사 커넥터 추상 베이스 클래스"""

    company_name: str = ""
    list_url: str = ""

    _CATEGORY_KEYWORDS = {
        "여행": ["여행", "호텔", "항공", "리조트", "해외", "마일리지"],
        "쇼핑": ["쇼핑", "백화점", "마트", "온라인", "쿠팡", "11번가"],
        "식음료": ["식사", "레스토랑", "다이닝", "스타벅스", "카페", "배달", "음식"],
        "교통": ["자동차", "주유", "차량", "하이패스", "교통"],
        "문화": ["영화", "공연", "문화", "CGV", "도서", "OTT"],
        "금융": ["금리", "대출", "할부", "금융", "적금", "예금"],
        "통신": ["통신", "넷플릭스", "유튜브", "구독", "멜론"],
    }
    _DROP_QUERY_KEYS = {
        "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
        "fbclid", "gclid", "vst_clck_nm", "vst_page_nm",
    }
    _TITLE_NOISE_PREFIXES = (
        "진행중 이벤트", "이벤트", "혜택", "상세", "본문 바로가기",
    )

    def infer_category(self, text: str) -> str:
        value = text or ""
        for cat, keywords in self._CATEGORY_KEYWORDS.items():
            if any(word in value for word in keywords):
                return cat
        return "생활"

    def infer_threat(self, text: str) -> str:
        value = text or ""
        high = ["10만원", "20만원", "30만원", "50만원", "100만원", "최대", "프리미엄", "VIP"]
        mid = ["1만원", "2만원", "3만원", "5만원", "5천원", "캐시백", "할인"]
        if any(word in value for word in high):
            return "High"
        if any(word in value for word in mid):
            return "Mid"
        return "Low"

    def clean_text(self, value: Optional[str]) -> str:
        if value is None:
            return ""
        text = re.sub(r"\s+", " ", str(value)).strip()
        return text

    def clean_title(self, title: Optional[str]) -> str:
        text = self.clean_text(title)
        if not text:
            return ""
        for prefix in self._TITLE_NOISE_PREFIXES:
            if text == prefix:
                return ""
        return text

    def normalize_url(self, href: Optional[str], base_url: Optional[str] = None) -> str:
        raw = self.clean_text(href)
        if not raw:
            return ""
        lowered = raw.lower()
        if lowered.startswith(("javascript:", "mailto:", "tel:")):
            return ""

        abs_url = urljoin(base_url or self.list_url, raw)
        parts = urlsplit(abs_url)
        if not parts.scheme or not parts.netloc:
            return ""

        query_items = []
        for key, value in parse_qsl(parts.query, keep_blank_values=True):
            k = key.strip()
            v = value.strip()
            if not k:
                continue
            if k.lower() in self._DROP_QUERY_KEYS:
                continue
            if k == "searchWord" and not v:
                continue
            query_items.append((k, v))

        query_items.sort()
        normalized_query = urlencode(query_items, doseq=True)
        normalized = urlunsplit((parts.scheme, parts.netloc, parts.path, normalized_query, ""))
        return normalized

    def format_compact_date(self, yyyymmdd: Optional[str]) -> str:
        text = re.sub(r"[^0-9]", "", str(yyyymmdd or ""))
        if len(text) != 8:
            return ""
        return f"{text[0:4]}.{text[4:6]}.{text[6:8]}"

    def normalize_period_text(self, text: Optional[str]) -> str:
        value = self.clean_text(text)
        if not value:
            return ""

        m = re.search(
            r"(\d{2,4})[./-](\d{1,2})[./-](\d{1,2})\s*(?:~|∼|～|-|–)\s*(\d{1,4})[./-](\d{1,2})[./-](\d{1,2})",
            value,
        )
        if not m:
            return value

        sy = int(m.group(1))
        sm = int(m.group(2))
        sd = int(m.group(3))
        ey = int(m.group(4))
        em = int(m.group(5))
        ed = int(m.group(6))

        if sy < 100:
            sy += 2000
        if ey < 100:
            ey += 2000
        if ey < 1000:
            ey = sy

        return f"{sy:04d}.{sm:02d}.{sd:02d}~{ey:04d}.{em:02d}.{ed:02d}"

    def build_period(self, start_yyyymmdd: Optional[str], end_yyyymmdd: Optional[str]) -> str:
        start = self.format_compact_date(start_yyyymmdd)
        end = self.format_compact_date(end_yyyymmdd)
        if start and end:
            return f"{start}~{end}"
        if start:
            return start
        return end

    def event_key(self, url: str, title: str, period: str) -> str:
        if url:
            return f"url::{url.lower()}"
        return f"title::{self.clean_text(title).lower()}::{self.clean_text(period).lower()}"

    def build_event(
        self,
        *,
        url: str,
        title: str,
        period: str = "",
        raw_text: str = "",
        benefit_type: str = "",
        benefit_value: str = "",
        conditions: str = "",
        target_segment: str = "",
    ) -> RawEvent:
        clean_url = self.normalize_url(url, base_url=self.list_url)
        clean_title = self.clean_title(title)
        if not clean_url or not clean_title:
            raise ValueError("url/title is required")

        clean_period = self.normalize_period_text(period)
        clean_raw_text = self.clean_text(raw_text)[:800]
        category_source = f"{clean_title} {clean_raw_text}".strip()
        threat_source = f"{clean_title} {clean_period} {clean_raw_text}".strip()

        return RawEvent(
            url=clean_url,
            company=self.company_name,
            title=clean_title,
            period=clean_period,
            category=self.infer_category(category_source),
            benefit_type=self.clean_text(benefit_type),
            benefit_value=self.clean_text(benefit_value),
            conditions=self.clean_text(conditions),
            target_segment=self.clean_text(target_segment),
            threat_level=self.infer_threat(threat_source),
            one_line_summary=clean_title,
            raw_text=clean_raw_text,
        )

    @abstractmethod
    async def crawl(self, page) -> List[RawEvent]:
        """
        Playwright Page를 받아 이벤트 목록을 수집.
        Args:
            page: playwright Page 인스턴스 (stealth 적용 완료 상태)
        Returns:
            List[RawEvent]
        """
        ...
