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
} from "firebase/firestore";
import { createStore, applicationId } from "../../src/lib/firebase-store.mjs";
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
