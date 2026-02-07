"""
Smart Multi-Strategy Crawler
각 카드사별로 최적의 크롤링 전략 적용

전략:
- 삼성카드: API 인터셉트 ✅ (이미 성공)
- 신한카드: 페이지네이션 + 직접 추출
- 현대카드: 카테고리 탭 순회 + API 인터셉트
- KB국민카드: iframe + 직접 추출
"""

import asyncio
import sys
import io
import json
import os
import random
from typing import List, Dict
from playwright.async_api import async_playwright, Page, Browser, Response
from playwright_stealth import stealth_async
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from database import SessionLocal, insert_event, init_db

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

load_dotenv()


class SmartMultiStrategyCrawler:
    """카드사별 맞춤형 크롤러"""
    
    def __init__(self):
        self.browser: Browser = None
        self.page: Page = None
        self.captured_apis: List[Dict] = []
    
    async def init_browser(self, headless: bool = True):
        """Stealth 브라우저"""
        playwright = await async_playwright().start()
        
        self.browser = await playwright.chromium.launch(
            headless=headless,
            args=['--disable-blink-features=AutomationControlled', '--window-size=1920,1080']
        )
        
        context = await self.browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            viewport={'width': 1920, 'height': 1080},
            locale='ko-KR',
        )
        
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
            window.chrome = {runtime: {}};
        """)
        
        self.page = await context.new_page()
        await stealth_async(self.page)
        
        print("[OK] 브라우저 초기화\n")
    
    # ==================== 삼성카드: API 인터셉트 ====================
    
    async def crawl_samsung(self) -> List[Dict]:
        """삼성카드: API 인터셉트 (이미 검증됨)"""
        print("="*70)
        print("[삼성카드] API 인터셉트 전략")
        print("="*70 + "\n")
        
        self.captured_apis = []
        
        async def handle_response(response: Response):
            try:
                url = response.url
                if 'samsungcard.com' not in url:
                    return
                if 'json' not in response.headers.get('content-type', ''):
                    return
                if not any(k in url.lower() for k in ['event', 'list', 'benefit']):
                    return
                if any(e in url.lower() for e in ['tracking', 'mpulse']):
                    return
                
                json_data = await response.json()
                data_size = len(json.dumps(json_data))
                if data_size < 100:
                    return
                
                self.captured_apis.append({'data': json_data, 'url': url})
                print(f"  ✅ API 캡처! {url[:60]}... ({data_size} bytes)")
            except:
                pass
        
        self.page.on('response', handle_response)
        
        await self.page.goto("https://www.samsungcard.com/personal/benefit/event/list.do", timeout=60000)
        await asyncio.sleep(5)
        
        # 더보기 클릭
        for i in range(10):
            try:
                btn = await self.page.query_selector('button:has-text("더보기")')
                if btn and await btn.is_visible():
                    await btn.click()
                    print("  ✅ 더보기 클릭")
                    await asyncio.sleep(3)
            except Exception as e:
                pass
            
            try:
                await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                await asyncio.sleep(2)
            except Exception as e:
                # 페이지 전환 오류 무시하고 계속
                print(f"  [WARN] 스크롤 오류 무시")
                break
        
        # 파싱
        events = []
        for api in self.captured_apis:
            event_list = api['data'].get('listPeiHPPPrgEvnInqrDVO', [])
            for event in event_list:
                title = event.get('cmpTitNm', '').strip()
                if not title or title == ' ':
                    continue
                
                events.append(self.parse_samsung_event(event))
        
        print(f"\n[삼성카드] 수집: {len(events)}개\n")
        return events
    
    def parse_samsung_event(self, event: Dict) -> Dict:
        """삼성카드 이벤트 파싱"""
        title = event.get('cmpTitNm', '').strip()
        start = event.get('cmsCmpStrtdt', '')
        end = event.get('cmsCmpEnddt', '')
        event_id = event.get('cmpId', '')
        
        start_fmt = f"{start[:4]}.{start[4:6]}.{start[6:8]}" if start and len(start) == 8 else ""
        end_fmt = f"{end[:4]}.{end[4:6]}.{end[6:8]}" if end and len(end) == 8 else ""
        period = f"{start_fmt}~{end_fmt}" if start_fmt else "정보 없음"
        
        # 올바른 URL 생성 (cmsId 사용)
        cms_id = event.get('cmsId', '')
        if cms_id:
            url = f"https://www.samsungcard.com/personal/event/ing/UHPPBE1403M0.jsp?cms_id={cms_id}"
        else:
            url = f"https://www.samsungcard.com/personal/benefit/event/view.do?evtId={event_id}"
        
        return {
            "url": url,
            "company": "삼성카드",
            "category": self.infer_category(title),
            "title": title,
            "period": period,
            "benefit_type": "정보 없음",
            "benefit_value": "상세 페이지 참조",
            "conditions": "상세 페이지 참조",
            "target_segment": "일반",
            "threat_level": self.infer_threat(title),
            "one_line_summary": title,
            "raw_text": json.dumps(event, ensure_ascii=False)[:500]
        }
    
    # ==================== 신한카드: HTML 직접 파싱 ====================
    
    async def crawl_shinhan(self) -> List[Dict]:
        """신한카드: HTML 직접 파싱"""
        print("="*70)
        print("[신한카드] HTML 파싱 전략")
        print("="*70 + "\n")
        
        await self.page.goto("https://www.shinhancard.com/pconts/html/benefit/event/main.html", timeout=60000)
        await asyncio.sleep(5)
        
        # 강력한 스크롤
        for i in range(20):
            await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(1)
        
        # HTML 파싱
        html = await self.page.content()
        soup = BeautifulSoup(html, 'lxml')
        
        events = []
        
        # 이벤트 리스트 찾기 (다양한 패턴)
        event_containers = soup.select('.event-list li, .list-item, article.event, div.event-card, .event-box')
        
        print(f"  발견된 컨테이너: {len(event_containers)}개")
        
        for container in event_containers[:50]:
            # 제목 찾기
            title_elem = container.select_one('h3, h4, .title, .event-title, strong')
            if not title_elem:
                continue
            
            title = title_elem.get_text(strip=True)
            if len(title) < 3:
                continue
            
            # 링크 찾기
            link_elem = container.find('a')
            if link_elem:
                href = link_elem.get('href', '')
                if href.startswith('/'):
                    url = f"https://www.shinhancard.com{href}"
                elif href.startswith('http'):
                    url = href
                else:
                    url = f"https://www.shinhancard.com/pconts/html/benefit/event/{href}"
            else:
                url = "https://www.shinhancard.com/pconts/html/benefit/event/main.html"
            
            # 기간 찾기
            period_elem = container.select_one('.period, .date, .event-date, span.date')
            period = period_elem.get_text(strip=True) if period_elem else "정보 없음"
            
            events.append({
                "url": url,
                "company": "신한카드",
                "category": self.infer_category(title),
                "title": title,
                "period": period,
                "benefit_type": "정보 없음",
                "benefit_value": "상세 페이지 참조",
                "conditions": "상세 페이지 참조",
                "target_segment": "일반",
                "threat_level": self.infer_threat(title),
                "one_line_summary": title,
                "raw_text": container.get_text(strip=True)[:500]
            })
        
        print(f"\n[신한카드] 수집: {len(events)}개\n")
        return events
    
    # ==================== 현대카드: 탭 순회 + API ====================
    
    async def crawl_hyundai(self) -> List[Dict]:
        """현대카드: 카테고리 탭 클릭 + API 인터셉트"""
        print("="*70)
        print("[현대카드] 탭 순회 + API 전략")
        print("="*70 + "\n")
        
        self.captured_apis = []
        
        async def handle_response(response: Response):
            try:
                url = response.url
                if 'hyundaicard.com' not in url:
                    return
                if 'json' not in response.headers.get('content-type', ''):
                    return
                if 'event' not in url.lower() and 'list' not in url.lower():
                    return
                
                json_data = await response.json()
                if len(json.dumps(json_data)) > 100:
                    self.captured_apis.append({'data': json_data, 'url': url})
                    print(f"  ✅ API 캡처! {url[:60]}...")
            except:
                pass
        
        self.page.on('response', handle_response)
        
        await self.page.goto("https://www.hyundaicard.com/event/eventlist.hdc", timeout=60000)
        await asyncio.sleep(5)
        
        # 모든 탭/카테고리 클릭 시도
        tab_selectors = [
            'button', 'a.tab', '.tab-item', '.category', '[role="tab"]',
            'li.tab', 'button.category'
        ]
        
        for selector in tab_selectors:
            try:
                tabs = await self.page.query_selector_all(selector)
                for i, tab in enumerate(tabs[:10]):
                    try:
                        if await tab.is_visible():
                            await tab.click()
                            print(f"  탭 클릭: {i+1}")
                            await asyncio.sleep(2)
                    except:
                        pass
            except:
                pass
        
        # 스크롤
        for _ in range(30):
            await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(1)
        
        # API가 없으면 HTML 파싱
        if not self.captured_apis:
            print("  API 없음, HTML 파싱...")
            html = await self.page.content()
            soup = BeautifulSoup(html, 'lxml')
            
            events = []
            containers = soup.select('.event-item, .card-item, article, li.item')[:50]
            
            for container in containers:
                title_elem = container.select_one('h3, h4, .title, strong')
                if not title_elem:
                    continue
                
                title = title_elem.get_text(strip=True)
                if len(title) < 3:
                    continue
                
                link = container.find('a')
                url = link.get('href', '') if link else ""
                if url and url.startswith('/'):
                    url = f"https://www.hyundaicard.com{url}"
                
                events.append({
                    "url": url or "https://www.hyundaicard.com/event/eventlist.hdc",
                    "company": "현대카드",
                    "category": self.infer_category(title),
                    "title": title,
                    "period": "정보 없음",
                    "benefit_type": "정보 없음",
                    "benefit_value": "상세 페이지 참조",
                    "conditions": "상세 페이지 참조",
                    "target_segment": "일반",
                    "threat_level": self.infer_threat(title),
                    "one_line_summary": title,
                    "raw_text": container.get_text(strip=True)[:500]
                })
            
            print(f"\n[현대카드] 수집: {len(events)}개\n")
            return events
        
        # API 파싱 (TODO)
        print(f"\n[현대카드] API 수집: {len(self.captured_apis)}개\n")
        return []
    
    # ==================== KB국민카드: Selenium 스타일 대기 ====================
    
    async def crawl_kb(self) -> List[Dict]:
        """KB국민카드: 긴 대기 + HTML 파싱"""
        print("="*70)
        print("[KB국민카드] 긴 대기 + HTML 전략")
        print("="*70 + "\n")
        
        await self.page.goto("https://www.kbcard.com/CRD/DVIEW/MBCXBDDAMBC0001.do", timeout=60000)
        
        # 매우 긴 대기 (JavaScript 완전 로딩)
        print("  페이지 로딩 대기 (10초)...")
        await asyncio.sleep(10)
        
        # 모든 요소가 로드될 때까지 대기
        try:
            await self.page.wait_for_selector('body', timeout=10000)
        except:
            pass
        
        # 강력한 스크롤
        for _ in range(30):
            await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(1.5)
        
        # HTML 파싱
        html = await self.page.content()
        soup = BeautifulSoup(html, 'lxml')
        
        events = []
        
        # KB국민카드 특화 셀렉터
        containers = soup.select('div.event-list li, tr, div.item, article')[:50]
        
        print(f"  발견된 요소: {len(containers)}개")
        
        for container in containers:
            title_elem = container.select_one('h3, h4, td.title, .title, strong, span.subject')
            if not title_elem:
                continue
            
            title = title_elem.get_text(strip=True)
            if len(title) < 3 or '이벤트' not in title and '혜택' not in title:
                continue
            
            link = container.find('a')
            url = link.get('href', '') if link else ""
            if url and url.startswith('/'):
                url = f"https://www.kbcard.com{url}"
            
            events.append({
                "url": url or "https://www.kbcard.com/CRD/DVIEW/MBCXBDDAMBC0001.do",
                "company": "KB국민카드",
                "category": self.infer_category(title),
                "title": title,
                "period": "정보 없음",
                "benefit_type": "정보 없음",
                "benefit_value": "상세 페이지 참조",
                "conditions": "상세 페이지 참조",
                "target_segment": "일반",
                "threat_level": self.infer_threat(title),
                "one_line_summary": title,
                "raw_text": container.get_text(strip=True)[:500]
            })
        
        print(f"\n[KB국민카드] 수집: {len(events)}개\n")
        return events
    
    # ==================== 유틸리티 ====================
    
    def infer_category(self, title: str) -> str:
        """카테고리 추론"""
        if any(w in title for w in ['여행', '호텔', '항공', '리조트']):
            return "여행"
        elif any(w in title for w in ['쇼핑', '할인', '백화점', '마트']):
            return "쇼핑"
        elif any(w in title for w in ['식사', '레스토랑', '다이닝', '스타벅스', '카페']):
            return "식음료"
        elif any(w in title for w in ['자동차', '보험', '주유', '차량']):
            return "교통"
        elif any(w in title for w in ['영화', '공연', '문화', 'CGV']):
            return "문화"
        elif any(w in title for w in ['금리', '대출', '할부', '금융']):
            return "금융"
        elif any(w in title for w in ['통신', '넷플릭스', '유튜브', '구독']):
            return "통신"
        else:
            return "생활"
    
    def infer_threat(self, title: str) -> str:
        """위협도 추론"""
        if any(w in title for w in ['10만원', '20만원', '30만원', '최대', '프리미엄']):
            return "High"
        elif any(w in title for w in ['1만원', '2만원', '3만원', '5천원']):
            return "Mid"
        else:
            return "Low"
    
    # ==================== 전체 실행 ====================
    
    async def crawl_all(self) -> List[Dict]:
        """전체 카드사 크롤링"""
        print("\n" + "="*70)
        print("🚀 Smart Multi-Strategy Crawler")
        print("="*70 + "\n")
        
        all_events = []
        
        await self.init_browser(headless=True)
        
        try:
            # 1. 삼성카드 (API)
            samsung_events = await self.crawl_samsung()
            all_events.extend(samsung_events)
            await asyncio.sleep(3)
            
            # 2. 신한카드 (HTML)
            shinhan_events = await self.crawl_shinhan()
            all_events.extend(shinhan_events)
            await asyncio.sleep(3)
            
            # 3. 현대카드 (탭 + HTML)
            hyundai_events = await self.crawl_hyundai()
            all_events.extend(hyundai_events)
            await asyncio.sleep(3)
            
            # 4. KB국민카드 (긴 대기 + HTML)
            kb_events = await self.crawl_kb()
            all_events.extend(kb_events)
            
        finally:
            if self.browser:
                await self.browser.close()
        
        print("="*70)
        print(f"🎉 전체 수집: {len(all_events)}개")
        print("="*70 + "\n")
        
        # 통계
        stats = {}
        for e in all_events:
            comp = e['company']
            stats[comp] = stats.get(comp, 0) + 1
        
        for comp, count in stats.items():
            print(f"  - {comp}: {count}개")
        
        print()
        return all_events
    
    def save_to_db(self, events: List[Dict]):
        """DB 저장"""
        if not events:
            return
        
        print("="*70)
        print(f"[DB 저장] {len(events)}개 저장 중...")
        print("="*70 + "\n")
        
        init_db()
        db = SessionLocal()
        
        try:
            saved = 0
            duplicate = 0
            
            for i, event in enumerate(events, 1):
                success = insert_event(db, event)
                if success:
                    saved += 1
                    print(f"  [{i:3d}] ✅ {event['company'][:4]} - {event['title'][:45]}")
                else:
                    duplicate += 1
            
            print(f"\n신규: {saved}개 | 중복: {duplicate}개\n")
        
        finally:
            db.close()


async def main():
    """메인"""
    crawler = SmartMultiStrategyCrawler()
    
    # 크롤링
    events = await crawler.crawl_all()
    
    # 저장
    crawler.save_to_db(events)
    
    print("\n✅ 완료! 대시보드: http://localhost:8000\n")


if __name__ == "__main__":
    asyncio.run(main())
