"""
Pure API Crawler - Gemini 제거, 크롤링에만 집중
API 인터셉트 → 직접 파싱 → DB 저장

목표: 2026년 4개 카드사 모든 이벤트 수집 (종료된 것 포함)
"""

import asyncio
import sys
import io
import json
import os
import random
from datetime import datetime
from typing import List, Dict
from playwright.async_api import async_playwright, Page, Browser, Response
from playwright_stealth import stealth_async
from dotenv import load_dotenv
from database import SessionLocal, insert_event, init_db

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

load_dotenv()


class PureAPICrawler:
    """순수 API 크롤러 (LLM 제거)"""
    
    USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    ]
    
    CARD_COMPANIES = {
        "신한카드": {
            "url": "https://www.shinhancard.com/pconts/html/benefit/event/main.html",
            "domain": "shinhancard.com",
            "api_parser": "parse_shinhan_api"
        },
        "삼성카드": {
            "url": "https://www.samsungcard.com/personal/benefit/event/list.do",
            "domain": "samsungcard.com",
            "api_parser": "parse_samsung_api"
        },
        "현대카드": {
            "url": "https://www.hyundaicard.com/event/eventlist.hdc",
            "domain": "hyundaicard.com",
            "api_parser": "parse_hyundai_api"
        },
        "KB국민카드": {
            "url": "https://www.kbcard.com/CRD/DVIEW/MBCXBDDAMBC0001.do",
            "domain": "kbcard.com",
            "api_parser": "parse_kb_api"
        }
    }
    
    def __init__(self):
        self.browser: Browser = None
        self.page: Page = None
        self.intercepted_apis: List[Dict] = []
    
    async def init_browser(self, headless: bool = True):
        """Stealth 브라우저"""
        playwright = await async_playwright().start()
        
        self.browser = await playwright.chromium.launch(
            headless=headless,
            args=['--disable-blink-features=AutomationControlled']
        )
        
        context = await self.browser.new_context(
            user_agent=random.choice(self.USER_AGENTS),
            viewport={'width': 1920, 'height': 1080},
            locale='ko-KR',
        )
        
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
            window.chrome = {runtime: {}};
        """)
        
        self.page = await context.new_page()
        await stealth_async(self.page)
        
        print("[OK] 크롤러 초기화 완료\n")
    
    async def setup_api_interceptor(self, company_name: str, domain: str):
        """API 인터셉터 설정"""
        print(f"[{company_name}] API 모니터링 시작...")
        
        async def handle_response(response: Response):
            try:
                url = response.url
                
                # 카드사 도메인만
                if domain not in url:
                    return
                
                # JSON만
                content_type = response.headers.get('content-type', '')
                if 'json' not in content_type:
                    return
                
                # 유의미한 키워드
                keywords = ['event', 'list', 'benefit', 'data', 'info']
                if not any(kw in url.lower() for kw in keywords):
                    return
                
                # 제외 패턴
                if any(ex in url.lower() for ex in ['tracking', 'analytics', 'mpulse', 'log']):
                    return
                
                try:
                    json_data = await response.json()
                    data_size = len(json.dumps(json_data))
                    
                    if data_size < 100:
                        return
                    
                    # 이벤트 관련 키 확인
                    json_str = json.dumps(json_data, ensure_ascii=False).lower()
                    if any(ind in json_str for ind in ['title', '제목', 'event', '이벤트', 'name']):
                        
                        self.intercepted_apis.append({
                            'company': company_name,
                            'url': url,
                            'data': json_data,
                        })
                        
                        print(f"  ✅ API 캡처! [{len(self.intercepted_apis)}] {url[:60]}...")
                        print(f"     크기: {data_size} bytes")
                
                except:
                    pass
            except:
                pass
        
        self.page.on('response', handle_response)
    
    async def auto_scroll_and_load(self, max_scrolls: int = 30):
        """자동 스크롤 & 더보기 (강화판)"""
        print(f"  강화 스크롤 시작 (최대 {max_scrolls}회)...")
        
        for i in range(max_scrolls):
            # 스크롤
            await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(2)  # 더 길게 대기
            
            # 더보기 버튼 찾기 (더 많은 패턴)
            more_selectors = [
                'button:has-text("더보기")',
                'button:has-text("더 보기")',
                'button:has-text("MORE")',
                'button:has-text("more")',
                'a:has-text("더보기")',
                'a:has-text("더 보기")',
                '.more-btn', '.btn-more', '.load-more',
                'button.more', 'a.more',
                '[onclick*="more"]', '[onclick*="More"]',
            ]
            
            clicked = False
            for selector in more_selectors:
                try:
                    btn = await self.page.query_selector(selector)
                    if btn and await btn.is_visible():
                        print(f"  ✅ '더보기' 클릭! (회차: {i+1})")
                        await btn.click()
                        await asyncio.sleep(3)  # 클릭 후 더 길게 대기
                        clicked = True
                        break
                except:
                    pass
            
            # 버튼 클릭했으면 다시 스크롤
            if clicked:
                await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                await asyncio.sleep(2)
        
        print(f"  스크롤 완료 ({max_scrolls}회 시도)\n")
    
    # ==================== API 파서들 ====================
    
    def parse_samsung_api(self, api_data: Dict) -> List[Dict]:
        """삼성카드 API 파싱"""
        events = []
        event_list = api_data.get('listPeiHPPPrgEvnInqrDVO', [])
        
        for event in event_list:
            title = event.get('cmpTitNm', '').strip()
            if not title or title == ' ':
                continue
            
            start = event.get('cmsCmpStrtdt', '')
            end = event.get('cmsCmpEnddt', '')
            event_id = event.get('cmpId', '')
            
            # 날짜 포맷팅
            start_fmt = f"{start[:4]}.{start[4:6]}.{start[6:8]}" if start and len(start) == 8 else ""
            end_fmt = f"{end[:4]}.{end[4:6]}.{end[6:8]}" if end and len(end) == 8 else ""
            period = f"{start_fmt}~{end_fmt}" if start_fmt and end_fmt else "정보 없음"
            
            # 카테고리 추론
            category = self.infer_category(title)
            threat_level = self.infer_threat(title)
            
            # 올바른 URL 생성 (cmsId 사용)
            cms_id = event.get('cmsId', '')
            if cms_id:
                url = f"https://www.samsungcard.com/personal/event/ing/UHPPBE1403M0.jsp?cms_id={cms_id}"
            else:
                url = f"https://www.samsungcard.com/personal/benefit/event/view.do?evtId={event_id}"
            
            events.append({
                "url": url,
                "company": "삼성카드",
                "category": category,
                "title": title,
                "period": period,
                "benefit_type": "정보 없음",
                "benefit_value": "상세 페이지 참조",
                "conditions": "상세 페이지 참조",
                "target_segment": "일반",
                "threat_level": threat_level,
                "one_line_summary": title,
                "raw_text": json.dumps(event, ensure_ascii=False)[:500]
            })
        
        return events
    
    def parse_shinhan_api(self, api_data: Dict) -> List[Dict]:
        """신한카드 API 파싱 (구조 파악 후 구현)"""
        # TODO: 신한카드 API 구조에 맞게 파싱
        return []
    
    def parse_hyundai_api(self, api_data: Dict) -> List[Dict]:
        """현대카드 API 파싱 (구조 파악 후 구현)"""
        # TODO: 현대카드 API 구조에 맞게 파싱
        return []
    
    def parse_kb_api(self, api_data: Dict) -> List[Dict]:
        """KB국민카드 API 파싱 (구조 파악 후 구현)"""
        # TODO: KB국민카드 API 구조에 맞게 파싱
        return []
    
    def infer_category(self, title: str) -> str:
        """제목으로 카테고리 추론"""
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
            return "기타"
    
    def infer_threat(self, title: str) -> str:
        """위협도 추론"""
        if any(w in title for w in ['10만원', '20만원', '30만원', '최대', '프리미엄']):
            return "High"
        elif any(w in title for w in ['1만원', '2만원', '3만원', '5천원']):
            return "Mid"
        else:
            return "Low"
    
    async def crawl_company(self, company: str, config: Dict) -> List[Dict]:
        """단일 카드사 크롤링"""
        print("="*70)
        print(f"[{company}] 크롤링 시작")
        print("="*70 + "\n")
        
        self.intercepted_apis = []
        await self.setup_api_interceptor(company, config['domain'])
        
        try:
            # 페이지 로딩
            print(f"  페이지 로딩: {config['url'][:60]}...")
            await self.page.goto(config['url'], timeout=60000)
            await asyncio.sleep(3)
            
            # 자동 스크롤 & 더보기
            await self.auto_scroll_and_load(max_scrolls=15)
            
            # 추가 대기 (API 완료)
            await asyncio.sleep(3)
            
            print(f"\n[결과] API 캡처: {len(self.intercepted_apis)}개\n")
            
            # API 데이터 파싱
            all_events = []
            
            if self.intercepted_apis:
                parser_name = config.get('api_parser')
                parser_method = getattr(self, parser_name, None)
                
                for i, api_item in enumerate(self.intercepted_apis, 1):
                    print(f"  [{i}/{len(self.intercepted_apis)}] API 파싱 중...")
                    
                    # 파일 저장
                    filename = f"api_{company}_{i}.json"
                    with open(filename, 'w', encoding='utf-8') as f:
                        json.dump(api_item['data'], f, ensure_ascii=False, indent=2)
                    print(f"      저장: {filename}")
                    
                    if parser_method:
                        parsed_events = parser_method(api_item['data'])
                        all_events.extend(parsed_events)
                        print(f"      파싱: {len(parsed_events)}개 이벤트")
            
            print(f"\n[{company}] 수집 완료: {len(all_events)}개\n")
            return all_events
            
        except Exception as e:
            print(f"[ERROR] {company}: {e}\n")
            return []
    
    async def crawl_all(self) -> List[Dict]:
        """전체 크롤링"""
        print("\n" + "="*70)
        print("🚀 Pure API Crawler 시작 (Gemini 제거, 크롤링 집중)")
        print(f"   {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*70 + "\n")
        
        all_events = []
        await self.init_browser(headless=True)
        
        try:
            for company, config in self.CARD_COMPANIES.items():
                events = await self.crawl_company(company, config)
                all_events.extend(events)
                await asyncio.sleep(3)
            
            print("="*70)
            print(f"🎉 전체 수집 완료: {len(all_events)}개")
            print("="*70 + "\n")
            
            # 카드사별 통계
            stats = {}
            for e in all_events:
                comp = e.get('company', '알수없음')
                stats[comp] = stats.get(comp, 0) + 1
            
            for comp, count in stats.items():
                print(f"  - {comp}: {count}개")
            
            print()
            return all_events
            
        finally:
            if self.browser:
                await self.browser.close()
    
    def save_to_db(self, events: List[Dict]):
        """DB 저장"""
        if not events:
            print("[WARN] 저장할 이벤트가 없습니다.\n")
            return
        
        print("="*70)
        print(f"[DB 저장] {len(events)}개 이벤트 저장 중...")
        print("="*70 + "\n")
        
        init_db()
        db = SessionLocal()
        
        try:
            saved = 0
            duplicate = 0
            
            for i, event in enumerate(events, 1):
                print(f"  [{i:2d}/{len(events)}] {event['title'][:50]}")
                
                success = insert_event(db, event)
                if success:
                    saved += 1
                    print(f"       ✅ 저장")
                else:
                    duplicate += 1
                    print(f"       ⚠️ 중복")
            
            print(f"\n{'='*70}")
            print(f"[완료]")
            print(f"  신규 저장: {saved}개")
            print(f"  중복 스킵: {duplicate}개")
            print(f"{'='*70}\n")
        
        finally:
            db.close()


async def main():
    """메인 실행"""
    crawler = PureAPICrawler()
    
    # 크롤링
    events = await crawler.crawl_all()
    
    # DB 저장
    crawler.save_to_db(events)
    
    print("\n[완료] 대시보드: http://localhost:8000\n")


if __name__ == "__main__":
    asyncio.run(main())
