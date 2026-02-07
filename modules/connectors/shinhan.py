"""
신한카드 커넥터.
우선순위:
1) 정적 JSON(evnPgsList01)에서 목록 확보
2) 모바일 AJAX(MOBFM829R03.ajax) 보강
3) DOM 파싱 최종 폴백
"""

import asyncio
import logging
import re
from typing import Dict, Iterable, List, Optional, Set

from bs4 import BeautifulSoup

from .base import BaseConnector, RawEvent

logger = logging.getLogger(__name__)


class ShinhanConnector(BaseConnector):
    company_name = "신한카드"
    list_url = "https://www.shinhancard.com/mob/MOBFM829N/MOBFM829R03.shc?sourcePage=R01"
    _PRIMARY_JSON_URLS = (
        "https://www.shinhancard.com/logic/json/evnPgsList01.json",
        "https://www.shinhancard.com/logic/json/evnPgsList02.json",
        "https://www.shinhancard.com/logic/json/evnPgsList03.json",
    )
    _MOBILE_AJAX_URL = "https://www.shinhancard.com/mob/MOBFM829N/MOBFM829R03.ajax"

    async def crawl(self, page) -> List[RawEvent]:
        events: List[RawEvent] = []
        seen: Set[str] = set()

        events.extend(await self._crawl_from_json_urls(page, seen))
        if len(events) < 100:
            events.extend(await self._crawl_from_mobile_ajax(page, seen))
        if len(events) < 80:
            events.extend(await self._crawl_from_dom(page, seen))

        logger.info("[ingest][shinhan] collected=%s", len(events))
        return events

    async def _crawl_from_json_urls(self, page, seen: Set[str]) -> List[RawEvent]:
        collected: List[RawEvent] = []
        for json_url in self._PRIMARY_JSON_URLS:
            try:
                response = await page.request.get(json_url)
                if response.status != 200:
                    continue
                payload = await response.json()
            except Exception as exc:
                logger.debug("[ingest][shinhan] json fetch failed %s: %s", json_url, str(exc)[:120])
                continue

            for item in self._extract_event_items(payload):
                event = self._event_from_item(item)
                if not event:
                    continue
                key = self.event_key(event.url, event.title, event.period)
                if key in seen:
                    continue
                seen.add(key)
                collected.append(event)

        return collected

    async def _crawl_from_mobile_ajax(self, page, seen: Set[str]) -> List[RawEvent]:
        collected: List[RawEvent] = []
        try:
            response = await page.request.get(self._MOBILE_AJAX_URL)
            if response.status != 200:
                return collected
            payload = await response.json()
        except Exception as exc:
            logger.debug("[ingest][shinhan] mobile ajax failed: %s", str(exc)[:120])
            return collected

        for item in self._extract_event_items(payload):
            event = self._event_from_item(item)
            if not event:
                continue
            key = self.event_key(event.url, event.title, event.period)
            if key in seen:
                continue
            seen.add(key)
            collected.append(event)

        return collected

    async def _crawl_from_dom(self, page, seen: Set[str]) -> List[RawEvent]:
        collected: List[RawEvent] = []
        try:
            await page.goto(self.list_url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(2.0)
        except Exception as exc:
            logger.debug("[ingest][shinhan] dom open failed: %s", str(exc)[:120])
            return collected

        for _ in range(8):
            count = await page.locator("#evtList li.list_area, #evtList [data-bind-item]").count()
            if count >= 50:
                break
            try:
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            except Exception:
                pass
            await asyncio.sleep(0.8)

        html = await page.content()
        soup = BeautifulSoup(html, "lxml")
        link_candidates = soup.select(
            "a[href*='/pconts/html/benefit/event/'], "
            "a[href*='/evt/'], "
            "a[href*='MOBEVENTN'], "
            "a[href*='MOBFM829R02']"
        )

        for anchor in link_candidates:
            href = anchor.get("href", "")
            url = self.normalize_url(href, base_url=self.list_url)
            if not url:
                continue
            container = anchor.find_parent(["li", "div", "article", "section"]) or anchor
            title = self.clean_title(anchor.get_text(" ", strip=True))
            raw_text = self.clean_text(container.get_text(" ", strip=True))
            if not title:
                title = self._infer_title_from_block(raw_text)
            if not title:
                continue
            period = self._extract_period_from_text(raw_text)

            try:
                event = self.build_event(
                    url=url,
                    title=title,
                    period=period,
                    raw_text=raw_text,
                )
            except ValueError:
                continue

            key = self.event_key(event.url, event.title, event.period)
            if key in seen:
                continue
            seen.add(key)
            collected.append(event)

        return collected

    def _extract_event_items(self, payload: dict) -> Iterable[Dict]:
        if not isinstance(payload, dict):
            return []

        items: List[Dict] = []
        root = payload.get("root")
        if isinstance(root, dict) and isinstance(root.get("evnlist"), list):
            items.extend([row for row in root["evnlist"] if isinstance(row, dict)])

        mbw = payload.get("mbw_json")
        if isinstance(mbw, dict):
            for key in ("dpEvtList", "ingEvtList", "zipEvtList", "evtList"):
                values = mbw.get(key)
                if isinstance(values, list):
                    items.extend([row for row in values if isinstance(row, dict)])

        return items

    def _event_from_item(self, item: Dict) -> Optional[RawEvent]:
        title = self.clean_title(
            item.get("mobWbEvtNm")
            or item.get("evtImgSlTilNm")
            or item.get("evtImgRplNm")
            or ""
        )
        if not title:
            return None

        href = (
            item.get("hpgEvtDlPgeUrlAr")
            or item.get("evtDtlUrl")
            or item.get("evtUrlAr")
            or ""
        )
        url = self.normalize_url(href, base_url=self.list_url)
        if not url:
            return None

        period = self.build_period(item.get("mobWbEvtStd"), item.get("mobWbEvtEdd"))
        if not period:
            period = self.normalize_period_text(item.get("evtTermTxt") or item.get("eventPeriod"))

        raw_parts = [
            title,
            self.clean_text(item.get("hpgEvtSmrTt")),
            self.clean_text(item.get("evtImgSlTilNm")),
            self.clean_text(item.get("evtImgRplNm")),
            period,
        ]
        raw_text = " | ".join([part for part in raw_parts if part])

        try:
            return self.build_event(
                url=url,
                title=title,
                period=period,
                raw_text=raw_text,
            )
        except ValueError:
            return None

    def _extract_period_from_text(self, text: str) -> str:
        m = re.search(
            r"(\d{2,4}[./-]\d{1,2}[./-]\d{1,2})\s*(?:~|∼|～|-|–)\s*(\d{2,4}[./-]\d{1,2}[./-]\d{1,2})",
            text or "",
        )
        if not m:
            return ""
        period = f"{m.group(1)}~{m.group(2)}"
        return self.normalize_period_text(period)

    def _infer_title_from_block(self, text: str) -> str:
        for chunk in re.split(r"[|·•]+", text or ""):
            candidate = self.clean_title(chunk)
            if not candidate:
                continue
            if len(candidate) < 4:
                continue
            if "이벤트" in candidate or "혜택" in candidate:
                return candidate
        return ""
