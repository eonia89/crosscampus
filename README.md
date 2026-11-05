# Crosscampus

**Different schools. One first step.**

한국 국제학교 고등학생이 학교 밖에서 프로젝트 팀을 만들고 **첫 주의 작은 결과물**까지 함께 시작하는 서비스입니다.

## 바로 살펴보기

- GitHub: [eonia89/crosscampus](https://github.com/eonia89/crosscampus) (비공개)
- 서비스: [Crosscampus 비공개 미리보기](https://crosscampus-first-sprint.free-tiger-9074.chatgpt.site/) (소유자 ChatGPT 계정으로 로그인)
- 핵심 흐름: **발견 → 역할별 지원 → 리더 수락 → 첫 주 실행 보드**
- `체험 공간`: 가상 학교·학생·프로젝트 6개. Jin / Mina / Yuri로 관점을 바꿔 전체 흐름을 검증합니다. 로그인 계정별로 분리되어 저장됩니다.
- `실제 프로젝트`: 실제 로그인 계정의 프로필·모집·지원·실행 보드를 서버에 저장합니다. 체험 데이터와 섞이지 않습니다.
- 현재 단계: **기능을 평가할 수 있는 비공개 초기 MVP**. 실제 학생 모집, 재학 인증, 운영 대응, 시장 수요 검증은 아직 수행하지 않았습니다.
- 매칭은 역할과 시간에 따른 설명 가능한 규칙입니다. LLM API나 AI 추천이라고 표시하지 않습니다.

## 팀원에게 전달할 것

**[TEAMMATE_START_HERE.md](TEAMMATE_START_HERE.md)의 복사 블록과 이 저장소/소스 ZIP을 전달하세요.**

팀원 담당 기능은 **첫 스프린트 결과물과 회고 기록**입니다. 실제 구현해야 할 제품 기능으로, 현재 구현과 겹치지 않게 범위·데이터 계약·권한·완료 조건·테스트를 정했습니다.

- [팀원 에이전트 시작 지시문](TEAMMATE_START_HERE.md)
- [팀원 작업 이슈 #1](https://github.com/eonia89/crosscampus/issues/1)
- [T01: 첫 스프린트 결과물 & 회고](docs/tasks/T01-sprint-outcomes.md)
- [제품 기획과 검증 계획](docs/PRODUCT.md)
- [구조와 데이터 계약](docs/ARCHITECTURE.md)
- [시연 순서 / 영어 소개](docs/DEMO.md)
- [출시 상태와 제한](docs/STATUS.md)
- [GitHub 업로드 / 협업 방법](docs/GITHUB.md)

## 실행

Node.js 22.13+와 npm이 필요합니다. npm 외 별도의 전역 도구나 API 키는 필요 없습니다.

```sh
npm ci
npm run setup
npm run dev
```

터미널에 출력되는 로컬 주소(기본 `http://127.0.0.1:5173`)를 엽니다. `프로젝트 만들기 → ChatGPT로 로그인`을 누르면 **로컬에서만** 테스트 계정 `local_seedy`로 로그인됩니다. 배포본은 실제 Sites 인증을 사용합니다.

`npm run setup`은 빌드 후 로컬 D1 마이그레이션을 적용합니다. 재실행해도 이미 적용한 마이그레이션을 반복하지 않습니다. `npm run db:local`은 로컬 데이터만 다룹니다. `.wrangler/`와 `.sites-runtime/`을 Git에 올리지 마세요.

```sh
npm test
npm run typecheck
npm run build
```

## 구현 범위

- 프로젝트 검색, 분야·역할·시간 필터, 추천/최신 정렬, 저장
- 프로필과 모집글 생성, 한국 시간 기준 모집 마감
- 역할별 지원, 중복/자기지원 차단, 대기 중 지원 취소
- 소유자만 수락·거절·모집 마감 가능; 역할당 1명 수락
- 팀원 수락 시 첫 주 실행 보드 생성, 목표·모임·체크리스트 저장
- 다른 사람의 지원서 본문과 다른 팀의 보드 비공개
- 신고 기록, 입력 길이 제한, 서버 권한 검사, Origin 검사
- D1 저장과 revision 기반 낙관적 동시성 제어
- 키보드 접근 가능한 모달, 반응형 화면, reduced-motion 지원

## 기술

React 19 + TypeScript, Vinext/Vite, Cloudflare Workers/D1, Drizzle schema migrations, Node 내장 테스트 러너. 핵심 도메인 로직은 `lib/domain.mjs`, 서버는 `app/api/world/route.ts`, 화면은 `app/crosscampus.tsx`입니다. 사이트 배포 식별자는 `.openai/hosting.json`에 있습니다. 기존 사이트 ID를 임의로 바꾸거나 새 사이트를 만들지 마세요.

## 개발 기록

이 MVP는 사용자 요청을 바탕으로 AI 코딩 도구를 사용해 구현되었습니다. 샘플 학생·샘플 활동을 실제 이용자나 실적으로 주장하지 않습니다. 기여자는 자신이 실제로 구현·검증한 기능을 자기 계정으로 커밋하고 PR에 변경과 검증 근거를 기록합니다.

이 저장소는 참가 신청용으로 준비한 사전 프로젝트입니다. 행사 당일 출품작의 사전 개발 허용 여부는 해당 행사 규칙을 따릅니다.
