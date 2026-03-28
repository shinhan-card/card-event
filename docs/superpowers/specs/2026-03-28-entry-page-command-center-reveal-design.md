# Entry Page Command Center Reveal Design

## Goal

기존 [entry-page/index.html](C:/Users/82104/Desktop/Cursor/card-event-intelligence/entry-page/index.html)의 단일 히어로 진입 화면을 `프리미엄 전략 플랫폼형 싱글 스크롤 랜딩`으로 재설계한다. 새 entry page는 단순한 표지 화면이 아니라, `Payment Market Monitoring - Vertical AI Platform`의 위상과 모니터링 범위를 동시에 전달하는 고급스러운 관문이어야 한다.

가장 중요한 조건은 아래 두 가지다.

- 기존 3D 인터랙션 배경은 버리지 않고 페이지 전체를 관통하는 `persistent command field`로 유지할 것
- 여러 페이지로 분리하지 않고, `하나의 페이지 안에서 정보 레이어가 순차적으로 열리는 구조`로 설계할 것

## User-Approved Rules

- entry page는 더 고급스럽고 예뻐야 한다.
- 페이지는 인터랙티브해야 한다.
- 여러 화면으로 쪼개지기보다 `스크롤이 있는 하나의 페이지`가 낫다.
- 첫 화면은 `플랫폼의 위상`과 `무엇을 모니터링하는지`를 함께 전달해야 한다.
- 전체 콘셉트는 `Command Center Reveal`로 간다.
- 기존 3D 인터랙션 이미지는 반드시 살린다.
- 3D는 히어로 전용 장식이 아니라 `페이지 전체에서 살아 있는 persistent scene`으로 유지한다.
- 분위기는 임원에게는 신뢰감, 실무자에게는 활용감을 주는 중간 지점이어야 한다.

## Current Context

현재 entry page는 다음 3개 파일 중심의 정적 구조다.

- [entry-page/index.html](C:/Users/82104/Desktop/Cursor/card-event-intelligence/entry-page/index.html)
- [entry-page/style.css](C:/Users/82104/Desktop/Cursor/card-event-intelligence/entry-page/style.css)
- [entry-page/script.js](C:/Users/82104/Desktop/Cursor/card-event-intelligence/entry-page/script.js)

현 상태의 특징은 아래와 같다.

- Spline iframe 기반 3D 배경 1개
- 중앙 정렬된 히어로 타이틀과 CTA 1개
- 주변에 떠 있는 5개의 edge feature pill
- 스크롤이 없는 단일 뷰포트 중심 레이아웃
- 실질적인 인터랙션 로직 부재

이 구조는 첫인상은 강하지만, 현재 프로젝트가 가진 `경쟁사 이벤트 인텔리전스`, `상품 변화 추적`, `시장 반응 감지`, `AI 브리핑 전환` 역량을 충분히 설명하지 못한다.

## Product Framing

entry page는 아래 두 역할을 동시에 수행해야 한다.

### 1. Brand Statement

이 페이지는 `Payment Market Monitoring - Vertical AI Platform`이라는 제품 위상을 선언해야 한다. 사용자는 첫 화면에서 단순한 대시보드가 아니라, 특정 도메인에 깊게 특화된 전략형 인텔리전스 플랫폼에 들어온다는 인상을 받아야 한다.

### 2. Monitoring Scope Preview

동시에 사용자는 이 플랫폼이 정확히 무엇을 모니터링하는지 바로 이해해야 한다. 핵심 감시 축은 아래 4개로 고정한다.

- 이벤트 인텔리전스
- 상품 인텔리전스
- 경쟁사 비교
- 시장 반응 시그널

브랜드 선언만 있고 범위가 보이지 않으면 추상적이 되고, 범위만 많고 위상이 없으면 제품이 아닌 단순 정보 페이지처럼 보이게 된다. 따라서 첫 화면부터 두 축을 함께 설계해야 한다.

## Chosen Direction

### Option A. Monumental Hero

- 강한 타이포와 최소 정보로 브랜드 위상만 밀어붙이는 방식
- 장점: 가장 조형적이고 고급스럽다
- 단점: 모니터링 범위와 실사용 맥락이 약하다

### Option B. Command Center Reveal `Chosen`

- 첫 화면에서 플랫폼 위상과 모니터링 범위를 함께 제시한다
- 스크롤을 내려가며 각 인텔리전스 영역과 결과물이 순차적으로 열린다
- 장점: 브랜드, 정보, 제품감의 균형이 가장 좋다
- 단점: 정보량과 미감을 동시에 관리해야 하므로 설계 정교함이 필요하다

### Option C. Dashboard Preview Landing

- 첫 화면부터 데이터 패널과 미리보기 모듈을 강하게 노출하는 방식
- 장점: 설명력과 제품감이 강하다
- 단점: 진입 페이지보다 실제 앱 화면처럼 보일 위험이 있다

현재 요구에 가장 잘 맞는 방향은 Option B다.

## Experience Architecture

entry page는 `한 페이지 안에서 점진적으로 깊어지는 플랫폼 서사`로 설계한다. 사용자는 페이지를 넘기는 느낌이 아니라, 하나의 커맨드 필드 안에서 정보층이 순차적으로 열리는 느낌을 받아야 한다.

권장 정보 흐름은 아래와 같다.

1. 플랫폼 위상과 감시 범위를 동시에 제시
2. 핵심 신호와 상태를 짧게 노출
3. 각 인텔리전스 영역을 구체적으로 확장
4. 실제 결과물인 AI 브리핑/감지 스냅샷을 제시
5. 수집-분석-브리핑 흐름을 보여준 뒤 CTA로 연결

## Screen Composition

전체 레이아웃은 `비대칭 커맨드 센터형`으로 잡는다. 완전 중앙 정렬보다 정보 밀도와 고급스러운 긴장감이 더 잘 살아난다.

### Section 1. Hero Command Layer

첫 화면의 역할:

- 플랫폼 위상 선언
- 4개 모니터링 축 사전 노출
- 진입 CTA 노출

권장 구성:

- 좌측: 헤드라인, 설명, CTA
- 우측: live signal panel 또는 command cards
- 보조 요소: 이벤트, 상품, 경쟁사, 시장 반응을 암시하는 신호 패널

첫 화면에서 사용자가 알아야 할 메시지는 다음이다.

- 이것은 고급 전략 플랫폼이다
- 이 플랫폼은 시장을 여러 축으로 지속 감시한다
- 단순 소개 페이지가 아니라 살아 있는 시스템이다

### Section 2. Sticky Signal Bar

히어로를 지나면 얇은 상태 바가 상단 또는 상단 인접 구간에 붙는다. 이 구간은 페이지 전체를 하나의 시스템처럼 느끼게 하는 연결 장치다.

후보 정보:

- 4사 모니터링
- 실시간에 가까운 감지
- AI 브리핑 변환
- 시장 반응 추적

### Section 3. Intelligence Reveal Grid

페이지 중간의 핵심 설명 구간이다. 다음 4개 블록을 중심으로 구성한다.

- 이벤트 인텔리전스
- 상품 인텔리전스
- 경쟁사 비교
- 시장 반응 시그널

카드형 섹션을 기본으로 하되, 스크롤 시 강조 대상이 바뀌거나 세부 패널이 함께 변하는 식의 인터랙션을 부여한다.

### Section 4. Briefing Preview Stage

entry page가 실제 플랫폼처럼 느껴지게 만드는 구간이다. 완성 차트보다 아래와 같은 `브리핑형 산출물 스냅샷`이 더 적합하다.

- 주간 브리핑 패널
- 변화 감지 로그
- 핵심 인사이트 문장
- 상태 태그와 타임스탬프

이 구간의 목적은 `결국 무엇이 결과물로 나오는가`를 보여주는 것이다.

### Section 5. Process Narrative

하단부에서 플랫폼의 흐름을 짧고 세련되게 요약한다.

- 수집
- 정제
- 분석
- 브리핑
- 액션

이 섹션은 vertical AI platform이라는 개념을 추상어가 아니라 운영 흐름으로 이해시키는 역할을 한다.

### Section 6. Final CTA

마지막 CTA는 단일 버튼보다 역할이 다른 2개 액션이 더 적합하다.

후보:

- 플랫폼 입장
- 브리핑 보기

## 3D And Interaction System

### Core Rule

기존 Spline 3D scene은 유지하되, `히어로 배경`이 아니라 `페이지 전체를 관통하는 persistent command field`로 승격한다.

### Interaction Principles

- 3D 씬은 전체 스크롤 동안 살아 있어야 한다
- 전면 정보 패널은 반투명, 그라데이션, 블러를 적절히 써서 3D 위에 떠 있는 듯 보여야 한다
- 섹션이 바뀔 때 3D의 초점, 글로우, 시선축은 미세하게만 이동한다
- 과도한 카메라 이동, 과격한 parallax, 현란한 회전 효과는 피한다
- 모바일에서는 3D 강도를 낮추고 가독성을 우선한다

### Approved Motion Vocabulary

- scroll reveal
- sticky state transition
- KPI count-up
- card hover glow
- subtle parallax
- section focus shift

애니메이션의 목표는 `와, 움직인다`가 아니라 `하나의 비싼 시스템 안을 탐색하는 느낌`이다.

## Visual Tone

### Brand Mood

비주얼은 `딥 네이비 기반의 프리미엄 커맨드 센터`로 정의한다.

피해야 할 방향:

- 과한 네온
- 싸이버펑크 과장
- 랜덤한 glassmorphism
- 과도한 UI chrome

지향점:

- deep navy
- graphite
- silver
- ice blue highlight
- satin glass cards
- 넉넉한 여백과 강한 위계

### Typography

- 헤드라인은 강하고 조형적이어야 한다
- 본문과 데이터 라벨은 정밀하고 차분해야 한다
- 설명문은 길게 쓰지 않고, 브리핑 문장처럼 짧고 단단하게 유지한다

### Card Language

- 완전 불투명 패널보다 얇은 반투명 패널을 사용한다
- 보더는 강한 흰색보다 실버 톤이 적합하다
- shadow는 퍼지는 검은 그림자보다 깊이감을 만드는 수준으로 절제한다
- 3D가 강한 만큼 전면 패널의 스타일은 과장하지 않는다

## Information Density Rules

정보는 많아 보여야 하지만, 무거워 보이면 안 된다.

각 섹션은 아래 조합을 기본 단위로 사용한다.

- 짧은 헤드라인
- 한 줄 설명
- 핵심 신호 2~4개
- 상태 태그 또는 작은 수치

피해야 할 방식:

- 장문의 마케팅 설명문
- 기능 나열식 bullet 과다
- 큰 차트만 덩그러니 두는 레이아웃
- 첫 화면부터 지나치게 많은 패널을 한꺼번에 배치하는 것

지향하는 방식:

- 설명보다 `관측된 시스템`처럼 보이기
- 카드보다 `command module`처럼 보이기
- 텍스트보다 `브리핑/시그널 조각`처럼 읽히기

## Content Model

entry page에서 보여줄 주요 콘텐츠 단위는 아래 범주를 우선 사용한다.

### Hero Layer

- 플랫폼 선언 카피
- 4개 모니터링 축
- CTA

### Signal Layer

- 감지된 변화 수
- 모니터링 범위
- 브리핑 주기
- 최근 신호 요약

### Preview Layer

- 변화 감지 카드
- 브리핑 문장 스니펫
- 경쟁사/상품/시장 반응 샘플 태그

### Process Layer

- 수집
- 정제
- 분석
- 브리핑
- 액션

## Technical Constraints

- 현재 entry page는 정적 HTML/CSS/JS 기반이므로, 초기 구현도 같은 기술 스택에서 우선 완성한다
- 3D는 기존 iframe 기반 Spline 연결을 유지한다
- 기존 `overflow: hidden` 구조는 싱글 페이지 스크롤 구조에 맞게 재설계해야 한다
- 스크롤 섹션이 추가되더라도 3D와 CTA의 상호작용이 깨지지 않도록 pointer-events 구조를 다시 설계해야 한다
- 모바일에서는 정보 패널이 3D를 압도하지 않도록 콘텐츠 폭과 줄 길이를 별도 최적화한다

## Non-Goals

- entry page를 실제 운영 대시보드처럼 만드는 것
- 모든 분석 기능을 차트 중심으로 다 보여주는 것
- 새로운 프런트 프레임워크 도입
- 과한 인터랙션으로 성능이나 가독성을 희생하는 것

## Success Criteria

- 첫 화면에서 플랫폼의 위상과 모니터링 범위가 동시에 전달된다
- 스크롤을 시작하면 사용자가 자연스럽게 플랫폼의 깊이를 이해한다
- 기존 3D 자산이 사라지지 않고 오히려 전체 페이지 분위기를 통합한다
- 페이지 전체가 하나의 공간처럼 느껴진다
- 예쁘기만 한 랜딩이 아니라, 실제 전략형 인텔리전스 플랫폼의 입구처럼 보인다
