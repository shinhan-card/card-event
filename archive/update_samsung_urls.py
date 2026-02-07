"""
삼성카드 이벤트 URL 수정
잘못된 URL → 올바른 URL (cms_id 사용)
"""

import sys
import io
import json
from database import SessionLocal, CardEvent

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

print("\n" + "="*70)
print("삼성카드 URL 업데이트")
print("="*70 + "\n")

# API 데이터 로드
with open('api_captured_삼성카드_1.json', 'r', encoding='utf-8') as f:
    api_data = json.load(f)

events_api = api_data.get('listPeiHPPPrgEvnInqrDVO', [])

# cmpId -> cmsId 매핑 생성
id_mapping = {}
for event in events_api:
    cmp_id = event.get('cmpId', '')
    cms_id = event.get('cmsId', '')
    title = event.get('cmpTitNm', '').strip()
    
    if cmp_id and cms_id:
        id_mapping[cmp_id] = {
            'cms_id': cms_id,
            'title': title
        }

print(f"[INFO] API에서 {len(id_mapping)}개 매핑 발견\n")

# DB 업데이트
db = SessionLocal()

try:
    samsung_events = db.query(CardEvent).filter(CardEvent.company == "삼성카드").all()
    
    print(f"[INFO] DB에 {len(samsung_events)}개 삼성카드 이벤트\n")
    
    updated = 0
    
    for i, event in enumerate(samsung_events, 1):
        # 현재 URL에서 ID 추출
        if 'evtId=' in event.url:
            evt_id = event.url.split('evtId=')[1].split('&')[0]
            
            if evt_id in id_mapping:
                cms_id = id_mapping[evt_id]['cms_id']
                new_url = f"https://www.samsungcard.com/personal/event/ing/UHPPBE1403M0.jsp?cms_id={cms_id}"
                
                print(f"[{i}] {event.title[:40]}")
                print(f"    변경 전: {event.url[:80]}...")
                print(f"    변경 후: {new_url}")
                
                event.url = new_url
                updated += 1
                print(f"    ✅ 업데이트\n")
    
    db.commit()
    
    print(f"{'='*70}")
    print(f"[완료] {updated}개 URL 업데이트")
    print(f"{'='*70}\n")

finally:
    db.close()

print("[다음] samsung_detail_crawler.py를 실행하여 올바른 상세 정보를 크롤링하세요.\n")
