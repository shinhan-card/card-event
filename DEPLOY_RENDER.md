# Render 퍼블리시 가이드

## 1) GitHub에 업로드
`card-event-intelligence` 폴더를 GitHub 저장소로 푸시합니다.

## 2) Render Blueprint 배포
1. Render 대시보드에서 `New +` -> `Blueprint` 선택
2. 방금 푸시한 저장소 연결
3. `render.yaml` 자동 인식 후 배포 시작

## 3) 필수 환경변수 확인
- `GEMINI_API_KEY` 입력 (Render 환경변수 화면에서 직접 입력)
- RPM 제한 관련 기본값은 `render.yaml`에 포함됨

## 4) 배포 완료 후 점검
- `https://<your-service>.onrender.com/health` -> `status: healthy` 확인
- 메인 대시보드 접속 후:
  - `카드사별 현재 상태 개요 (Gemini)`
  - `카드 4사 비교 요약 (정성 + 정량)`
  섹션 렌더링 확인

## 참고
- SQLite는 Render 디스크(`/var/data/events.db`)로 영속화됩니다.
- 크롤링/상세추출은 Playwright가 포함된 Docker 이미지로 실행됩니다.
