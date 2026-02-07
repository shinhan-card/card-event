"""
Google 검색 기반 크롤러
카드사 사이트를 직접 크롤링하지 않고
Google 검색 결과에서 이벤트 URL을 찾아 크롤링
"""

import asyncio
import sys
import io
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import re

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


class GoogleSearchCrawler:
    """Google 검색 기반 이벤트 크롤러"""
    
    def __init__(self):
        self.card_companies = [
            "신한카드",
            "삼성카드",
            "현대카드",
            "KB국민카드"
        ]
    
    async def search_google(self, query: str, max_results: int = 10):
        """Google 검색하여 URL 수집"""
        print(f"\n[검색] {query}")
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            try:
                # Google 검색
                search_url = f"https://www.google.com/search?q={query.replace(' ', '+')}&num=20"
                await page.goto(search_url, timeout=30000)
                await asyncio.sleep(2)
                
                html = await page.content()
                soup = BeautifulSoup(html, 'lxml')
                
                # 검색 결과 링크 추출
                urls = []
                for link in soup.find_all('a'):
                    href = link.get('href', '')
                    if '/url?q=' in href:
                        # Google 검색 결과 URL 파싱
                        match = re.search(r'/url\?q=([^&]+)', href)
                        if match:
                            url = match.group(1)
                            # 카드사 도메인만 필터링
                            if any(domain in url for domain in ['shinhancard.com', 'samsungcard.com', 'hyundaicard.com', 'kbcard.com']):
                                if 'event' in url or 'benefit' in url:
                                    urls.append(url)
                
                # 중복 제거
                urls = list(dict.fromkeys(urls))[:max_results]
                
                print(f"[OK] {len(urls)}개 URL 발견")
                for i, url in enumerate(urls[:5], 1):
                    print(f"  {i}. {url[:80]}...")
                
                return urls
                
            finally:
                await browser.close()
    
    async def collect_all_events(self):
        """모든 카드사의 이벤트 URL 수집"""
        print("\n" + "="*70)
        print("Google 검색 기반 이벤트 URL 수집")
        print("="*70)
        
        all_urls = []
        
        for company in self.card_companies:
            query = f"{company} 이벤트 2026 혜택"
            urls = await self.search_google(query, max_results=5)
            all_urls.extend(urls)
            await asyncio.sleep(3)  # Google Rate Limit
        
        # 중복 제거
        all_urls = list(dict.fromkeys(all_urls))
        
        print(f"\n{'='*70}")
        print(f"[완료] 총 {len(all_urls)}개 이벤트 URL 수집")
        print(f"{'='*70}\n")
        
        # URL 리스트 출력
        for i, url in enumerate(all_urls, 1):
            print(f"{i:2d}. {url}")
        
        # 파일로 저장
        with open("event_urls.txt", 'w', encoding='utf-8') as f:
            for url in all_urls:
                f.write(url + '\n')
        
        print(f"\n[OK] URL 목록이 'event_urls.txt'에 저장되었습니다.")
        
        return all_urls


async def main():
    """메인"""
    crawler = GoogleSearchCrawler()
    urls = await crawler.collect_all_events()
    
    if urls:
        print(f"\n다음 단계:")
        print(f"  1. manual_collector.py 실행")
        print(f"  2. 위의 URL들을 하나씩 입력")
        print(f"  3. AI가 자동으로 분석 + DB 저장\n")


if __name__ == "__main__":
    asyncio.run(main())
