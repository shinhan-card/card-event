"""
개선된 웹 크롤링 모듈 v2
Playwright Stealth 적용으로 강력한 봇 탐지 회피
"""

from playwright.async_api import async_playwright, Page, Browser
from playwright_stealth import stealth_async
from bs4 import BeautifulSoup
import random
import asyncio
import os
import re
from typing import List, Dict, Tuple
from dotenv import load_dotenv

load_dotenv()


class SmartCardEventScraper:
    """스마트 카드사 이벤트 스크래퍼 v2 (Stealth 모드)"""
    
    # 최신 크롬 버전 User-Agents (2026년 2월 기준)
    USER_AGENTS = [
        # Windows 10/11 Chrome 131
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        # Windows 10/11 Chrome 130
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        # macOS Chrome 131
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        # macOS Chrome 130
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    ]
    
    def __init__(self):
        self.browser: Browser = None
        self.page: Page = None
        
        self.card_companies = {
            "신한카드": os.getenv("SHINHAN_EVENT_URL", "https://www.shinhancard.com/pconts/html/benefit/event/main.html"),
            "삼성카드": os.getenv("SAMSUNG_EVENT_URL", "https://www.samsungcard.com/personal/benefit/event/list.do"),
            "현대카드": os.getenv("HYUNDAI_EVENT_URL", "https://www.hyundaicard.com/event/eventlist.hdc"),
            "KB국민카드": os.getenv("KB_EVENT_URL", "https://www.kbcard.com/CRD/DVIEW/MBCXBDDAMBC0001.do"),
        }
    
    async def init_browser(self, headless: bool = True):
        """
        Playwright Stealth 적용 브라우저 초기화
        - playwright-stealth로 자동화 탐지 완벽 회피
        - headless/non-headless 모두 대응
        - 실제 사용자와 동일한 환경 구성
        """
        playwright = await async_playwright().start()
        
        # 브라우저 실행 옵션 (봇 탐지 회피)
        launch_args = [
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--disable-setuid-sandbox',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-infobars',
            '--window-size=1920,1080',
        ]
        
        # headless 모드일 때 추가 옵션
        if headless:
            launch_args.extend([
                '--disable-gpu',
                '--disable-software-rasterizer',
            ])
        
        self.browser = await playwright.chromium.launch(
            headless=headless,
            args=launch_args,
            # headless=False에서도 자동화 탐지 방지
            chromium_sandbox=False
        )
        
        # 실제 사용자처럼 보이는 컨텍스트 생성
        selected_ua = random.choice(self.USER_AGENTS)
        print(f"[INFO] User-Agent: {selected_ua[:80]}...")
        
        context = await self.browser.new_context(
            user_agent=selected_ua,
            viewport={'width': 1920, 'height': 1080},
            locale='ko-KR',
            timezone_id='Asia/Seoul',
            # 실제 브라우저처럼 권한 설정
            permissions=['geolocation'],
            # 실제 사용자의 화면 해상도
            screen={'width': 1920, 'height': 1080},
            # 실제 브라우저처럼 Java 활성화
            java_script_enabled=True,
        )
        
        # 강력한 자동화 탐지 회피 스크립트
        await context.add_init_script("""
            // navigator.webdriver 제거
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            
            // Chrome 객체 추가 (자동화 도구에는 없음)
            window.chrome = {
                runtime: {},
                loadTimes: function() {},
                csi: function() {},
                app: {}
            };
            
            // Permissions API 오버라이드
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
            
            // Plugins 배열 추가 (실제 브라우저처럼)
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
            
            // Languages 설정
            Object.defineProperty(navigator, 'languages', {
                get: () => ['ko-KR', 'ko', 'en-US', 'en']
            });
            
            // Platform 설정
            Object.defineProperty(navigator, 'platform', {
                get: () => 'Win32'
            });
            
            // Hardware Concurrency (CPU 코어 수)
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => 8
            });
            
            // Device Memory
            Object.defineProperty(navigator, 'deviceMemory', {
                get: () => 8
            });
        """)
        
        # 새 페이지 생성
        self.page = await context.new_page()
        
        # ⭐ playwright-stealth 적용 (가장 중요!)
        await stealth_async(self.page)
        
        print("[OK] 브라우저 초기화 완료 (Stealth 모드 적용)")
    
    async def close_browser(self):
        if self.browser:
            await self.browser.close()
            print("[OK] 브라우저 종료")
    
    async def random_delay(self, min_sec: float = 1.0, max_sec: float = 3.0):
        """랜덤 지연 (사람처럼 행동)"""
        delay = random.uniform(min_sec, max_sec)
        await asyncio.sleep(delay)
    
    async def human_like_scroll(self):
        """사람처럼 스크롤"""
        # 랜덤한 속도와 거리로 여러 번 스크롤
        scroll_count = random.randint(3, 7)
        for _ in range(scroll_count):
            scroll_amount = random.randint(300, 800)
            await self.page.evaluate(f"window.scrollBy(0, {scroll_amount})")
            await asyncio.sleep(random.uniform(0.3, 0.8))
        
        # 페이지 상단으로 다시 스크롤 (사람처럼)
        if random.random() > 0.5:
            await self.page.evaluate("window.scrollTo(0, 0)")
            await asyncio.sleep(random.uniform(0.5, 1.0))
    
    async def human_like_mouse_move(self):
        """사람처럼 마우스 이동 (선택적)"""
        try:
            # 랜덤한 위치로 마우스 이동
            x = random.randint(100, 1800)
            y = random.randint(100, 900)
            await self.page.mouse.move(x, y)
            await asyncio.sleep(random.uniform(0.1, 0.3))
        except:
            pass
    
    async def smart_extract_event_urls(self, company: str, list_url: str) -> List[str]:
        """
        스마트 이벤트 URL 추출
        - 모든 링크를 가져온 후 키워드 기반 필터링
        - href 패턴 분석
        - 텍스트 내용 분석
        """
        print(f"\n{'='*70}")
        print(f"[{company}] 스마트 크롤링 시작")
        print(f"{'='*70}")
        
        try:
            # 페이지 로딩 (실제 사용자처럼)
            await self.page.goto(list_url, wait_until="networkidle", timeout=30000)
            await self.random_delay(2, 4)
            
            # 사람처럼 마우스 이동
            await self.human_like_mouse_move()
            
            # 사람처럼 스크롤하여 lazy loading 콘텐츠 로드
            await self.human_like_scroll()
            
            await self.random_delay(1, 2)
            
            # 페이지의 모든 링크 가져오기
            all_links = await self.page.query_selector_all('a')
            print(f"[INFO] 페이지 내 전체 링크: {len(all_links)}개")
            
            event_urls = []
            keyword_patterns = [
                'event', 'Event', 'EVENT',
                '이벤트', 'benefit', 'promotion',
                'detail', 'view', 'info'
            ]
            
            for link in all_links:
                try:
                    href = await link.get_attribute('href')
                    text = await link.inner_text()
                    text = text.strip()
                    
                    if not href:
                        continue
                    
                    # 1. href에 이벤트 관련 키워드가 있는지 확인
                    href_match = any(keyword in href for keyword in keyword_patterns)
                    
                    # 2. 링크 텍스트에 이벤트 관련 키워드가 있는지 확인
                    text_match = any(keyword in text for keyword in ['이벤트', '프로모션', '할인', '혜택'])
                    
                    if href_match or text_match:
                        # 상대 경로를 절대 경로로 변환
                        if href.startswith('/'):
                            from urllib.parse import urljoin
                            full_url = urljoin(list_url, href)
                        elif href.startswith('http'):
                            full_url = href
                        elif href.startswith('javascript:') or href.startswith('#'):
                            # JavaScript 링크는 onclick 속성 확인
                            onclick = await link.get_attribute('onclick')
                            if onclick:
                                # 파라미터 추출 시도
                                match = re.search(r"['\"]([^'\"]+)['\"]", onclick)
                                if match and 'event' in onclick.lower():
                                    param = match.group(1)
                                    full_url = f"{list_url}?id={param}"
                                else:
                                    continue
                            else:
                                continue
                        else:
                            continue
                        
                        # 중복 제거 및 유효성 검사
                        if full_url not in event_urls:
                            # list 페이지 자체는 제외
                            if 'list' not in full_url.lower() or 'detail' in full_url.lower():
                                event_urls.append(full_url)
                                if len(event_urls) <= 5:  # 처음 5개만 출력
                                    print(f"  [{len(event_urls)}] {text[:30]:30s} -> {href[:50]}")
                
                except Exception as e:
                    continue
            
            # 중복 제거
            event_urls = list(dict.fromkeys(event_urls))
            
            # 최대 20개로 제한
            event_urls = event_urls[:20]
            
            print(f"\n[OK] {company}: 총 {len(event_urls)}개 이벤트 URL 발견")
            
            return event_urls
            
        except Exception as e:
            print(f"[ERROR] {company} 크롤링 실패: {e}")
            return []
    
    async def extract_event_detail(self, url: str) -> Tuple[str, str]:
        """이벤트 상세 페이지에서 텍스트 추출 (Human-like)"""
        print(f"  상세 페이지 분석: {url[:60]}...")
        
        try:
            # 페이지 로딩
            await self.page.goto(url, wait_until="networkidle", timeout=30000)
            await self.random_delay(1, 2)
            
            # 사람처럼 마우스 움직임
            await self.human_like_mouse_move()
            
            # 사람처럼 스크롤
            await self.human_like_scroll()
            
            await asyncio.sleep(1)
            
            html = await self.page.content()
            soup = BeautifulSoup(html, 'lxml')
            
            # 불필요한 태그 제거
            for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe']):
                tag.decompose()
            
            text_parts = []
            
            # 제목
            for selector in ['h1', 'h2', '.title', '.event-title']:
                title = soup.select_one(selector)
                if title:
                    title_text = title.get_text(strip=True)
                    if len(title_text) > 3:
                        text_parts.append(f"[제목] {title_text}")
                        break
            
            # 본문
            body_selectors = ['article', '.content', '.detail', 'main', 'body']
            for selector in body_selectors:
                content = soup.select_one(selector)
                if content:
                    content_text = content.get_text(separator='\n', strip=True)
                    if len(content_text) > 100:
                        text_parts.append(f"[본문]\n{content_text}")
                        break
            
            # 텍스트 정제
            full_text = '\n\n'.join(text_parts)
            lines = [line.strip() for line in full_text.split('\n') if line.strip()]
            full_text = '\n'.join(lines)
            
            if len(full_text) > 8000:
                full_text = full_text[:8000]
            
            print(f"    추출 완료: {len(full_text)}자")
            
            return (url, full_text)
            
        except Exception as e:
            print(f"    [ERROR] 상세 페이지 추출 실패: {e}")
            return (url, "")
    
    async def scrape_all_companies(self) -> List[Tuple[str, str]]:
        """모든 카드사 크롤링"""
        all_events = []
        
        await self.init_browser(headless=True)
        
        try:
            for company, list_url in self.card_companies.items():
                print(f"\n{'='*70}")
                print(f"[{company}] 크롤링 시작")
                print(f"{'='*70}")
                
                # 1단계: URL 수집
                event_urls = await self.smart_extract_event_urls(company, list_url)
                
                if not event_urls:
                    print(f"[WARN] {company}: 이벤트 URL을 찾지 못했습니다.")
                    continue
                
                # 2단계: 상세 페이지 크롤링 (최대 5개만)
                print(f"\n[{company}] 상세 페이지 크롤링 (최대 5개)")
                for idx, event_url in enumerate(event_urls[:5], 1):
                    print(f"\n  [{idx}/5]", end=" ")
                    url, text = await self.extract_event_detail(event_url)
                    
                    if text and len(text) > 100:
                        all_events.append((url, text))
                    
                    await self.random_delay(2, 4)
                
                print(f"\n[OK] {company}: {len(all_events)}개 이벤트 수집 완료")
                await self.random_delay(3, 5)
        
        finally:
            await self.close_browser()
        
        print(f"\n{'='*70}")
        print(f"[완료] 전체 수집: 총 {len(all_events)}개 이벤트")
        print(f"{'='*70}")
        
        return all_events


async def test_scraper():
    """테스트 함수"""
    scraper = SmartCardEventScraper()
    events = await scraper.scrape_all_companies()
    
    print(f"\n수집된 이벤트:")
    for i, (url, text) in enumerate(events, 1):
        print(f"\n[{i}] {url}")
        print(f"텍스트 길이: {len(text)}자")
        print(f"내용 샘플: {text[:200]}...")


if __name__ == "__main__":
    asyncio.run(test_scraper())
