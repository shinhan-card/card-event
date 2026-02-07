"""
웹 크롤링 모듈
Playwright Stealth를 활용한 카드사 이벤트 페이지 스크래핑
강력한 봇 탐지 회피 기능
"""

from playwright.async_api import async_playwright, Page, Browser
from playwright_stealth import stealth_async
from bs4 import BeautifulSoup
import random
import asyncio
import os
from typing import List, Dict, Tuple
from dotenv import load_dotenv

load_dotenv()


class CardEventScraper:
    """카드사 이벤트 스크래퍼 (Stealth 모드)"""
    
    # 최신 크롬 버전 User-Agents (2026년 2월 기준)
    USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    ]
    
    def __init__(self):
        """스크래퍼 초기화"""
        self.browser: Browser = None
        self.page: Page = None
        
        # 환경 변수에서 카드사 URL 로드
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
        """
        playwright = await async_playwright().start()
        
        # 브라우저 실행 옵션
        launch_args = [
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--disable-setuid-sandbox',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-infobars',
            '--window-size=1920,1080',
        ]
        
        if headless:
            launch_args.extend([
                '--disable-gpu',
                '--disable-software-rasterizer',
            ])
        
        self.browser = await playwright.chromium.launch(
            headless=headless,
            args=launch_args,
            chromium_sandbox=False
        )
        
        # 실제 사용자처럼 보이는 컨텍스트
        selected_ua = random.choice(self.USER_AGENTS)
        
        context = await self.browser.new_context(
            user_agent=selected_ua,
            viewport={'width': 1920, 'height': 1080},
            locale='ko-KR',
            timezone_id='Asia/Seoul',
            permissions=['geolocation'],
            screen={'width': 1920, 'height': 1080},
            java_script_enabled=True,
        )
        
        # 강력한 자동화 탐지 회피 스크립트
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            
            window.chrome = {
                runtime: {},
                loadTimes: function() {},
                csi: function() {},
                app: {}
            };
            
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
            
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
            
            Object.defineProperty(navigator, 'languages', {
                get: () => ['ko-KR', 'ko', 'en-US', 'en']
            });
        """)
        
        self.page = await context.new_page()
        
        # ⭐ playwright-stealth 적용!
        await stealth_async(self.page)
        
        print("✅ 브라우저 초기화 완료 (Stealth 모드 적용)")
    
    async def close_browser(self):
        """브라우저 종료"""
        if self.browser:
            await self.browser.close()
            print("🔒 브라우저 종료")
    
    async def random_delay(self, min_sec: float = 1.0, max_sec: float = 3.0):
        """랜덤 대기 (봇 탐지 우회)"""
        delay = random.uniform(min_sec, max_sec)
        await asyncio.sleep(delay)
    
    async def human_like_scroll(self):
        """사람처럼 스크롤"""
        scroll_count = random.randint(3, 7)
        for _ in range(scroll_count):
            scroll_amount = random.randint(300, 800)
            await self.page.evaluate(f"window.scrollBy(0, {scroll_amount})")
            await asyncio.sleep(random.uniform(0.3, 0.8))
        
        if random.random() > 0.5:
            await self.page.evaluate("window.scrollTo(0, 0)")
            await asyncio.sleep(random.uniform(0.5, 1.0))
    
    async def human_like_mouse_move(self):
        """사람처럼 마우스 이동"""
        try:
            x = random.randint(100, 1800)
            y = random.randint(100, 900)
            await self.page.mouse.move(x, y)
            await asyncio.sleep(random.uniform(0.1, 0.3))
        except:
            pass
    
    async def get_page_content(self, url: str) -> str:
        """페이지 HTML 가져오기"""
        try:
            await self.page.goto(url, wait_until="networkidle", timeout=30000)
            await self.random_delay(2, 4)  # 페이지 로딩 대기
            
            # 스크롤 다운 (동적 콘텐츠 로딩)
            await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await self.random_delay(1, 2)
            
            content = await self.page.content()
            return content
        except Exception as e:
            print(f"❌ 페이지 로딩 실패 ({url}): {e}")
            return ""
    
    async def extract_event_list_urls(self, company: str, list_url: str) -> List[str]:
        """
        이벤트 목록 페이지에서 상세 URL 추출 (개선된 버전)
        
        Args:
            company: 카드사명
            list_url: 이벤트 목록 페이지 URL
        
        Returns:
            list: 이벤트 상세 URL 리스트
        """
        print(f"\n📋 [{company}] 이벤트 목록 수집 중...")
        
        try:
            # Playwright로 페이지 직접 조작
            await self.page.goto(list_url, wait_until="networkidle", timeout=30000)
            await self.random_delay(2, 4)
            
            # 스크롤하여 동적 콘텐츠 로딩
            for _ in range(3):
                await self.page.evaluate("window.scrollBy(0, window.innerHeight)")
                await self.random_delay(1, 2)
            
            event_urls = []
            
            # Playwright로 링크 직접 추출 (더 안정적)
            if company == "신한카드":
                # 신한카드: li.event-item > a 또는 .event-list a 패턴
                selectors = [
                    'a[href*="eventDetail"]',
                    'a[href*="/event/"]',
                    '.event-list a',
                    'li.event-item a',
                    'div.event-box a',
                    'a[onclick*="event"]'
                ]
            elif company == "삼성카드":
                # 삼성카드: benefit/event 경로
                selectors = [
                    'a[href*="eventDetail"]',
                    'a[href*="benefit/event"]',
                    '.event-item a',
                    'div.benefit-list a',
                    'a[onclick*="goDetail"]'
                ]
            elif company == "현대카드":
                # 현대카드: eventView, eventDetail 패턴
                selectors = [
                    'a[href*="eventView"]',
                    'a[href*="eventDetail"]',
                    'a[href*="/event/"]',
                    '.event-card a',
                    'li.list-item a'
                ]
            elif company == "KB국민카드":
                # KB국민카드: DVIEW, event 패턴
                selectors = [
                    'a[href*="DVIEW"]',
                    'a[href*="event"]',
                    'a[href*="benefit"]',
                    '.card-list a',
                    'div.event-item a'
                ]
            else:
                # 범용 패턴
                selectors = [
                    'a[href*="event"]',
                    'a[href*="Event"]',
                    'a[href*="benefit"]'
                ]
            
            # 각 셀렉터 시도
            for selector in selectors:
                try:
                    links = await self.page.query_selector_all(selector)
                    print(f"  [DEBUG] {selector}: {len(links)}개 발견")
                    
                    for link in links[:30]:  # 각 셀렉터당 최대 30개
                        href = await link.get_attribute('href')
                        if href:
                            # 상대 경로 처리
                            if href.startswith('/'):
                                from urllib.parse import urljoin
                                full_url = urljoin(list_url, href)
                            elif href.startswith('http'):
                                full_url = href
                            elif href.startswith('javascript:') or href.startswith('#'):
                                # onclick 이벤트에서 URL 추출 시도
                                onclick = await link.get_attribute('onclick')
                                if onclick and ('event' in onclick.lower() or 'detail' in onclick.lower()):
                                    # onclick에서 파라미터 추출 (예: goDetail('123'))
                                    import re
                                    match = re.search(r"['\"]([^'\"]+)['\"]", onclick)
                                    if match:
                                        param = match.group(1)
                                        full_url = f"{list_url}?id={param}"
                                    else:
                                        continue
                                else:
                                    continue
                            else:
                                # 기타 상대 경로
                                from urllib.parse import urljoin
                                full_url = urljoin(list_url, href)
                            
                            # 중복 제거 및 유효성 검사
                            if full_url not in event_urls and len(full_url) > 10:
                                # 같은 목록 페이지는 제외
                                if full_url != list_url and 'list' not in full_url.split('/')[-1].lower():
                                    event_urls.append(full_url)
                
                except Exception as e:
                    print(f"  [WARN] {selector} 처리 중 오류: {e}")
                    continue
            
            # 중복 제거
            event_urls = list(dict.fromkeys(event_urls))[:20]  # 최대 20개
            
            print(f"✅ [{company}] 총 {len(event_urls)}개 이벤트 URL 발견")
            
            if event_urls:
                print(f"  샘플 URL: {event_urls[0][:80]}...")
            
            return event_urls
            
        except Exception as e:
            print(f"❌ [{company}] 목록 수집 실패: {e}")
            return []
    
    async def extract_event_detail(self, url: str) -> Tuple[str, str]:
        """
        이벤트 상세 페이지에서 텍스트 추출 (개선된 버전)
        
        Args:
            url: 이벤트 상세 URL
        
        Returns:
            tuple: (url, 추출된 텍스트)
        """
        print(f"📄 상세 페이지 분석 중: {url[:60]}...")
        
        try:
            await self.page.goto(url, wait_until="networkidle", timeout=30000)
            await self.random_delay(2, 3)
            
            # 페이지 스크롤 (lazy loading 컨텐츠 로드)
            await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await self.random_delay(1, 2)
            
            html = await self.page.content()
            soup = BeautifulSoup(html, 'lxml')
            
            # 불필요한 태그 제거
            for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe', 'noscript']):
                tag.decompose()
            
            text_parts = []
            
            # 1. 제목 추출 (우선순위 순)
            title_selectors = [
                'h1.event-title', 'h1.title', 'div.event-title h1',
                'h2.event-title', 'h2.title', 'div.title h2',
                'h1', 'h2', '.page-title', 'title'
            ]
            
            for selector in title_selectors:
                title = soup.select_one(selector)
                if title:
                    title_text = title.get_text(strip=True)
                    if len(title_text) > 3:  # 최소 3글자 이상
                        text_parts.append(f"[제목] {title_text}")
                        break
            
            # 2. 이벤트 기간 추출
            period_selectors = [
                '.event-period', '.period', '.date', '.event-date',
                'span:contains("기간")', 'div:contains("이벤트 기간")',
                'p.date', 'div.period'
            ]
            
            for selector in period_selectors:
                try:
                    period = soup.select_one(selector)
                    if period:
                        period_text = period.get_text(strip=True)
                        if any(char in period_text for char in ['~', '-', '부터', '까지', '기간']):
                            text_parts.append(f"[기간] {period_text}")
                            break
                except:
                    continue
            
            # 3. 본문 콘텐츠 추출 (우선순위 순)
            content_selectors = [
                'div.event-content', 'div.event-detail', 'article.event',
                'div.detail-content', 'div.content', 'article',
                'main', 'div.container', 'div#content'
            ]
            
            content_found = False
            for selector in content_selectors:
                content = soup.select_one(selector)
                if content:
                    # 중첩된 리스트나 테이블도 처리
                    content_text = content.get_text(separator='\n', strip=True)
                    if len(content_text) > 50:  # 최소 50자 이상
                        text_parts.append(f"[본문]\n{content_text}")
                        content_found = True
                        break
            
            # 본문을 못 찾았으면 body 전체
            if not content_found:
                body = soup.find('body')
                if body:
                    body_text = body.get_text(separator='\n', strip=True)
                    text_parts.append(f"[본문]\n{body_text}")
            
            # 4. 테이블 데이터 추출 (혜택 정보가 표 형식인 경우)
            tables = soup.find_all('table')
            for i, table in enumerate(tables[:3], 1):  # 최대 3개 테이블
                try:
                    rows = table.find_all('tr')
                    table_text = []
                    for row in rows:
                        cells = [cell.get_text(strip=True) for cell in row.find_all(['th', 'td'])]
                        if cells:
                            table_text.append(' | '.join(cells))
                    if table_text:
                        text_parts.append(f"[표 {i}]\n" + '\n'.join(table_text))
                except:
                    continue
            
            # 5. 리스트 항목 추출 (혜택 조건 등)
            lists = soup.find_all(['ul', 'ol'])
            for i, ul in enumerate(lists[:5], 1):  # 최대 5개 리스트
                try:
                    items = ul.find_all('li')
                    if len(items) > 0 and len(items) < 30:  # 너무 많으면 메뉴일 가능성
                        list_text = []
                        for item in items:
                            item_text = item.get_text(strip=True)
                            if len(item_text) > 5:
                                list_text.append(f"  - {item_text}")
                        if list_text:
                            text_parts.append(f"[목록 {i}]\n" + '\n'.join(list_text))
                except:
                    continue
            
            # 6. 이미지 alt 속성 (혜택이 이미지로 표현된 경우)
            images = soup.find_all('img', alt=True)
            alt_texts = []
            for img in images[:15]:
                alt_text = img.get('alt', '').strip()
                if alt_text and len(alt_text) > 5 and '로고' not in alt_text and 'logo' not in alt_text.lower():
                    alt_texts.append(f"  - {alt_text}")
            
            if alt_texts:
                text_parts.append(f"[이미지 설명]\n" + '\n'.join(alt_texts))
            
            # 7. 메타 태그에서 설명 추출
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if meta_desc and meta_desc.get('content'):
                text_parts.append(f"[메타 설명] {meta_desc['content']}")
            
            # 텍스트 정제
            full_text = '\n\n'.join(text_parts)
            
            # 중복 줄 제거
            lines = full_text.split('\n')
            cleaned_lines = []
            prev_line = ""
            for line in lines:
                line = line.strip()
                if line and line != prev_line:  # 빈 줄과 중복 제거
                    cleaned_lines.append(line)
                    prev_line = line
            
            full_text = '\n'.join(cleaned_lines)
            
            # 길이 제한
            if len(full_text) > 8000:
                full_text = full_text[:8000] + "\n...(내용 생략)"
            
            print(f"  [INFO] 추출된 텍스트 길이: {len(full_text)}자")
            
            return (url, full_text)
            
        except Exception as e:
            print(f"  [ERROR] 상세 페이지 추출 실패: {e}")
            return (url, "")
    
    async def scrape_all_companies(self) -> List[Tuple[str, str]]:
        """
        모든 카드사 이벤트 수집
        
        Returns:
            list: [(url, text), ...] 형태의 리스트
        """
        all_events = []
        
        await self.init_browser(headless=True)
        
        try:
            for company, list_url in self.card_companies.items():
                print(f"\n{'='*60}")
                print(f"🏢 {company} 수집 시작")
                print(f"{'='*60}")
                
                # 1단계: 이벤트 목록 URL 수집
                event_urls = await self.extract_event_list_urls(company, list_url)
                
                # 2단계: 각 이벤트 상세 페이지 크롤링
                for idx, event_url in enumerate(event_urls, 1):
                    print(f"[{idx}/{len(event_urls)}] ", end="")
                    url, text = await self.extract_event_detail(event_url)
                    
                    if text:
                        all_events.append((url, text))
                    
                    # 봇 탐지 방지를 위한 랜덤 딜레이
                    await self.random_delay(2, 5)
                
                print(f"✅ [{company}] 수집 완료: {len(event_urls)}개\n")
        
        finally:
            await self.close_browser()
        
        print(f"\n{'='*60}")
        print(f"🎉 전체 수집 완료: 총 {len(all_events)}개 이벤트")
        print(f"{'='*60}")
        
        return all_events


async def test_scraper():
    """테스트용 함수"""
    scraper = CardEventScraper()
    
    # 테스트: 신한카드만 수집
    scraper.card_companies = {
        "신한카드": "https://www.shinhancard.com/pconts/html/benefit/event/main.html"
    }
    
    events = await scraper.scrape_all_companies()
    
    print("\n=== 수집 결과 샘플 ===")
    for idx, (url, text) in enumerate(events[:3], 1):
        print(f"\n[{idx}] {url}")
        print(f"텍스트 길이: {len(text)}자")
        print(f"내용: {text[:200]}...\n")


if __name__ == "__main__":
    asyncio.run(test_scraper())
