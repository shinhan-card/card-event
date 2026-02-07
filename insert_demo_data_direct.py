"""
AI 분석 없이 직접 구조화된 데모 데이터 삽입
대시보드 기능 시연용
"""

import sys
import io
from database import SessionLocal, init_db, insert_event

# Windows 콘솔 UTF-8 인코딩 설정
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


# 이미 AI로 분석된 것처럼 구조화된 데모 데이터
STRUCTURED_DEMO_DATA = [
    {
        "url": "https://www.shinhancard.com/event/detail/1",
        "company": "신한카드",
        "category": "식음료",
        "title": "신한카드 X 스타벅스 특별 프로모션",
        "period": "2026.02.01~2026.03.31",
        "benefit_type": "즉시할인",
        "benefit_value": "5,000원",
        "conditions": "Deep Dream 카드, 5만원 이상 결제, 1일 1회 최대 3회",
        "target_segment": "20-30대 프리미엄",
        "threat_level": "High",
        "one_line_summary": "스타벅스 5만원 이상 결제 시 5천원 즉시 할인",
        "raw_text": "신한카드 Deep Dream 카드로 스타벅스 5만원 이상 결제 시 5천원 즉시 할인"
    },
    {
        "url": "https://www.samsungcard.com/event/detail/2",
        "company": "삼성카드",
        "category": "여행",
        "title": "삼성카드 해외여행 최대 30% 할인",
        "period": "2026.02.05~2026.04.30",
        "benefit_type": "즉시할인",
        "benefit_value": "최대 30만원",
        "conditions": "Platinum/VVIP 카드, 해외 호텔 예약, 200만원 이상 시 20%",
        "target_segment": "40대 이상 프리미엄",
        "threat_level": "High",
        "one_line_summary": "해외 호텔 예약 시 최대 30만원 즉시 할인",
        "raw_text": "삼성카드 Platinum/VVIP로 해외 호텔 예약 시 최대 30만원 할인"
    },
    {
        "url": "https://www.hyundaicard.com/event/detail/3",
        "company": "현대카드",
        "category": "쇼핑",
        "title": "현대카드 M EDITION3 온라인 쇼핑 10% 할인",
        "period": "2026.02.01~2026.02.28",
        "benefit_type": "청구할인",
        "benefit_value": "10% (최대 1만원)",
        "conditions": "M EDITION3 카드, 전월 실적 30만원 이상, 월 1회",
        "target_segment": "20-30대 일반",
        "threat_level": "Mid",
        "one_line_summary": "온라인 쇼핑몰 10% 청구할인",
        "raw_text": "현대카드 M EDITION3으로 온라인 쇼핑 시 10% 청구할인"
    },
    {
        "url": "https://www.kbcard.com/event/detail/4",
        "company": "KB국민카드",
        "category": "생활",
        "title": "KB국민카드 편의점 3천원 캐시백",
        "period": "2026.02.01~2026.03.31",
        "benefit_type": "캐시백",
        "benefit_value": "3,000원",
        "conditions": "KB국민카드 전체, 편의점 3만원 이상, 월 1회",
        "target_segment": "전연령",
        "threat_level": "Mid",
        "one_line_summary": "편의점 3만원 이상 결제 시 3천원 KB Pay 캐시백",
        "raw_text": "CU/GS25/세븐일레븐 3만원 이상 결제 시 3,000원 캐시백"
    },
    {
        "url": "https://www.shinhancard.com/event/detail/5",
        "company": "신한카드",
        "category": "식음료",
        "title": "신한카드 배달앱 2만원 할인",
        "period": "2026.02.05~2026.02.29",
        "benefit_type": "즉시할인",
        "benefit_value": "20,000원",
        "conditions": "신한카드 전체, 배달앱 10만원 이상, 기간 내 1회",
        "target_segment": "전연령",
        "threat_level": "High",
        "one_line_summary": "배달앱 10만원 이상 주문 시 2만원 즉시 할인",
        "raw_text": "배달의민족/요기요/쿠팡이츠 10만원 이상 결제 시 2만원 할인"
    },
    {
        "url": "https://www.samsungcard.com/event/detail/6",
        "company": "삼성카드",
        "category": "교통",
        "title": "삼성카드 주유 리터당 100원 할인",
        "period": "2026.02.01~2026.12.31",
        "benefit_type": "즉시할인",
        "benefit_value": "리터당 100원 (월 최대 5,000원)",
        "conditions": "taptap O 카드, 전월 실적 30만원 이상, 월 50리터",
        "target_segment": "30-40대 일반",
        "threat_level": "Mid",
        "one_line_summary": "전국 주요 주유소 리터당 100원 할인",
        "raw_text": "SK에너지/GS칼텍스/S-OIL 주유 시 리터당 100원 할인"
    },
    {
        "url": "https://www.hyundaicard.com/event/detail/7",
        "company": "현대카드",
        "category": "문화",
        "title": "현대카드 CGV 영화 2+1",
        "period": "2026.02.01~2026.06.30",
        "benefit_type": "사은품",
        "benefit_value": "영화 1매 무료",
        "conditions": "현대카드 Purple, CGV 영화 2매 구매, 월 1회",
        "target_segment": "20-30대 일반",
        "threat_level": "Low",
        "one_line_summary": "CGV 영화 2매 구매 시 1매 추가 제공",
        "raw_text": "현대카드 Purple로 CGV 영화 2매 구매 시 1매 무료"
    },
    {
        "url": "https://www.kbcard.com/event/detail/8",
        "company": "KB국민카드",
        "category": "쇼핑",
        "title": "KB국민카드 대형마트 7% 청구할인",
        "period": "2026.02.01~2026.02.28",
        "benefit_type": "청구할인",
        "benefit_value": "7% (최대 3만원)",
        "conditions": "KB국민카드 전체, 전월 실적 30만원 이상, 오프라인만",
        "target_segment": "전연령",
        "threat_level": "High",
        "one_line_summary": "이마트/롯데마트/홈플러스 7% 청구할인",
        "raw_text": "대형마트 오프라인 매장 결제 시 7% 청구할인"
    },
    {
        "url": "https://www.shinhancard.com/event/detail/9",
        "company": "신한카드",
        "category": "식음료",
        "title": "신한카드 카페 5천원 즉시 할인",
        "period": "2026.02.05~2026.03.31",
        "benefit_type": "즉시할인",
        "benefit_value": "5,000원",
        "conditions": "Mr.Life/Deep Dream 카드, 2만원 이상, 월 2회",
        "target_segment": "20-30대 프리미엄",
        "threat_level": "Mid",
        "one_line_summary": "카페 2만원 이상 결제 시 5천원 즉시 할인",
        "raw_text": "스타벅스/이디야/투썸플레이스 2만원 이상 시 5천원 할인"
    },
    {
        "url": "https://www.samsungcard.com/event/detail/10",
        "company": "삼성카드",
        "category": "통신",
        "title": "삼성카드 구독 서비스 50% 할인",
        "period": "2026.02.01~2026.12.31",
        "benefit_type": "청구할인",
        "benefit_value": "50% (최대 1만원)",
        "conditions": "taptap Z 카드, 넷플릭스/유튜브/멜론 자동결제",
        "target_segment": "20대",
        "threat_level": "High",
        "one_line_summary": "넷플릭스/유튜브 프리미엄/멜론 50% 할인",
        "raw_text": "구독 서비스 자동결제 시 월 1만원까지 50% 할인"
    }
]


def insert_demo_data_direct():
    """구조화된 데모 데이터를 직접 DB에 삽입"""
    
    print("\n" + "="*70)
    print("데모 데이터 직접 삽입 (AI 분석 우회)")
    print("="*70 + "\n")
    
    # 데이터베이스 초기화
    init_db()
    db = SessionLocal()
    
    try:
        success_count = 0
        
        for i, data in enumerate(STRUCTURED_DEMO_DATA, 1):
            print(f"[{i}/10] 삽입 중: {data['title']}")
            print(f"        회사: {data['company']} | 카테고리: {data['category']} | 위협도: {data['threat_level']}")
            
            success = insert_event(db, data)
            if success:
                success_count += 1
            
        print(f"\n{'='*70}")
        print(f"완료!")
        print(f"{'='*70}")
        print(f"  총 {len(STRUCTURED_DEMO_DATA)}개 중 {success_count}개 성공적으로 저장")
        print(f"{'='*70}\n")
        
        print("[INFO] 이제 대시보드를 실행하세요:")
        print("       python app.py")
        print("       http://localhost:8000\n")
        
    finally:
        db.close()


if __name__ == "__main__":
    insert_demo_data_direct()
