"""
Universal Card Event Crawler
완전 자동화된 지능형 카드사 이벤트 크롤러

주요 기능:
1. API 인터셉트 (JSON 응답 자동 캡처)
2. 지능형 스크롤 (무한 스크롤 & 더보기 버튼 자동 처리)
3. LLM 기반 데이터 정제 (Gemini API)
4. 완전 자동화 실행 (수동 개입 불필요)
"""

import asyncio
import sys
import io
import json
import os
import random
from datetime import datetime
from typing import List, Dict, Tuple, Optional
from playwright.async_api import async_playwright, Page, Browser, Response
from playwright_stealth import stealth_async
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import google.generativeai as genai

# Windows 콘솔 UTF-8 인코딩
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

load_dotenv()

# Gemini API 설정
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


class UniversalCardEventCrawler:
    """범용 카드사 이벤트 크롤러"""
    
    # 최신 Chrome User-Agent
    USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    ]
    
    # 카드사 설정
    CARD_COMPANIES = {
        "신한카드": {
            "url": "https://www.shinhancard.com/pconts/html/benefit/event/main.html",
            "domain": "shinhancard.com"
        },
        "삼성카드": {
            "url": "https://www.samsungcard.com/personal/benefit/event/list.do",
            "domain": "samsungcard.com"
        },
        "현대카드": {
            "url": "https://www.hyundaicard.com/event/eventlist.hdc",
            "domain": "hyundaicard.com"
        },
        "KB국민카드": {
            "url": "https://www.kbcard.com/CRD/DVIEW/MBCXBDDAMBC0001.do",
            "domain": "kbcard.com"
        }
    }
    
    def __init__(self):
        self.browser: Browser = None
        self.page: Page = None
        self.intercepted_apis: List[Dict] = []
        self.gemini_model = genai.GenerativeModel('gemini-2.5-flash')
    
    async def init_browser(self, headless: bool = True):
        """Stealth 브라우저 초기화"""
        playwright = await async_playwright().start()
        
        launch_args = [
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--disable-setuid-sandbox',
            '--no-first-run',
            '--no-default-browser-check',
            '--window-size=1920,1080',
        ]
        
        if headless:
            launch_args.extend(['--disable-gpu'])
        
        self.browser = await playwright.chromium.launch(
            headless=headless,
            args=launch_args
        )
        
        user_agent = random.choice(self.USER_AGENTS)
        
        context = await self.browser.new_context(
            user_agent=user_agent,
            viewport={'width': 1920, 'height': 1080},
            locale='ko-KR',
            timezone_id='Asia/Seoul',
            screen={'width': 1920, 'height': 1080},
        )
        
        # 자동화 탐지 회피
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
            window.chrome = {runtime: {}, loadTimes: function() {}, csi: function() {}};
            Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
            Object.defineProperty(navigator, 'languages', {get: () => ['ko-KR', 'ko', 'en-US']});
        """)
        
        self.page = await context.new_page()
        await stealth_async(self.page)
        
        print("[OK] Universal Crawler 초기화 완료 (Stealth 모드)\n")
    
    async def close_browser(self):
        """브라우저 종료"""
        if self.browser:
            await self.browser.close()
    
    # ==================== 1. API 인터셉트 로직 ====================
    
    async def setup_api_interceptor(self, company_name: str):
        """
        API 응답 인터셉터 설정
        - JSON 응답 중 'event', 'list' 키워드 포함된 것 자동 캡처
        - 파일로 저장하여 나중에 분석
        """
        print(f"[API 인터셉터] {company_name} API 모니터링 시작...")
        
        async def handle_response(response: Response):
            """응답 핸들러 (개선된 필터링)"""
            try:
                url = response.url
                
                # 1차 필터: 카드사 도메인 확인
                company_domain = self.CARD_COMPANIES[company_name]['domain']
                if company_domain not in url:
                    return  # 외부 API는 무시
                
                # 2차 필터: JSON 응답만
                content_type = response.headers.get('content-type', '')
                if 'application/json' not in content_type and 'json' not in content_type:
                    return
                
                # 3차 필터: URL에 유의미한 키워드 포함
                keywords = ['event', 'list', 'benefit', 'promotion', 'promo', 'card', 'data', 'info']
                if not any(kw in url.lower() for kw in keywords):
                    return
                
                # 4차 필터: 제외할 URL 패턴
                exclude_patterns = ['tracking', 'analytics', 'mpulse', 'log', 'metric', 'stat']
                if any(pattern in url.lower() for pattern in exclude_patterns):
                    return
                
                try:
                    json_data = await response.json()
                    
                    # 5차 필터: 유의미한 데이터 크기
                    data_size = len(json.dumps(json_data))
                    if data_size < 100:  # 너무 작으면 의미 없음
                        return
                    
                    # 6차 필터: 이벤트 관련 키 포함 여부
                    json_str = json.dumps(json_data, ensure_ascii=False).lower()
                    event_indicators = ['title', 'name', '제목', '이벤트', 'event', 'benefit', '혜택']
                    
                    if any(indicator in json_str for indicator in event_indicators):
                        
                        self.intercepted_apis.append({
                            'company': company_name,
                            'url': url,
                            'data': json_data,
                            'timestamp': datetime.now().isoformat()
                        })
                        
                        print(f"  [API 캡처!] {url[:80]}...")
                        print(f"    데이터 타입: {type(json_data).__name__}")
                        
                        if isinstance(json_data, list):
                            print(f"    배열 길이: {len(json_data)}")
                        elif isinstance(json_data, dict):
                            print(f"    키 개수: {len(json_data.keys())}")
                        
                        print(f"    데이터 크기: {data_size} bytes")
                        
                        # 파일로 저장
                        filename = f"api_captured_{company_name}_{len(self.intercepted_apis)}.json"
                        with open(filename, 'w', encoding='utf-8') as f:
                            json.dump(json_data, f, ensure_ascii=False, indent=2)
                        print(f"    저장됨: {filename}\n")
                
                except Exception as e:
                    pass  # JSON 파싱 실패는 무시
            
            except Exception as e:
                pass  # 일반 오류 무시
        
        # 응답 리스너 등록
        self.page.on('response', handle_response)
        print(f"[OK] API 인터셉터 설정 완료\n")
    
    # ==================== 2. 지능형 스크롤 & 로딩 대기 ====================
    
    async def auto_scroll(self, max_scrolls: int = 20):
        """
        자동 스크롤 및 동적 콘텐츠 로딩
        - 무한 스크롤 감지
        - '더보기' 버튼 자동 클릭
        - 페이지 끝까지 스크롤
        """
        print("[자동 스크롤] 페이지 전체 로딩 시작...")
        
        previous_height = 0
        scroll_count = 0
        
        while scroll_count < max_scrolls:
            # 현재 페이지 높이 확인
            current_height = await self.page.evaluate("document.body.scrollHeight")
            
            # 페이지 끝까지 스크롤
            await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(random.uniform(1.5, 2.5))
            
            # '더보기' 버튼 찾아서 클릭
            more_buttons = [
                'button:has-text("더보기")',
                'button:has-text("더 보기")',
                'a:has-text("더보기")',
                '.more-btn',
                '.btn-more',
                'button.load-more',
                '[onclick*="more"]',
            ]
            
            for selector in more_buttons:
                try:
                    button = await self.page.query_selector(selector)
                    if button:
                        is_visible = await button.is_visible()
                        if is_visible:
                            print(f"  [발견!] '더보기' 버튼 클릭: {selector}")
                            await button.click()
                            await asyncio.sleep(random.uniform(2, 3))
                            break
                except:
                    continue
            
            # 새 높이 확인
            new_height = await self.page.evaluate("document.body.scrollHeight")
            
            # 더 이상 변화가 없으면 종료
            if new_height == previous_height:
                print(f"  [OK] 스크롤 완료 (높이 변화 없음)\n")
                break
            
            previous_height = new_height
            scroll_count += 1
            print(f"  스크롤 {scroll_count}회: 높이 {current_height} → {new_height}")
        
        if scroll_count >= max_scrolls:
            print(f"  [OK] 최대 스크롤 횟수 도달 ({max_scrolls}회)\n")
        
        # 페이지 상단으로 복귀 (사람처럼)
        await self.page.evaluate("window.scrollTo(0, 0)")
        await asyncio.sleep(1)
    
    # ==================== 3. LLM 기반 데이터 정제 ====================
    
    def analyze_content_with_gemini(self, raw_content: str, company: str, url: str) -> Optional[Dict]:
        """
        Gemini API로 비구조화 데이터를 표준 스키마로 변환
        
        Args:
            raw_content: JSON 문자열 또는 HTML 텍스트
            company: 카드사명
            url: 원본 URL
        
        Returns:
            dict: 표준 스키마로 변환된 이벤트 데이터 또는 None
        """
        if not raw_content or len(raw_content) < 50:
            return None
        
        system_prompt = """
당신은 **카드 산업 전문 AI 애널리스트**입니다.
주어진 데이터(JSON 또는 텍스트)에서 카드 이벤트 정보를 추출하여 표준 스키마로 변환하세요.

**출력 형식 (반드시 JSON만 출력)**:
{
  "company": "카드사명",
  "category": "카테고리 (쇼핑/여행/식음료/교통/문화/생활/금융/통신/기타)",
  "title": "이벤트 제목",
  "period": "이벤트 기간 (YYYY.MM.DD~YYYY.MM.DD)",
  "benefit_type": "혜택 유형 (할인/캐시백/포인트적립/무이자할부/사은품/기타)",
  "benefit_value": "혜택 금액/비율 (예: 10%, 5000원, 최대 3만원)",
  "conditions": "참여 조건 요약",
  "target_segment": "타겟 고객층",
  "threat_level": "경쟁 위협도 (High/Mid/Low)",
  "one_line_summary": "한 줄 요약"
}

**중요**:
- 반드시 유효한 JSON만 출력
- 코드 블록(```) 사용 금지
- 정보 없으면 "정보 없음" 표기
"""
        
        user_prompt = f"""
카드사: {company}
URL: {url}

아래 데이터를 분석하여 표준 스키마로 변환하세요:

{raw_content[:5000]}
"""
        
        try:
            print(f"  [Gemini] AI 분석 중... ({company})")
            
            response = self.gemini_model.generate_content(
                f"{system_prompt}\n\n{user_prompt}",
                generation_config={
                    "temperature": 0.2,
                    "top_p": 0.8,
                    "max_output_tokens": 1024,
                }
            )
            
            result_text = response.text.strip()
            
            # 마크다운 코드 블록 제거
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]
                result_text = result_text.strip()
            
            # JSON 파싱
            parsed_data = json.loads(result_text)
            parsed_data["url"] = url
            parsed_data["raw_text"] = raw_content[:1000]
            
            print(f"  [OK] AI 분석 완료: {parsed_data.get('title', '제목 없음')}\n")
            
            return parsed_data
        
        except json.JSONDecodeError as e:
            print(f"  [WARN] JSON 파싱 실패: {e}")
            return None
        except Exception as e:
            print(f"  [ERROR] AI 분석 실패: {e}")
            return None
    
    # ==================== 핵심 크롤링 로직 ====================
    
    async def crawl_company(self, company_name: str, config: Dict) -> List[Dict]:
        """
        단일 카드사 크롤링 (완전 자동화)
        
        Args:
            company_name: 카드사명
            config: 카드사 설정 (url, domain)
        
        Returns:
            list: 분석된 이벤트 데이터 리스트
        """
        print("="*70)
        print(f"[{company_name}] 크롤링 시작")
        print("="*70 + "\n")
        
        url = config['url']
        collected_events = []
        
        # API 인터셉터 설정
        self.intercepted_apis = []  # 초기화
        await self.setup_api_interceptor(company_name)
        
        try:
            # 페이지 로딩
            print(f"[페이지 로딩] {url}")
            await self.page.goto(url, wait_until="networkidle", timeout=60000)
            await asyncio.sleep(random.uniform(3, 5))
            
            # 지능형 자동 스크롤
            await self.auto_scroll(max_scrolls=10)
            
            # 추가 대기 (API 요청 완료 대기)
            await asyncio.sleep(3)
            
            print(f"\n{'='*70}")
            print(f"[{company_name}] 수집 결과")
            print(f"{'='*70}\n")
            
            # 1순위: API 인터셉트 데이터 사용
            if self.intercepted_apis:
                print(f"[API 데이터] {len(self.intercepted_apis)}개 API 응답 캡처됨")
                
                for i, api_data in enumerate(self.intercepted_apis, 1):
                    print(f"\n  [{i}/{len(self.intercepted_apis)}] API 데이터 분석 중...")
                    
                    # JSON을 문자열로 변환하여 Gemini에 전달
                    json_str = json.dumps(api_data['data'], ensure_ascii=False, indent=2)
                    
                    # Gemini로 분석
                    analyzed = self.analyze_content_with_gemini(
                        json_str,
                        company_name,
                        api_data['url']
                    )
                    
                    if analyzed:
                        collected_events.append(analyzed)
                    
                    # API Rate Limit 방지
                    if i < len(self.intercepted_apis):
                        await asyncio.sleep(2)
            
            # 2순위: HTML 파싱
            else:
                print(f"[HTML 파싱] API 데이터 없음, HTML에서 추출...")
                
                html = await self.page.content()
                soup = BeautifulSoup(html, 'lxml')
                
                # 불필요한 태그 제거
                for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
                    tag.decompose()
                
                # 본문 텍스트 추출
                body = soup.find('body')
                if body:
                    text = body.get_text(separator='\n', strip=True)
                    text = '\n'.join([line.strip() for line in text.split('\n') if line.strip()])
                    
                    if len(text) > 200:
                        print(f"  [INFO] HTML 텍스트 추출: {len(text)}자")
                        
                        # Gemini로 분석
                        analyzed = self.analyze_content_with_gemini(
                            text[:8000],
                            company_name,
                            url
                        )
                        
                        if analyzed:
                            collected_events.append(analyzed)
            
            print(f"\n[{company_name}] 수집 완료: {len(collected_events)}개 이벤트\n")
            
            return collected_events
        
        except Exception as e:
            print(f"[ERROR] {company_name} 크롤링 실패: {e}\n")
            return []
    
    # ==================== 4. 완전 자동화 실행 ====================
    
    async def run_all_sync(self) -> List[Dict]:
        """
        전체 카드사 자동 크롤링 (수동 개입 불필요)
        
        Returns:
            list: 모든 카드사의 이벤트 데이터
        """
        print("\n" + "="*70)
        print("🚀 Universal Card Event Crawler 시작")
        print(f"   {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*70 + "\n")
        
        all_events = []
        
        # 브라우저 초기화
        await self.init_browser(headless=True)
        
        try:
            # 각 카드사 순회
            for company_name, config in self.CARD_COMPANIES.items():
                events = await self.crawl_company(company_name, config)
                all_events.extend(events)
                
                # 다음 카드사 전 대기
                if company_name != list(self.CARD_COMPANIES.keys())[-1]:
                    await asyncio.sleep(random.uniform(3, 5))
            
            # 최종 결과
            print("\n" + "="*70)
            print("🎉 전체 크롤링 완료")
            print("="*70)
            print(f"  총 수집된 이벤트: {len(all_events)}개")
            
            # 카드사별 통계
            company_stats = {}
            for event in all_events:
                comp = event.get('company', '알 수 없음')
                company_stats[comp] = company_stats.get(comp, 0) + 1
            
            print(f"\n  카드사별:")
            for comp, count in company_stats.items():
                print(f"    - {comp}: {count}개")
            
            print("="*70 + "\n")
            
            return all_events
        
        finally:
            await self.close_browser()
    
    # ==================== 데이터베이스 저장 ====================
    
    async def run_and_save_to_db(self):
        """크롤링 + AI 분석 + DB 저장 전체 프로세스"""
        from database import SessionLocal, insert_event
        
        # 크롤링 실행
        events = await self.run_all_sync()
        
        if not events:
            print("[WARN] 수집된 이벤트가 없습니다.")
            return
        
        # 데이터베이스 저장
        print("\n[DB 저장] 데이터베이스에 저장 중...")
        db = SessionLocal()
        
        try:
            saved_count = 0
            duplicate_count = 0
            
            for i, event_data in enumerate(events, 1):
                print(f"  [{i}/{len(events)}] {event_data.get('title', '제목 없음')}")
                
                success = insert_event(db, event_data)
                if success:
                    saved_count += 1
                else:
                    duplicate_count += 1
            
            print(f"\n[완료]")
            print(f"  신규 저장: {saved_count}개")
            print(f"  중복 스킵: {duplicate_count}개")
            print(f"\n[INFO] 대시보드: http://localhost:8000\n")
        
        finally:
            db.close()


# ==================== 실행 함수 ====================

async def main():
    """메인 함수"""
    crawler = UniversalCardEventCrawler()
    
    print("\n" + "="*70)
    print("Universal Card Event Crawler")
    print("="*70)
    print("\n실행 모드:")
    print("  1. 크롤링만 실행 (결과 출력)")
    print("  2. 크롤링 + DB 저장 (전체 파이프라인)")
    print("  3. 테스트 (신한카드만)")
    
    choice = input("\n선택 (1-3): ").strip()
    
    if choice == '1':
        # 크롤링만
        events = await crawler.run_all_sync()
        
        print("\n수집된 이벤트:")
        for i, event in enumerate(events, 1):
            print(f"\n[{i}] {event.get('title')}")
            print(f"    회사: {event.get('company')}")
            print(f"    카테고리: {event.get('category')}")
            print(f"    혜택: {event.get('benefit_value')}")
            print(f"    위협도: {event.get('threat_level')}")
    
    elif choice == '2':
        # 전체 파이프라인
        await crawler.run_and_save_to_db()
    
    elif choice == '3':
        # 테스트 (신한카드만)
        await crawler.init_browser(headless=False)  # 브라우저 보이게
        
        try:
            test_company = "신한카드"
            test_config = crawler.CARD_COMPANIES[test_company]
            
            events = await crawler.crawl_company(test_company, test_config)
            
            if events:
                print("\n테스트 성공! 수집된 이벤트:")
                for event in events:
                    print(f"  - {event.get('title')}")
            else:
                print("\n테스트 완료. 수집된 이벤트: 0개")
                print("브라우저와 저장된 JSON 파일을 확인하세요.")
        
        finally:
            await crawler.close_browser()
    
    else:
        print("[ERROR] 잘못된 선택")


if __name__ == "__main__":
    asyncio.run(main())
