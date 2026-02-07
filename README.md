# 경쟁사 카드 이벤트 인텔리전스 시스템 v2.0

> 신한카드 마케팅 담당자가 삼성카드/KB국민카드/현대카드 이벤트를 매일 아침 5분 내 파악하고, 주간 판촉 전략을 세울 수 있는 경쟁사 인텔리전스 플랫폼

## 핵심 기능

- **4사 자동 수집**: 삼성/신한/현대/KB 이벤트를 커넥터 기반으로 자동 수집
- **Playwright 상세 추출**: 각 이벤트 URL에서 혜택/조건/참여방법 등 마케팅 콘텐츠 구조화
- **Gemini AI 인사이트**: 위협도/경쟁력 포인트/프로모션 전략/마케팅 시사점 자동 생성
- **5개 분석 대시보드**: 경영요약, 카드사 비교, 혜택 벤치마크, 전략 맵, 이벤트 상세
- **Chart.js 시각화**: 커버리지 바, 혜택 분포, 전략 히트맵, 추세 차트

## 기술 스택

| 분야 | 기술 |
|------|------|
| 백엔드 | Python 3.10+, FastAPI, Uvicorn |
| 크롤링 | Playwright (Stealth), BeautifulSoup |
| AI | Google Gemini 2.5 Flash |
| DB | SQLite, SQLAlchemy ORM |
| 프론트 | Tailwind CSS, Chart.js, Vanilla JS |
| 스케줄링 | APScheduler |

## 프로젝트 구조

```
card-event-intelligence/
├── app.py                      # FastAPI 서버 (엔트리포인트)
├── database.py                 # DB 모델 + CRUD + 마이그레이션
├── detail_extractor.py         # Playwright 상세 추출
├── gemini_insight.py           # Gemini AI 인사이트 보강
├── modules/
│   ├── connectors/
│   │   ├── base.py             # BaseConnector ABC
│   │   ├── samsung.py          # 삼성카드 커넥터
│   │   ├── shinhan.py          # 신한카드 커넥터
│   │   ├── hyundai.py          # 현대카드 커넥터
│   │   └── kb.py               # KB국민카드 커넥터
│   ├── pipeline.py             # 통합 파이프라인 (수집->추출->인사이트)
│   ├── extraction.py           # 추출 래퍼
│   ├── normalization.py        # 정규화 (period/benefit 파싱)
│   └── insights.py             # 인사이트 엔진 (rule + Gemini 하이브리드)
├── templates/
│   └── simple_dashboard.html   # 대시보드 HTML
├── static/js/
│   └── dashboard.js            # 대시보드 JS (Chart.js 시각화 포함)
├── tests/
│   ├── test_normalization.py   # 파서/정규화 단위 테스트
│   └── test_insights.py        # 인사이트 스코어링 단위 테스트
├── docs/
│   └── OPERATIONS.md           # 운영 가이드
├── events.db                   # SQLite 데이터베이스
├── requirements.txt            # Python 의존성
└── .env                        # 환경 변수 (API 키)
```

## 빠른 시작

```bash
# 1. 가상환경 생성 및 패키지 설치
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt

# 2. Playwright 브라우저 설치
playwright install chromium

# 3. 환경 변수 설정
copy .env.example .env
# .env에 GEMINI_API_KEY 입력

# 4. DB 초기화 + 마이그레이션
python database.py

# 5. 대시보드 실행
python app.py
# -> http://localhost:8000
```

## 퍼블리시 (Render)

이 프로젝트는 `Dockerfile` + `render.yaml`이 포함되어 있어 Render Blueprint로 바로 배포 가능합니다.

1. GitHub 저장소로 푸시
2. Render에서 `New +` -> `Blueprint` 선택
3. 저장소 연결 후 배포
4. `GEMINI_API_KEY` 값만 Render 환경변수에 입력

상세 절차: `DEPLOY_RENDER.md`

## API 명세

### 기존 API (하위호환)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/events | 이벤트 목록 (필터: company, category, threat_level) |
| GET | /api/events/{id} | 이벤트 상세 |
| POST | /api/events/{id}/extract-detail | 단건 상세 추출 |
| POST | /api/events/extract-pending | 미추출 일괄 추출 |
| GET | /api/stats | 통계 |
| GET | /api/companies | 카드사 목록 |
| GET | /api/categories | 카테고리 목록 |

### 신규 Analytics API
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/analytics/company-overview | 카드사별 현황 집계 |
| GET | /api/analytics/trends?from=&to= | 기간별 이벤트 추세 |
| GET | /api/analytics/strategy-map | 전략 목적 히트맵 |
| GET | /api/analytics/benefit-benchmark | 혜택 금액/비율 분포 |

### 신규 잡/파이프라인 API
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/jobs | 잡 목록 |
| GET | /api/jobs/stats | 잡 통계 |
| POST | /api/jobs/{id}/retry | 실패 잡 재시도 |
| GET | /api/events/{id}/intelligence | 이벤트 AI 분석 + 태그 |
| GET | /api/events/{id}/snapshots | 스냅샷 이력 |
| POST | /api/pipeline/ingest | 수집 트리거 |
| POST | /api/pipeline/full | 전체 파이프라인 트리거 |

## DB 스키마

- **events**: 이벤트 마스터 (정규화 필드 포함: period_start/end, benefit_amount_won/pct, status)
- **event_snapshots**: 수집 시점별 원본/구조화 스냅샷 (변화 추적)
- **event_sections**: 마케팅 콘텐츠 섹션별 정규화 (혜택_상세, 참여방법, 유의사항 등)
- **event_insights**: 인사이트 (benefit_level, objective_tags, evidence, confidence 등)
- **jobs**: 파이프라인 잡 상태 추적 (ingest/extract/insight, retry, error)

## 사용 시나리오

### 아침 브리핑 (5분)
1. http://localhost:8000 접속
2. "경영 요약" 탭에서 주목 이벤트(위협도 High) 확인
3. "카드사 비교" 탭에서 4사 혜택 수준/추출률 비교

### 주간 전략회의
1. "혜택 벤치마크" 탭에서 카드사별 혜택 금액/할인율 비교
2. "전략 맵" 탭에서 목적 히트맵(신규유치/리텐션/제휴 등) 확인
3. 이벤트 클릭 → AI 분석에서 마케팅 시사점/액션 제안 확인
4. 엑셀 다운로드로 보고서 작성
