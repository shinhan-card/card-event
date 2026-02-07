"""
Sequential CMS ID Crawler
cms_id를 순차 증가시키며 모든 삼성카드 이벤트 수집

전략: cms_id를 1씩 증가시키며 페이지 접속
- 유효한 이벤트: 정상 로드
- 없는 이벤트: "조회 결과가 없습니다" 팝업
"""

import asyncio
import sys
import io
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async
from bs4 import BeautifulSoup
from database import SessionLocal, insert_event, init_db

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


class SequentialCMSCrawler:
    """순차 CMS ID 크롤러"""
    
    def __init__(self):
        self.base_url = "https://www.samsungcard.com/personal/event/ing/UHPPBE1403M0.jsp?cms_id="
    
    async def check_and_crawl(self, page, cms_id: int) -> dict:
        """단일 cms_id 확인 및 크롤링"""
        url = f"{self.base_url}{cms_id}"
        
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=15000)
            await asyncio.sleep(2)
            
            # "조회 결과가 없습니다" 체크
            html = await page.content()
            
            if "조회 결과가 없습니다" in html or "없습니다" in html and "이벤트" not in html:
                return None  # 유효하지 않은 이벤트
            
            # 유효한 이벤트! 크롤링
            soup = BeautifulSoup(html, 'lxml')
            
            # 제목 추출 (사이트 헤더 "삼성카드" 등 제외, 본문 이벤트 제목만 사용)
            title = self._extract_event_title(soup, html)
            
            if not title or len(title) < 3:
                return None
            
            # 기간 추출
            period = "정보 없음"
            period_keywords = ['기간', '이벤트 기간', '진행기간']
            for keyword in period_keywords:
                period_elem = soup.find(string=lambda text: text and keyword in text)
                if period_elem:
                    period_text = period_elem.parent.get_text(strip=True) if period_elem.parent else period_elem
                    period = period_text[:100]
                    break
            
            # 혜택 내용 추출
            benefit = []
            benefit_keywords = ['혜택', '할인', '캐시백', '증정', '적립']
            benefit_elems = soup.find_all(string=lambda text: text and any(kw in text for kw in benefit_keywords))
            
            for elem in benefit_elems[:5]:
                text = elem.parent.get_text(strip=True) if elem.parent else elem
                if len(text) > 10 and len(text) < 150:
                    benefit.append(text)
            
            benefit_value = ' / '.join(benefit[:2]) if benefit else "상세 페이지 참조"
            
            # 조건 추출
            condition = []
            condition_keywords = ['조건', '대상', '제외', '유의사항']
            condition_elems = soup.find_all(string=lambda text: text and any(kw in text for kw in condition_keywords))
            
            for elem in condition_elems[:3]:
                text = elem.parent.get_text(strip=True) if elem.parent else elem
                if len(text) > 10 and len(text) < 150:
                    condition.append(text)
            
            conditions = ' / '.join(condition[:2]) if condition else "상세 페이지 참조"
            
            # 카테고리 & 위협도 추론
            category = self.infer_category(title)
            threat_level = self.infer_threat(title + ' ' + benefit_value)
            
            # 전체 텍스트
            body_text = soup.get_text(separator='\n', strip=True)
            lines = [l for l in body_text.split('\n') if l.strip()]
            raw_text = '\n'.join(lines)[:2000]
            
            return {
                "url": url,
                "company": "삼성카드",
                "category": category,
                "title": title,
                "period": period,
                "benefit_type": "할인" if "할인" in benefit_value else "캐시백" if "캐시백" in benefit_value else "기타",
                "benefit_value": benefit_value,
                "conditions": conditions,
                "target_segment": "일반",
                "threat_level": threat_level,
                "one_line_summary": title,
                "raw_text": raw_text
            }
        
        except Exception as e:
            return None
    
    # 사이트명/헤더로 쓸 수 있는 문구 → 이벤트 제목으로 쓰지 않음
    _HEADER_LIKE = ('삼성카드', '삼성 카드', 'samsungcard', 'samsung card', 'Samsung', 'SAMSUNG', '로그인', '마이페이지', '이벤트 목록', '개인카드', '기업카드')
    # 알림/배너 문구 → 실제 이벤트 제목이 아님 (제외)
    _NOTIFICATION_PREFIXES = ('이벤트에 응모되었습니다', '이벤트에 응모 되었습니다', '이벤트에 응모됐습니다', '이벤트에 응모 됐습니다')
    
    def _is_header_like(self, text: str) -> bool:
        if not text or len(text) <= 5:
            return True
        t = text.strip()
        for h in self._HEADER_LIKE:
            if t == h or t.startswith(h + ' ') or t.endswith(' ' + h):
                return True
        if t in ('이벤트', '혜택', '프로모션') and len(t) <= 5:
            return True
        return False
    
    def _is_notification_banner(self, text: str) -> bool:
        """'이벤트에 응모되었습니다...' 같은 알림 문구면 True → 제목 후보에서 제외."""
        if not text or len(text) < 10:
            return False
        t = text.strip()
        if any(t.startswith(p) for p in self._NOTIFICATION_PREFIXES):
            return True
        if '마이홈 앱의' in t and '자산 연결' in t:
            return True
        return False
    
    def _extract_event_title(self, soup: BeautifulSoup, html: str) -> str:
        """본문 이벤트 제목만 추출 (헤더/알림 문구 제외). '이벤트에 응모되었습니다' 등은 제외."""
        candidates = []
        
        def _ok(t: str) -> bool:
            if not t or len(t) < 4:
                return False
            if self._is_header_like(t) or self._is_notification_banner(t):
                return False
            return True
        
        # 1) 본문 영역 우선: main, .content, .event-detail, [class*="event"], [class*="detail"]
        for scope_sel in ['main', '.content', '.event-detail', '[class*="event"]', '[class*="detail"]', '[class*="campaign"]', 'article']:
            scope = soup.select_one(scope_sel)
            if not scope:
                continue
            for tag in scope.find_all(['h1', 'h2', 'h3']):
                t = tag.get_text(strip=True)
                if _ok(t):
                    candidates.append((len(t), t))
        
        # 2) 전체에서 h1, h2, h3 (헤더/알림 제외)
        for tag in soup.find_all(['h1', 'h2', 'h3']):
            t = tag.get_text(strip=True)
            if _ok(t):
                candidates.append((len(t), t))
        
        # 3) 클래스로 제목일 가능성 있는 것
        for sel in ['.event-title', '.title', '.tit', '.campaign-title', '[class*="tit"]', '[class*="title"]']:
            try:
                el = soup.select_one(sel)
                if el:
                    t = el.get_text(strip=True)
                    if _ok(t):
                        candidates.append((len(t), t))
            except Exception:
                pass
        
        # 4) meta og:title (이벤트 페이지는 보통 이벤트명이 들어감)
        try:
            og = soup.find('meta', property='og:title')
            if og and og.get('content'):
                t = og['content'].strip()
                for suffix in (' | 삼성카드', ' | Samsung', '- 삼성카드', '- Samsung'):
                    if t.endswith(suffix):
                        t = t[:-len(suffix)].strip()
                        break
                if _ok(t):
                    candidates.append((len(t), t))
        except Exception:
            pass
        
        if not candidates:
            return None
        # 같은 제목 중복 제거, 알림 문구 제외, 실제 이벤트 제목(혜택/할인/브랜드 등) 우선
        seen = set()
        unique = []
        for _, t in sorted(candidates, key=lambda x: (-len(x[1]), x[1])):
            if t in seen or self._is_notification_banner(t):
                continue
            seen.add(t)
            unique.append(t)
        # '혜택으로 만나 보세요' 등 실제 이벤트 제목 패턴 우선 (혼다 자동차·등록금 등)
        for t in unique:
            if any(k in t for k in ('혜택', '할인', '캐시백', '프로모션', '서.프.라', '2월', '3월', '할부', '등록금', '자동차')):
                return t
        return unique[0] if unique else None
    
    def infer_category(self, text: str) -> str:
        """카테고리 추론"""
        if any(w in text for w in ['여행', '호텔', '항공']):
            return "여행"
        elif any(w in text for w in ['쇼핑', '할인', '백화점']):
            return "쇼핑"
        elif any(w in text for w in ['식사', '레스토랑', '다이닝', '스타벅스', '카페']):
            return "식음료"
        elif any(w in text for w in ['자동차', '보험', '주유']):
            return "교통"
        elif any(w in text for w in ['영화', '공연', '문화']):
            return "문화"
        elif any(w in text for w in ['금리', '대출', '할부']):
            return "금융"
        elif any(w in text for w in ['통신', '넷플릭스', '유튜브']):
            return "통신"
        else:
            return "생활"
    
    def infer_threat(self, text: str) -> str:
        """위협도 추론"""
        if any(w in text for w in ['10만원', '20만원', '30만원', '50만원', '최대', '프리미엄']):
            return "High"
        elif any(w in text for w in ['1만원', '2만원', '3만원', '5천원']):
            return "Mid"
        else:
            return "Low"
    
    async def crawl_range(self, start_id: int = 3700000, end_id: int = 3750000, batch_size: int = 100):
        """범위 크롤링"""
        print("\n" + "="*70)
        print("🚀 Sequential CMS ID Crawler")
        print(f"   범위: {start_id} ~ {end_id}")
        print("="*70 + "\n")
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                viewport={'width': 1920, 'height': 1080}
            )
            
            page = await context.new_page()
            await stealth_async(page)
            
            collected_events = []
            consecutive_fails = 0
            max_consecutive_fails = 50  # 연속 50번 실패하면 종료
            
            current_id = start_id
            
            while current_id <= end_id:
                # batch 단위로 진행 상황 출력
                if (current_id - start_id) % batch_size == 0:
                    print(f"\n[진행] cms_id {current_id} ~ {current_id + batch_size - 1} 탐색 중...")
                    print(f"  현재까지 수집: {len(collected_events)}개")
                
                event_data = await self.check_and_crawl(page, current_id)
                
                if event_data:
                    consecutive_fails = 0
                    collected_events.append(event_data)
                    print(f"  ✅ [{current_id}] {event_data['title'][:50]}")
                    print(f"      기간: {event_data['period'][:50]}")
                else:
                    consecutive_fails += 1
                
                # 연속 실패가 너무 많으면 종료
                if consecutive_fails >= max_consecutive_fails:
                    print(f"\n[INFO] 연속 {max_consecutive_fails}번 실패, 탐색 종료")
                    break
                
                current_id += 1
                
                # 너무 빠르지 않게
                await asyncio.sleep(0.5)
            
            await browser.close()
            
            print(f"\n{'='*70}")
            print(f"🎉 크롤링 완료: 총 {len(collected_events)}개 이벤트 발견")
            print(f"{'='*70}\n")
            
            return collected_events
    
    def save_to_db(self, events: list):
        """DB 저장"""
        if not events:
            print("[WARN] 저장할 이벤트가 없습니다.")
            return
        
        print(f"[DB 저장] {len(events)}개 저장 중...\n")
        
        init_db()
        db = SessionLocal()
        
        try:
            saved = 0
            duplicate = 0
            
            for i, event in enumerate(events, 1):
                success = insert_event(db, event)
                if success:
                    saved += 1
                    print(f"  [{i:3d}] ✅ {event['title'][:50]}")
                else:
                    duplicate += 1
            
            print(f"\n신규: {saved}개 | 중복: {duplicate}개\n")
        
        finally:
            db.close()


async def main():
    """메인 실행"""
    crawler = SequentialCMSCrawler()
    
    print("\n삼성카드 순차 크롤링")
    print("="*70)
    print("\n옵션:")
    print("  1. 최근 이벤트 (3735000 ~ 3736000) - 빠름")
    print("  2. 2월 전체 (3730000 ~ 3740000) - 중간")
    print("  3. 2026년 전체 (3700000 ~ 3800000) - 느림 (약 10-20분)")
    
    choice = input("\n선택 (1-3): ").strip()
    
    if choice == '1':
        start, end = 3735000, 3736000
    elif choice == '2':
        start, end = 3730000, 3740000
    elif choice == '3':
        start, end = 3700000, 3800000
    else:
        print("[ERROR] 잘못된 선택")
        return
    
    # 크롤링
    events = await crawler.crawl_range(start, end, batch_size=100)
    
    # 저장
    crawler.save_to_db(events)
    
    print("\n✅ 완료! 대시보드: http://localhost:8000\n")


if __name__ == "__main__":
    asyncio.run(main())
