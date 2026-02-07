"""
전체 플로우 테스트: DB 초기화 → 데모 데이터 → 실제 삼성 URL 1건 추가 → 상세 추출 실행
"""
import asyncio
import sys
import os

# 프로젝트 루트가 path에 있도록
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, init_db, insert_event, CardEvent


# 실제 삼성카드 이벤트 상세 URL (cms_id 기반)
SAMSUNG_REAL_URL = "https://www.samsungcard.com/personal/event/ing/UHPPBE1403M0.jsp?cms_id=3735000"


def ensure_db_and_demo():
    """DB 초기화 후, 삼성 실제 URL 이벤트가 없으면 1건 추가."""
    init_db()
    db = SessionLocal()
    try:
        existing = db.query(CardEvent).filter(CardEvent.url == SAMSUNG_REAL_URL).first()
        if existing:
            print("[OK] 삼성 실제 URL 이벤트가 이미 있습니다.")
            return
        insert_event(db, {
            "url": SAMSUNG_REAL_URL,
            "company": "삼성카드",
            "category": "테스트",
            "title": "삼성카드 이벤트 (상세 추출 테스트)",
            "period": "2026.02.01~2026.12.31",
            "benefit_type": "기타",
            "benefit_value": "상세 페이지 참조",
            "conditions": "",
            "target_segment": "",
            "threat_level": "Mid",
            "one_line_summary": "상세 추출 테스트용",
            "raw_text": "",
        })
        print("[OK] 테스트용 이벤트 1건 추가 (삼성 실제 URL)")
    finally:
        db.close()


async def run_extract_once():
    """상세 추출 1회 실행 후 결과 요약 출력."""
    try:
        import detail_extractor
    except ModuleNotFoundError as e:
        if "playwright" in str(e).lower():
            print("\n[건너뜀] Playwright 미설치로 상세 추출 테스트를 생략합니다.")
            print("  설치: pip install playwright  후  playwright install chromium")
            return True  # 플로우 자체는 성공으로 처리
        raise
    print("\n[추출 테스트] 삼성 이벤트 URL에서 상세 추출 중... (약 10초)")
    try:
        result = await detail_extractor.extract_from_url(SAMSUNG_REAL_URL, wait_sec=3)
    except Exception as e:
        print(f"[실패] {e}")
        if "Executable" in str(e) or "playwright" in str(e).lower():
            print("  → Playwright 브라우저: playwright install chromium")
        return False

    title = result.get("title") or "(없음)"
    period = result.get("period") or "(없음)"
    raw_len = len(result.get("raw_text") or "")
    mc = result.get("marketing_content") or {}
    insights = result.get("insights") or {}

    print(f"  제목: {title[:60]}...")
    print(f"  기간: {period}")
    print(f"  raw_text 길이: {raw_len}자")
    print(f"  marketing_content 섹션: {list(mc.keys())}")
    for k, v in mc.items():
        if isinstance(v, list) and v:
            print(f"    - {k}: {len(v)}건")
        elif v:
            print(f"    - {k}: 있음")
    print(f"  인사이트: 혜택_수준={insights.get('혜택_수준')}, 타겟_명확도={insights.get('타겟_명확도')}")
    print(f"  경쟁력_포인트: {insights.get('경쟁력_포인트', [])}")
    print(f"  프로모션_전략: {insights.get('프로모션_전략', [])}")
    print("\n[OK] 상세 추출 테스트 완료")
    return True


def main():
    print("=== 전체 플로우 테스트 ===\n")
    ensure_db_and_demo()
    ok = asyncio.run(run_extract_once())
    print("\n대시보드 실행: python app.py  →  http://localhost:8000")
    print("목록에서 '삼성카드 이벤트 (상세 추출 테스트)' 클릭 후 '이 페이지에서 내용 추출하여 반영' 버튼으로 동일 추출 가능.")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
