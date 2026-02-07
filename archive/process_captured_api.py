"""
캡처된 API 데이터를 직접 처리하여 DB에 저장
Gemini 파싱 오류 우회
"""

import json
import sys
import io
from database import SessionLocal, insert_event, init_db
from analyzer import CardEventAnalyzer

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


def process_samsung_api():
    """삼성카드 API 데이터 처리"""
    print("\n" + "="*70)
    print("삼성카드 API 데이터 처리")
    print("="*70 + "\n")
    
    init_db()
    db = SessionLocal()
    analyzer = CardEventAnalyzer()
    
    try:
        with open('api_captured_삼성카드_1.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        events = data.get('listPeiHPPPrgEvnInqrDVO', [])
        print(f"발견된 이벤트: {len(events)}개\n")
        
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
            
            # 이벤트 URL 생성
            url = f"https://www.samsungcard.com/personal/benefit/event/view.do?evtId={event_id}"
            
            # 전체 이벤트 정보를 텍스트로 변환하여 Gemini 분석
            event_text = f"""
삼성카드 이벤트

제목: {title}
기간: {period}
이벤트 ID: {event_id}

원본 데이터:
{json.dumps(event, ensure_ascii=False, indent=2)}
"""
            
            print(f"[{i}/{len(events)}] Gemini AI 분석 중: {title[:40]}...")
            
            # Gemini로 분석
            analyzed = analyzer.analyze_event(event_text, url)
            
            if analyzed:
                # DB 저장
                success = insert_event(db, analyzed)
                if success:
                    saved_count += 1
                    print(f"  ✅ 저장 완료")
                else:
                    print(f"  ⚠️ 중복 스킵")
            else:
                print(f"  ❌ AI 분석 실패")
            
            # API Rate Limit
            if i < len(events) and i % 5 == 0:
                print(f"\n  [대기] API Quota 방지를 위해 60초 대기 중...\n")
                import time
                time.sleep(60)
        
        print(f"\n{'='*70}")
        print(f"완료!")
        print(f"{'='*70}")
        print(f"  총 {len(events)}개 중 {saved_count}개 저장 성공")
        print(f"{'='*70}\n")
        
    finally:
        db.close()


if __name__ == "__main__":
    process_samsung_api()
