"""
삼성카드 커넥터 — cms_id 순차 크롤링 방식
"""

import asyncio
from typing import List
from bs4 import BeautifulSoup
from .base import BaseConnector, RawEvent


class SamsungConnector(BaseConnector):
    company_name = "삼성카드"
    list_url = "https://www.samsungcard.com/personal/event/ing/UHPPBE1403M0.jsp"
    BASE_DETAIL = "https://www.samsungcard.com/personal/event/ing/UHPPBE1403M0.jsp?cms_id="

    # cms_id 탐색 범위 (2026년 기준)
    CMS_START = 3733000
    CMS_END = 3740000
    MAX_CONSECUTIVE_FAIL = 60

    async def crawl(self, page) -> List[RawEvent]:
        events: List[RawEvent] = []
        consecutive_fail = 0

        for cms_id in range(self.CMS_START, self.CMS_END):
            url = f"{self.BASE_DETAIL}{cms_id}"
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=12000)
                await asyncio.sleep(1.5)
                html = await page.content()

                if "조회 결과가 없습니다" in html:
                    consecutive_fail += 1
                    if consecutive_fail >= self.MAX_CONSECUTIVE_FAIL:
                        break
                    continue

                consecutive_fail = 0
                soup = BeautifulSoup(html, "lxml")
                title = self._extract_title(soup) or ""
                if not title or len(title) < 3:
                    continue

                period = self._extract_period(soup)
                events.append(RawEvent(
                    url=url,
                    company=self.company_name,
                    title=title,
                    period=period,
                    category=self.infer_category(title),
                    threat_level=self.infer_threat(title),
                    one_line_summary=title,
                    raw_text=soup.get_text(separator=" ", strip=True)[:800],
                ))
            except Exception:
                consecutive_fail += 1
                if consecutive_fail >= self.MAX_CONSECUTIVE_FAIL:
                    break

        return events

    # -- 헬퍼 --
    _HEADER_NOISE = ("삼성카드", "삼성 카드", "로그인", "마이페이지", "이벤트 목록")
    _NOTIFICATION = ("이벤트에 응모되었습니다", "이벤트에 응모 되었습니다")

    def _extract_title(self, soup: BeautifulSoup) -> str:
        for scope_sel in ['main', '.content', '.event-detail', '[class*="event"]', 'article']:
            scope = soup.select_one(scope_sel)
            if not scope:
                continue
            for tag in scope.find_all(["h1", "h2", "h3"]):
                t = tag.get_text(strip=True)
                if t and len(t) >= 4 and not any(n in t for n in self._HEADER_NOISE) \
                        and not any(t.startswith(p) for p in self._NOTIFICATION):
                    return t
        og = soup.find("meta", property="og:title")
        if og and og.get("content"):
            t = og["content"].strip()
            for suffix in (" | 삼성카드", "- 삼성카드"):
                if t.endswith(suffix):
                    t = t[:-len(suffix)].strip()
            if len(t) >= 4:
                return t
        return ""

    def _extract_period(self, soup: BeautifulSoup) -> str:
        import re
        body = soup.get_text(separator=" ", strip=True)
        m = re.search(
            r'(\d{2,4})[./-](\d{1,2})[./-](\d{1,2})\s*(?:~|～|-|–)\s*(\d{2,4})[./-](\d{1,2})[./-](\d{1,2})',
            body,
        )
        if m:
            def _norm(y, mo, d):
                yr = int(y)
                if yr < 100:
                    yr += 2000
                return f"{yr:04d}.{int(mo):02d}.{int(d):02d}"
            return f"{_norm(m[1], m[2], m[3])}~{_norm(m[4], m[5], m[6])}"
        return ""
