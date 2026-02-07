"""단위 테스트: 카드사 커넥터 파싱/정규화 헬퍼"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules.connectors.base import BaseConnector
from modules.connectors.hyundai import HyundaiConnector
from modules.connectors.kb import KBConnector
from modules.connectors.shinhan import ShinhanConnector


class _DummyConnector(BaseConnector):
    company_name = "테스트카드"
    list_url = "https://example.com/list"

    async def crawl(self, page):
        return []


def test_base_normalize_url_and_period():
    c = _DummyConnector()
    normalized = c.normalize_url(
        "https://example.com/detail?utm_source=x&b=2&a=1&searchWord=",
        base_url=c.list_url,
    )
    assert normalized == "https://example.com/detail?a=1&b=2"

    period = c.build_period("20260201", "20260331")
    assert period == "2026.02.01~2026.03.31"


def test_shinhan_extract_event_items():
    connector = ShinhanConnector()
    payload = {
        "root": {"evnlist": [{"mobWbEvtNm": "A", "hpgEvtDlPgeUrlAr": "/evt/A"}]},
        "mbw_json": {"zipEvtList": [{"mobWbEvtNm": "B", "hpgEvtDlPgeUrlAr": "/evt/B"}]},
    }
    rows = list(connector._extract_event_items(payload))
    assert len(rows) == 2


def test_hyundai_event_from_api_item():
    connector = HyundaiConnector()
    item = {
        "bnftWebEvntCd": "ABC123",
        "bnftEvntNm": "2월 5만원 캐시백 이벤트",
        "srtDttm": "2026. 2. 1",
        "endDttm": "2026. 2. 28",
    }
    event = connector._event_from_api_item(item, "")
    assert event is not None
    assert "CPBEV0101_06.hc" in event.url
    assert "bnftWebEvntCd=ABC123" in event.url


def test_kb_parse_events_from_html():
    connector = KBConnector()
    html = """
    <div id="main_contents">
      <ul class="eventList">
        <li>
          <a href="javascript:goDetail('1000096', '', '1');">
            <div class="evtlist-desc">
              <span class="tit">2026 겨울방학 긁을수록 터진다!</span>
              <span class="date">2026.1.9(금) ~ 2.8(일)</span>
            </div>
          </a>
        </li>
      </ul>
    </div>
    """
    events = connector._parse_events_from_html(html)
    assert len(events) == 1
    assert events[0].title.startswith("2026 겨울방학")
    assert "eventNum=1000096" in events[0].url


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"  PASS {name}")
            except AssertionError as exc:
                print(f"  FAIL {name}: {exc}")
                raise
    print("Done.")
