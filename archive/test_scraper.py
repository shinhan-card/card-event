"""
카드사 사이트 구조 분석 스크립트
실제 HTML을 확인하여 올바른 셀렉터를 찾습니다.
"""

import asyncio
from playwright.async_api import async_playwright
import sys
import io

# Windows 콘솔 UTF-8 인코딩 설정
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


async def analyze_site(url, company_name):
    """사이트 구조 분석"""
    print(f"\n{'='*70}")
    print(f"[{company_name}] 사이트 분석 중...")
    print(f"URL: {url}")
    print(f"{'='*70}\n")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)  # 브라우저 보이게
        page = await browser.new_page()
        
        try:
            await page.goto(url, timeout=30000, wait_until='networkidle')
            await page.wait_for_timeout(3000)
            
            # 페이지 HTML 저장
            content = await page.content()
            filename = f"html_{company_name}.html"
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"[OK] HTML 저장됨: {filename}")
            
            # 링크 분석
            links = await page.query_selector_all('a')
            print(f"\n[INFO] 전체 링크 수: {len(links)}")
            
            # 이벤트 관련 링크 찾기
            event_links = []
            for link in links[:100]:  # 상위 100개만
                href = await link.get_attribute('href')
                text = await link.inner_text()
                text = text.strip()[:50]  # 50자까지만
                
                if href and ('event' in href.lower() or '이벤트' in text):
                    event_links.append({
                        'text': text,
                        'href': href
                    })
            
            print(f"\n[INFO] 이벤트 관련 링크: {len(event_links)}개")
            for i, link in enumerate(event_links[:10], 1):
                print(f"  {i}. {link['text']}")
                print(f"     -> {link['href']}")
            
            # 스크린샷
            screenshot_file = f"screenshot_{company_name}.png"
            await page.screenshot(path=screenshot_file, full_page=True)
            print(f"\n[OK] 스크린샷 저장: {screenshot_file}")
            
            input("\n계속하려면 Enter를 누르세요...")
            
        except Exception as e:
            print(f"[ERROR] {e}")
        
        finally:
            await browser.close()


async def main():
    """메인 함수"""
    card_companies = {
        "신한카드": "https://www.shinhancard.com/pconts/html/benefit/event/main.html",
        "삼성카드": "https://www.samsungcard.com/personal/benefit/event/list.do",
        "현대카드": "https://www.hyundaicard.com/event/eventlist.hdc",
        "KB국민카드": "https://www.kbcard.com/CRD/DVIEW/MBCXBDDAMBC0001.do",
    }
    
    print("\n어떤 카드사를 분석하시겠습니까?")
    for i, company in enumerate(card_companies.keys(), 1):
        print(f"  {i}. {company}")
    print("  5. 전체 분석")
    
    choice = input("\n선택 (1-5): ").strip()
    
    if choice == '5':
        for company, url in card_companies.items():
            await analyze_site(url, company)
    elif choice in ['1', '2', '3', '4']:
        company = list(card_companies.keys())[int(choice) - 1]
        url = card_companies[company]
        await analyze_site(url, company)
    else:
        print("[ERROR] 잘못된 선택입니다.")


if __name__ == "__main__":
    asyncio.run(main())
