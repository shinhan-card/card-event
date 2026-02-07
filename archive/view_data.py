"""데이터베이스의 이벤트 확인"""
import sys
import io
from database import SessionLocal, get_all_events
import json

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

db = SessionLocal()
events = get_all_events(db)

print("\n" + "="*70)
print(f"데이터베이스 저장된 이벤트: 총 {len(events)}개")
print("="*70 + "\n")

if events:
    # 카드사별 통계
    companies = {}
    threats = {"High": 0, "Mid": 0, "Low": 0}
    categories = {}
    
    for event in events:
        companies[event.company] = companies.get(event.company, 0) + 1
        if event.threat_level in threats:
            threats[event.threat_level] += 1
        if event.category:
            categories[event.category] = categories.get(event.category, 0) + 1
    
    print("카드사별 분포:")
    for company, count in companies.items():
        print(f"  - {company}: {count}개")
    
    print("\n위협도별 분포:")
    for level, count in threats.items():
        print(f"  - {level}: {count}개")
    
    print("\n카테고리별 분포:")
    for category, count in categories.items():
        print(f"  - {category}: {count}개")
    
    print("\n" + "="*70)
    print("이벤트 목록:")
    print("="*70)
    
    for i, event in enumerate(events[:10], 1):
        print(f"\n[{i}] {event.title}")
        print(f"    회사: {event.company}")
        print(f"    카테고리: {event.category}")
        print(f"    혜택: {event.benefit_value}")
        print(f"    기간: {event.period}")
        print(f"    위협도: {event.threat_level}")
        print(f"    요약: {event.one_line_summary}")
else:
    print("저장된 이벤트가 없습니다.")

db.close()

print("\n" + "="*70)
print("대시보드: http://localhost:8000")
print("API 문서: http://localhost:8000/docs")
print("="*70 + "\n")
