"""
Gemini Vision Analyzer - 스크린샷 + 멀티모달 분석
이미지와 텍스트를 동시에 분석하여 정확한 이벤트 정보 추출
"""

import asyncio
import sys
import io
import json
import base64
from pathlib import Path
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async
import google.generativeai as genai
from PIL import Image
from database import SessionLocal, insert_event, init_db
from dotenv import load_dotenv
import os

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

load_dotenv()

# Gemini API 설정
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# 분석 완료 이벤트 추적 파일
ANALYZED_FILE = "analyzed_events.json"


class GeminiVisionAnalyzer:
    """Gemini Vision 기반 이벤트 분석기"""
    
    # Gemini 모델 우선순위 (높은 것부터 시도)
    GEMINI_MODELS = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-flash-latest',
        'gemini-pro-latest',
    ]
    
    def __init__(self):
        self.analyzed_cms_ids = self.load_analyzed()
        self.gemini_model = None
        self.init_gemini_model()
    
    def init_gemini_model(self):
        """Gemini 모델 초기화 (우선순위대로 시도)"""
        for model_name in self.GEMINI_MODELS:
            try:
                self.gemini_model = genai.GenerativeModel(model_name)
                print(f"[OK] Gemini 모델: {model_name}\n")
                return
            except Exception as e:
                print(f"[WARN] {model_name} 실패, 다음 모델 시도...")
                continue
        
        raise Exception("사용 가능한 Gemini 모델이 없습니다!")
    
    def load_analyzed(self) -> set:
        """이미 분석한 cms_id 로드"""
        if Path(ANALYZED_FILE).exists():
            with open(ANALYZED_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return set(data.get('analyzed_cms_ids', []))
        return set()
    
    def save_analyzed(self, cms_id: int):
        """분석 완료 cms_id 저장"""
        self.analyzed_cms_ids.add(cms_id)
        with open(ANALYZED_FILE, 'w', encoding='utf-8') as f:
            json.dump({'analyzed_cms_ids': list(self.analyzed_cms_ids)}, f)
    
    async def analyze_event_page(self, page, cms_id: int, screenshot_path: str, text_content: str) -> dict:
        """
        Gemini 멀티모달 분석
        
        Args:
            page: Playwright 페이지 객체
            cms_id: 이벤트 CMS ID
            screenshot_path: 스크린샷 파일 경로
            text_content: 추출된 텍스트
        
        Returns:
            dict: 분석된 이벤트 정보
        """
        
        system_prompt = """
너는 **카드 상품 전략 전문가**이자 **이미지/문서 분석 전문가**야.
제공된 **이미지를 최우선**으로 꼼꼼히 분석하고, 텍스트는 보조 참고용으로만 사용해.

## 이미지 분석 원칙 (필수)
1. **숫자 정확 추출**: 금액(원, 만원), 할인율(%), 캐시백(%), 일수, 횟수 등 이미지에 보이는 숫자는 반드시 그대로 적어줘. "일부 할인" X → "5만원 할인" O.
2. **영역별 분석**: 상단 제목·기간, 중앙 혜택 문구, 하단 유의사항·대상카드·참여방법을 구역별로 나눠서 모두 읽어줘.
3. **표·카드·버튼 포함**: 표 안의 셀, 카드 이미지 위 텍스트, "참여하기" 옆 작은 글씨까지 빠짐없이 분석해줘.
4. **구체적 표현**: "다양한 혜택" X → 실제 내용(예: "스타벅스 2만원 이상 결제 시 2천원 할인") O.
5. **날짜 형식**: 이벤트 기간·종료일은 반드시 YYYY.MM.DD 또는 YYYY-MM-DD 형태로 통일해줘.
6. **정보가 진짜 없을 때만** "정보 없음" 사용. 추정 가능하면 추정해서 채워줘.

## 출력 형식 (반드시 JSON만 출력, 코드 블록 사용 금지)
{
  "이벤트명": "이벤트 제목 (이미지 상단/제목 영역에서 추출)",
  "혜택금액내용": "구체적 혜택 (예: 5만원 할인, 10% 캐시백, 1+1 무료)",
  "참여방법": "참여 방법 (앱 접수, 사전등록, 결제 시 자동 등)",
  "전월실적조건": "전월 실적 조건 (없으면 '없음')",
  "대상카드": "대상 카드명 또는 브랜드",
  "제외대상": "제외 조건 (없으면 '없음')",
  "이벤트종료일": "종료일 (YYYY.MM.DD)"
}
"""
        
        user_prompt = f"""
[과제] 삼성카드 이벤트 페이지 이미지+텍스트를 분석해줘.

[1단계 - 이미지]
- 이미지 전체를 위에서 아래로 스캔하면서 **모든 글씨(제목, 부제, 금액, %, 기간, 유의사항)**를 읽어줘.
- 작은 글씨, 푸터, 별표(*) 안내도 빠짐없이 포함해줘.

[2단계 - 텍스트 참고]
{text_content[:2500]}

[3단계 - JSON 출력]
위 이미지와 텍스트에서 추출한 내용을 바탕으로, **구체적인 숫자와 문구**를 넣은 JSON만 출력해줘. 추정 가능한 정보는 반드시 채워줘.
"""
        
        try:
            # 이미지 로드
            img = Image.open(screenshot_path)
            
            print(f"  [Gemini] 멀티모달 분석 중... (이미지 + 텍스트)")
            
            # Gemini Vision API 호출
            response = self.gemini_model.generate_content(
                [system_prompt, user_prompt, img],
                generation_config={
                    "temperature": 0.2,
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
            parsed = json.loads(result_text)
            
            # 핵심 정보가 전혀 없으면 None 반환 (저장/목록 제외 대상)
            title = (parsed.get('이벤트명') or '').strip()
            benefit = (parsed.get('혜택금액내용') or '').strip()
            end_date = (parsed.get('이벤트종료일') or '').strip()
            empty_markers = ('', '정보 없음', '정보없음', '제목 없음', '상세 페이지 참조', '-')
            if not title or title in empty_markers:
                print(f"  [SKIP] 이벤트명 없음 → 목록 제외")
                return None
            if not benefit and not end_date and (parsed.get('참여방법') or '').strip() in empty_markers:
                print(f"  [SKIP] 혜택/기간/참여방법 모두 없음 → 목록 제외")
                return None
            
            print(f"  [OK] 분석 완료: {title[:40]}")
            print(f"       혜택: {(benefit or '-')[:50]}")
            
            return parsed
        
        except json.JSONDecodeError as e:
            print(f"  [ERROR] JSON 파싱 실패: {e}")
            print(f"  응답: {response.text[:200]}")
            return None
        except Exception as e:
            print(f"  [ERROR] 분석 실패: {e}")
            return None
    
    async def crawl_event_with_vision(self, cms_id: int) -> dict:
        """
        단일 이벤트 크롤링 + Vision 분석
        
        Args:
            cms_id: 삼성카드 CMS ID
        
        Returns:
            dict: 분석된 이벤트 데이터 또는 None
        """
        
        # 이미 분석했으면 스킵
        if cms_id in self.analyzed_cms_ids:
            print(f"  ⏭️  [{cms_id}] 이미 분석함, 스킵")
            return None
        
        url = f"https://www.samsungcard.com/personal/event/ing/UHPPBE1403M0.jsp?cms_id={cms_id}"
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                viewport={'width': 1920, 'height': 1080}
            )
            
            page = await context.new_page()
            await stealth_async(page)
            
            try:
                print(f"\n[{cms_id}] 페이지 로딩...")
                
                # 페이지 로드
                await page.goto(url, wait_until="networkidle", timeout=15000)
                await asyncio.sleep(3)
                
                html = await page.content()
                
                # "조회 결과 없음" 체크
                if "조회 결과가 없습니다" in html:
                    print(f"  ⚠️  이벤트 없음")
                    return None
                
                # 스크롤하여 전체 콘텐츠 로드
                for _ in range(3):
                    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                    await asyncio.sleep(1)
                
                # 텍스트 추출
                text_content = await page.inner_text('body')
                
                # 스크린샷 캡처
                screenshot_path = f"screenshots/event_{cms_id}.png"
                Path("screenshots").mkdir(exist_ok=True)
                
                await page.screenshot(path=screenshot_path, full_page=True)
                print(f"  📸 스크린샷 저장: {screenshot_path}")
                
                # Gemini 분석
                analyzed_data = await self.analyze_event_page(
                    page, cms_id, screenshot_path, text_content
                )
                
                if not analyzed_data:
                    return None
                
                # 표준 스키마로 변환
                event_data = {
                    "url": url,
                    "company": "삼성카드",
                    "category": self.infer_category(analyzed_data.get('이벤트명', '')),
                    "title": analyzed_data.get('이벤트명', '제목 없음'),
                    "period": f"~{analyzed_data.get('이벤트종료일', '정보 없음')}",
                    "benefit_type": "혜택",
                    "benefit_value": analyzed_data.get('혜택금액내용', '상세 페이지 참조'),
                    "conditions": f"{analyzed_data.get('참여방법', '')} / {analyzed_data.get('전월실적조건', '')}",
                    "target_segment": analyzed_data.get('대상카드', '일반'),
                    "threat_level": "Mid",  # 기본값
                    "one_line_summary": analyzed_data.get('이벤트명', ''),
                    "raw_text": json.dumps(analyzed_data, ensure_ascii=False)
                }
                
                # 분석 완료 기록
                self.save_analyzed(cms_id)
                
                return event_data
            
            except Exception as e:
                print(f"  [ERROR] {e}")
                return None
            
            finally:
                await browser.close()
    
    def infer_category(self, title: str) -> str:
        """카테고리 추론"""
        if any(w in title for w in ['여행', '호텔', '항공']):
            return "여행"
        elif any(w in title for w in ['쇼핑', '할인', '백화점']):
            return "쇼핑"
        elif any(w in title for w in ['식사', '레스토랑', '다이닝', '스타벅스', '카페']):
            return "식음료"
        elif any(w in title for w in ['자동차', '보험', '주유']):
            return "교통"
        elif any(w in title for w in ['영화', '공연', '문화']):
            return "문화"
        elif any(w in title for w in ['금리', '대출', '할부']):
            return "금융"
        elif any(w in title for w in ['통신', '넷플릭스', '유튜브']):
            return "통신"
        else:
            return "생활"
    
    async def crawl_cms_range(self, start_id: int, end_id: int):
        """cms_id 범위 크롤링"""
        
        print("\n" + "="*70)
        print("🚀 Gemini Vision Analyzer - 삼성카드 상세 분석")
        print(f"   범위: {start_id} ~ {end_id}")
        print(f"   모델: {self.gemini_model._model_name if self.gemini_model else 'None'}")
        print("="*70 + "\n")
        
        collected = []
        consecutive_fails = 0
        
        for cms_id in range(start_id, end_id + 1):
            # 진행 상황 출력
            if (cms_id - start_id) % 10 == 0:
                print(f"\n[진행] cms_id {cms_id} ~ {cms_id + 9}")
                print(f"  현재까지: {len(collected)}개 수집\n")
            
            event_data = await self.crawl_event_with_vision(cms_id)
            
            if event_data:
                consecutive_fails = 0
                collected.append(event_data)
            else:
                consecutive_fails += 1
                if consecutive_fails >= 20:
                    print(f"\n[종료] 연속 20번 실패, 탐색 종료")
                    break
            
            # API Rate Limit 방지
            await asyncio.sleep(2)
        
        print(f"\n{'='*70}")
        print(f"🎉 분석 완료: {len(collected)}개")
        print(f"{'='*70}\n")
        
        return collected
    
    def save_to_db(self, events: list):
        """DB 저장"""
        if not events:
            print("[WARN] 저장할 이벤트 없음\n")
            return
        
        print(f"[DB 저장] {len(events)}개 저장 중...\n")
        
        init_db()
        db = SessionLocal()
        
        try:
            saved = 0
            duplicate = 0
            
            for i, event in enumerate(events, 1):
                success = insert_event(db, event)
                if success:
                    saved += 1
                    print(f"  [{i:2d}] ✅ {event['title'][:50]}")
                else:
                    duplicate += 1
            
            print(f"\n신규: {saved}개 | 중복: {duplicate}개\n")
        
        finally:
            db.close()


async def main():
    """메인 실행"""
    
    analyzer = GeminiVisionAnalyzer()
    
    print("\n" + "="*70)
    print("Gemini Vision Analyzer - 삼성카드 이벤트 분석")
    print("="*70)
    print("\n옵션:")
    print("  1. 최근 이벤트 (3735000 ~ 3735050) - 빠름, 테스트용")
    print("  2. 2월 이벤트 (3733000 ~ 3736000) - 중간, 추천")
    print("  3. 사용자 지정")
    
    choice = input("\n선택 (1-3): ").strip()
    
    if choice == '1':
        start, end = 3735000, 3735050
    elif choice == '2':
        start, end = 3733000, 3736000
    elif choice == '3':
        start = int(input("시작 cms_id: "))
        end = int(input("종료 cms_id: "))
    else:
        print("[ERROR] 잘못된 선택")
        return
    
    # 크롤링 + 분석
    events = await analyzer.crawl_cms_range(start, end)
    
    # DB 저장
    analyzer.save_to_db(events)
    
    print("\n✅ 완료! 대시보드: http://localhost:8000\n")


if __name__ == "__main__":
    asyncio.run(main())
