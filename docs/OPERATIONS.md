# 운영 가이드

## 일상 운영

### 서버 시작
```bash
cd card-event-intelligence
.\venv\Scripts\activate
python app.py
```
서버 시작 30초 후 미추출 이벤트 자동 추출 + 이후 6시간마다 반복.

### 수동 수집 트리거
```bash
# 전체 카드사 수집 + 추출 + 인사이트
curl -X POST http://localhost:8000/api/pipeline/full

# 특정 카드사만
curl -X POST "http://localhost:8000/api/pipeline/ingest?company=삼성카드"
```

### 잡 모니터링
```bash
# 잡 통계
curl http://localhost:8000/api/jobs/stats

# 실패 잡 목록
curl "http://localhost:8000/api/jobs?status=failed"

# 실패 잡 재시도
curl -X POST http://localhost:8000/api/jobs/{job_id}/retry
```

## 장애 대응

### Playwright 브라우저 오류
```bash
.\venv\Scripts\playwright install chromium
```

### Gemini API 실패
- rule-based fallback이 100% 보장하므로 인사이트는 항상 생성됨
- Gemini 실패 시 insight.source = "rule"로 저장
- .env의 GEMINI_API_KEY 확인

### DB 마이그레이션
```bash
python database.py
```
기존 데이터를 보존하면서 새 테이블/컬럼 추가.

## 데이터 품질 점검

### 추출률 확인
```bash
curl http://localhost:8000/api/analytics/company-overview
```
totals.extraction_rate와 totals.insight_rate 확인.

### 테스트 실행
```bash
python tests/test_normalization.py
python tests/test_insights.py
```
