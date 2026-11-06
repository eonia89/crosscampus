import test from "node:test";
import assert from "node:assert/strict";
import {
  makeDemoWorld,
  emptyWorld,
  reduceWorld,
  visibleWorld,
  getMatch,
  DomainError,
  safeResultUrl,
} from "../src/lib/domain.mjs";
const now = Date.parse("2026-11-05T02:00:00+09:00");
const world = () => makeDemoWorld(now);
let counter = 0;
const act = (w, actor, c) =>
  reduceWorld(w, actor, c, now, () => `test-${++counter}`);
const application = {
  type: "apply",
  projectId: "ocean",
  role: "디자인",
  note: "첫 주에 포스터 시안을 두 개 만들어서 팀과 이야기하고 싶어요.",
};
const profile = {
  name: "Alex",
  school: "Test School",
  grade: "G10",
  skills: ["기획"],
  hours: 2,
  language: "한국어",
  bio: "",
};
const project = {
  title: "새로운 학교 라디오",
  subtitle: "학생들의 이야기를 나누는 라디오",
  description: "다른 학교 학생을 인터뷰해서 첫 주에 짧은 오디오를 만들어요.",
  outcome: "10분 인터뷰 오디오 1편",
  category: "미디어·창작",
  roles: ["영상"],
  hours: 2,
  weeks: 2,
  mode: "온라인",
  language: "한국어",
  deadline: "2026-11-20",
};
function accepted() {
  let w = act(world(), "demo-jin", application);
  const a = w.applications.find((a) => a.userId === "demo-jin");
  w = act(w, "demo-mina", {
    type: "decide",
    projectId: "ocean",
    applicationId: a.id,
    decision: "accepted",
  });
  return w;
}
test("demo data explicitly marks fictional projects and schools", () => {
  const w = world();
  assert.equal(w.projects.length, 6);
  assert.ok(w.projects.every((p) => p.sample));
  assert.ok(Object.values(w.profiles).every((p) => p.school.includes("예시")));
});
test("new project requires a profile and validates required roles", () => {
  assert.throws(
    () => act(emptyWorld(), "new", { type: "create", project }),
    /프로필/,
  );
  let w = act(emptyWorld(), "new", { type: "profile", profile });
  assert.throws(
    () => act(w, "new", { type: "create", project: { ...project, roles: [] } }),
    /역할/,
  );
  w = act(w, "new", { type: "create", project });
  assert.equal(w.projects[0].ownerId, "new");
  assert.equal(w.projects[0].sample, false);
});
test("invalid deadline and unbounded data are rejected", () => {
  const w = act(emptyWorld(), "new", { type: "profile", profile });
  for (const deadline of ["2020-01-01", "bad-date"])
    assert.throws(
      () =>
        act(w, "new", { type: "create", project: { ...project, deadline } }),
      /마감일/,
    );
  assert.throws(
    () =>
      act(w, "new", {
        type: "create",
        project: { ...project, title: "a".repeat(71) },
      }),
    /프로젝트 이름/,
  );
});
test("application is immutable, role-specific and cannot be duplicated", () => {
  const original = world();
  const w = act(original, "demo-jin", application);
  assert.equal(original.applications.length, 1);
  assert.equal(w.applications.length, 2);
  assert.throws(() => act(w, "demo-jin", application), /이미 지원/);
  assert.throws(
    () => act(world(), "demo-jin", { ...application, role: "개발" }),
    /역할/,
  );
});
test("leaders cannot apply to own projects, closed and expired projects reject", () => {
  assert.throws(() => act(world(), "demo-mina", application), /내 프로젝트/);
  const closed = act(world(), "demo-mina", {
    type: "close",
    projectId: "ocean",
  });
  assert.throws(() => act(closed, "demo-jin", application), /마감/);
  const expired = world();
  expired.projects[0].deadline = "2020-01-01";
  assert.throws(() => act(expired, "demo-jin", application), /마감/);
});
test("only owner can decide or close", () => {
  assert.throws(
    () =>
      act(world(), "demo-jin", {
        type: "decide",
        projectId: "ocean",
        applicationId: "sample-application",
        decision: "accepted",
      }),
    (e) => e.status === 403,
  );
  assert.throws(
    () => act(world(), "demo-jin", { type: "close", projectId: "ocean" }),
    (e) => e.status === 403,
  );
});
test("acceptance opens first sprint; a filled role cannot be accepted twice", () => {
  let w = accepted();
  assert.equal(w.sprints.length, 1);
  w = act(w, "demo-mina", {
    type: "decide",
    projectId: "ocean",
    applicationId: "sample-application",
    decision: "accepted",
  });
  assert.equal(w.sprints.length, 1);
  const extra = {
    id: "extra",
    projectId: "ocean",
    userId: "another",
    role: "디자인",
    note: "eligible",
    status: "pending",
  };
  w.applications.push(extra);
  assert.throws(
    () =>
      act(w, "demo-mina", {
        type: "decide",
        projectId: "ocean",
        applicationId: "extra",
        decision: "accepted",
      }),
    /이미 팀원/,
  );
});
test("only team members can read or mutate a sprint", () => {
  let w = accepted();
  const c = {
    type: "task",
    projectId: "ocean",
    taskId: w.sprints[0].tasks[0].id,
    done: true,
  };
  assert.throws(
    () => act(w, "demo-yuri", c),
    (e) => e.status === 403,
  );
  assert.equal(visibleWorld(w, "demo-yuri").sprints.length, 0);
  w = act(w, "demo-jin", c);
  assert.equal(w.sprints[0].tasks[0].done, true);
  assert.equal(visibleWorld(w, "demo-mina").sprints.length, 1);
});
test("applicant can withdraw and reapply without duplication", () => {
  let w = act(world(), "demo-jin", application);
  const id = w.applications.find((a) => a.userId === "demo-jin").id;
  assert.throws(
    () => act(w, "demo-yuri", { type: "withdraw", applicationId: id }),
    /대기/,
  );
  w = act(w, "demo-jin", { type: "withdraw", applicationId: id });
  w = act(w, "demo-jin", application);
  assert.equal(
    w.applications.filter(
      (a) => a.userId === "demo-jin" && a.status === "pending",
    ).length,
    1,
  );
});
test("applicant cannot withdraw after joining", () => {
  const w = accepted();
  const id = w.applications.find((a) => a.userId === "demo-jin").id;
  assert.throws(
    () => act(w, "demo-jin", { type: "withdraw", applicationId: id }),
    /대기/,
  );
});
test("private application notes, bookmarks and reports are not exposed", () => {
  let w = act(world(), "demo-jin", application);
  w = act(w, "demo-mina", { type: "bookmark", projectId: "repair" });
  w = act(w, "demo-mina", {
    type: "report",
    projectId: "repair",
    reason: "테스트 신고입니다.",
  });
  const visible = visibleWorld(w, "demo-yuri");
  assert.equal(
    visible.applications.some((a) => a.userId === "demo-jin"),
    false,
  );
  assert.equal(visible.bookmarks["demo-mina"], undefined);
  assert.deepEqual(visible.reports, []);
});
test("filled roles are visible without disclosing private applications", () => {
  const v = visibleWorld(accepted(), "demo-yuri");
  assert.deepEqual(v.filledRoles.ocean, ["디자인"]);
  assert.equal(v.teamCounts.ocean, 1);
});
test("matching explains skills and availability instead of fabricating AI certainty", () => {
  const w = world();
  const match = getMatch(w.projects[0], w.profiles["demo-jin"]);
  assert.ok(match.reasons.includes("디자인 역할을 찾고 있어요"));
  assert.ok(match.reasons.includes("주 3시간으로 시작할 수 있어요"));
  assert.equal(match.score, 9);
});
test("unknown commands and anonymous writes are rejected", () => {
  assert.throws(
    () => act(world(), null, application),
    (e) => e.status === 401,
  );
  assert.throws(
    () => act(world(), "demo-jin", { type: "impersonate" }),
    DomainError,
  );
});
test("reports are recorded only once per user and project", () => {
  let w = act(world(), "demo-jin", {
    type: "report",
    projectId: "repair",
    reason: "테스트 신고를 기록합니다.",
  });
  assert.equal(w.reports.length, 1);
  assert.throws(
    () =>
      act(w, "demo-jin", {
        type: "report",
        projectId: "repair",
        reason: "다시 신고합니다.",
      }),
    /이미 신고/,
  );
});
test("accepted teammates get role-specific small first steps", () => {
  const w = accepted();
  assert.ok(
    w.sprints[0].tasks.some(
      (t) => t.title.includes("Jin") && t.title.includes("시안 2개"),
    ),
  );
  assert.ok(w.sprints[0].goal.includes(w.projects[0].outcome));
});
test("nonexistent calendar dates are rejected even if they parse", () => {
  const w = act(emptyWorld(), "new", { type: "profile", profile });
  assert.throws(
    () =>
      act(w, "new", {
        type: "create",
        project: { ...project, deadline: "2027-02-31" },
      }),
    /마감일/,
  );
});

const outcome = {
  title: "30초 테스트 영상",
  url: "https://drive.google.com/file/d/demo-test-clip",
  contribution: "해변 장면 촬영과 첫 컷 편집을 맡았어요.",
  reflection: "바람 소리가 커서 다음에는 마이크 위치를 바꿔볼게요.",
};
const createOutcome = (w, actor = "demo-mina", extra = {}) =>
  act(w, actor, {
    type: "outcome.create",
    projectId: "ocean",
    outcome: { ...outcome, ...extra },
  });
test("leader records an outcome; accepted member reads it and leaves feedback", () => {
  let w = createOutcome(accepted());
  const o = w.outcomes[0];
  assert.equal(o.userId, "demo-mina");
  assert.equal(o.projectId, "ocean");
  assert.equal(o.createdAt, now);
  assert.equal(visibleWorld(w, "demo-jin").outcomes.length, 1);
  w = act(w, "demo-jin", {
    type: "feedback.create",
    projectId: "ocean",
    outcomeId: o.id,
    body: "색감이 좋아요. 마지막 장면을 조금 더 길게!",
  });
  assert.equal(w.feedback.length, 1);
  assert.equal(w.feedback[0].userId, "demo-jin");
  assert.equal(w.feedback[0].outcomeId, o.id);
});
test("only the author edits or deletes; deletion removes its feedback", () => {
  let w = createOutcome(accepted(), "demo-jin");
  const id = w.outcomes[0].id;
  w = act(w, "demo-mina", {
    type: "feedback.create",
    projectId: "ocean",
    outcomeId: id,
    body: "다음 주에 소리만 보완해 봐요.",
  });
  for (const type of ["outcome.update", "outcome.delete"])
    assert.throws(
      () =>
        act(w, "demo-mina", {
          type,
          projectId: "ocean",
          outcomeId: id,
          outcome: { ...outcome, title: "리더가 바꾼 제목" },
        }),
      (e) => e.status === 403,
    );
  const later = reduceWorld(
    w,
    "demo-jin",
    {
      type: "outcome.update",
      projectId: "ocean",
      outcomeId: id,
      outcome: { ...outcome, title: "60초 테스트 영상" },
    },
    now + 1000,
  );
  assert.equal(later.outcomes[0].title, "60초 테스트 영상");
  assert.equal(later.outcomes[0].createdAt, now);
  assert.equal(later.outcomes[0].updatedAt, now + 1000);
  const removed = act(later, "demo-jin", {
    type: "outcome.delete",
    projectId: "ocean",
    outcomeId: id,
  });
  assert.equal(removed.outcomes.length, 0);
  assert.equal(removed.feedback.length, 0);
  assert.equal(later.feedback.length, 1, "input world is not mutated");
});
test("pending applicants and outsiders cannot read or write team outcomes", () => {
  let w = createOutcome(accepted());
  const id = w.outcomes[0].id;
  // demo-yuri has a pending application to ocean; nobody else is on the team.
  for (const actor of ["demo-yuri", "stranger"]) {
    assert.equal(visibleWorld(w, actor).outcomes.length, 0);
    assert.equal(visibleWorld(w, actor).feedback.length, 0);
    assert.throws(
      () => createOutcome(w, actor),
      (e) => e.status === 403,
    );
    assert.throws(
      () =>
        act(w, actor, {
          type: "feedback.create",
          projectId: "ocean",
          outcomeId: id,
          body: "밖에서 남긴 피드백",
        }),
      (e) => e.status === 403,
    );
  }
  assert.throws(
    () =>
      act(world(), "demo-mina", {
        type: "outcome.create",
        projectId: "ocean",
        outcome,
      }),
    /실행 보드/,
  );
});
test("result links must be public HTTPS without credentials or loopback hosts", () => {
  for (const url of [
    "javascript:alert(1)",
    "http://example.com/work",
    "https://user:pw@example.com/",
    "https://localhost:5173/",
    "https://demo.localhost/",
    "https://127.0.0.1/",
    "https://[::1]/",
    "https://0x7f.0.0.1/",
    "data:text/html,hi",
    "not a link",
    `https://example.com/${"a".repeat(2050)}`,
  ])
    assert.throws(() => safeResultUrl(url), /결과물 링크/, url);
  assert.equal(
    safeResultUrl(" HTTPS://Example.com/영상 "),
    "https://example.com/%EC%98%81%EC%83%81",
  );
  assert.throws(() => createOutcome(accepted(), "demo-mina", { title: "x" }));
  assert.throws(() =>
    createOutcome(accepted(), "demo-mina", { reflection: "짧음" }),
  );
});
test("forged author, project and timestamp fields are ignored", () => {
  const w = act(accepted(), "demo-jin", {
    type: "outcome.create",
    projectId: "ocean",
    outcome: {
      ...outcome,
      userId: "demo-mina",
      projectId: "repair",
      createdAt: 1,
      id: "forged",
    },
  });
  const o = w.outcomes[0];
  assert.equal(o.userId, "demo-jin");
  assert.equal(o.projectId, "ocean");
  assert.equal(o.createdAt, now);
  assert.notEqual(o.id, "forged");
});
test("teams are limited to 20 outcomes and each outcome to 20 feedback notes", () => {
  let w = accepted();
  for (let i = 0; i < 20; i++) w = createOutcome(w);
  assert.throws(() => createOutcome(w), /20개/);
  const id = w.outcomes[0].id;
  for (let i = 0; i < 20; i++)
    w = act(w, "demo-jin", {
      type: "feedback.create",
      projectId: "ocean",
      outcomeId: id,
      body: `피드백 ${i + 1}번이에요.`,
    });
  assert.throws(
    () =>
      act(w, "demo-jin", {
        type: "feedback.create",
        projectId: "ocean",
        outcomeId: id,
        body: "스물한 번째 피드백",
      }),
    /20개/,
  );
});
test("older demo payloads without outcome arrays still load and accept outcomes", () => {
  const old = accepted();
  delete old.outcomes;
  delete old.feedback;
  const v = visibleWorld(old, "demo-jin");
  assert.deepEqual(v.outcomes, []);
  assert.deepEqual(v.feedback, []);
  const w = createOutcome(old);
  assert.equal(w.outcomes.length, 1);
  assert.equal(w.sprints.length, old.sprints.length);
  assert.equal(w.applications.length, old.applications.length);
});
