"""캡처된 API 데이터 분석"""
import json
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# 삼성카드 데이터
print("\n" + "="*70)
print("삼성카드 캡처된 API 데이터 분석")
print("="*70 + "\n")

with open('api_captured_삼성카드_1.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

events = data.get('listPeiHPPPrgEvnInqrDVO', [])
print(f"총 이벤트 수: {len(events)}개\n")

print("이벤트 목록 (상위 10개):\n")
for i, event in enumerate(events[:10], 1):
    title = event.get('cmpTitNm', '제목 없음')
    start = event.get('cmsCmpStrtdt', '')
    end = event.get('cmsCmpEnddt', '')
    event_id = event.get('cmpId', '')
    
    # 날짜 포맷팅
    if start and len(start) == 8:
        start = f"{start[:4]}.{start[4:6]}.{start[6:8]}"
    if end and len(end) == 8:
        end = f"{end[:4]}.{end[4:6]}.{end[6:8]}"
    
    print(f"[{i:2d}] {title}")
    print(f"     기간: {start} ~ {end}")
    print(f"     ID: {event_id}\n")

print("="*70)
print(f"✅ 총 {len(events)}개의 실제 이벤트 데이터 캡처!")
print("="*70 + "\n")

# 현대카드 데이터
print("="*70)
print("현대카드 캡처된 API 데이터 분석")
print("="*70 + "\n")

try:
    with open('api_captured_현대카드_1.json', 'r', encoding='utf-8') as f:
        hyundai_data = json.load(f)
    
    print(f"키 목록: {list(hyundai_data.keys())[:10]}")
    print(f"데이터 크기: {len(str(hyundai_data))} bytes")
except Exception as e:
    print(f"현대카드 데이터 분석 실패: {e}")

print()
