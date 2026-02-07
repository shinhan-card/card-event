"""
자동 삼성카드 크롤러 (선택 없이 바로 실행)
cms_id 순차 증가로 2026년 모든 이벤트 수집
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

# 사이트명/헤더로 쓸 수 있는 문구 → 이벤트 제목으로 쓰지 않음
_HEADER_LIKE = ('삼성카드', '삼성 카드', 'samsungcard', 'samsung card', 'Samsung', 'SAMSUNG', '로그인', '마이페이지', '이벤트 목록', '개인카드', '기업카드')
# 알림/배너 문구 → 실제 이벤트 제목이 아님 (제외)
_NOTIFICATION_PREFIXES = ('이벤트에 응모되었습니다', '이벤트에 응모 되었습니다', '이벤트에 응모됐습니다', '이벤트에 응모 됐습니다')


def _is_header_like(text):
    if not text or len(text) <= 5:
        return True
    t = text.strip()
    for h in _HEADER_LIKE:
        if t == h or t.startswith(h + ' ') or t.endswith(' ' + h):
            return True
    return False


def _is_notification_banner(text):
    """'이벤트에 응모되었습니다...' 같은 알림 문구면 True → 제목 후보에서 제외."""
    if not text or len(text) < 10:
        return False
    t = text.strip()
    if any(t.startswith(p) for p in _NOTIFICATION_PREFIXES):
        return True
    if '마이홈 앱의' in t and '자산 연결' in t:
        return True
    return False


def _extract_event_title(soup, html):
    """본문 이벤트 제목만 추출 (헤더/알림 문구 제외). '이벤트에 응모되었습니다' 등은 제외."""
    candidates = []

    def _ok(t):
        if not t or len(t) < 4:
            return False
        if _is_header_like(t) or _is_notification_banner(t):
            return False
        return True

    # 1) 본문 영역 우선
    for scope_sel in ['main', '.content', '.event-detail', '[class*="event"]', '[class*="detail"]', '[class*="campaign"]', 'article']:
        scope = soup.select_one(scope_sel)
        if not scope:
            continue
        for tag in scope.find_all(['h1', 'h2', 'h3']):
            t = tag.get_text(strip=True)
            if _ok(t):
                candidates.append((len(t), t))
    # 2) 전체 h1, h2, h3 (헤더/알림 제외)
    for tag in soup.find_all(['h1', 'h2', 'h3']):
        t = tag.get_text(strip=True)
        if _ok(t):
            candidates.append((len(t), t))
    # 3) 클래스
    for sel in ['.event-title', '.title', '.tit', '.campaign-title', '[class*="tit"]']:
        try:
            el = soup.select_one(sel)
            if el:
                t = el.get_text(strip=True)
                if _ok(t):
                    candidates.append((len(t), t))
        except Exception:
            pass
    # 4) og:title
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
    seen = set()
    unique = []
    for _, t in sorted(candidates, key=lambda x: (-len(x[1]), x[1])):
        if t in seen or _is_notification_banner(t):
            continue
        seen.add(t)
        unique.append(t)
    for t in unique:
        if any(k in t for k in ('혜택', '할인', '캐시백', '프로모션', '서.프.라', '2월', '3월', '할부', '등록금', '자동차')):
            return t
    return unique[0] if unique else None


async def crawl_samsung_all():
    """삼성카드 전체 크롤링"""
    
    print("\n" + "="*70)
    print("🚀 삼성카드 순차 크롤러 (자동 실행)")
    print("   범위: cms_id 3733000 ~ 3737000 (2026년 2월 중심)")
    print("="*70 + "\n")
    
    base_url = "https://www.samsungcard.com/personal/event/ing/UHPPBE1403M0.jsp?cms_id="
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            viewport={'width': 1920, 'height': 1080}
        )
        
        page = await context.new_page()
        await stealth_async(page)
        
        collected = []
        consecutive_fails = 0
        
        # 범위 설정
        start_id = 3733000
        end_id = 3737000
        
        for cms_id in range(start_id, end_id + 1):
            # 100개마다 진행 상황 출력
            if (cms_id - start_id) % 100 == 0:
                print(f"\n[진행] {cms_id} ~ {cms_id + 99} 탐색 중...")
                print(f"  현재까지: {len(collected)}개 발견")
            
            url = f"{base_url}{cms_id}"
            
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=10000)
                await asyncio.sleep(1)
                
                html = await page.content()
                
                # "조회 결과 없음" 체크
                if "조회 결과가 없습니다" in html or ("없습니다" in html and len(html) < 50000):
                    consecutive_fails += 1
                    if consecutive_fails >= 100:
                        print(f"\n[종료] 연속 100번 실패, 탐색 종료")
                        break
                    continue
                
                # 유효한 이벤트!
                consecutive_fails = 0
                soup = BeautifulSoup(html, 'lxml')
                
                # 제목 (사이트 헤더 "삼성카드" 등 제외, 본문 이벤트 제목만)
                title = _extract_event_title(soup, html)
                
                if not title or len(title) < 3:
                    continue
                
                # 기간
                period = "정보 없음"
                for kw in ['기간', '이벤트 기간']:
                    elem = soup.find(string=lambda t: t and kw in t)
                    if elem:
                        period = elem.parent.get_text(strip=True)[:50] if elem.parent else elem[:50]
                        break
                
                # 혜택
                benefit = []
                for elem in soup.find_all(string=lambda t: t and any(k in t for k in ['혜택', '할인', '캐시백']))[:3]:
                    text = elem.parent.get_text(strip=True) if elem.parent else elem
                    if 10 < len(text) < 150:
                        benefit.append(text)
                
                benefit_value = ' / '.join(benefit[:2]) if benefit else "상세 페이지 참조"
                
                # 카테고리
                category = "생활"
                if any(w in title for w in ['여행', '호텔']): category = "여행"
                elif any(w in title for w in ['쇼핑', '할인']): category = "쇼핑"
                elif any(w in title for w in ['식사', '다이닝', '스타벅스', '카페']): category = "식음료"
                elif any(w in title for w in ['자동차', '보험']): category = "교통"
                elif any(w in title for w in ['영화', '공연']): category = "문화"
                elif any(w in title for w in ['금리', '대출', '할부']): category = "금융"
                
                # 위협도
                threat = "Low"
                if any(w in title + benefit_value for w in ['10만원', '20만원', '30만원', '최대']):
                    threat = "High"
                elif any(w in title + benefit_value for w in ['1만원', '2만원', '3만원']):
                    threat = "Mid"
                
                event_data = {
                    "url": url,
                    "company": "삼성카드",
                    "category": category,
                    "title": title,
                    "period": period,
                    "benefit_type": "할인" if "할인" in benefit_value else "캐시백" if "캐시백" in benefit_value else "기타",
                    "benefit_value": benefit_value,
                    "conditions": "상세 페이지 참조",
                    "target_segment": "일반",
                    "threat_level": threat,
                    "one_line_summary": title,
                    "raw_text": soup.get_text(strip=True)[:1000]
                }
                
                collected.append(event_data)
                print(f"  ✅ [{cms_id}] {title[:45]}")
            
            except Exception as e:
                consecutive_fails += 1
                if consecutive_fails >= 100:
                    break
        
        await browser.close()
        
        print(f"\n{'='*70}")
        print(f"🎉 크롤링 완료: {len(collected)}개 이벤트")
        print(f"{'='*70}\n")
        
        return collected


def save_to_db(events):
    """DB 저장"""
    if not events:
        return
    
    print(f"[DB 저장] {len(events)}개 저장 중...\n")
    
    init_db()
    db = SessionLocal()
    
    try:
        saved = 0
        duplicate = 0
        
        for event in events:
            success = insert_event(db, event)
            if success:
                saved += 1
                print(f"  ✅ {event['title'][:50]}")
            else:
                duplicate += 1
        
        print(f"\n신규: {saved}개 | 중복: {duplicate}개\n")
    
    finally:
        db.close()


async def main():
    """메인"""
    events = await crawl_samsung_all()
    save_to_db(events)
    print("\n✅ 완료! http://localhost:8000\n")


if __name__ == "__main__":
    asyncio.run(main())
