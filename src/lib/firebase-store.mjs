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
import {
  emptyWorld,
  reduceWorld,
  firstSteps,
  outcomeFields,
  feedbackBody,
  outcomeSlots,
  FEEDBACK_LIMIT,
  OUTCOME_LIMIT,
  isExpectedOutcome,
  STALE_OUTCOME_MESSAGE,
} from "./domain.mjs";
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
const millis = (t) => t?.toMillis?.() ?? t;
// A live outcome document holds its feedback as a map. Flatten it into the
// demo-compatible view model: world.outcomes and world.feedback arrays.
export function splitOutcome(d) {
  const { feedback = {}, lastFeedbackId, ...o } = d;
  return {
    outcome: {
      ...o,
      createdAt: millis(o.createdAt),
      updatedAt: millis(o.updatedAt),
    },
    feedback: Object.values(feedback)
      .map((f) => ({
        ...f,
        outcomeId: o.id,
        projectId: o.projectId,
        createdAt: millis(f.createdAt),
      }))
      .sort((a, b) => a.createdAt - b.createdAt),
  };
}
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
    const teams = (
      await Promise.all(
        w.projects
          .filter((p) => p.memberIds.includes(uid))
          .map(async (p) => {
            const [s, tasks, outcomes] = await Promise.all([
              getDoc(ref("sprints", p.id)),
              getDocs(collection(db, "sprints", p.id, "tasks")),
              getDocs(
                query(
                  collection(db, "sprints", p.id, "outcomes"),
                  limit(OUTCOME_LIMIT),
                ),
              ),
            ]);
            return s.exists()
              ? {
                  sprint: {
                    ...s.data(),
                    tasks: tasks.docs.map((t) => t.data()),
                  },
                  outcomes: outcomes.docs.map((o) => splitOutcome(o.data())),
                }
              : null;
          }),
      )
    ).filter(Boolean);
    w.sprints = teams.map((t) => t.sprint);
    w.outcomes = teams
      .flatMap((t) => t.outcomes.map((o) => o.outcome))
      .sort((a, b) => b.createdAt - a.createdAt);
    w.feedback = teams.flatMap((t) => t.outcomes.flatMap((o) => o.feedback));
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
    } else if (c.type === "outcome.create") {
      const fields = outcomeFields(c.outcome);
      const outcomes = collection(db, "sprints", c.projectId, "outcomes");
      // Slots are claimed inside a transaction; if a teammate takes the same
      // slot concurrently, the transaction sees it and moves to the next one.
      const taken = new Set(
        (await getDocs(query(outcomes, limit(OUTCOME_LIMIT)))).docs.map(
          (d) => d.id,
        ),
      );
      let saved = false;
      for (const id of outcomeSlots.filter((s) => !taken.has(s))) {
        saved = await runTransaction(db, async (tx) => {
          const slot = await tx.get(doc(outcomes, id));
          if (slot.exists()) return false;
          tx.set(slot.ref, {
            id,
            projectId: c.projectId,
            userId: uid,
            ...fields,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            feedback: {},
            lastFeedbackId: "",
          });
          return true;
        });
        if (saved) break;
      }
      if (!saved)
        fail(`결과물은 팀마다 ${OUTCOME_LIMIT}개까지 남길 수 있어요.`);
    } else if (c.type === "outcome.update" || c.type === "outcome.delete") {
      const fields =
        c.type === "outcome.update" ? outcomeFields(c.outcome) : null;
      await runTransaction(db, async (tx) => {
        const o = await expectedOutcome(tx, c);
        if (o.data().userId !== uid)
          fail("내가 남긴 결과물만 수정하거나 삭제할 수 있어요.");
        if (fields)
          tx.update(o.ref, { ...fields, updatedAt: serverTimestamp() });
        else tx.delete(o.ref);
      });
    } else if (c.type === "feedback.create") {
      const body = feedbackBody(c.body);
      const id = crypto.randomUUID().replaceAll("-", "");
      await runTransaction(db, async (tx) => {
        const o = await expectedOutcome(tx, c);
        if (Object.keys(o.data().feedback ?? {}).length >= FEEDBACK_LIMIT)
          fail(`피드백은 결과물마다 ${FEEDBACK_LIMIT}개까지 남길 수 있어요.`);
        tx.update(o.ref, {
          [`feedback.${id}`]: {
            id,
            userId: uid,
            body,
            createdAt: serverTimestamp(),
          },
          lastFeedbackId: id,
        });
      });
    } else fail("지원하지 않는 요청이에요.");
    return load();
  }
  // Reads the targeted outcome inside the transaction (so retries re-check it)
  // and rejects the command if the slot is empty or now holds a different
  // outcome instance than the one the caller was viewing.
  async function expectedOutcome(tx, c) {
    const o = await tx.get(
      ref("sprints", c.projectId, "outcomes", c.outcomeId),
    );
    if (!o.exists()) fail("결과물을 찾을 수 없어요. 이미 삭제됐을 수 있어요.");
    if (!isExpectedOutcome(millis(o.data().createdAt), c.outcomeCreatedAt))
      fail(STALE_OUTCOME_MESSAGE);
    return o;
  }
  return { load, execute };
}
