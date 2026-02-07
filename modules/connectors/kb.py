"""
KB국민카드 커넥터.
목록 페이지는 javascript:goDetail + doSearchSpider(pageCount) 구조이므로
form POST(pageCount) 기반으로 페이지를 순회한다.
"""

import asyncio
import logging
import re
from typing import Dict, List, Optional, Set

from bs4 import BeautifulSoup

from .base import BaseConnector, RawEvent

logger = logging.getLogger(__name__)


class KBConnector(BaseConnector):
    company_name = "KB국민카드"
    list_url = "https://card.kbcard.com/BON/DVIEW/HBBMCXCRVNEC0001"
    _MAX_PAGE = 40

    async def crawl(self, page) -> List[RawEvent]:
        events: List[RawEvent] = []
        seen: Set[str] = set()

        try:
            await page.goto(self.list_url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(1.5)
        except Exception as exc:
            logger.warning("[ingest][kb] list open failed: %s", str(exc)[:150])
            return events

        for page_no in range(1, self._MAX_PAGE + 1):
            html = await self._fetch_page_html(page, page_no)
            if not html:
                break

            page_events = self._parse_events_from_html(html)
            if not page_events:
                break

            added = 0
            for event in page_events:
                key = self.event_key(event.url, event.title, event.period)
                if key in seen:
                    continue
                seen.add(key)
                events.append(event)
                added += 1

            if added == 0:
                break

        logger.info("[ingest][kb] collected=%s", len(events))
        return events

    async def _fetch_page_html(self, page, page_no: int) -> str:
        payload = self._build_page_payload(page_no)
        try:
            response = await page.request.post(self.list_url, form=payload)
            if response.status != 200:
                return ""
            return await response.text()
        except Exception as exc:
            logger.debug("[ingest][kb] page=%s fetch failed: %s", page_no, str(exc)[:120])
            return ""

    def _build_page_payload(self, page_no: int) -> Dict[str, str]:
        return {
            "pageCount": str(page_no),
            "카드이벤트구분": "",
            "이벤트혜택구분": "ALL",
            "이벤트일련번호": "",
            "가맹점분류코드": "",
            "prevUrl": "HBBMCXCRVNEC0001",
            "대고객게시여부": "",
            "admin": "",
        }

    def _parse_events_from_html(self, html: str) -> List[RawEvent]:
        soup = BeautifulSoup(html, "lxml")
        anchors = soup.select("#main_contents a[href^='javascript:goDetail'], .eventList a[href^='javascript:goDetail']")
        events: List[RawEvent] = []

        for anchor in anchors:
            href = anchor.get("href", "")
            event_no = self._extract_event_no(href)
            if not event_no:
                continue

            title = self._extract_title(anchor)
            if not title:
                continue

            block_text = self.clean_text(anchor.get_text(" ", strip=True))
            period = self._extract_period_from_text(block_text)
            detail_url = f"{self.list_url}?mainCC=a&eventNum={event_no}"

            try:
                event = self.build_event(
                    url=detail_url,
                    title=title,
                    period=period,
                    raw_text=block_text,
                )
            except ValueError:
                continue

            events.append(event)

        return events

    def _extract_event_no(self, href: str) -> str:
        m = re.search(r"goDetail\('(\d+)'", href or "")
        return m.group(1) if m else ""

    def _extract_title(self, anchor) -> str:
        for selector in (".evtlist-desc .tit", ".evtlist-desc .title", ".tit", ".title", "strong"):
            el = anchor.select_one(selector)
            if el:
                title = self.clean_title(el.get_text(" ", strip=True))
                if title:
                    return title

        img = anchor.select_one("img[alt]")
        if img:
            title = self.clean_title(img.get("alt", ""))
            if title:
                return title

        text = self.clean_text(anchor.get_text(" ", strip=True))
        text = re.sub(
            r"\d{4}\.\d{1,2}\.\d{1,2}\s*(?:\([^)]*\))?\s*(?:~|∼|～|-|–)\s*\d{1,4}\.\d{1,2}\.\d{1,2}\s*(?:\([^)]*\))?",
            "",
            text,
        )
        return self.clean_title(text[:80])

    def _extract_period_from_text(self, text: str) -> str:
        m = re.search(
            r"(\d{4}\.\d{1,2}\.\d{1,2})(?:\([^)]*\))?\s*(?:~|∼|～|-|–)\s*(\d{1,4}\.\d{1,2}\.\d{1,2})(?:\([^)]*\))?",
            text or "",
        )
        if not m:
            return ""

        start = m.group(1)
        end = m.group(2)
        if len(end.split(".")[0]) < 4:
            start_year = start.split(".")[0]
            end = f"{start_year}.{end}"
        return self.normalize_period_text(f"{start}~{end}")
