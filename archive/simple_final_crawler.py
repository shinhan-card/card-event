"""
Simple Final Crawler - 단순하고 확실한 크롤러
복잡한 기능 제거, 실용성에 집중

목표:
1. 삼성카드 cms_id 순차 크롤링 (2026년 모든 이벤트)
2. 제목, 기간, 간단한 혜택만 정확하게 수집
3. 빠르고 안정적으로 작동
"""

import asyncio
import sys
import io
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async
from bs4 import BeautifulSoup
from database import SessionLocal, insert_event, init_db
from datetime import datetime

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


async def crawl_samsung_simple(start_id: int, end_id: int):
    """삼성카드 심플 크롤러"""
    
    print("\n" + "="*70)
    print(f"🚀 삼성카드 심플 크롤러")
    print(f"   범위: {start_id} ~ {end_id}")
    print(f"   시작: {datetime.now().strftime('%H:%M:%S')}")
    print("="*70 + "\n")
    
    base_url = "https://www.samsungcard.com/personal/event/ing/UHPPBE1403M0.jsp?cms_id="
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await stealth_async(page)
        
        events = []
        fails = 0
        
        for cms_id in range(start_id, end_id + 1):
            if (cms_id - start_id) % 50 == 0:
                print(f"[{cms_id}] 탐색 중... (현재 {len(events)}개 발견)")
            
            url = f"{base_url}{cms_id}"
            
            try:
                await page.goto(url, timeout=8000)
                await asyncio.sleep(0.5)
                
                html = await page.content()
                
                # 조회 결과 없음 체크
                if "조회 결과가 없습니다" in html:
                    fails += 1
                    if fails >= 50:
                        print(f"\n연속 50번 실패, 종료")
                        break
                    continue
                
                fails = 0
                soup = BeautifulSoup(html, 'lxml')
                
                # 제목
                title = None
                for tag in soup.find_all(['h1', 'h2', 'h3']):
                    text = tag.get_text(strip=True)
                    if 5 < len(text) < 100:
                        title = text
                        break
                
                if not title:
                    continue
                
                # 기간 찾기 (간단하게)
                period = "정보 없음"
                full_text = soup.get_text()
                
                # "2026.02.01~2026.02.28" 패턴 찾기
                import re
                date_pattern = r'20\d{2}\.\d{2}\.\d{2}[~\-]20\d{2}\.\d{2}\.\d{2}'
                match = re.search(date_pattern, full_text)
                if match:
                    period = match.group(0).replace('-', '~')
                
                # 카테고리 (간단하게)
                category = "기타"
                if '여행' in title: category = "여행"
                elif '쇼핑' in title or '할인' in title: category = "쇼핑"
                elif '식사' in title or '다이닝' in title or '스타벅스' in title: category = "식음료"
                elif '자동차' in title or '보험' in title: category = "교통"
                elif '영화' in title or '공연' in title: category = "문화"
                elif '금리' in title or '할부' in title: category = "금융"
                
                events.append({
                    "url": url,
                    "company": "삼성카드",
                    "category": category,
                    "title": title,
                    "period": period,
                    "benefit_type": "혜택",
                    "benefit_value": "상세 페이지 참조",
                    "conditions": "상세 페이지 참조",
                    "target_segment": "일반",
                    "threat_level": "Mid",  # 기본값
                    "one_line_summary": title,
                    "raw_text": title
                })
                
                print(f"  ✅ [{cms_id}] {title[:50]}")
            
            except:
                fails += 1
                if fails >= 50:
                    break
        
        await browser.close()
        
        print(f"\n{'='*70}")
        print(f"완료: {len(events)}개 수집")
        print(f"시간: {datetime.now().strftime('%H:%M:%S')}")
        print(f"{'='*70}\n")
        
        return events


def save_events(events):
    """DB 저장"""
    if not events:
        return
    
    print(f"[DB 저장] {len(events)}개 저장 중...\n")
    
    init_db()
    db = SessionLocal()
    
    try:
        saved = 0
        for event in events:
            if insert_event(db, event):
                saved += 1
                print(f"  ✅ {event['title'][:50]}")
        
        print(f"\n신규 저장: {saved}개\n")
    finally:
        db.close()


async def main():
    """메인 - 삼성카드 2월 집중"""
    # 2026년 2월 중심 범위
    events = await crawl_samsung_simple(3733000, 3737000)
    save_events(events)
    print("\n✅ 완료! http://localhost:8000\n")


if __name__ == "__main__":
    asyncio.run(main())
