"""
데모 데이터 생성 스크립트
실제 크롤링 없이 AI 분석 및 대시보드 기능을 테스트
"""

import sys
import io
import asyncio
from database import SessionLocal, init_db, insert_event
from analyzer import CardEventAnalyzer

# Windows 콘솔 UTF-8 인코딩 설정
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


# 실제 카드사 이벤트 예시 데이터
DEMO_EVENTS = [
    {
        "url": "https://www.shinhancard.com/event/detail/1",
        "text": """
        신한카드 X 스타벅스 특별 프로모션
        
        이벤트 기간: 2026년 2월 1일 ~ 2026년 3월 31일
        
        혜택 내용:
        - 스타벅스 5만원 이상 결제 시 5,000원 즉시 할인
        - 1일 1회, 이벤트 기간 내 최대 3회 가능
        - Deep Dream 카드 소지자 대상
        
        참여 조건:
        - 신한카드 Deep Dream 카드로 결제
        - 일부 매장 제외 (고속도로 휴게소, 백화점 내 매장)
        - 모바일 상품권 결제 제외
        
        신한카드로 즐기는 프리미엄 커피 혜택!
        """
    },
    {
        "url": "https://www.samsungcard.com/event/detail/2",
        "text": """
        삼성카드 해외여행 최대 30% 할인
        
        기간: 2026.02.05 ~ 2026.04.30
        
        [혜택 안내]
        호텔 예약 시 최대 30만원 즉시 할인
        - 50만원 이상: 10% 할인
        - 100만원 이상: 15% 할인
        - 200만원 이상: 20% 할인 (최대 30만원)
        
        [대상카드]
        - 삼성카드 Platinum
        - 삼성카드 VVIP
        
        [유의사항]
        - 해외 호텔 예약만 해당
        - 국내 호텔 제외
        - 항공권 예약 제외
        """
    },
    {
        "url": "https://www.hyundaicard.com/event/detail/3",
        "text": """
        현대카드 M EDITION3 온라인 쇼핑 10% 할인
        
        이벤트 기간: 2026년 2월 1일 ~ 2026년 2월 28일
        
        온라인 쇼핑몰 결제 시 10% 청구할인 (최대 1만원)
        
        - 대상: 현대카드 M EDITION3 카드
        - 할인: 전월 실적 30만원 이상 시 10% 청구할인
        - 한도: 월 1회, 최대 1만원
        - 가맹점: 쿠팡, 11번가, G마켓, 옥션, 위메프
        
        전월 실적 30만원 이상 달성 고객님만 참여 가능합니다.
        """
    },
    {
        "url": "https://www.kbcard.com/event/detail/4",
        "text": """
        KB국민카드 편의점 3천원 캐시백
        
        행사 기간: 2026.02.01 ~ 2026.03.31
        
        CU/GS25/세븐일레븐 3만원 이상 결제 시 3,000원 캐시백
        
        [참여대상]
        - KB국민카드 전체 (체크/신용)
        - 법인카드 제외
        
        [혜택내용]
        - 편의점 3만원 이상 결제
        - 3,000원 KB Pay 캐시백
        - 월 1회 한정
        
        [유의사항]
        - 담배, 상품권 구매 제외
        - 온라인 결제 제외
        """
    },
    {
        "url": "https://www.shinhancard.com/event/detail/5",
        "text": """
        신한카드 배달앱 2만원 할인
        
        기간: 2026년 2월 5일 ~ 2026년 2월 29일
        
        배달의민족, 요기요, 쿠팡이츠 10만원 이상 결제 시 2만원 즉시 할인
        
        대상: 신한카드 전체 (체크/신용/법인 모두 가능)
        혜택: 10만원 이상 주문 시 2만원 즉시 할인
        한도: 이벤트 기간 내 1회 한정
        
        배달 음식도 신한카드로 할인받으세요!
        """
    },
    {
        "url": "https://www.samsungcard.com/event/detail/6",
        "text": """
        삼성카드 주유 리터당 100원 할인
        
        이벤트 기간: 2026.02.01 ~ 2026.12.31
        
        전국 주요 주유소에서 리터당 100원 할인
        
        [할인내용]
        - SK에너지: 리터당 100원 할인
        - GS칼텍스: 리터당 100원 할인
        - S-OIL: 리터당 100원 할인
        
        [대상카드]
        삼성카드 taptap O (탭탭오)
        
        [혜택한도]
        월 50리터, 최대 5,000원까지
        
        전월 이용금액 30만원 이상 시 자동 적용
        """
    },
    {
        "url": "https://www.hyundaicard.com/event/detail/7",
        "text": """
        현대카드 CGV 영화 2+1
        
        기간: 2026.02.01 ~ 2026.06.30
        
        CGV 영화 2매 구매 시 1매 무료
        
        - 대상: 현대카드 Purple
        - 혜택: CGV 영화 2매 구매 시 1매 추가 제공
        - 한도: 월 1회
        - 방법: CGV 앱에서 현대카드 Purple로 결제
        
        주말/공휴일 모두 사용 가능
        3D, 4DX는 차액 부담
        """
    },
    {
        "url": "https://www.kbcard.com/event/detail/8",
        "text": """
        KB국민카드 대형마트 7% 청구할인
        
        이벤트 기간: 2026년 2월 1일 ~ 2026년 2월 28일
        
        이마트/롯데마트/홈플러스 7% 청구할인
        
        [참여조건]
        - KB국민카드 전카드 (체크/신용)
        - 전월 실적 30만원 이상
        
        [할인내용]
        - 7% 청구할인
        - 월 최대 3만원까지
        - 오프라인 매장만 해당
        
        [제외사항]
        - 온라인몰 제외
        - 상품권 구매 제외
        - 주류/담배 제외
        """
    },
    {
        "url": "https://www.shinhancard.com/event/detail/9",
        "text": """
        신한카드 카페 5천원 즉시 할인
        
        2026.02.05 ~ 2026.03.31
        
        스타벅스/이디야/투썸플레이스 5천원 즉시 할인
        
        대상 카드: 신한카드 Mr.Life, Deep Dream
        할인 조건: 2만원 이상 결제 시
        할인 금액: 5,000원 즉시 할인
        이용 한도: 월 2회
        
        참여 방법:
        1. 대상 카페에서 2만원 이상 주문
        2. 신한카드로 결제
        3. 자동으로 5천원 할인 적용
        
        아메리카노는 물론 케이크, 텀블러 구매도 포함!
        """
    },
    {
        "url": "https://www.samsungcard.com/event/detail/10",
        "text": """
        삼성카드 구독 서비스 50% 할인
        
        행사기간: 2026.02.01 ~ 2026.12.31
        
        넷플릭스/유튜브 프리미엄/멜론 50% 할인
        
        [할인대상]
        - 넷플릭스 스탠다드: 50% 할인
        - 유튜브 프리미엄: 50% 할인
        - 멜론 스트리밍: 50% 할인
        
        [대상카드]
        삼성카드 taptap Z (MZ세대 특화)
        
        [혜택한도]
        월 1만원까지 할인
        
        [참여방법]
        각 서비스에서 삼성카드 taptap Z로 자동결제 등록
        """
    }
]


async def create_demo_data():
    """데모 데이터 생성 및 AI 분석"""
    
    print("\n" + "="*70)
    print("데모 데이터 생성 및 AI 분석 시작")
    print("="*70 + "\n")
    
    # 데이터베이스 초기화
    init_db()
    db = SessionLocal()
    
    try:
        # AI 분석기 초기화
        analyzer = CardEventAnalyzer()
        
        print(f"[INFO] {len(DEMO_EVENTS)}개의 데모 이벤트를 AI로 분석합니다...")
        print("[INFO] 각 이벤트당 약 3-5초 소요 (Gemini API 호출)\n")
        
        success_count = 0
        
        for i, demo_event in enumerate(DEMO_EVENTS, 1):
            print(f"\n{'='*70}")
            print(f"[{i}/{len(DEMO_EVENTS)}] AI 분석 중...")
            print(f"{'='*70}")
            
            # AI 분석
            analyzed_data = analyzer.analyze_event(
                demo_event["text"], 
                demo_event["url"]
            )
            
            if analyzed_data:
                # 데이터베이스에 저장
                success = insert_event(db, analyzed_data)
                if success:
                    success_count += 1
                    print(f"[OK] 저장 완료: {analyzed_data.get('title', '제목 없음')}")
                    print(f"     회사: {analyzed_data.get('company')}")
                    print(f"     카테고리: {analyzed_data.get('category')}")
                    print(f"     위협도: {analyzed_data.get('threat_level')}")
            else:
                print(f"[SKIP] AI 분석 실패")
            
            # API Rate Limit 방지
            if i < len(DEMO_EVENTS):
                import time
                time.sleep(2)
        
        print(f"\n{'='*70}")
        print(f"완료!")
        print(f"{'='*70}")
        print(f"  총 {len(DEMO_EVENTS)}개 중 {success_count}개 성공적으로 저장")
        print(f"{'='*70}\n")
        
        print("[INFO] 이제 대시보드를 실행하세요:")
        print("       python app.py")
        print("       http://localhost:8000\n")
        
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(create_demo_data())
