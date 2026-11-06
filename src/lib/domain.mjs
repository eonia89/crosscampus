export const categories = [
  "환경·사회",
  "미디어·창작",
  "테크·메이킹",
  "리서치",
  "커뮤니티",
];
export const skills = [
  "기획",
  "디자인",
  "개발",
  "영상",
  "리서치",
  "글쓰기",
  "운영",
];
export const firstSteps = {
  기획: "첫 결과물에 꼭 필요한 장면·기능 3개 정리하기",
  디자인: "분위기가 다른 작은 시안 2개를 팀에 공유하기",
  개발: "핵심 동작 하나를 눌러볼 수 있는 초안 만들기",
  영상: "휴대폰으로 30초 테스트 영상을 찍어 공유하기",
  리서치: "확인하고 싶은 질문 3개와 근거 자료 정리하기",
  글쓰기: "첫 문단이나 인터뷰 질문 5개를 써서 공유하기",
  운영: "이번 주 가능한 시간과 첫 모임 진행 순서 정리하기",
};

export const modes = ["온라인", "서울·경기", "제주"];
export class DomainError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
const fail = (m, s) => {
  throw new DomainError(m, s);
};
const text = (v, l, min, max) => {
  if (typeof v !== "string" || v.trim().length < min || v.trim().length > max)
    fail(`${l}: ${min}~${max}자로 입력해 주세요.`);
  return v.trim();
};
const choice = (v, opts, l) =>
  opts.includes(v) ? v : fail(`${l}을 선택해 주세요.`);
const num = (v, min, max, l) =>
  Number.isInteger(Number(v)) && Number(v) >= min && Number(v) <= max
    ? Number(v)
    : fail(`${l}: ${min}~${max} 사이 숫자를 입력해 주세요.`);
export const emptyWorld = () => ({
  version: 1,
  profiles: {},
  projects: [],
  applications: [],
  bookmarks: {},
  sprints: [],
  reports: [],
  outcomes: [],
  feedback: [],
});
// Older saved demo worlds predate outcomes/feedback. Add empty arrays without
// touching any existing data; the result is only persisted on the next change.
export function withOutcomeDefaults(w) {
  return {
    ...w,
    outcomes: Array.isArray(w.outcomes) ? w.outcomes : [],
    feedback: Array.isArray(w.feedback) ? w.feedback : [],
  };
}

export const OUTCOME_LIMIT = 20;
export const FEEDBACK_LIMIT = 20;
// Live outcome IDs are fixed slots; 20 slots bound a team to 20 outcomes.
export const outcomeSlots = Array.from(
  { length: OUTCOME_LIMIT },
  (_, i) => `o${String(i + 1).padStart(2, "0")}`,
);
// Mirrors firestore.rules exactly. The host must be a DNS name whose last
// label is alphabetic (or punycode), so IP literals are never accepted.
export const SAFE_URL_PATTERN =
  /^https:\/\/([A-Za-z0-9-]+\.)+([A-Za-z]{2,63}|xn--[A-Za-z0-9-]{1,59})(:[0-9]{1,5})?([/?#][^\s\\]*)?$/;
const LOOPBACK_HOST_PATTERN = /^https:\/\/([^/?#:]*\.)?localhost(:|\/|\?|#|$)/i;

export function safeResultUrl(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  const message =
    "결과물 링크: https://로 시작하는 공개 주소를 입력해 주세요. 로그인 정보나 내부 주소(localhost 등)는 사용할 수 없어요.";
  if (!raw || raw.length > 2048) fail(message);
  let u;
  try {
    u = new URL(raw);
  } catch {
    fail(message);
  }
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    !u.hostname ||
    /^\[|^[0-9.]+$|^0x/i.test(u.hostname)
  )
    fail(message);
  const href = u.href;
  if (
    href.length > 2048 ||
    !SAFE_URL_PATTERN.test(href) ||
    LOOPBACK_HOST_PATTERN.test(href)
  )
    fail(message);
  return href;
}
export function outcomeFields(v = {}) {
  return {
    title: text(v.title, "결과물 이름", 3, 80),
    url: safeResultUrl(v.url),
    contribution: text(v.contribution, "나의 기여", 10, 500),
    reflection: text(v.reflection, "돌아보기", 10, 1000),
  };
}
export const feedbackBody = (v) => text(v, "피드백", 5, 500);
export function makeDemoWorld(now = Date.now()) {
  const w = emptyWorld();
  w.profiles = {
    "demo-jin": {
      id: "demo-jin",
      name: "Jin",
      school: "Maple International · 예시",
      grade: "G10",
      skills: ["디자인", "영상"],
      hours: 3,
      language: "한국어·English",
      bio: "작은 아이디어를 눈에 보이는 결과물로 만드는 걸 좋아해요.",
    },
    "demo-mina": {
      id: "demo-mina",
      name: "Mina",
      school: "Harbor School · 예시",
      grade: "G11",
      skills: ["기획", "리서치"],
      hours: 4,
      language: "한국어·English",
      bio: "다른 학교 친구들과 함께 변화를 만들고 싶어요.",
    },
    "demo-yuri": {
      id: "demo-yuri",
      name: "Yuri",
      school: "Forest Academy · 예시",
      grade: "G10",
      skills: ["글쓰기", "개발"],
      hours: 3,
      language: "English",
      bio: "코드와 이야기로 새로운 걸 만들어요.",
    },
  };
  const rows = [
    [
      "ocean",
      "바다의 목소리를, 5분의 영화로.",
      "제주의 해양 쓰레기를 기록하는 학생 다큐멘터리",
      "미디어·창작",
      ["영상", "디자인"],
      3,
      4,
      "온라인",
      "한국어·English",
      "각자의 동네 해변에서 같은 질문을 던지고, 하나의 짧은 영화로 엮어요. 첫 주에는 휴대폰으로 30초 테스트 영상을 만들어볼 거예요.",
      "5분 다큐멘터리 1편과 공개 상영용 포스터",
      "demo-mina",
      "coral",
    ],
    [
      "repair",
      "버려질 물건의 두 번째 캠퍼스.",
      "학교를 연결하는 수리·업사이클링 지도",
      "환경·사회",
      ["디자인", "개발"],
      2,
      3,
      "온라인",
      "한국어·English",
      "고장난 물건을 버리기 전에 고칠 곳을 찾을 수 있을까요? 각 학교 주변 수리 가게를 조사하고 직접 확인한 정보로 작은 지도를 만들어요.",
      "직접 확인한 수리 장소 10곳이 담긴 웹 지도",
      "demo-yuri",
      "lime",
    ],
    [
      "zine",
      "우리는 어느 언어로 꿈꿀까?",
      "두 언어 사이에서 자라는 학생들의 작은 매거진",
      "미디어·창작",
      ["글쓰기", "디자인"],
      2,
      2,
      "온라인",
      "한국어·English",
      "한국어와 영어 사이에서 생기는 재미있는 순간들을 짧은 글과 그림으로 나눠요. 완벽한 영어보다 자기만의 이야기가 중요해요.",
      "8페이지 디지털 진 1호",
      "demo-mina",
      "lavender",
    ],
    [
      "access",
      "모두에게 열려 있는 동네.",
      "이동 약자의 시선으로 캠퍼스 주변 살펴보기",
      "리서치",
      ["리서치", "기획"],
      3,
      4,
      "서울·경기",
      "한국어·English",
      "입구의 작은 턱, 읽기 어려운 안내판처럼 쉽게 놓치는 장벽을 관찰해요. 확인한 사실과 개선 아이디어를 구분해 담아요.",
      "공개 장소 5곳의 접근성 관찰 리포트",
      "demo-yuri",
      "sky",
    ],
    [
      "garden",
      "창가에서 시작하는 작은 실험.",
      "우리 교실 식물의 빛과 성장 기록하기",
      "테크·메이킹",
      ["개발", "리서치"],
      2,
      4,
      "온라인",
      "English",
      "학교마다 다른 환경에서 같은 식물의 성장을 기록해요. 첫 주에는 측정 방법과 기록 양식을 함께 정합니다.",
      "4주 관찰 데이터와 시각화 페이지",
      "demo-mina",
      "peach",
    ],
    [
      "welcome",
      "전학생에게 보내는 첫 번째 편지.",
      "새로운 친구를 위한 학생 제작 웰컴 키트",
      "커뮤니티",
      ["글쓰기", "디자인", "운영"],
      1,
      2,
      "온라인",
      "한국어·English",
      "우리가 처음 왔을 때 알았으면 좋았을 것들을 모아요. 동의를 받은 익명 경험과 학교 공식 안내를 구분해 담습니다.",
      "학생이 직접 검토한 디지털 웰컴 키트",
      "demo-yuri",
      "yellow",
    ],
  ];
  w.projects = rows.map(
    ([
      id,
      title,
      subtitle,
      category,
      roles,
      hours,
      weeks,
      mode,
      language,
      description,
      outcome,
      ownerId,
      color,
    ]) => ({
      id,
      title,
      subtitle,
      category,
      roles,
      hours,
      weeks,
      mode,
      language,
      description,
      outcome,
      ownerId,
      color,
      status: "open",
      createdAt: now,
      deadline: new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
      }).format(new Date(now + 14 * 86400000)),
      sample: true,
    }),
  );
  w.applications = [
    {
      id: "sample-application",
      projectId: "ocean",
      userId: "demo-yuri",
      role: "영상",
      note: "휴대폰 촬영과 간단한 편집을 해봤어요. 첫 주 테스트 영상을 함께 만들어보고 싶어요.",
      status: "pending",
      createdAt: now,
    },
  ];
  return w;
}
export function getMatch(p, profile) {
  if (!profile) return { score: 0, reasons: [] };
  const shared = p.roles.filter((r) => profile.skills.includes(r));
  const reasons = shared.map((r) => `${r} 역할을 찾고 있어요`);
  if (profile.hours >= p.hours)
    reasons.push(`주 ${p.hours}시간으로 시작할 수 있어요`);
  if (p.mode === "온라인") reasons.push("어느 학교에서든 온라인으로");
  return {
    score:
      shared.length * 3 +
      (profile.hours >= p.hours ? 2 : 0) +
      (p.mode === "온라인" ? 1 : 0),
    reasons,
  };
}
export function canJoinSprint(w, id, actor) {
  return (
    w.projects.some((p) => p.id === id && p.ownerId === actor) ||
    w.applications.some(
      (a) =>
        a.projectId === id && a.userId === actor && a.status === "accepted",
    )
  );
}
export function reduceWorld(
  original,
  actor,
  c,
  now = Date.now(),
  uid = () => crypto.randomUUID(),
) {
  if (!actor || typeof c !== "object" || !c) fail("로그인이 필요해요.", 401);
  const w = withOutcomeDefaults(structuredClone(original)),
    p = w.projects.find((p) => p.id === c.projectId);
  const owned = () => {
    if (!p) fail("프로젝트를 찾을 수 없어요.", 404);
    if (p.ownerId !== actor) fail("프로젝트 리더만 변경할 수 있어요.", 403);
  };
  switch (c.type) {
    case "profile": {
      const v = c.profile ?? {};
      if (
        !Array.isArray(v.skills) ||
        !v.skills.length ||
        v.skills.length > 4 ||
        v.skills.some((s) => !skills.includes(s))
      )
        fail("역할을 1~4개 선택해 주세요.");
      w.profiles[actor] = {
        id: actor,
        name: text(v.name, "이름 또는 별명", 1, 30),
        school: text(v.school, "학교", 1, 80),
        grade: choice(v.grade, ["G9", "G10", "G11", "G12"], "학년"),
        skills: [...new Set(v.skills)],
        hours: num(v.hours, 1, 10, "주당 시간"),
        language: choice(
          v.language,
          ["한국어", "English", "한국어·English"],
          "사용 언어",
        ),
        bio: text(v.bio ?? "", "소개", 0, 250),
      };
      break;
    }
    case "create": {
      if (!w.profiles[actor]) fail("먼저 내 프로필을 완성해 주세요.");
      if (w.projects.filter((p) => p.ownerId === actor).length >= 20)
        fail("프로젝트는 20개까지 만들 수 있어요.");
      const v = c.project ?? {};
      if (
        !Array.isArray(v.roles) ||
        !v.roles.length ||
        v.roles.length > 4 ||
        v.roles.some((s) => !skills.includes(s))
      )
        fail("필요한 역할을 1~4개 선택해 주세요.");
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(v.deadline ?? "") ||
        Number.isNaN(Date.parse(v.deadline)) ||
        new Date(v.deadline).toISOString().slice(0, 10) !== v.deadline ||
        Date.parse(`${v.deadline}T23:59:59+09:00`) < now
      )
        fail("모집 마감일은 오늘 이후로 선택해 주세요.");
      w.projects.unshift({
        id: uid(),
        ownerId: actor,
        title: text(v.title, "프로젝트 이름", 3, 70),
        subtitle: text(v.subtitle, "한 줄 소개", 5, 110),
        description: text(v.description, "프로젝트 소개", 20, 1500),
        outcome: text(v.outcome, "완성할 결과물", 5, 250),
        category: choice(v.category, categories, "분야"),
        roles: [...new Set(v.roles)],
        hours: num(v.hours, 1, 10, "주당 시간"),
        weeks: num(v.weeks, 1, 12, "기간"),
        mode: choice(v.mode, modes, "진행 방식"),
        language: choice(
          v.language,
          ["한국어", "English", "한국어·English"],
          "사용 언어",
        ),
        deadline: v.deadline,
        color: ["coral", "lime", "lavender", "sky", "peach"][
          w.projects.length % 5
        ],
        status: "open",
        createdAt: now,
        sample: false,
      });
      break;
    }
    case "bookmark": {
      if (!p) fail("프로젝트를 찾을 수 없어요.", 404);
      const s = new Set(w.bookmarks[actor] ?? []);
      if (s.has(p.id)) s.delete(p.id);
      else s.add(p.id);
      w.bookmarks[actor] = [...s];
      break;
    }
    case "apply": {
      if (!p) fail("프로젝트를 찾을 수 없어요.", 404);
      if (!w.profiles[actor]) fail("먼저 내 프로필을 완성해 주세요.");
      if (p.ownerId === actor) fail("내 프로젝트에는 지원할 수 없어요.");
      if (
        p.status !== "open" ||
        Date.parse(`${p.deadline}T23:59:59+09:00`) < now
      )
        fail("모집이 마감된 프로젝트예요.");
      if (
        w.applications.some(
          (a) =>
            a.projectId === p.id &&
            a.userId === actor &&
            ["pending", "accepted"].includes(a.status),
        )
      )
        fail("이미 지원한 프로젝트예요.");
      choice(c.role, p.roles, "역할");
      if (
        w.applications.some(
          (a) =>
            a.projectId === p.id &&
            a.role === c.role &&
            a.status === "accepted",
        )
      )
        fail("이 역할은 이미 팀원이 합류했어요.");
      w.applications.push({
        id: uid(),
        projectId: p.id,
        userId: actor,
        role: c.role,
        note: text(c.note, "참여 제안", 10, 600),
        status: "pending",
        createdAt: now,
      });
      break;
    }
    case "withdraw": {
      const a = w.applications.find(
        (a) => a.id === c.applicationId && a.userId === actor,
      );
      if (!a || a.status !== "pending")
        fail("대기 중인 지원만 취소할 수 있어요.");
      a.status = "withdrawn";
      break;
    }
    case "decide": {
      owned();
      const a = w.applications.find(
        (a) => a.id === c.applicationId && a.projectId === p.id,
      );
      if (!a || a.status !== "pending") fail("처리할 지원서를 찾을 수 없어요.");
      const d = choice(c.decision, ["accepted", "rejected"], "처리 상태");
      if (
        d === "accepted" &&
        w.applications.some(
          (x) =>
            x.projectId === p.id &&
            x.role === a.role &&
            x.status === "accepted",
        )
      )
        fail("해당 역할에는 이미 팀원이 있어요.");
      a.status = d;
      if (d === "accepted" && !w.sprints.some((s) => s.projectId === p.id))
        w.sprints.push({
          projectId: p.id,
          meeting: "",
          goal: `‘${p.outcome.slice(0, 180)}’의 첫 초안을 함께 만들어요.`,
          tasks: [
            {
              id: uid(),
              title: "서로의 역할과 이번 주 가능한 시간 나누기",
              done: false,
            },
            { id: uid(), title: "첫 번째 결과물의 범위 정하기", done: false },
          ],
        });
      if (d === "accepted") {
        w.sprints
          .find((s) => s.projectId === p.id)
          .tasks.push({
            id: uid(),
            title: `${w.profiles[a.userId].name} · ${firstSteps[a.role]}`,
            done: false,
          });
      }
      break;
    }
    case "task": {
      if (!canJoinSprint(w, c.projectId, actor))
        fail("팀원만 실행 보드를 변경할 수 있어요.", 403);
      const t = w.sprints
        .find((s) => s.projectId === c.projectId)
        ?.tasks.find((t) => t.id === c.taskId);
      if (!t) fail("할 일을 찾을 수 없어요.", 404);
      t.done = c.done === true;
      break;
    }
    case "kickoff": {
      if (!canJoinSprint(w, c.projectId, actor))
        fail("팀원만 실행 보드를 변경할 수 있어요.", 403);
      const s = w.sprints.find((s) => s.projectId === c.projectId);
      if (!s) fail("팀원을 수락하면 실행 보드가 열려요.");
      s.meeting = text(c.meeting ?? "", "첫 모임", 0, 150);
      s.goal = text(c.goal, "첫 주 목표", 5, 250);
      break;
    }
    case "close":
      owned();
      p.status = p.status === "open" ? "closed" : "open";
      break;
    case "report": {
      if (!p) fail("프로젝트를 찾을 수 없어요.", 404);
      if (w.reports.some((r) => r.projectId === p.id && r.userId === actor))
        fail("이미 신고를 접수했어요.");
      w.reports.push({
        id: uid(),
        projectId: p.id,
        userId: actor,
        reason: text(c.reason, "신고 내용", 5, 500),
        createdAt: now,
      });
      break;
    }
    case "outcome.create": {
      if (!canJoinSprint(w, c.projectId, actor))
        fail("팀원만 결과물을 남길 수 있어요.", 403);
      if (!w.sprints.some((s) => s.projectId === c.projectId))
        fail("팀원을 수락하면 실행 보드가 열려요.");
      if (
        w.outcomes.filter((o) => o.projectId === c.projectId).length >=
        OUTCOME_LIMIT
      )
        fail(`결과물은 팀마다 ${OUTCOME_LIMIT}개까지 남길 수 있어요.`);
      w.outcomes.push({
        id: uid(),
        projectId: c.projectId,
        userId: actor,
        ...outcomeFields(c.outcome),
        createdAt: now,
        updatedAt: now,
      });
      break;
    }
    case "outcome.update":
    case "outcome.delete": {
      if (!canJoinSprint(w, c.projectId, actor))
        fail("팀원만 결과물을 변경할 수 있어요.", 403);
      const o = w.outcomes.find(
        (o) => o.id === c.outcomeId && o.projectId === c.projectId,
      );
      if (!o) fail("결과물을 찾을 수 없어요.", 404);
      if (o.userId !== actor)
        fail("내가 남긴 결과물만 수정하거나 삭제할 수 있어요.", 403);
      if (c.type === "outcome.update") {
        Object.assign(o, outcomeFields(c.outcome), { updatedAt: now });
      } else {
        w.outcomes = w.outcomes.filter((x) => x !== o);
        w.feedback = w.feedback.filter((f) => f.outcomeId !== o.id);
      }
      break;
    }
    case "feedback.create": {
      if (!canJoinSprint(w, c.projectId, actor))
        fail("팀원만 피드백을 남길 수 있어요.", 403);
      const o = w.outcomes.find(
        (o) => o.id === c.outcomeId && o.projectId === c.projectId,
      );
      if (!o) fail("결과물을 찾을 수 없어요. 이미 삭제됐을 수 있어요.", 404);
      if (
        w.feedback.filter((f) => f.outcomeId === o.id).length >= FEEDBACK_LIMIT
      )
        fail(`피드백은 결과물마다 ${FEEDBACK_LIMIT}개까지 남길 수 있어요.`);
      w.feedback.push({
        id: uid(),
        outcomeId: o.id,
        projectId: o.projectId,
        userId: actor,
        body: feedbackBody(c.body),
        createdAt: now,
      });
      break;
    }
    default:
      fail("지원하지 않는 요청이에요.");
  }
  return w;
}
export function visibleWorld(original, actor) {
  const w = withOutcomeDefaults(original);
  const v = structuredClone(w);
  v.applications = w.applications.filter(
    (a) =>
      a.userId === actor ||
      w.projects.some((p) => p.id === a.projectId && p.ownerId === actor),
  );
  v.teamCounts = Object.fromEntries(
    w.projects.map((p) => [
      p.id,
      w.applications.filter(
        (a) => a.projectId === p.id && a.status === "accepted",
      ).length,
    ]),
  );
  v.filledRoles = Object.fromEntries(
    w.projects.map((p) => [
      p.id,
      w.applications
        .filter((a) => a.projectId === p.id && a.status === "accepted")
        .map((a) => a.role),
    ]),
  );
  v.sprints = w.sprints.filter((s) => canJoinSprint(w, s.projectId, actor));
  v.outcomes = w.outcomes.filter((o) => canJoinSprint(w, o.projectId, actor));
  v.feedback = w.feedback.filter((f) => canJoinSprint(w, f.projectId, actor));
  v.bookmarks = { [actor]: w.bookmarks[actor] ?? [] };
  v.reports = [];
  return v;
}
