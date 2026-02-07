# Render 퍼블리시 가이드

## 1) GitHub에 업로드
`card-event-intelligence` 폴더를 GitHub 저장소로 푸시합니다.

## 2) Render Blueprint 배포
1. Render 대시보드에서 `New +` -> `Blueprint` 선택
2. 방금 푸시한 저장소 연결
3. `render.yaml` 자동 인식 후 배포 시작

## 3) 필수 환경변수 확인
- **GEMINI_API_KEY** 는 `render.yaml`에 넣지 않습니다. 배포 후 서비스 → **Environment** 에서 직접 추가하세요.
- RPM 제한 관련 기본값은 `render.yaml`에 포함됨

## 4) 배포 완료 후 점검
- `https://<your-service>.onrender.com/health` -> `status: healthy` 확인
- 메인 대시보드 접속 후 탭/차트 렌더링 확인

## Blueprint 오류가 날 때 ("A Blueprint file was found, but there was an issue")

- **수정 사항**: `render.yaml`에서 `env: docker` → `runtime: docker` 로 바꿨고, `GEMINI_API_KEY`(sync: false) 항목은 제거했습니다. 최신 코드를 GitHub에 푸시한 뒤 Blueprint 다시 시도하세요.
- 그래도 오류가 나면 **디스크(disk) 블록**이 원인일 수 있습니다. `render.yaml`에서 `disk:` 전체 블록(맨 아래 4줄)을 삭제한 뒤 다시 시도하세요. 단, 디스크를 쓰지 않으면 재배포 시 DB가 초기화됩니다.

## 참고
- SQLite는 Render 디스크(`/var/data/events.db`)로 영속화됩니다. 디스크를 제거하면 컨테이너 내부 DB만 사용됩니다.
- 크롤링/상세추출은 Playwright가 포함된 Docker 이미지로 실행됩니다.
