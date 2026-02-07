"""
자동 Gemini Vision Analyzer
스크린샷 + 멀티모달 분석 (자동 실행)
"""

import asyncio
import sys
import io
import json
from pathlib import Path
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async
import google.generativeai as genai
from PIL import Image
from database import SessionLocal, insert_event, init_db
import os

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Gemini API 설정
genai.configure(api_key="AIzaSyBNAkrqvW6ueYrZHsyX3W7LXEmlWh5i6Jk")

# 분석 기록
ANALYZED_FILE = "analyzed.json"

def load_analyzed():
    if Path(ANALYZED_FILE).exists():
        with open(ANALYZED_FILE, 'r') as f:
            return set(json.load(f))
    return set()

def save_analyzed(analyzed_set):
    with open(ANALYZED_FILE, 'w') as f:
        json.dump(list(analyzed_set), f)


async def analyze_one_event(cms_id):
    """단일 이벤트 분석"""
    
    url = f"https://www.samsungcard.com/personal/event/ing/UHPPBE1403M0.jsp?cms_id={cms_id}"
    
    # Gemini 모델 (2.5-flash 우선)
    models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest']
    model = None
    
    for m in models:
        try:
            model = genai.GenerativeModel(m)
            break
        except:
            continue
    
    if not model:
        print("[ERROR] Gemini 모델 초기화 실패")
        return None
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await stealth_async(page)
        
        try:
            # 페이지 로드
            await page.goto(url, wait_until="networkidle", timeout=15000)
            await asyncio.sleep(3)
            
            html = await page.content()
            
            # 조회 결과 없음 체크
            if "조회 결과가 없습니다" in html:
                return None
            
            # 스크롤
            for _ in range(2):
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                await asyncio.sleep(1)
            
            # 텍스트 추출
            text = await page.inner_text('body')
            
            # 스크린샷
            screenshot = f"screenshots/event_{cms_id}.png"
            Path("screenshots").mkdir(exist_ok=True)
            await page.screenshot(path=screenshot, full_page=True)
            
            print(f"    📸 스크린샷 저장")
            
            # Gemini 분석
            img = Image.open(screenshot)
            
            prompt = f"""
카드 상품 전략 전문가로서 이 이미지와 텍스트를 분석해줘.

[텍스트]
{text[:1500]}

아래 JSON 형식으로만 출력해줘 (코드 블록 없이):
{{
  "이벤트명": "...",
  "혜택금액내용": "...",
  "참여방법": "...",
  "전월실적조건": "...",
  "대상카드": "...",
  "제외대상": "...",
  "이벤트종료일": "YYYY.MM.DD"
}}
"""
            
            print(f"    🤖 Gemini 분석 중...")
            
            response = model.generate_content([prompt, img])
            result = response.text.strip()
            
            # JSON 파싱
            if result.startswith("```"):
                result = result.split("```")[1]
                if result.startswith("json"):
                    result = result[4:]
                result = result.strip()
            
            data = json.loads(result)
            
            print(f"    ✅ 분석 완료: {data.get('이벤트명', '')[:40]}")
            
            return {
                "url": url,
                "company": "삼성카드",
                "category": "생활",
                "title": data.get('이벤트명', '제목 없음'),
                "period": f"~{data.get('이벤트종료일', '')}",
                "benefit_type": "혜택",
                "benefit_value": data.get('혜택금액내용', '상세 페이지 참조'),
                "conditions": f"{data.get('참여방법', '')} / {data.get('전월실적조건', '')}",
                "target_segment": data.get('대상카드', '일반'),
                "threat_level": "Mid",
                "one_line_summary": data.get('이벤트명', ''),
                "raw_text": json.dumps(data, ensure_ascii=False)
            }
        
        except Exception as e:
            print(f"    ❌ 오류: {e}")
            return None
        
        finally:
            await browser.close()


async def main():
    print("\n🚀 Gemini Vision Analyzer (자동 실행)\n")
    print("범위: cms_id 3735200 ~ 3735230 (30개 테스트)\n")
    
    analyzed = load_analyzed()
    collected = []
    
    for cms_id in range(3735200, 3735230):
        if cms_id in analyzed:
            continue
        
        print(f"\n[{cms_id}] 분석 중...")
        
        event = await analyze_one_event(cms_id)
        
        if event:
            collected.append(event)
            analyzed.add(cms_id)
            save_analyzed(analyzed)
        
        # API Rate Limit
        await asyncio.sleep(3)
    
    print(f"\n총 {len(collected)}개 수집!\n")
    
    # DB 저장
    if collected:
        init_db()
        db = SessionLocal()
        try:
            saved = 0
            for e in collected:
                if insert_event(db, e):
                    saved += 1
                    print(f"✅ {e['title'][:50]}")
            print(f"\n신규: {saved}개\n")
        finally:
            db.close()
    
    print("✅ 완료! http://localhost:8000\n")


if __name__ == "__main__":
    asyncio.run(main())
