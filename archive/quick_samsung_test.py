"""
빠른 삼성카드 테스트 (100개만)
cms_id 순차 크롤링 검증
"""

import asyncio
import sys
import io
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async
from bs4 import BeautifulSoup

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


async def test_quick():
    print("\n🚀 빠른 테스트 (cms_id 3733000 ~ 3733100)\n")
    
    base_url = "https://www.samsungcard.com/personal/event/ing/UHPPBE1403M0.jsp?cms_id="
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await stealth_async(page)
        
        found = []
        
        for cms_id in range(3733000, 3733100):
            url = f"{base_url}{cms_id}"
            
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=8000)
                await asyncio.sleep(0.8)
                
                html = await page.content()
                
                # "조회 결과 없음" 체크
                if "조회 결과가 없습니다" in html:
                    continue
                
                # 제목 추출
                soup = BeautifulSoup(html, 'lxml')
                title_elem = soup.select_one('h1, h2')
                
                if title_elem:
                    title = title_elem.get_text(strip=True)
                    if len(title) > 3:
                        found.append({'cms_id': cms_id, 'title': title, 'url': url})
                        print(f"✅ [{cms_id}] {title[:50]}")
            
            except:
                pass
        
        await browser.close()
        
        print(f"\n총 {len(found)}개 발견!\n")
        
        for item in found:
            print(f"  - {item['title']}")
            print(f"    {item['url']}\n")


if __name__ == "__main__":
    asyncio.run(test_quick())
