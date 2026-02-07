"""
디버깅용 크롤러 - 브라우저를 보이게 하고 실제 페이지 확인
"""

import asyncio
from playwright.async_api import async_playwright
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


async def debug_site(url, company_name):
    """사이트를 열어서 실제로 확인"""
    print(f"\n{'='*70}")
    print(f"[{company_name}] 디버깅")
    print(f"{'='*70}\n")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)  # 브라우저 보이게
        page = await browser.new_page()
        
        try:
            print(f"[INFO] 페이지 로딩 중: {url}")
            await page.goto(url, timeout=60000)
            
            # 10초 대기 (사용자가 페이지 확인 가능)
            print("[INFO] 10초 대기 중... 페이지를 확인하세요.")
            await asyncio.sleep(10)
            
            # 모든 링크 가져오기
            all_links = await page.query_selector_all('a')
            print(f"\n[INFO] 발견된 전체 링크: {len(all_links)}개\n")
            
            # 링크 샘플 출력
            print("링크 샘플 (처음 20개):")
            for i, link in enumerate(all_links[:20], 1):
                href = await link.get_attribute('href')
                text = await link.inner_text()
                text = text.strip()[:40] if text else ""
                print(f"  {i:2d}. {text:40s} -> {href}")
            
            # 페이지 HTML 저장
            html = await page.content()
            filename = f"debug_{company_name}.html"
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(html)
            print(f"\n[OK] HTML 저장: {filename}")
            
            # 사용자가 확인할 시간 주기
            print("\n[INFO] 브라우저를 확인하세요. 종료하려면 Enter를 누르세요...")
            input()
            
        except Exception as e:
            print(f"[ERROR] {e}")
        
        finally:
            await browser.close()


async def main():
    """메인"""
    sites = {
        "1": ("신한카드", "https://www.shinhancard.com/pconts/html/benefit/event/main.html"),
        "2": ("삼성카드", "https://www.samsungcard.com/personal/benefit/event/list.do"),
        "3": ("현대카드", "https://www.hyundaicard.com/event/eventlist.hdc"),
        "4": ("KB국민카드", "https://www.kbcard.com/CRD/DVIEW/MBCXBDDAMBC0001.do"),
    }
    
    print("\n디버깅할 카드사를 선택하세요:")
    for key, (name, _) in sites.items():
        print(f"  {key}. {name}")
    
    choice = input("\n선택 (1-4): ").strip()
    
    if choice in sites:
        company, url = sites[choice]
        await debug_site(url, company)
    else:
        print("[ERROR] 잘못된 선택")


if __name__ == "__main__":
    asyncio.run(main())
