"""
빠른 순차 크롤러 - 실전 버전
cms_id 3733000~3736000 탐색 (최근 이벤트 중심)
"""

import asyncio
import sys
import io
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
from database import SessionLocal, insert_event, init_db

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


async def crawl():
    print("\n🚀 빠른 순차 크롤링 시작\n")
    
    base = "https://www.samsungcard.com/personal/event/ing/UHPPBE1403M0.jsp?cms_id="
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        found = []
        fails = 0
        
        # 더 좁은 범위로 빠르게
        for cms_id in range(3733000, 3736000):
            url = f"{base}{cms_id}"
            
            try:
                resp = await page.goto(url, timeout=5000)
                await asyncio.sleep(0.3)
                
                html = await page.content()
                
                if "조회 결과가 없습니다" in html or resp.status == 404:
                    fails += 1
                    if fails >= 30:
                        print(f"\n연속 30번 실패, 종료 (현재 {len(found)}개)\n")
                        break
                    continue
                
                fails = 0
                soup = BeautifulSoup(html, 'lxml')
                
                # 제목
                title = None
                for h in soup.find_all(['h1', 'h2']):
                    t = h.get_text(strip=True)
                    if 5 < len(t) < 80:
                        title = t
                        break
                
                if not title:
                    continue
                
                # 기간
                import re
                period = "정보 없음"
                text = soup.get_text()
                match = re.search(r'20\d{2}\.\d{2}\.\d{2}~20\d{2}\.\d{2}\.\d{2}', text)
                if match:
                    period = match.group()
                
                # 카테고리
                cat = "생활"
                if '여행' in title: cat = "여행"
                elif '쇼핑' in title: cat = "쇼핑"
                elif '식사' in title or '다이닝' in title: cat = "식음료"
                elif '자동차' in title or '보험' in title: cat = "교통"
                elif '금리' in title or '할부' in title: cat = "금융"
                
                found.append({
                    "url": url,
                    "company": "삼성카드",
                    "category": cat,
                    "title": title,
                    "period": period,
                    "benefit_type": "혜택",
                    "benefit_value": "상세 페이지 참조",
                    "conditions": "상세 페이지 참조",
                    "target_segment": "일반",
                    "threat_level": "Mid",
                    "one_line_summary": title,
                    "raw_text": title
                })
                
                print(f"✅ [{cms_id}] {title[:50]}")
            
            except:
                fails += 1
                if fails >= 30:
                    break
        
        await browser.close()
        
        print(f"\n총 {len(found)}개 발견!\n")
        return found


def save(events):
    if not events:
        return
    
    print(f"DB 저장 중...\n")
    
    init_db()
    db = SessionLocal()
    
    try:
        saved = 0
        for e in events:
            if insert_event(db, e):
                saved += 1
        
        print(f"신규: {saved}개\n")
    finally:
        db.close()


async def main():
    events = await crawl()
    save(events)
    print("✅ 완료! http://localhost:8000\n")


if __name__ == "__main__":
    asyncio.run(main())
