"""
현대카드 커넥터.
우선순위:
1) 목록 DOM + 더보기 버튼(pageing)
2) API(/cpb/ev/apiCPBEV0101_05s.hc) 직접 호출 폴백
"""

import asyncio
import logging
import re
from typing import Dict, List, Optional, Set

from .base import BaseConnector, RawEvent

logger = logging.getLogger(__name__)


class HyundaiConnector(BaseConnector):
    company_name = "현대카드"
    list_url = "https://www.hyundaicard.com/cpb/ev/CPBEV0101_01.hc"
    _API_LIST_URL = "https://www.hyundaicard.com/cpb/ev/apiCPBEV0101_05s.hc"
    _DETAIL_PATH = "/cpb/ev/CPBEV0101_06.hc"

    async def crawl(self, page) -> List[RawEvent]:
        events: List[RawEvent] = []
        seen: Set[str] = set()

        try:
            await page.goto(self.list_url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(2.0)
        except Exception as exc:
            logger.warning("[ingest][hyundai] list open failed: %s", str(exc)[:150])
            return events

        await self._collect_from_dom(page, events, seen)
        await self._load_more_and_collect(page, events, seen)

        if len(events) < 80:
            await self._collect_from_api(page, events, seen)

        logger.info("[ingest][hyundai] collected=%s", len(events))
        return events

    async def _collect_from_dom(self, page, events: List[RawEvent], seen: Set[str]) -> None:
        rows = await page.evaluate(
            """
            () => {
              const items = Array.from(document.querySelectorAll('#event_list1 li'));
              return items.map((li) => {
                const anchor = li.querySelector('a[href*="CPBEV0101_06.hc"]');
                if (!anchor) return null;
                const titleEl = li.querySelector('.txt_title');
                const dateEl = li.querySelector('.txt_date');
                const title = titleEl ? titleEl.textContent : anchor.textContent;
                const period = dateEl ? dateEl.textContent : '';
                const text = li.innerText || '';
                return {
                  href: anchor.getAttribute('href') || '',
                  title: title || '',
                  period: period || '',
                  raw_text: text || ''
                };
              }).filter(Boolean);
            }
            """
        )

        for row in rows:
            event = self._event_from_dom_row(row)
            if not event:
                continue
            key = self.event_key(event.url, event.title, event.period)
            if key in seen:
                continue
            seen.add(key)
            events.append(event)

    async def _load_more_and_collect(self, page, events: List[RawEvent], seen: Set[str]) -> None:
        # 렌더 타이밍 이슈로 초기에는 버튼이 잠시 숨겨질 수 있어 짧게 대기
        for _ in range(5):
            try:
                if await page.locator("#moreDiv").is_visible():
                    break
            except Exception:
                pass
            await asyncio.sleep(0.6)

        stagnant = 0
        for _ in range(12):
            try:
                more_div = page.locator("#moreDiv")
                if not await more_div.is_visible():
                    break
            except Exception:
                break

            try:
                before_count = await page.locator("#event_list1 li").count()
                await page.locator("#moreDiv .btn-more").scroll_into_view_if_needed()
                await page.click("#moreDiv .btn-more", timeout=5000)
                await asyncio.sleep(1.2)
                after_count = await page.locator("#event_list1 li").count()
            except Exception:
                await asyncio.sleep(0.8)
                after_count = await page.locator("#event_list1 li").count()

            await self._collect_from_dom(page, events, seen)

            if after_count <= before_count:
                stagnant += 1
                if stagnant >= 2:
                    break
            else:
                stagnant = 0

    async def _collect_from_api(self, page, events: List[RawEvent], seen: Set[str]) -> None:
        rnum = await self._safe_input_value(page, "#rnum", default="56")
        index = await self._safe_input_value(page, "#index", default="29")
        search_word = await self._safe_input_value(page, "#searchWord1", default="")
        evnt_ctgr_vl = await self._safe_input_value(page, "#evntCtgrVl", default="")

        for _ in range(10):
            payload = {
                "rnum": rnum,
                "index": index,
                "searchWord": search_word,
                "evntCtgrVl": evnt_ctgr_vl,
            }
            try:
                response = await page.request.post(self._API_LIST_URL, form=payload)
                if response.status != 200:
                    break
                data = await response.json()
            except Exception as exc:
                logger.debug("[ingest][hyundai] api fetch failed: %s", str(exc)[:120])
                break

            body = data.get("bdy") if isinstance(data, dict) else {}
            event_list = body.get("eventList", []) if isinstance(body, dict) else []
            if not event_list:
                break

            for item in event_list:
                event = self._event_from_api_item(item, search_word)
                if not event:
                    continue
                key = self.event_key(event.url, event.title, event.period)
                if key in seen:
                    continue
                seen.add(key)
                events.append(event)

            paging_info = body.get("cpbev0101_0103VO", {}) if isinstance(body, dict) else {}
            next_rnum = self._safe_next_num(paging_info.get("rnum"), rnum, step=28)
            next_index = self._safe_next_num(paging_info.get("index"), index, step=28)
            if next_rnum == rnum and next_index == index:
                break
            rnum, index = next_rnum, next_index

    def _event_from_dom_row(self, row: Dict) -> Optional[RawEvent]:
        href = row.get("href", "")
        title = row.get("title", "")
        period = row.get("period", "")
        raw_text = row.get("raw_text", "")

        if not href or not title:
            return None

        try:
            return self.build_event(
                url=href,
                title=title,
                period=period,
                raw_text=raw_text,
            )
        except ValueError:
            return None

    def _event_from_api_item(self, item: Dict, search_word: str) -> Optional[RawEvent]:
        if not isinstance(item, dict):
            return None

        event_code = self.clean_text(item.get("bnftWebEvntCd"))
        title = self.clean_title(item.get("bnftEvntNm") or "")
        if not event_code or not title:
            return None

        period = self.normalize_period_text(
            f"{self.clean_text(item.get('srtDttm'))}~{self.clean_text(item.get('endDttm'))}"
        )
        detail_href = f"{self._DETAIL_PATH}?bnftWebEvntCd={event_code}&searchWord={search_word}"
        raw_parts = [
            title,
            self.clean_text(item.get("srtDttm")),
            self.clean_text(item.get("endDttm")),
            self.clean_text(item.get("bnftEvntSmrCn")),
        ]
        raw_text = " | ".join([part for part in raw_parts if part])

        try:
            return self.build_event(
                url=detail_href,
                title=title,
                period=period,
                raw_text=raw_text,
            )
        except ValueError:
            return None

    async def _safe_input_value(self, page, selector: str, default: str) -> str:
        try:
            value = await page.locator(selector).input_value()
            return self.clean_text(value) or default
        except Exception:
            return default

    def _safe_next_num(self, current_value: Optional[str], fallback: str, step: int) -> str:
        try:
            return str(int(self.clean_text(current_value)) + step)
        except Exception:
            try:
                return str(int(self.clean_text(fallback)) + step)
            except Exception:
                return fallback
