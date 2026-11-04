import assert from "node:assert/strict";
const base = process.env.CROSSCAMPUS_TEST_URL ?? "http://127.0.0.1:5173";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
  throw new Error(
    "This smoke test may run only against a local development server.",
  );
let cookie = "";
async function request(path, command, extra = {}) {
  const res = await fetch(base + path, {
    method: command ? "POST" : "GET",
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(command ? { "Content-Type": "application/json", Origin: base } : {}),
      ...extra,
    },
    ...(command ? { body: JSON.stringify(command) } : {}),
  });
  const raw = await res.text();
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    body = { error: raw };
  }
  return { status: res.status, body };
}
const anon = await request("/api/world");
assert.equal(anon.body.authenticated, false);
assert.equal(
  (await request("/api/world", { type: "bookmark", projectId: "ocean" }))
    .status,
  401,
);
const signed = await fetch(base + "/signin-with-chatgpt?return_to=/", {
  redirect: "manual",
});
cookie = signed.headers
  .getSetCookie()
  .map((c) => c.split(";")[0])
  .join("; ");
assert.ok(cookie, "Local sign-in must issue a dev cookie");
assert.equal(
  (
    await request(
      "/api/world",
      { type: "reset" },
      { Origin: "https://untrusted.invalid" },
    )
  ).status,
  403,
);
const demo = "/api/world?mode=demo&actor=demo-jin";
assert.equal((await request(demo, { type: "reset" })).status, 200);
const applied = await request(demo, {
  type: "apply",
  projectId: "ocean",
  role: "디자인",
  note: "첫 주 디자인 시안을 만들어 함께 검토하고 싶어요.",
});
assert.equal(applied.status, 200);
const app = applied.body.world.applications.find(
  (a) => a.userId === "demo-jin",
);
assert.ok(app);
assert.equal(
  (
    await request(demo, {
      type: "decide",
      projectId: "ocean",
      applicationId: app.id,
      decision: "accepted",
    })
  ).status,
  403,
);
const accepted = await request("/api/world?mode=demo&actor=demo-mina", {
  type: "decide",
  projectId: "ocean",
  applicationId: app.id,
  decision: "accepted",
});
assert.equal(accepted.status, 200);
const reload = await request(demo);
assert.equal(reload.body.world.sprints.length, 1);
const task = reload.body.world.sprints[0].tasks[0];
assert.equal(
  (
    await request(demo, {
      type: "task",
      projectId: "ocean",
      taskId: task.id,
      done: true,
    })
  ).status,
  200,
);
assert.equal((await request(demo)).body.world.sprints[0].tasks[0].done, true);
const outsider = await request("/api/world?mode=demo&actor=demo-yuri");
assert.equal(outsider.body.world.sprints.length, 0);
const live = await request("/api/world?mode=live&actor=demo-mina");
assert.equal(live.body.actor, "local_seedy");
assert.equal(
  live.body.world.projects.some((p) => p.sample),
  false,
);
await request(demo, { type: "reset" });
console.log(
  "API smoke passed: auth, origin, demo isolation, apply/accept, private sprint, persistence, live actor binding.",
);
