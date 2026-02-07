"""
DB에 이미 저장된 삼성카드 이벤트 중 제목이 '삼성카드' 등으로 잘못된 것만
상세 페이지를 다시 방문해 제목을 추출하여 DB를 수정합니다.
"""

import asyncio
import re
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async
from bs4 import BeautifulSoup
from database import SessionLocal, init_db
from database import CardEvent

# 수정 대상으로 볼 제목 (사이트명/헤더/알림 문구처럼 잘못 들어간 경우)
BAD_TITLE_PATTERNS = ('삼성카드', '삼성 카드', 'samsungcard', 'samsung card', 'Samsung', 'SAMSUNG', '이벤트에 응모되었습니다', '이벤트에 응모 되었습니다')
HEADER_LIKE = ('삼성카드', '삼성 카드', 'samsungcard', 'samsung card', 'Samsung', 'SAMSUNG', '로그인', '마이페이지', '이벤트 목록', '개인카드', '기업카드')
NOTIFICATION_PREFIXES = ('이벤트에 응모되었습니다', '이벤트에 응모 되었습니다', '이벤트에 응모됐습니다', '이벤트에 응모 됐습니다')


def is_bad_title(title):
    """수정 대상: 사이트명/알림 문구('이벤트에 응모되었습니다' 등)로 시작하거나 포함된 제목."""
    if not title or len(title) < 10:
        return True
    t = (title or '').strip()
    for bad in BAD_TITLE_PATTERNS:
        if bad in t or t == bad:
            return True
    if any(t.startswith(p) for p in NOTIFICATION_PREFIXES):
        return True
    if '마이홈 앱의' in t and '자산 연결' in t:
        return True
    return False


def _is_header_like(text):
    if not text or len(text) <= 5:
        return True
    t = text.strip()
    for h in HEADER_LIKE:
        if t == h or t.startswith(h + ' ') or t.endswith(' ' + h):
            return True
    return False


def _is_notification_banner(text):
    """'이벤트에 응모되었습니다...' 같은 알림 문구면 True → 제목 후보에서 제외."""
    if not text or len(text) < 10:
        return False
    t = text.strip()
    if any(t.startswith(p) for p in NOTIFICATION_PREFIXES):
        return True
    if '마이홈 앱의' in t and '자산 연결' in t:
        return True
    return False


def _extract_event_title(soup):
    """본문 이벤트 제목만 추출 (헤더/알림 문구 제외). '이벤트에 응모되었습니다' 등은 제외."""
    candidates = []

    def _ok(t):
        if not t or len(t) < 4:
            return False
        if _is_header_like(t) or _is_notification_banner(t):
            return False
        return True

    for scope_sel in ['main', '.content', '.event-detail', '[class*="event"]', '[class*="detail"]', '[class*="campaign"]', 'article']:
        scope = soup.select_one(scope_sel)
        if not scope:
            continue
        for tag in scope.find_all(['h1', 'h2', 'h3']):
            t = tag.get_text(strip=True)
            if _ok(t):
                candidates.append((len(t), t))
    for tag in soup.find_all(['h1', 'h2', 'h3']):
        t = tag.get_text(strip=True)
        if _ok(t):
            candidates.append((len(t), t))
    for sel in ['.event-title', '.title', '.tit', '.campaign-title', '[class*="tit"]', '[class*="title"]']:
        try:
            el = soup.select_one(sel)
            if el:
                t = el.get_text(strip=True)
                if _ok(t):
                    candidates.append((len(t), t))
        except Exception:
            pass
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


async def fetch_title_from_url(url):
    """URL에서 이벤트 제목만 추출 (헤더 제외)."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            viewport={'width': 1920, 'height': 1080}
        )
        page = await context.new_page()
        await stealth_async(page)
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=15000)
            await asyncio.sleep(2)
            html = await page.content()
            if "조회 결과가 없습니다" in html:
                return None
            soup = BeautifulSoup(html, 'lxml')
            return _extract_event_title(soup)
        except Exception as e:
            print(" [ERROR]", str(e)[:60])
            return None
        finally:
            await browser.close()


def extract_cms_id(url):
    m = re.search(r'cms_id=(\d+)', url or '')
    return int(m.group(1)) if m else None


async def main():
    import sys as _sys
    limit = None
    if len(_sys.argv) > 1:
        try:
            limit = int(_sys.argv[1])
            print(f"[제한] 처음 {limit}건만 수정합니다.\n")
        except ValueError:
            pass

    init_db()
    db = SessionLocal()
    
    # 삼성카드 이벤트 중 제목이 잘못된 것만
    events = db.query(CardEvent).filter(CardEvent.company == "삼성카드").all()
    to_fix = [e for e in events if is_bad_title(e.title)]
    if limit is not None:
        to_fix = to_fix[:limit]
    
    if not to_fix:
        print("수정할 이벤트가 없습니다. (제목이 이미 정상인 경우)")
        db.close()
        return
    
    print(f"\n[수정 대상] 삼성카드 이벤트 {len(to_fix)}건 (제목이 '삼성카드' 등으로 잘못된 것)\n")
    
    fixed = 0
    for i, event in enumerate(to_fix, 1):
        cms_id = extract_cms_id(event.url)
        if not cms_id:
            print(f"  [{i}] URL에서 cms_id 없음, 스킵: {event.url[:50]}...")
            continue
        print(f"  [{i}/{len(to_fix)}] cms_id={cms_id} 방문 중...", end=" ")
        new_title = await fetch_title_from_url(event.url)
        if new_title and new_title != event.title:
            event.title = new_title
            event.one_line_summary = new_title
            db.commit()
            fixed += 1
            print(f"-> {new_title[:50]}")
        else:
            print(f"(변경 없음: {new_title[:40] if new_title else '추출 실패'})")
        await asyncio.sleep(1)
    
    db.close()
    print(f"\n완료: {fixed}건 제목 수정\n")


if __name__ == "__main__":
    asyncio.run(main())
