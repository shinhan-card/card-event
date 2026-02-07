"""
실제 카드사 이벤트 페이지 크롤링 테스트
샘플 URL로 전체 파이프라인 테스트
"""

import asyncio
import sys
import io
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
from analyzer import CardEventAnalyzer
from database import SessionLocal, init_db, insert_event

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


# 실제 카드사 이벤트 페이지 샘플 URL
SAMPLE_URLS = [
    # 신한카드 - 실제 이벤트 페이지들 (2024-2026년 기준)
    "https://www.shinhancard.com/pconts/html/benefit/event/1234567890.html",  # 예시
    
    # 삼성카드
    "https://www.samsungcard.com/personal/benefit/event/UHPPBE0001M0.jsp",
    
    # 현대카드
    "https://www.hyundaicard.com/event/view.hdc?eventId=123",
    
    # KB국민카드
    "https://www.kbcard.com/CRD/DVIEW/MBCXBDDAMBC0001.do?evtId=123",
]

# 더 간단한 테스트용: 공개 뉴스 사이트 사용
TEST_URLS = [
    # 네이버 카드뉴스나 공개 블로그 포스트
    "https://blog.naver.com",  # 실제 카드 이벤트 블로그 URL
]


async def crawl_and_analyze(url: str):
    """URL 크롤링 + AI 분석"""
    print(f"\n{'='*70}")
    print(f"처리 중: {url}")
    print(f"{'='*70}")
    
    analyzer = CardEventAnalyzer()
    db = SessionLocal()
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            try:
                print(f"[1/3] 페이지 로딩 중...")
                await page.goto(url, timeout=30000)
                await asyncio.sleep(3)
                
                html = await page.content()
                soup = BeautifulSoup(html, 'lxml')
                
                # 텍스트 추출
                for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
                    tag.decompose()
                
                body = soup.find('body')
                if body:
                    text = body.get_text(separator='\n', strip=True)
                    text = '\n'.join([line.strip() for line in text.split('\n') if line.strip()])[:8000]
                    
                    print(f"[OK] 텍스트 추출: {len(text)}자")
                    
                    if len(text) > 100:
                        # AI 분석
                        print(f"[2/3] Gemini AI 분석 중...")
                        analyzed_data = analyzer.analyze_event(text, url)
                        
                        if analyzed_data:
                            # DB 저장
                            print(f"[3/3] DB 저장 중...")
                            success = insert_event(db, analyzed_data)
                            
                            if success:
                                print(f"\n[OK] 성공!")
                                print(f"  회사: {analyzed_data.get('company')}")
                                print(f"  제목: {analyzed_data.get('title')}")
                                print(f"  위협도: {analyzed_data.get('threat_level')}")
                                return True
                        else:
                            print("[WARN] AI 분석 실패")
                    else:
                        print("[WARN] 텍스트가 너무 짧음")
                
            finally:
                await browser.close()
        
    except Exception as e:
        print(f"[ERROR] {e}")
    finally:
        db.close()
    
    return False


async def main():
    """메인"""
    init_db()
    
    print("\n" + "="*70)
    print("실제 카드사 이벤트 크롤링 테스트")
    print("="*70)
    
    # 사용자 입력 받기
    print("\n옵션을 선택하세요:")
    print("  1. 테스트 URL 사용 (추천)")
    print("  2. 직접 URL 입력")
    
    choice = input("\n선택 (1-2): ").strip()
    
    urls = []
    
    if choice == '1':
        # 간단한 테스트 URL
        urls = [
            "https://www.example.com",  # 예시
        ]
        print("\n[INFO] 테스트 모드: 샘플 URL로 파이프라인 테스트")
        print("[WARN] 실제 카드사 URL이 아닌 테스트용입니다.")
        print("\n실제 사용하려면:")
        print("  1. 카드사 웹사이트 방문")
        print("  2. 이벤트 상세 페이지 URL 복사")
        print("  3. manual_collector.py 실행하여 URL 입력\n")
        
        proceed = input("계속하시겠습니까? (y/n): ").lower()
        if proceed != 'y':
            return
        
    else:
        print("\n카드사 이벤트 페이지 URL을 입력하세요 (한 줄에 하나씩, 완료하면 빈 줄):")
        while True:
            url = input("URL: ").strip()
            if not url:
                break
            urls.append(url)
    
    if not urls:
        print("\n[INFO] 입력된 URL이 없습니다.")
        return
    
    # 크롤링 실행
    print(f"\n[INFO] {len(urls)}개 URL 처리 시작...\n")
    
    success_count = 0
    for i, url in enumerate(urls, 1):
        print(f"\n[{i}/{len(urls)}]")
        success = await crawl_and_analyze(url)
        if success:
            success_count += 1
        await asyncio.sleep(2)
    
    print(f"\n{'='*70}")
    print(f"완료! {success_count}/{len(urls)}개 성공")
    print(f"{'='*70}\n")


if __name__ == "__main__":
    asyncio.run(main())
