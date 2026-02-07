"""
캡처된 API 데이터를 직접 DB에 저장 (Gemini 우회)
빠르고 확실한 방법
"""

import json
import sys
import io
from database import SessionLocal, insert_event, init_db

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

print("\n" + "="*70)
print("캡처된 API 데이터 직접 저장 (고속 모드)")
print("="*70 + "\n")

init_db()
db = SessionLocal()

try:
    # 삼성카드 데이터
    with open('api_captured_삼성카드_1.json', 'r', encoding='utf-8') as f:
        samsung_data = json.load(f)
    
    events = samsung_data.get('listPeiHPPPrgEvnInqrDVO', [])
    print(f"[삼성카드] {len(events)}개 이벤트 발견\n")
    
    saved_count = 0
    
    for i, event in enumerate(events, 1):
        title = event.get('cmpTitNm', '').strip()
        start = event.get('cmsCmpStrtdt', '')
        end = event.get('cmsCmpEnddt', '')
        event_id = event.get('cmpId', '')
        
        if not title or title == ' ':
            continue
        
        # 날짜 포맷팅
        if start and len(start) == 8:
            start_fmt = f"{start[:4]}.{start[4:6]}.{start[6:8]}"
        else:
            start_fmt = "정보 없음"
        
        if end and len(end) == 8:
            end_fmt = f"{end[:4]}.{end[4:6]}.{end[6:8]}"
        else:
            end_fmt = "정보 없음"
        
        period = f"{start_fmt}~{end_fmt}"
        
        # 이벤트 URL 생성 (cmsId 사용!)
        cms_id = event.get('cmsId', '')
        if cms_id:
            url = f"https://www.samsungcard.com/personal/event/ing/UHPPBE1403M0.jsp?cms_id={cms_id}"
        else:
            url = f"https://www.samsungcard.com/personal/benefit/event/view.do?evtId={event_id}"
        
        # 간단한 카테고리 추론
        category = "기타"
        if any(word in title for word in ['여행', '호텔', '항공']):
            category = "여행"
        elif any(word in title for word in ['쇼핑', '할인', '백화점']):
            category = "쇼핑"
        elif any(word in title for word in ['식사', '레스토랑', '다이닝', '스타벅스', '카페']):
            category = "식음료"
        elif any(word in title for word in ['자동차', '보험', '주유']):
            category = "교통"
        elif any(word in title for word in ['영화', '공연', '문화']):
            category = "문화"
        
        # 위협도 추론 (캐시백 금액 기준)
        threat_level = "Mid"
        if any(word in title for word in ['10만원', '20만원', '30만원', '최대', '프리미엄']):
            threat_level = "High"
        elif any(word in title for word in ['1만원', '2만원', '3만원']):
            threat_level = "Mid"
        else:
            threat_level = "Low"
        
        # DB 저장 데이터 구성
        event_data = {
            "url": url,
            "company": "삼성카드",
            "category": category,
            "title": title,
            "period": period,
            "benefit_type": "정보 없음",
            "benefit_value": "정보 없음",
            "conditions": "상세 페이지 참조",
            "target_segment": "일반",
            "threat_level": threat_level,
            "one_line_summary": title,
            "raw_text": json.dumps(event, ensure_ascii=False)[:1000]
        }
        
        print(f"[{i:2d}] {title[:50]}")
        
        success = insert_event(db, event_data)
        if success:
            saved_count += 1
            print(f"     ✅ 저장 완료 (카테고리: {category}, 위협도: {threat_level})")
        else:
            print(f"     ⚠️ 중복 스킵")
        
        print()
    
    print(f"\n{'='*70}")
    print(f"완료!")
    print(f"{'='*70}")
    print(f"  총 {len(events)}개 중 {saved_count}개 저장 성공")
    print(f"{'='*70}\n")
    
    print("[INFO] 대시보드: http://localhost:8000")
    print("[INFO] 데이터 확인: python view_data.py\n")
    
finally:
    db.close()
