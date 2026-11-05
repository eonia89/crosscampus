# Crosscampus

**Different schools. One first step.**

한국 국제학교 고등학생이 학교 밖에서 프로젝트 팀을 만들고 **첫 주의 작은 결과물**까지 함께 시작하는 서비스입니다.

## 바로 살펴보기

- GitHub: [eonia89/crosscampus](https://github.com/eonia89/crosscampus) (비공개)
- 서비스: [Crosscampus](https://crosscampus-kr.web.app) · Firebase 프로젝트 `crosscampus-kr`. 배포와 Google 로그인 검증 완료.
- 핵심 흐름: **발견 → 역할별 지원 → 리더 수락 → 첫 주 실행 보드**
- `체험 공간`: 가상 학교·학생·프로젝트 6개. 로그인 없이 Jin / Mina / Yuri로 전체 흐름을 검증합니다. 변경 내용은 해당 브라우저에만 저장됩니다.
- `실제 프로젝트`: Google 로그인 후 초대된 계정만 접근합니다. Firestore에 저장되며 지원서는 지원자·리더만, 보드는 합류한 팀원만 볼 수 있습니다.
- 초기 MVP입니다. 실제 학생 모집, 재학 인증, 운영 대응, 시장 수요 검증은 아직 수행하지 않았습니다.
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

Node.js 22.13+와 npm이 필요합니다. 로컬 체험은 Google 계정이나 비밀 키 없이 실행됩니다.

```sh
npm ci
npm run dev
```

터미널의 `http://127.0.0.1:5173`을 엽니다. 체험 상태는 브라우저 저장소에만 남습니다.

실제 저장·권한의 로컬 개발에는 Java 21+와 Firebase 에뮬레이터를 사용합니다. 두 터미널에서 실행하세요.

```sh
npm run emulators
# 별도 터미널
VITE_USE_EMULATORS=true npm run dev
```

에뮬레이터 인증 사용자는 운영 Google 계정이 아닙니다. `demo-crosscampus` 프로젝트만 사용하며, 실제 프로젝트 UI 테스트에는 에뮬레이터의 `access/{테스트 이메일}` 문서에 `enabled: true`를 먼저 넣습니다. 이 관리자 작업은 앱에서 수행할 수 없습니다. [Firebase 운영 안내](docs/FIREBASE.md)를 참조하세요.

```sh
npm test
npm run test:rules
npm run typecheck
npm run build
```

`test:rules`는 Firestore 에뮬레이터를 시작하고 종료합니다. 이미 에뮬레이터가 실행 중이면 중지하거나 `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node --test tests/firebase/*.test.mjs`로 실행하세요. 테스트는 별도 `demo-crosscampus` DB를 초기화하므로 로컬 테스트 데이터가 지워집니다.

## 구현 범위와 기술

React 19 + TypeScript + Vite SPA, Firebase Hosting, Google Authentication, Firestore Security Rules와 트랜잭션을 사용합니다. 무료 Spark 범위에서 운영하며 Cloud Functions/App Hosting/유료 결제 계정은 사용하지 않습니다.

탐색·필터·저장, 프로필, 모집글, 역할별 지원/취소, 리더의 수락/거절/모집마감, 첫 주 목표·모임·체크리스트, 비공개 신고 기록을 구현했습니다. 역할당 한 명만 수락할 수 있으며 동시에 수락해도 DB에서 제한합니다.

`lib/domain.mjs`는 순수 검증과 체험 상태, `lib/firebase-store.mjs`는 실제 저장, `firestore.rules`는 서버에서 실행되는 접근 권한, `firebase/client.ts`는 로그인과 저장소 선택, `app/crosscampus.tsx`는 화면입니다. [구조](docs/ARCHITECTURE.md)를 먼저 읽으세요.

이전 Sites/D1 파일은 이관 참고용으로 남아 있고 기본 Firebase 빌드에 포함되지 않습니다. 이전 배포로 돌아가려면 Git의 `e5a1b47` 버전을 사용하세요. 현재 브랜치의 혼합 파일을 Sites에 재배포하지 마세요.

## 개발 기록

이 MVP는 사용자 요청을 바탕으로 AI 코딩 도구를 사용해 구현되었습니다. 샘플 학생·샘플 활동을 실제 이용자나 실적으로 주장하지 않습니다. 기여자는 자신이 실제로 구현·검증한 기능을 자기 계정으로 커밋하고 PR에 변경과 검증 근거를 기록합니다.

이 저장소는 참가 신청용으로 준비한 사전 프로젝트입니다. 행사 당일 출품작의 사전 개발 허용 여부는 해당 행사 규칙을 따릅니다.
