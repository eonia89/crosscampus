import test from "node:test";
import assert from "node:assert/strict";
import {
  makeDemoWorld,
  emptyWorld,
  reduceWorld,
  visibleWorld,
  getMatch,
  DomainError,
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
