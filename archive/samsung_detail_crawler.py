"""
삼성카드 상세 페이지 크롤러
목록에서 각 이벤트 URL을 추출하여 상세 정보 크롤링
"""

import asyncio
import sys
import io
import json
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async
from bs4 import BeautifulSoup
from database import SessionLocal, get_all_events, CardEvent
from sqlalchemy import update

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


class SamsungDetailCrawler:
    """삼성카드 상세 크롤러"""
    
    async def crawl_detail_page(self, page, url: str) -> dict:
        """단일 상세 페이지 크롤링 (페이지 재사용)"""
        try:
            print(f"  크롤링 중: {url[:60]}...")
            
            # 페이지 로딩 (wait_until 옵션 제거로 더 안정적)
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(5)  # 더 긴 대기
                
            # 스크롤하여 전체 콘텐츠 로드
            try:
                for _ in range(3):
                    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                    await asyncio.sleep(1)
            except:
                pass  # 스크롤 오류 무시
                
            html = await page.content()
            soup = BeautifulSoup(html, 'lxml')
                
            # 불필요한 태그 제거
            for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
                tag.decompose()
            
            # 상세 정보 추출
            detail_info = {}
                
            # 1. 혜택 내용 추출
            benefit_keywords = ['혜택', '할인', '적립', '캐시백', '포인트', '무료', '증정']
            benefit_sections = soup.find_all(['div', 'section', 'p', 'li', 'td'], 
                string=lambda text: text and any(kw in text for kw in benefit_keywords))
                
            benefits = []
            for section in benefit_sections[:10]:
                text = section.get_text(strip=True)
                if len(text) > 10 and len(text) < 200:
                    benefits.append(text)
            
            detail_info['benefit_value'] = ' / '.join(benefits[:3]) if benefits else "상세 페이지 참조"
                
            # 2. 참여 조건 추출
            condition_keywords = ['조건', '대상', '제외', '유의사항', '참여방법']
            condition_sections = soup.find_all(['div', 'section', 'p', 'li', 'td'],
                string=lambda text: text and any(kw in text for kw in condition_keywords))
            
            conditions = []
            for section in condition_sections[:10]:
                text = section.get_text(strip=True)
                if len(text) > 10 and len(text) < 200:
                    conditions.append(text)
            
            detail_info['conditions'] = ' / '.join(conditions[:3]) if conditions else "상세 페이지 참조"
            
            # 3. 대상 카드 추출
            card_keywords = ['대상카드', '해당카드', '적용카드']
            target_card = soup.find(['div', 'section', 'p', 'span'],
                string=lambda text: text and any(kw in text for kw in card_keywords))
            
            if target_card:
                detail_info['target_segment'] = target_card.get_text(strip=True)[:100]
            else:
                detail_info['target_segment'] = "전체카드"
            
            # 4. 혜택 유형 추론
            full_text = soup.get_text().lower()
            if '할인' in full_text:
                detail_info['benefit_type'] = "할인"
            elif '캐시백' in full_text:
                detail_info['benefit_type'] = "캐시백"
            elif '포인트' in full_text or '적립' in full_text:
                detail_info['benefit_type'] = "포인트적립"
            elif '무이자' in full_text or '할부' in full_text:
                detail_info['benefit_type'] = "무이자할부"
            elif '증정' in full_text or '무료' in full_text:
                detail_info['benefit_type'] = "사은품"
            else:
                detail_info['benefit_type'] = "기타"
            
            # 5. 원본 텍스트 저장 (전체 내용)
            body_text = soup.get_text(separator='\n', strip=True)
            lines = [line for line in body_text.split('\n') if line.strip()]
            detail_info['raw_text'] = '\n'.join(lines)[:2000]  # 2000자까지
            
            print(f"    ✅ 상세 정보 추출 완료")
            print(f"       혜택: {detail_info['benefit_value'][:50]}...")
            print(f"       조건: {detail_info['conditions'][:50]}...")
            
            return detail_info
        
        except Exception as e:
            print(f"    ❌ 오류: {e}")
            return {}
    
    async def crawl_all_details(self):
        """DB의 모든 삼성카드 이벤트의 상세 정보 크롤링"""
        print("\n" + "="*70)
        print("🚀 삼성카드 상세 페이지 크롤러 (개선판)")
        print("="*70 + "\n")
        
        # 브라우저 초기화 (한 번만)
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                viewport={'width': 1920, 'height': 1080}
            )
            
            page = await context.new_page()
            await stealth_async(page)
            
            # DB에서 삼성카드 이벤트 조회
            db = SessionLocal()
            
            try:
                samsung_events = db.query(CardEvent).filter(
                    CardEvent.company == "삼성카드"
                ).all()
                
                print(f"[INFO] 삼성카드 이벤트: {len(samsung_events)}개\n")
                
                if not samsung_events:
                    print("[WARN] 삼성카드 이벤트가 없습니다.")
                    return
                
                success_count = 0
                
                for i, event in enumerate(samsung_events, 1):
                    print(f"\n[{i}/{len(samsung_events)}] {event.title[:50]}")
                    
                    # 이미 상세 정보가 있으면 스킵
                    if event.benefit_value and event.benefit_value != "정보 없음" and event.benefit_value != "상세 페이지 참조":
                        print(f"  ⏭️  이미 상세 정보 있음, 스킵")
                        continue
                    
                    # 상세 페이지 크롤링 (page 객체 재사용)
                    detail_info = await self.crawl_detail_page(page, event.url)
                    
                    if detail_info:
                        # DB 업데이트
                        event.benefit_type = detail_info.get('benefit_type', event.benefit_type)
                        event.benefit_value = detail_info.get('benefit_value', event.benefit_value)
                        event.conditions = detail_info.get('conditions', event.conditions)
                        event.target_segment = detail_info.get('target_segment', event.target_segment)
                        event.raw_text = detail_info.get('raw_text', event.raw_text)
                        
                        db.commit()
                        success_count += 1
                        print(f"    💾 DB 업데이트 완료")
                    
                    # 다음 페이지 전 대기
                    if i < len(samsung_events):
                        await asyncio.sleep(3)
                
                print(f"\n{'='*70}")
                print(f"[완료] {success_count}/{len(samsung_events)}개 상세 정보 수집")
                print(f"{'='*70}\n")
                
                print("[INFO] 대시보드에서 확인: http://localhost:8000\n")
            
            finally:
                db.close()
                await browser.close()


async def main():
    """메인 실행"""
    crawler = SamsungDetailCrawler()
    await crawler.crawl_all_details()


if __name__ == "__main__":
    asyncio.run(main())
