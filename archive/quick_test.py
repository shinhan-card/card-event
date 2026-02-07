"""
빠른 크롤링 테스트
특정 카드사 1개만 테스트
"""

import asyncio
import sys
import io
from scraper import CardEventScraper

# Windows 콘솔 UTF-8 인코딩 설정
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


async def quick_test():
    """빠른 테스트 함수"""
    
    print("\n" + "="*70)
    print("빠른 크롤링 테스트")
    print("="*70 + "\n")
    
    print("테스트할 카드사를 선택하세요:")
    print("  1. 신한카드")
    print("  2. 삼성카드")
    print("  3. 현대카드")
    print("  4. KB국민카드")
    
    choice = input("\n선택 (1-4): ").strip()
    
    test_companies = {
        "1": ("신한카드", "https://www.shinhancard.com/pconts/html/benefit/event/main.html"),
        "2": ("삼성카드", "https://www.samsungcard.com/personal/benefit/event/list.do"),
        "3": ("현대카드", "https://www.hyundaicard.com/event/eventlist.hdc"),
        "4": ("KB국민카드", "https://www.kbcard.com/CRD/DVIEW/MBCXBDDAMBC0001.do"),
    }
    
    if choice not in test_companies:
        print("[ERROR] 잘못된 선택입니다.")
        return
    
    company, url = test_companies[choice]
    
    print(f"\n[INFO] {company} 크롤링 시작...")
    print(f"[INFO] URL: {url}\n")
    
    scraper = CardEventScraper()
    scraper.card_companies = {company: url}
    
    try:
        # 초기화
        await scraper.init_browser(headless=False)  # 브라우저 보이게
        
        # 1단계: URL 수집
        print(f"\n{'='*70}")
        print(f"1단계: 이벤트 URL 수집")
        print(f"{'='*70}")
        event_urls = await scraper.extract_event_list_urls(company, url)
        
        if not event_urls:
            print("\n[WARN] 이벤트 URL을 찾지 못했습니다.")
            print("[INFO] 브라우저를 확인하여 페이지 구조를 살펴보세요.")
            input("\n계속하려면 Enter를 누르세요...")
            await scraper.close_browser()
            return
        
        print(f"\n[INFO] 발견된 URL 목록:")
        for i, event_url in enumerate(event_urls[:5], 1):
            print(f"  {i}. {event_url}")
        
        # 2단계: 상세 페이지 크롤링 (첫 번째만)
        print(f"\n{'='*70}")
        print(f"2단계: 상세 페이지 크롤링 (첫 번째만)")
        print(f"{'='*70}")
        
        first_url = event_urls[0]
        url, text = await scraper.extract_event_detail(first_url)
        
        print(f"\n[결과]")
        print(f"URL: {url}")
        print(f"\n추출된 텍스트 (처음 500자):")
        print("-" * 70)
        print(text[:500])
        print("-" * 70)
        
        # 파일로 저장
        filename = f"test_result_{company}.txt"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(f"URL: {url}\n\n")
            f.write("="*70 + "\n")
            f.write("추출된 텍스트\n")
            f.write("="*70 + "\n\n")
            f.write(text)
        
        print(f"\n[OK] 전체 결과가 '{filename}' 파일로 저장되었습니다.")
        
        # 모든 URL 크롤링 할지 선택
        print(f"\n남은 {len(event_urls) - 1}개 URL도 크롤링 하시겠습니까? (y/n): ", end="")
        continue_choice = input().strip().lower()
        
        if continue_choice == 'y':
            all_results = [(url, text)]
            
            for i, event_url in enumerate(event_urls[1:5], 2):  # 최대 5개까지
                print(f"\n[{i}/5] 크롤링 중...")
                await scraper.random_delay(2, 4)
                url, text = await scraper.extract_event_detail(event_url)
                all_results.append((url, text))
            
            # 전체 결과 저장
            all_filename = f"test_result_{company}_all.txt"
            with open(all_filename, 'w', encoding='utf-8') as f:
                for i, (url, text) in enumerate(all_results, 1):
                    f.write(f"\n\n{'='*70}\n")
                    f.write(f"이벤트 {i}\n")
                    f.write(f"{'='*70}\n")
                    f.write(f"URL: {url}\n\n")
                    f.write(text)
                    f.write("\n\n")
            
            print(f"\n[OK] 전체 {len(all_results)}개 결과가 '{all_filename}' 파일로 저장되었습니다.")
        
    except Exception as e:
        print(f"\n[ERROR] 오류 발생: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        await scraper.close_browser()
        print("\n[완료] 테스트가 종료되었습니다.")


if __name__ == "__main__":
    asyncio.run(quick_test())
