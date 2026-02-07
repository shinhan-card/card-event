"""
Playwright Stealth 테스트
봇 탐지 회피가 제대로 작동하는지 검증
"""

import asyncio
import sys
import io
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


async def test_stealth():
    """Stealth 모드 테스트"""
    
    print("\n" + "="*70)
    print("Playwright Stealth 테스트")
    print("="*70 + "\n")
    
    async with async_playwright() as p:
        # 브라우저 실행 (화면 보이게)
        browser = await p.chromium.launch(
            headless=False,  # 화면 보이게
            args=[
                '--disable-blink-features=AutomationControlled',
                '--no-first-run',
                '--no-default-browser-check',
            ]
        )
        
        # User-Agent 설정
        user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        
        context = await browser.new_context(
            user_agent=user_agent,
            viewport={'width': 1920, 'height': 1080},
            locale='ko-KR',
        )
        
        # 추가 스크립트
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
        """)
        
        page = await context.new_page()
        
        # ⭐ Stealth 적용
        await stealth_async(page)
        
        print("[OK] Stealth 모드 적용 완료\n")
        
        # 봇 탐지 테스트 사이트 방문
        test_urls = [
            "https://bot.sannysoft.com/",  # 봇 탐지 테스트
            "https://arh.antoinevastel.com/bots/areyouheadless",  # Headless 탐지
            "https://www.shinhancard.com",  # 실제 카드사 사이트
        ]
        
        print("봇 탐지 테스트 사이트에서 검증 중...\n")
        
        for i, url in enumerate(test_urls, 1):
            print(f"[{i}/{len(test_urls)}] {url}")
            
            try:
                await page.goto(url, timeout=30000)
                await asyncio.sleep(5)
                
                # 현재 User-Agent 확인
                ua = await page.evaluate("navigator.userAgent")
                print(f"  User-Agent: {ua[:80]}...")
                
                # webdriver 속성 확인
                webdriver = await page.evaluate("navigator.webdriver")
                print(f"  navigator.webdriver: {webdriver}")
                
                # Chrome 객체 확인
                has_chrome = await page.evaluate("typeof window.chrome !== 'undefined'")
                print(f"  window.chrome 존재: {has_chrome}")
                
                # Plugins 확인
                plugins_count = await page.evaluate("navigator.plugins.length")
                print(f"  Plugins 수: {plugins_count}")
                
                print()
                
                if i < len(test_urls):
                    input("  다음 사이트로 이동하려면 Enter를 누르세요...")
                    print()
                
            except Exception as e:
                print(f"  [ERROR] {e}\n")
        
        print("\n[완료] 브라우저를 확인하세요.")
        print("봇으로 탐지되지 않으면 성공입니다!")
        input("\n종료하려면 Enter를 누르세요...")
        
        await browser.close()


if __name__ == "__main__":
    asyncio.run(test_stealth())
