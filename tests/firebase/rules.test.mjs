import { readFileSync } from "node:fs";
import { before, beforeEach, after, test } from "node:test";
import assert from "node:assert/strict";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { createStore, applicationId } from "../../src/lib/firebase-store.mjs";
import {
  outcomeSlots as outcomeSlotsForTest,
  outcomeTarget,
} from "../../src/lib/domain.mjs";
let env;
const profile = (uid) => ({
  id: uid,
  name: uid,
  school: "테스트 학교",
  grade: "G10",
  skills: ["디자인", "개발"],
  hours: 3,
  language: "한국어",
  bio: "",
});
const projectInput = () => ({
  title: "학교 간 첫 프로젝트",
  subtitle: "작은 결과물을 함께 만들어요",
  description:
    "학교가 다른 학생들이 첫 주에 간단한 시안을 만들고 서로 확인하는 프로젝트입니다.",
  outcome: "작동하는 첫 번째 화면",
  category: "테크·메이킹",
  roles: ["디자인", "개발"],
  hours: 2,
  weeks: 2,
  mode: "온라인",
  language: "한국어",
  deadline: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
    Date.now() + 86400000 * 7,
  ),
});
const db = (uid) =>
  env
    .authenticatedContext(uid, {
      email: `${uid}@example.com`,
      email_verified: true,
    })
    .firestore();
const store = (uid) => createStore(db(uid), uid);
async function seed(callback) {
  await env.withSecurityRulesDisabled((c) => callback(c.firestore()));
}
async function create() {
  const w = await store("owner").execute({
    type: "create",
    project: projectInput(),
  });
  return w.projects[0].id;
}
async function apply(pid, uid = "alice", role = "디자인") {
  await store(uid).execute({
    type: "apply",
    projectId: pid,
    role,
    note: "첫 주에 작은 화면 시안을 만들어 공유하겠습니다.",
  });
  return applicationId(pid, uid);
}
async function accept(pid, uid = "alice") {
  return store("owner").execute({
    type: "decide",
    projectId: pid,
    applicationId: applicationId(pid, uid),
    decision: "accepted",
  });
}
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-crosscampus",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});
after(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await seed(async (d) => {
    for (const uid of ["owner", "alice", "bob", "outsider"]) {
      await setDoc(doc(d, "access", `${uid}@example.com`), { enabled: true });
      await setDoc(doc(d, "profiles", uid), profile(uid));
    }
  });
});
test("anonymous, uninvited and unverified accounts cannot read real profiles", async () => {
  await assertFails(
    getDocs(collection(env.unauthenticatedContext().firestore(), "profiles")),
  );
  await assertFails(getDocs(collection(db("blocked"), "profiles")));
  await assertFails(
    getDocs(
      collection(
        env
          .authenticatedContext("alice", {
            email: "alice@example.com",
            email_verified: false,
          })
          .firestore(),
        "profiles",
      ),
    ),
  );
  await assertFails(
    setDoc(doc(db("blocked"), "access", "blocked@example.com"), {
      enabled: true,
    }),
  );
});
test("profile writes are owned and schema constrained", async () => {
  await assertSucceeds(
    setDoc(doc(db("alice"), "profiles", "alice"), {
      ...profile("alice"),
      bio: "직접 만든 소개",
    }),
  );
  await assertFails(
    setDoc(doc(db("alice"), "profiles", "bob"), profile("bob")),
  );
  await assertFails(
    setDoc(doc(db("alice"), "profiles", "alice"), {
      ...profile("alice"),
      admin: true,
    }),
  );
  await assertFails(
    setDoc(doc(db("alice"), "profiles", "alice"), {
      ...profile("alice"),
      hours: 99,
    }),
  );
});
test("a project and its bounded counter must be created atomically", async () => {
  const pid = await create();
  assert.equal(
    (await getDoc(doc(db("owner"), "counters", "owner"))).data().count,
    1,
  );
  const p = (await getDoc(doc(db("owner"), "projects", pid))).data();
  await assertFails(
    setDoc(doc(db("owner"), "projects", "forged"), {
      ...p,
      id: "forged",
      createdAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(db("owner"), "counters", "owner"), { count: 0 }),
  );
  await seed((d) =>
    setDoc(doc(d, "counters", "owner"), { count: 20, lastProjectId: pid }),
  );
  await assert.rejects(
    store("owner").execute({ type: "create", project: projectInput() }),
    /20개/,
  );
  const ownerDb = db("owner");
  const b = writeBatch(ownerDb);
  b.set(doc(ownerDb, "projects", "too-many"), {
    ...p,
    id: "too-many",
    createdAt: serverTimestamp(),
  });
  b.set(doc(ownerDb, "counters", "owner"), {
    count: 21,
    lastProjectId: "too-many",
  });
  await assertFails(b.commit());
});
test("application notes are visible only to the applicant and project owner", async () => {
  const pid = await create(),
    aid = await apply(pid);
  await assertSucceeds(getDoc(doc(db("alice"), "applications", aid)));
  await assertSucceeds(getDoc(doc(db("owner"), "applications", aid)));
  await assertFails(getDoc(doc(db("bob"), "applications", aid)));
  await assertFails(getDocs(collection(db("alice"), "applications")));
  assert.equal((await store("bob").load()).applications.length, 0);
});
test("server rules reject forged applicants, owner IDs and invalid notes", async () => {
  const pid = await create();
  const a = {
    id: applicationId(pid, "alice"),
    projectId: pid,
    userId: "alice",
    ownerId: "owner",
    role: "디자인",
    note: "유효한 길이의 지원 내용입니다.",
    status: "pending",
    createdAt: serverTimestamp(),
  };
  await assertFails(setDoc(doc(db("bob"), "applications", a.id), a));
  await assertFails(
    setDoc(doc(db("alice"), "applications", a.id), { ...a, ownerId: "alice" }),
  );
  await assertFails(
    setDoc(doc(db("alice"), "applications", a.id), { ...a, note: "짧음" }),
  );
  await assertFails(
    setDoc(doc(db("alice"), "applications", a.id), { ...a, role: "운영" }),
  );
});
test("closed and expired projects reject applications at the database boundary", async () => {
  const pid = await create();
  await store("owner").execute({ type: "close", projectId: pid });
  const a = {
    id: applicationId(pid, "alice"),
    projectId: pid,
    userId: "alice",
    ownerId: "owner",
    role: "디자인",
    note: "유효한 길이의 지원 내용입니다.",
    status: "pending",
    createdAt: serverTimestamp(),
  };
  await assertFails(setDoc(doc(db("alice"), "applications", a.id), a));
  await seed((d) =>
    updateDoc(doc(d, "projects", pid), {
      status: "open",
      deadlineAt: Date.now() - 1000,
    }),
  );
  await assertFails(setDoc(doc(db("alice"), "applications", a.id), a));
});
test("duplicate pending applications fail; withdrawn and rejected applications can reapply", async () => {
  const pid = await create(),
    aid = await apply(pid);
  await assert.rejects(apply(pid), /이미 지원/);
  await store("alice").execute({ type: "withdraw", applicationId: aid });
  await apply(pid);
  await store("owner").execute({
    type: "decide",
    projectId: pid,
    applicationId: aid,
    decision: "rejected",
  });
  await apply(pid);
  assert.equal(
    (await getDoc(doc(db("alice"), "applications", aid))).data().status,
    "pending",
  );
});
test("acceptance atomically creates membership and first-week tasks", async () => {
  const pid = await create(),
    aid = await apply(pid);
  await assertFails(
    updateDoc(doc(db("alice"), "applications", aid), { status: "accepted" }),
  );
  await assertFails(
    updateDoc(doc(db("owner"), "applications", aid), { status: "accepted" }),
  );
  const w = await accept(pid);
  assert.equal(w.sprints[0].tasks.length, 3);
  assert.equal(w.filledRoles[pid][0], "디자인");
  const a = await store("alice").load();
  assert.equal(a.sprints.length, 1);
  assert.ok(a.sprints[0].tasks.some((t) => t.title.includes("시안 2개")));
});
test("simultaneous acceptance for one role admits exactly one teammate", async () => {
  const pid = await create();
  await apply(pid, "alice");
  await apply(pid, "bob");
  const results = await Promise.allSettled([
    accept(pid, "alice"),
    accept(pid, "bob"),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const p = (await getDoc(doc(db("owner"), "projects", pid))).data();
  assert.equal(p.memberIds.length, 2);
  assert.equal(Object.keys(p.filledRoles).length, 1);
});
test("leaders cannot forge membership without an accepted application", async () => {
  const pid = await create();
  await apply(pid);
  await accept(pid);
  await assertFails(
    updateDoc(doc(db("owner"), "projects", pid), {
      memberIds: ["owner", "alice", "outsider"],
      filledRoles: { 디자인: "alice", 개발: "outsider" },
      lastAcceptedUid: "outsider",
    }),
  );
  await assertFails(
    updateDoc(doc(db("alice"), "projects", pid), { ownerId: "alice" }),
  );
});
test("only team members can read or change the sprint; task text cannot be replaced", async () => {
  const pid = await create();
  await apply(pid);
  await accept(pid);
  await assertFails(getDoc(doc(db("outsider"), "sprints", pid)));
  await assertFails(
    getDocs(collection(db("outsider"), "sprints", pid, "tasks")),
  );
  await assertFails(
    store("outsider").execute({
      type: "kickoff",
      projectId: pid,
      goal: "권한 없는 변경",
      meeting: "",
    }),
  );
  await store("alice").execute({
    type: "kickoff",
    projectId: pid,
    goal: "첫 번째 화면 시안 완성하기",
    meeting: "금요일 온라인",
  });
  await store("alice").execute({
    type: "task",
    projectId: pid,
    taskId: "welcome",
    done: true,
  });
  assert.equal(
    (await getDoc(doc(db("alice"), "sprints", pid, "tasks", "welcome"))).data()
      .done,
    true,
  );
  await assertFails(
    updateDoc(doc(db("alice"), "sprints", pid, "tasks", "welcome"), {
      title: "다른 내용으로 바꾼 작업",
    }),
  );
  await assertFails(updateDoc(doc(db("alice"), "sprints", pid), { goal: "x" }));
});
test("each accepted role adds one task and preserves existing sprint work", async () => {
  const pid = await create();
  await apply(pid);
  await accept(pid);
  await store("alice").execute({
    type: "task",
    projectId: pid,
    taskId: "welcome",
    done: true,
  });
  await apply(pid, "bob", "개발");
  const w = await accept(pid, "bob");
  assert.equal(w.sprints[0].tasks.length, 4);
  assert.equal(w.sprints[0].tasks.find((t) => t.id === "welcome").done, true);
});
test("bookmarks remain private and reports cannot be read or duplicated", async () => {
  const pid = await create();
  await store("alice").execute({ type: "bookmark", projectId: pid });
  await assertFails(
    getDocs(collection(db("bob"), "users", "alice", "bookmarks")),
  );
  await store("alice").execute({
    type: "report",
    projectId: pid,
    reason: "테스트 신고 내용입니다.",
  });
  await assertFails(
    getDoc(doc(db("alice"), "reports", applicationId(pid, "alice"))),
  );
  await assertFails(
    store("alice").execute({
      type: "report",
      projectId: pid,
      reason: "중복 신고를 검사합니다.",
    }),
  );
});
test("revoked access blocks subsequent reads and writes", async () => {
  await seed((d) => deleteDoc(doc(d, "access", "alice@example.com")));
  await assertFails(
    setDoc(doc(db("alice"), "profiles", "alice"), profile("alice")),
  );
  await assertFails(getDocs(collection(db("alice"), "projects")));
});

const outcomeInput = {
  title: "첫 화면 시안",
  url: "https://www.figma.com/file/crosscampus-first-screen",
  contribution: "첫 화면 레이아웃 두 가지와 색 조합을 만들었어요.",
  reflection: "버튼이 너무 많아서 다음 버전에서는 하나로 줄여볼게요.",
};
const outcomeRef = (uid, pid, oid = "o01") =>
  doc(db(uid), "sprints", pid, "outcomes", oid);
const rawOutcome = (pid, uid, oid = "o01", extra = {}) => ({
  id: oid,
  projectId: pid,
  userId: uid,
  ...outcomeInput,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  feedback: {},
  lastFeedbackId: "",
  ...extra,
});
async function teamWithMembers() {
  const pid = await create();
  await apply(pid, "alice", "디자인");
  await accept(pid, "alice");
  await apply(pid, "bob", "개발");
  await accept(pid, "bob");
  return pid;
}
async function postOutcome(uid, pid, extra = {}) {
  const w = await store(uid).execute({
    type: "outcome.create",
    projectId: pid,
    outcome: { ...outcomeInput, ...extra },
  });
  return w.outcomes.find((o) => o.userId === uid && o.projectId === pid);
}
const comment = (
  uid,
  pid,
  oid,
  body = "색 조합이 좋아요. 글자만 조금 키워봐요.",
) =>
  store(uid).execute({
    type: "feedback.create",
    projectId: pid,
    outcomeId: oid,
    body,
  });
test("leader shares an outcome; accepted member sees it after reload and comments", async () => {
  const pid = await create();
  await apply(pid);
  await accept(pid);
  const o = await postOutcome("owner", pid);
  assert.equal(o.id, "o01");
  assert.equal(typeof o.createdAt, "number");
  const seen = await store("alice").load();
  assert.equal(seen.outcomes.length, 1);
  assert.equal(seen.outcomes[0].title, outcomeInput.title);
  await comment("alice", pid, o.id);
  const again = await store("owner").load();
  assert.equal(again.feedback.length, 1);
  assert.equal(again.feedback[0].userId, "alice");
  assert.equal(again.feedback[0].outcomeId, o.id);
  assert.equal(typeof again.feedback[0].createdAt, "number");
});
test("outsiders and pending applicants cannot read or write outcomes, even directly", async () => {
  const pid = await create();
  await apply(pid, "alice");
  await accept(pid, "alice");
  await apply(pid, "bob", "개발"); // bob stays pending
  await postOutcome("alice", pid);
  for (const uid of ["outsider", "bob"]) {
    await assertFails(getDoc(outcomeRef(uid, pid)));
    await assertFails(getDocs(collection(db(uid), "sprints", pid, "outcomes")));
    await assertFails(
      setDoc(outcomeRef(uid, pid, "o02"), rawOutcome(pid, uid, "o02")),
    );
    await assertFails(
      updateDoc(outcomeRef(uid, pid), {
        "feedback.abcdef123456": {
          id: "abcdef123456",
          userId: uid,
          body: "팀 밖에서 남기는 피드백",
          createdAt: serverTimestamp(),
        },
        lastFeedbackId: "abcdef123456",
      }),
    );
    await assertFails(deleteDoc(outcomeRef(uid, pid)));
    assert.equal((await store(uid).load()).outcomes.length, 0);
  }
  await seed((d) => deleteDoc(doc(d, "access", "alice@example.com")));
  await assertFails(getDoc(outcomeRef("alice", pid)));
});
test("authors edit and delete their own outcome; teammates cannot", async () => {
  const pid = await teamWithMembers();
  const o = await postOutcome("alice", pid);
  await store("alice").execute({
    type: "outcome.update",
    projectId: pid,
    outcomeId: o.id,
    outcome: { ...outcomeInput, title: "첫 화면 시안 v2" },
  });
  const ref = outcomeRef("alice", pid, o.id);
  const after = (await getDoc(ref)).data();
  assert.equal(after.title, "첫 화면 시안 v2");
  assert.ok(after.updatedAt.toMillis() >= after.createdAt.toMillis());
  for (const uid of ["bob", "owner"]) {
    await assertFails(
      updateDoc(outcomeRef(uid, pid, o.id), {
        title: "다른 사람이 바꾼 제목",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(deleteDoc(outcomeRef(uid, pid, o.id)));
    await assert.rejects(
      store(uid).execute({
        type: "outcome.delete",
        projectId: pid,
        outcomeId: o.id,
      }),
      /내가 남긴/,
    );
  }
  await store("alice").execute({
    type: "outcome.delete",
    projectId: pid,
    outcomeId: o.id,
  });
  assert.equal((await getDoc(ref)).exists(), false);
});
test("forged outcome fields and unsafe links are rejected by Rules", async () => {
  const pid = await teamWithMembers();
  const ref = outcomeRef("alice", pid, "o01");
  const forged = [
    { userId: "bob" },
    { projectId: "another-project" },
    { id: "o02" },
    { createdAt: Timestamp.fromMillis(1) },
    { updatedAt: Timestamp.fromMillis(1) },
    { feedback: { x: { id: "x", userId: "bob", body: "미리 넣은 피드백" } } },
    { lastFeedbackId: "x" },
    { admin: true },
    { title: "x" },
    { reflection: "짧음" },
  ];
  for (const extra of forged)
    await assertFails(setDoc(ref, rawOutcome(pid, "alice", "o01", extra)));
  for (const url of [
    "javascript:alert(1)",
    "http://example.com/work",
    "https://user:pw@example.com/",
    "https://user@example.com/",
    "https://localhost:5173/",
    "https://demo.localhost/",
    "https://127.0.0.1/",
    "https://[::1]/",
    "https://intranet/",
    "https://example.com/has space",
    "https://example.com\\@evil.com/",
    `https://example.com/${"a".repeat(2048)}`,
  ])
    await assertFails(setDoc(ref, rawOutcome(pid, "alice", "o01", { url })));
  await assertFails(
    setDoc(
      outcomeRef("alice", pid, "custom-id"),
      rawOutcome(pid, "alice", "custom-id"),
    ),
  );
  await assertFails(
    setDoc(outcomeRef("alice", pid, "o21"), rawOutcome(pid, "alice", "o21")),
  );
  await assertSucceeds(setDoc(ref, rawOutcome(pid, "alice")));
  // Immutable creator, project and timestamps on later edits.
  for (const change of [
    { userId: "bob" },
    { projectId: "another-project" },
    { createdAt: serverTimestamp() },
    { title: "새 제목입니다", updatedAt: Timestamp.fromMillis(1) },
    { url: "http://example.com/", updatedAt: serverTimestamp() },
  ])
    await assertFails(updateDoc(ref, change));
});
test("feedback is append-only, bound to the caller and cannot be rewritten", async () => {
  const pid = await teamWithMembers();
  const o = await postOutcome("alice", pid);
  await comment("bob", pid, o.id);
  const ref = outcomeRef("bob", pid, o.id);
  const [fid] = Object.keys((await getDoc(ref)).data().feedback);
  const entry = (id, extra = {}) => ({
    id,
    userId: "bob",
    body: "또 다른 피드백이에요.",
    createdAt: serverTimestamp(),
    ...extra,
  });
  // Rewriting or removing an existing note, posting as someone else, or
  // smuggling extra entries / fields is rejected.
  await assertFails(
    updateDoc(ref, {
      [`feedback.${fid}`]: entry(fid, { body: "바뀐 피드백입니다." }),
      lastFeedbackId: fid,
    }),
  );
  await assertFails(updateDoc(ref, { feedback: {}, lastFeedbackId: "" }));
  await assertFails(
    updateDoc(ref, {
      "feedback.forged000001": entry("forged000001", { userId: "alice" }),
      lastFeedbackId: "forged000001",
    }),
  );
  await assertFails(
    updateDoc(ref, {
      "feedback.forged000002": entry("forged000002", {
        createdAt: Timestamp.fromMillis(1),
      }),
      lastFeedbackId: "forged000002",
    }),
  );
  await assertFails(
    updateDoc(ref, {
      "feedback.forged000003": entry("forged000003"),
      "feedback.forged000004": entry("forged000004"),
      lastFeedbackId: "forged000004",
    }),
  );
  await assertFails(
    updateDoc(ref, {
      "feedback.forged000005": entry("forged000005", { score: 5 }),
      lastFeedbackId: "forged000005",
    }),
  );
  await assertFails(
    updateDoc(ref, {
      "feedback.forged000006": entry("forged000006", { body: "짧음" }),
      lastFeedbackId: "forged000006",
    }),
  );
  await assertFails(
    updateDoc(ref, {
      "feedback.forged000007": entry("forged000007"),
      lastFeedbackId: "forged000007",
      title: "피드백과 함께 바꾼 제목",
    }),
  );
  await assertSucceeds(
    updateDoc(ref, {
      "feedback.valid0000001": entry("valid0000001"),
      lastFeedbackId: "valid0000001",
    }),
  );
});
test("deleting an outcome removes its feedback with it, leaving nothing readable", async () => {
  const pid = await teamWithMembers();
  const o = await postOutcome("alice", pid);
  await comment("bob", pid, o.id);
  await comment("owner", pid, o.id);
  assert.equal((await store("alice").load()).feedback.length, 2);
  await store("alice").execute({
    type: "outcome.delete",
    projectId: pid,
    outcomeId: o.id,
  });
  const w = await store("bob").load();
  assert.equal(w.outcomes.length, 0);
  assert.equal(w.feedback.length, 0);
  // The freed slot starts clean, and a stale comment aimed at the deleted
  // outcome does not land on the new one.
  const next = await postOutcome("bob", pid);
  assert.equal(next.id, o.id);
  await assert.rejects(
    store("owner").execute({
      type: "feedback.create",
      projectId: pid,
      outcomeId: o.id,
      outcomeCreatedAt: o.createdAt,
      body: "삭제된 결과물에 남기려던 피드백",
    }),
    /새로고침/,
  );
  assert.equal((await store("owner").load()).feedback.length, 0);
});
test("concurrent creates never exceed 20 outcomes; feedback stops at 20 per outcome", async () => {
  const pid = await teamWithMembers();
  await seed(async (d) => {
    for (const oid of outcomeSlotsForTest.slice(0, 17))
      await setDoc(
        doc(d, "sprints", pid, "outcomes", oid),
        rawOutcome(pid, "owner", oid),
      );
  });
  const results = await Promise.allSettled(
    ["alice", "bob", "owner", "alice", "bob"].map((uid) =>
      postOutcome(uid, pid),
    ),
  );
  const created = results.filter((r) => r.status === "fulfilled").length;
  assert.ok(created >= 1 && created <= 3);
  const outcomes = () =>
    getDocs(collection(db("alice"), "sprints", pid, "outcomes"));
  assert.equal((await outcomes()).size, 17 + created);
  while ((await outcomes()).size < 20) await postOutcome("owner", pid);
  await assert.rejects(postOutcome("alice", pid), /20개/);
  assert.equal((await outcomes()).size, 20);

  const feedback = Object.fromEntries(
    Array.from({ length: 18 }, (_, i) => {
      const id = `seeded${String(i).padStart(4, "0")}`;
      return [
        id,
        {
          id,
          userId: "owner",
          body: "미리 남긴 피드백",
          createdAt: serverTimestamp(),
        },
      ];
    }),
  );
  await seed((d) =>
    updateDoc(doc(d, "sprints", pid, "outcomes", "o01"), { feedback }),
  );
  const notes = await Promise.allSettled(
    ["alice", "bob", "owner", "alice"].map((uid) => comment(uid, pid, "o01")),
  );
  const added = notes.filter((r) => r.status === "fulfilled").length;
  assert.ok(added >= 1 && added <= 2);
  const count = async () =>
    Object.keys((await getDoc(outcomeRef("alice", pid, "o01"))).data().feedback)
      .length;
  assert.equal(await count(), 18 + added);
  while ((await count()) < 20) await comment("bob", pid, "o01");
  await assert.rejects(comment("alice", pid, "o01"), /20개/);
  await assertFails(
    updateDoc(outcomeRef("bob", pid, "o01"), {
      "feedback.extra0000021": {
        id: "extra0000021",
        userId: "bob",
        body: "스물한 번째 피드백",
        createdAt: serverTimestamp(),
      },
      lastFeedbackId: "extra0000021",
    }),
  );
  assert.equal(await count(), 20);
});
test("deletion racing with new feedback never leaves orphaned notes", async () => {
  const pid = await teamWithMembers();
  const o = await postOutcome("alice", pid);
  await Promise.allSettled([
    store("alice").execute({
      type: "outcome.delete",
      projectId: pid,
      outcomeId: o.id,
    }),
    comment("bob", pid, o.id),
    comment("owner", pid, o.id),
  ]);
  const snap = await getDoc(outcomeRef("alice", pid, o.id));
  assert.equal(snap.exists(), false);
  const w = await store("bob").load();
  assert.equal(w.feedback.length, 0);
});

// Regression cases from the maintainer review (2026-11-06): slot IDs are
// reused, so a stale edit/delete for a deleted outcome must not touch the
// replacement that now occupies the same slot.
async function replaceInSameSlot(pid) {
  const old = await postOutcome("alice", pid);
  await store("alice").execute({
    type: "outcome.delete",
    ...outcomeTarget(old),
  });
  const replacement = await postOutcome("alice", pid, {
    title: "Replacement result",
  });
  assert.equal(replacement.id, old.id);
  assert.notEqual(replacement.createdAt, old.createdAt);
  await comment("bob", pid, replacement.id);
  return { old, replacement };
}
for (const operation of ["update", "delete"]) {
  test(`review: stale ${operation} must not affect a replacement in a reused slot`, async () => {
    const pid = await teamWithMembers();
    const { old, replacement } = await replaceInSameSlot(pid);
    await assert.rejects(
      store("alice").execute({
        type: `outcome.${operation}`,
        projectId: pid,
        outcomeId: old.id,
        outcomeCreatedAt: old.createdAt,
        ...(operation === "update"
          ? { outcome: { ...outcomeInput, title: "Stale edit from old tab" } }
          : {}),
      }),
      /새로고침/,
    );
    const actual = await getDoc(outcomeRef("alice", pid, replacement.id));
    assert.equal(actual.exists(), true);
    assert.equal(actual.data().title, "Replacement result");
    assert.equal(actual.data().contribution, outcomeInput.contribution);
    assert.equal(Object.keys(actual.data().feedback).length, 1);
  });
}
test("review: a refreshed view can still edit and delete the replacement", async () => {
  const pid = await teamWithMembers();
  const { replacement } = await replaceInSameSlot(pid);
  const fresh = (await store("alice").load()).outcomes.find(
    (o) => o.id === replacement.id,
  );
  assert.equal(fresh.createdAt, replacement.createdAt);
  await store("alice").execute({
    type: "outcome.update",
    ...outcomeTarget(fresh),
    outcome: { ...outcomeInput, title: "Edited after refresh" },
  });
  assert.equal(
    (await getDoc(outcomeRef("alice", pid, fresh.id))).data().title,
    "Edited after refresh",
  );
  await store("alice").execute({
    type: "outcome.delete",
    ...outcomeTarget(fresh),
  });
  assert.equal(
    (await getDoc(outcomeRef("alice", pid, fresh.id))).exists(),
    false,
  );
});
