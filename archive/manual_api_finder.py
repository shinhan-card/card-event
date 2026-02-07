"""
수동 API 찾기 도구
브라우저를 보이게 해서 직접 조작하며 API 캡처
"""

import asyncio
import sys
import io
import json
from playwright.async_api import async_playwright, Response
from playwright_stealth import stealth_async

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


async def find_apis(company_name: str, url: str, domain: str):
    """API 찾기"""
    print(f"\n{'='*70}")
    print(f"[{company_name}] API 탐지기")
    print(f"{'='*70}\n")
    
    captured_apis = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,  # 브라우저 보이게!
            args=['--disable-blink-features=AutomationControlled']
        )
        
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            viewport={'width': 1920, 'height': 1080},
            locale='ko-KR',
        )
        
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
        """)
        
        page = await context.new_page()
        await stealth_async(page)
        
        # API 인터셉터
        async def handle_response(response: Response):
            try:
                url_str = response.url
                
                # 도메인 확인
                if domain not in url_str:
                    return
                
                # JSON 확인
                content_type = response.headers.get('content-type', '')
                if 'json' not in content_type:
                    return
                
                # 제외 패턴
                if any(ex in url_str.lower() for ex in ['tracking', 'analytics', 'mpulse', 'log', 'metric']):
                    return
                
                try:
                    json_data = await response.json()
                    data_size = len(json.dumps(json_data))
                    
                    if data_size < 100:
                        return
                    
                    captured_apis.append({
                        'url': url_str,
                        'data': json_data,
                        'size': data_size
                    })
                    
                    print(f"\n  ✅ API 캡처! [{len(captured_apis)}]")
                    print(f"     URL: {url_str[:80]}...")
                    print(f"     크기: {data_size} bytes")
                    
                    # 자동 저장
                    filename = f"manual_api_{company_name}_{len(captured_apis)}.json"
                    with open(filename, 'w', encoding='utf-8') as f:
                        json.dump(json_data, f, ensure_ascii=False, indent=2)
                    print(f"     저장: {filename}")
                    
                except:
                    pass
            except:
                pass
        
        page.on('response', handle_response)
        
        # 페이지 로딩
        print(f"[INFO] 페이지 로딩: {url}")
        print(f"[INFO] 브라우저가 열립니다. 직접 조작하세요:\n")
        print("  1. 페이지 스크롤")
        print("  2. '더보기' 버튼 클릭")
        print("  3. 카테고리 탭 클릭")
        print("  4. 검색 또는 필터 사용\n")
        print(f"[INFO] 캡처된 API는 자동으로 'manual_api_{company_name}_X.json'으로 저장됩니다.\n")
        
        await page.goto(url, timeout=60000)
        await asyncio.sleep(5)
        
        print("[대기] 브라우저를 조작하세요. 완료하면 Enter를 누르세요...")
        input()
        
        await browser.close()
        
        print(f"\n{'='*70}")
        print(f"[{company_name}] 총 {len(captured_apis)}개 API 캡처")
        print(f"{'='*70}\n")
        
        for i, api in enumerate(captured_apis, 1):
            print(f"  [{i}] {api['url'][:60]}... ({api['size']} bytes)")
        
        print()


async def main():
    """메인"""
    companies = {
        "1": ("신한카드", "https://www.shinhancard.com/pconts/html/benefit/event/main.html", "shinhancard.com"),
        "2": ("삼성카드", "https://www.samsungcard.com/personal/benefit/event/list.do", "samsungcard.com"),
        "3": ("현대카드", "https://www.hyundaicard.com/event/eventlist.hdc", "hyundaicard.com"),
        "4": ("KB국민카드", "https://www.kbcard.com/CRD/DVIEW/MBCXBDDAMBC0001.do", "kbcard.com"),
    }
    
    print("\nAPI를 찾을 카드사를 선택하세요:")
    for key, (name, _, _) in companies.items():
        print(f"  {key}. {name}")
    print("  5. 전체")
    
    choice = input("\n선택 (1-5): ").strip()
    
    if choice in companies:
        name, url, domain = companies[choice]
        await find_apis(name, url, domain)
    elif choice == '5':
        for key in ['1', '2', '3', '4']:
            name, url, domain = companies[key]
            await find_apis(name, url, domain)
    else:
        print("[ERROR] 잘못된 선택")


if __name__ == "__main__":
    asyncio.run(main())
