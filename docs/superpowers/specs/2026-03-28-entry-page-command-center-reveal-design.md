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
- 카피는 `기존의 분산되고 수작업 중심이던 모니터링 방식`과 비교했을 때 무엇이 좋아졌는지를 분명히 드러내야 한다.

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

## Messaging Strategy

entry page의 카피는 단순히 기능을 나열하는 대신, `기존 방식과 비교했을 때 업무가 어떻게 좋아졌는지`를 자연스럽게 보여줘야 한다. 특히 이 페이지는 임원과 실무자 사이의 사용자 모두를 설득해야 하므로, 추상적인 비전 문장만으로는 부족하고 실제 업무 변화가 함께 읽혀야 한다.

권장 메시지 문법은 `직접 비교형`과 `업무 혁신형`을 섞는 방식이다.

- 흩어진 카드사/채널 확인 작업 -> 하나의 플랫폼에서 통합 감지
- 수작업 탐색/정리/비교 -> 자동 분석과 브리핑 전환
- 후행적 확인 -> 실시간에 가까운 신호 포착
- 정보 수집 노동 -> 판단과 액션 중심 업무

카피 톤은 아래 원칙을 따른다.

- 문제를 과장하거나 투덜대지 않는다
- `불편하다`, `귀찮다`보다 `분산된`, `수작업 중심`, `후행적` 같은 표현을 쓴다
- 개선 메시지는 항상 `무엇이 대체되었는가`와 `무엇으로 전환되었는가`가 같이 읽히게 한다
- 제품 자랑보다 업무 전환 효과가 먼저 읽히게 한다

### Simple And Direct Tone Rules

Apple 홈페이지처럼 쉽고 직관적인 인상을 주려면, 이 페이지의 문장은 `전략적이되 어렵지 않게` 읽혀야 한다. 즉 고급스러운 말투는 유지하되, 문장 구조는 짧고 즉시 이해되어야 한다.

- 한 문장에는 한 가지 메시지만 넣는다
- 먼저 사용자가 얻는 이점을 말하고, 방식은 뒤에서 보완한다
- 한글 본문에서는 내부 용어와 추상 명사를 과도하게 쓰지 않는다
- `인텔리전스`, `시그널`, `artifact`, `taxonomy` 같은 단어는 꼭 필요한 곳에서만 제한적으로 쓴다
- 설명형 동사보다 행동형 동사를 우선한다
  - 예: `전환합니다`보다 `모읍니다`, `보여줍니다`, `비교합니다`, `알려줍니다`
- hero 설명은 2문장 또는 2줄 안에서 이해되어야 한다
- 읽는 사람이 속으로 다시 해석해야 하는 문장은 피한다

### Tone Translation Examples

아래처럼 `좋은 개념이지만 무거운 문장`을 `쉽고 직관적인 문장`으로 바꾼다.

- `브리핑 가능한 인텔리전스로 전환합니다` -> `바로 보고할 수 있는 브리핑으로 정리합니다`
- `시장 반응 시그널을 포착합니다` -> `시장 반응 변화를 더 빨리 봅니다`
- `수집과 정리에 머물던 모니터링` -> `찾고 정리하던 일을 줄이고`
- `판단과 액션 중심 업무` -> `중요한 판단에 더 빨리 들어가게`
- `실시간에 가까운 신호 포착` -> `변화를 더 빠르게 확인`

### Messaging Applications By Section

- Hero: 플랫폼 위상 선언과 함께, 흩어진 모니터링을 하나의 브리핑 흐름으로 바꾼다는 메시지를 넣는다
- Signal Bar: `분산 모니터링 -> 통합 인텔리전스` 같은 짧은 전환 언어를 압축적으로 쓴다
- Intelligence Reveal: 각 영역이 기존에 따로 보던 업무를 어떻게 연결하는지 보여준다
- Briefing Preview: 수집된 변화가 어떻게 바로 briefing artifact로 바뀌는지 보여준다
- Process Narrative: `찾고 정리하는 일`보다 `판단하고 대응하는 일`에 집중하게 만든다는 메시지로 마무리한다

### Reference Copy Direction

- `카드사별로 흩어진 이벤트·상품·시장 반응 신호를 하나의 흐름으로 감지하고, 브리핑 가능한 인텔리전스로 전환합니다.`
- `수집과 정리에 머물던 모니터링을, 판단과 액션을 위한 브리핑 시스템으로 바꿉니다.`
- `변화를 뒤늦게 정리하는 대신, 시장 신호를 실시간에 가깝게 포착하고 연결합니다.`

### Simpler Copy Direction

- `여러 곳에서 찾던 카드사 변화, 이제 한곳에서 봅니다.`
- `이벤트와 상품 변화는 더 빨리 보고, 시장 반응은 함께 읽습니다.`
- `찾고 정리하던 시간은 줄이고, 중요한 판단은 더 빠르게.`
- `흩어진 모니터링을 하나의 브리핑 흐름으로 바꿉니다.`

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

### Hero Budget Rules

첫 뷰포트는 `포스터 같은 한 장의 구성`으로 읽혀야지, 작은 대시보드처럼 보이면 안 된다.

첫 화면에 동시에 허용되는 정보 예산은 아래로 제한한다.

- 브랜드 라벨 1개
- 강한 헤드라인 1개
- 설명 문장 1개
- Primary CTA 1개
- 압축된 신호 묶음 1개
- 시각 앵커 1개

첫 화면에서 금지할 것:

- 동급 위계의 카드 여러 개
- 큰 KPI 그리드
- 완성형 브리핑 패널 전체 노출
- 좌우에 정보 박스를 과도하게 쌓는 구성

즉 첫 화면은 `브랜드 + 범위 + 암시된 신호`까지만 보여주고, 깊은 설명은 스크롤 이후로 넘긴다.

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

CTA 위계는 아래처럼 고정한다.

- `플랫폼 입장`은 primary CTA로 유지
- `브리핑 보기`는 secondary action으로 내린다
- secondary action은 ghost button 또는 text link 수준으로 절제한다
- 두 CTA가 시각적으로 같은 무게를 갖지 않도록 한다

## Section Grammar Rules

모든 섹션이 같은 카드/패널 문법으로 반복되면 AI SaaS 랜딩처럼 보일 위험이 크다. 각 섹션은 서로 다른 레이아웃 역할을 가져야 한다.

- Hero Command Layer: split composition
- Sticky Signal Bar: thin ribbon / status strip
- Intelligence Reveal Grid: staggered module reveal, not equal 4-up dashboard grid
- Briefing Preview Stage: full-width editorial sheet 또는 large preview panel
- Process Narrative: narrow timeline or sequenced rail
- Final CTA: calm closing composition

섹션별로 같은 반투명 카드가 반복되는 느낌을 피하고, 각 구간이 `하나의 장면`처럼 읽히게 해야 한다.

## 3D And Interaction System

### Core Rule

기존 Spline 3D scene은 유지하되, `히어로 배경`이 아니라 `페이지 전체를 관통하는 persistent command field`로 승격한다.

### Interaction Principles

- 3D 씬은 전체 스크롤 동안 살아 있어야 한다
- 전면 정보 패널은 반투명, 그라데이션, 블러를 적절히 써서 3D 위에 떠 있는 듯 보여야 한다
- 섹션이 바뀔 때 3D의 초점, 글로우, 시선축은 미세하게만 이동한다
- 과도한 카메라 이동, 과격한 parallax, 현란한 회전 효과는 피한다
- 모바일에서는 3D 강도를 낮추고 가독성을 우선한다

### Input Ownership Model

스크롤형 페이지에서 3D와 콘텐츠가 입력 우선권을 두고 싸우면 바로 품질이 떨어진다. 아래 규칙을 명시적으로 지킨다.

- Hero 구간에서는 3D가 시각적 반응을 가져도 된다
- Hero 구간에서도 CTA와 핵심 텍스트 주변은 콘텐츠가 우선권을 가진다
- 본문 스크롤 구간에서는 콘텐츠 레이어가 스크롤과 포인터 입력의 우선권을 가진다
- 본문 구간의 3D는 passive reaction 또는 미세한 parallax 수준으로 제한한다
- 모바일에서는 3D 직접 조작을 기본적으로 약화하거나 비활성화한다

즉 사용자는 `콘텐츠를 읽는 동안 방해받지 않고`, 동시에 `뒤에 살아 있는 시스템이 계속 존재한다`고 느껴야 한다.

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

타이포 시스템은 최소 3개 역할로 분리한다.

- Display: hero headline 전용, 브랜드 위상과 첫인상을 담당
- UI Sans: 본문, 라벨, 버튼, 설명 텍스트 담당
- Numeric/Data: 수치, 타임스탬프, signal label 담당

추가 규칙:

- body용 서체와 hero용 서체가 완전히 같은 인상으로 보이면 안 된다
- 숫자는 tabular figures 또는 동등한 정렬 특성을 갖도록 한다
- 첫 화면의 영문 라벨과 한글 헤드라인이 함께 있어도 조형적으로 충돌하지 않게 weight와 tracking을 따로 조정한다
- 현재 body에 가까운 `Pretendard` 계열은 UI Sans로 유지 가능하지만, hero는 별도 display voice가 필요하다

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

추가 원칙:

- 첫 화면은 headline만 훑어도 제품의 정체성이 이해되어야 한다
- 각 섹션은 한 가지 역할만 수행해야 한다
- 30%를 덜어냈을 때 더 좋아 보이면 과감히 덜어낸다

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
