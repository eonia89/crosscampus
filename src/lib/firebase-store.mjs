import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  runTransaction,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { emptyWorld, reduceWorld, firstSteps } from "./domain.mjs";
const fail = (message) => {
  throw new Error(message);
};
const data = (snap) =>
  snap.exists()
    ? {
        ...snap.data(),
        createdAt: snap.data().createdAt?.toMillis?.() ?? snap.data().createdAt,
      }
    : null;
export const applicationId = (pid, uid) => `${pid}__${uid}`;
export function toProject(p) {
  return {
    ...p,
    deadline: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
    }).format(new Date(p.deadlineAt)),
  };
}
export function createStore(db, uid) {
  const ref = (...p) => doc(db, ...p);
  async function load() {
    const [profiles, projects, mine, incoming, bookmarks] = await Promise.all([
      getDocs(query(collection(db, "profiles"), limit(200))),
      getDocs(query(collection(db, "projects"), limit(100))),
      getDocs(
        query(
          collection(db, "applications"),
          where("userId", "==", uid),
          limit(200),
        ),
      ),
      getDocs(
        query(
          collection(db, "applications"),
          where("ownerId", "==", uid),
          limit(200),
        ),
      ),
      getDocs(collection(db, "users", uid, "bookmarks")),
    ]);
    const w = emptyWorld();
    w.profiles = Object.fromEntries(profiles.docs.map((d) => [d.id, d.data()]));
    w.projects = projects.docs.map((d) => toProject(data(d)));
    w.applications = [
      ...new Map(
        [...mine.docs, ...incoming.docs].map((d) => [d.id, data(d)]),
      ).values(),
    ];
    w.bookmarks = { [uid]: bookmarks.docs.map((d) => d.id) };
    w.teamCounts = Object.fromEntries(
      w.projects.map((p) => [p.id, Object.keys(p.filledRoles).length]),
    );
    w.filledRoles = Object.fromEntries(
      w.projects.map((p) => [p.id, Object.keys(p.filledRoles)]),
    );
    w.sprints = (
      await Promise.all(
        w.projects
          .filter((p) => p.memberIds.includes(uid))
          .map(async (p) => {
            const [s, tasks] = await Promise.all([
              getDoc(ref("sprints", p.id)),
              getDocs(collection(db, "sprints", p.id, "tasks")),
            ]);
            return s.exists()
              ? { ...s.data(), tasks: tasks.docs.map((t) => t.data()) }
              : null;
          }),
      )
    ).filter(Boolean);
    return w;
  }
  async function execute(c) {
    if (c.type === "profile") {
      const w = reduceWorld(emptyWorld(), uid, c);
      await setDoc(ref("profiles", uid), w.profiles[uid]);
    } else if (c.type === "create") {
      const pid = crypto.randomUUID();
      await runTransaction(db, async (tx) => {
        const [profile, count] = await Promise.all([
          tx.get(ref("profiles", uid)),
          tx.get(ref("counters", uid)),
        ]);
        if (!profile.exists()) fail("먼저 내 프로필을 완성해 주세요.");
        const n = count.data()?.count ?? 0;
        if (n >= 20) fail("프로젝트는 20개까지 만들 수 있어요.");
        const w = emptyWorld();
        w.profiles[uid] = profile.data();
        const p = reduceWorld(w, uid, c, Date.now(), () => pid).projects[0];
        const { deadline, ...rest } = p;
        tx.set(ref("projects", pid), {
          ...rest,
          deadlineAt: Date.parse(`${deadline}T23:59:59+09:00`),
          createdAt: serverTimestamp(),
          memberIds: [uid],
          filledRoles: {},
          lastAcceptedUid: "",
        });
        tx.set(ref("counters", uid), { count: n + 1, lastProjectId: pid });
      });
    } else if (c.type === "bookmark") {
      await runTransaction(db, async (tx) => {
        const r = ref("users", uid, "bookmarks", c.projectId);
        const old = await tx.get(r);
        if (old.exists()) tx.delete(r);
        else tx.set(r, { projectId: c.projectId });
      });
    } else if (c.type === "apply") {
      const existing = (
        await getDocs(
          query(
            collection(db, "applications"),
            where("userId", "==", uid),
            limit(200),
          ),
        )
      ).docs.find((a) => a.data().projectId === c.projectId);
      await runTransaction(db, async (tx) => {
        const [p, profile, previous] = await Promise.all([
          tx.get(ref("projects", c.projectId)),
          tx.get(ref("profiles", uid)),
          existing ? tx.get(existing.ref) : Promise.resolve(null),
        ]);
        if (!p.exists()) fail("프로젝트를 찾을 수 없어요.");
        if (p.data().filledRoles[c.role])
          fail("이 역할은 이미 팀원이 합류했어요.");
        const w = emptyWorld();
        w.projects = [toProject(data(p))];
        if (profile.exists()) w.profiles[uid] = profile.data();
        if (previous?.exists()) w.applications = [data(previous)];
        const id = applicationId(c.projectId, uid);
        const a = reduceWorld(w, uid, c, Date.now(), () => id).applications.at(
          -1,
        );
        tx.set(ref("applications", id), {
          ...a,
          ownerId: p.data().ownerId,
          createdAt: serverTimestamp(),
        });
      });
    } else if (c.type === "withdraw") {
      await updateDoc(ref("applications", c.applicationId), {
        status: "withdrawn",
      });
    } else if (c.type === "decide") {
      if (!["accepted", "rejected"].includes(c.decision))
        fail("처리 상태를 선택해 주세요.");
      await runTransaction(db, async (tx) => {
        const [ps, as, ss] = await Promise.all([
          tx.get(ref("projects", c.projectId)),
          tx.get(ref("applications", c.applicationId)),
          tx.get(ref("sprints", c.projectId)),
        ]);
        const p = ps.data(),
          a = as.data();
        if (
          !p ||
          p.ownerId !== uid ||
          !a ||
          a.projectId !== c.projectId ||
          a.status !== "pending"
        )
          fail("처리할 지원서를 찾을 수 없어요.");
        const applicant = await tx.get(ref("profiles", a.userId));
        if (c.decision === "accepted" && p.filledRoles[a.role])
          fail("해당 역할에는 이미 팀원이 있어요.");
        tx.update(as.ref, { status: c.decision });
        if (c.decision === "accepted") {
          tx.update(ps.ref, {
            filledRoles: { ...p.filledRoles, [a.role]: a.userId },
            memberIds: [...p.memberIds, a.userId],
            lastAcceptedUid: a.userId,
          });
          if (!ss.exists()) {
            tx.set(ss.ref, {
              projectId: p.id,
              meeting: "",
              goal: `‘${p.outcome.slice(0, 180)}’의 첫 초안을 함께 만들어요.`,
            });
            for (const [id, title] of [
              ["welcome", "서로의 역할과 이번 주 가능한 시간 나누기"],
              ["scope", "첫 번째 결과물의 범위 정하기"],
            ])
              tx.set(ref("sprints", p.id, "tasks", id), {
                id,
                projectId: p.id,
                title,
                done: false,
                kind: id,
                role: "",
                assigneeId: uid,
              });
          }
          const id = `role-${a.role}`;
          tx.set(ref("sprints", p.id, "tasks", id), {
            id,
            projectId: p.id,
            title: `${applicant.data()?.name ?? "팀원"} · ${firstSteps[a.role]}`,
            done: false,
            kind: "role",
            role: a.role,
            assigneeId: a.userId,
          });
        }
      });
    } else if (c.type === "task") {
      await updateDoc(ref("sprints", c.projectId, "tasks", c.taskId), {
        done: c.done === true,
      });
    } else if (c.type === "kickoff") {
      const goal = typeof c.goal === "string" ? c.goal.trim() : "";
      const meeting = typeof c.meeting === "string" ? c.meeting.trim() : "";
      if (goal.length < 5 || goal.length > 250 || meeting.length > 150)
        fail("목표는 5~250자, 모임 안내는 150자 이내로 입력해 주세요.");
      await updateDoc(ref("sprints", c.projectId), { goal, meeting });
    } else if (c.type === "close") {
      await runTransaction(db, async (tx) => {
        const p = await tx.get(ref("projects", c.projectId));
        if (!p.exists()) fail("프로젝트를 찾을 수 없어요.");
        tx.update(p.ref, {
          status: p.data().status === "open" ? "closed" : "open",
        });
      });
    } else if (c.type === "report") {
      const reason = typeof c.reason === "string" ? c.reason.trim() : "";
      if (reason.length < 5 || reason.length > 500)
        fail("신고 내용은 5~500자로 입력해 주세요.");
      const id = applicationId(c.projectId, uid);
      await setDoc(ref("reports", id), {
        id,
        projectId: c.projectId,
        userId: uid,
        reason,
        createdAt: serverTimestamp(),
      });
    } else fail("지원하지 않는 요청이에요.");
    return load();
  }
  return { load, execute };
}
