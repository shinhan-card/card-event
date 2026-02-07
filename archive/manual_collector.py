"""
수동 이벤트 수집기
사용자가 카드사 사이트에서 이벤트 URL을 직접 입력하면
해당 페이지를 크롤링하고 AI로 분석하여 DB에 저장
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


class ManualEventCollector:
    """수동 이벤트 수집기"""
    
    def __init__(self):
        self.analyzer = CardEventAnalyzer()
        self.db = SessionLocal()
        init_db()
    
    async def crawl_url(self, url: str):
        """단일 URL 크롤링"""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            try:
                print(f"\n[INFO] 페이지 로딩: {url}")
                await page.goto(url, timeout=30000)
                await asyncio.sleep(3)
                
                html = await page.content()
                soup = BeautifulSoup(html, 'lxml')
                
                # 불필요한 태그 제거
                for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
                    tag.decompose()
                
                # 텍스트 추출
                text_parts = []
                
                # 제목
                for selector in ['h1', 'h2', '.title', '.event-title']:
                    title = soup.select_one(selector)
                    if title:
                        title_text = title.get_text(strip=True)
                        if len(title_text) > 3:
                            text_parts.append(f"[제목] {title_text}")
                            break
                
                # 본문
                body = soup.find('body')
                if body:
                    body_text = body.get_text(separator='\n', strip=True)
                    text_parts.append(f"[본문]\n{body_text}")
                
                full_text = '\n\n'.join(text_parts)
                lines = [line.strip() for line in full_text.split('\n') if line.strip()]
                full_text = '\n'.join(lines)[:8000]
                
                print(f"[OK] 텍스트 추출 완료: {len(full_text)}자")
                
                return full_text
                
            finally:
                await browser.close()
    
    async def process_url(self, url: str):
        """URL 처리: 크롤링 + AI 분석 + DB 저장"""
        print(f"\n{'='*70}")
        print(f"이벤트 처리 중: {url}")
        print(f"{'='*70}")
        
        # 1. 크롤링
        text = await self.crawl_url(url)
        
        if not text or len(text) < 100:
            print("[ERROR] 텍스트 추출 실패")
            return False
        
        # 2. AI 분석
        print(f"\n[INFO] Gemini AI로 분석 중...")
        analyzed_data = self.analyzer.analyze_event(text, url)
        
        if not analyzed_data:
            print("[ERROR] AI 분석 실패")
            return False
        
        # 3. DB 저장
        print(f"\n[INFO] 데이터베이스 저장 중...")
        success = insert_event(self.db, analyzed_data)
        
        if success:
            print(f"\n[OK] 저장 완료!")
            print(f"  회사: {analyzed_data.get('company')}")
            print(f"  제목: {analyzed_data.get('title')}")
            print(f"  카테고리: {analyzed_data.get('category')}")
            print(f"  혜택: {analyzed_data.get('benefit_value')}")
            print(f"  위협도: {analyzed_data.get('threat_level')}")
            return True
        else:
            print("[WARN] 이미 존재하는 URL입니다.")
            return False
    
    def close(self):
        self.db.close()


async def main():
    """메인 함수"""
    collector = ManualEventCollector()
    
    print("\n" + "="*70)
    print("수동 이벤트 수집기")
    print("="*70)
    print("\n카드사 웹사이트에서 이벤트 페이지 URL을 복사해서 입력하세요.")
    print("여러 URL을 입력하려면 한 줄에 하나씩 입력하고, 완료하면 빈 줄을 입력하세요.\n")
    
    urls = []
    while True:
        url = input("이벤트 URL (완료하려면 Enter): ").strip()
        if not url:
            break
        urls.append(url)
    
    if not urls:
        print("\n[INFO] 입력된 URL이 없습니다.")
        return
    
    print(f"\n[INFO] 총 {len(urls)}개 URL을 처리합니다...\n")
    
    success_count = 0
    for i, url in enumerate(urls, 1):
        print(f"\n{'='*70}")
        print(f"[{i}/{len(urls)}] 처리 중")
        print(f"{'='*70}")
        
        try:
            success = await collector.process_url(url)
            if success:
                success_count += 1
        except Exception as e:
            print(f"[ERROR] 처리 실패: {e}")
        
        if i < len(urls):
            await asyncio.sleep(2)  # API Rate Limit
    
    collector.close()
    
    print(f"\n{'='*70}")
    print(f"완료! {success_count}/{len(urls)}개 성공")
    print(f"{'='*70}\n")
    
    print("[INFO] 대시보드에서 확인: http://localhost:8000\n")


if __name__ == "__main__":
    asyncio.run(main())
