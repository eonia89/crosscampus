import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import {
  DomainError,
  emptyWorld,
  makeDemoWorld,
  reduceWorld,
  visibleWorld,
} from "../../../lib/domain.mjs";
export const dynamic = "force-dynamic";
const reply = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
async function context(request: Request) {
  const user = await getChatGPTUser();
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") === "live" ? "live" : "demo";
  const requestedActor = url.searchParams.get("actor") ?? "demo-jin";
  const actor =
    mode === "demo" &&
    ["demo-jin", "demo-mina", "demo-yuri"].includes(requestedActor)
      ? requestedActor
      : user?.userId;
  return {
    user,
    mode,
    actor,
    key: mode === "live" ? "live" : `demo:${user?.userId}`,
  };
}
async function load(key: string, mode: string) {
  if (!env.DB) throw new Error("DB unavailable");
  let row = await env.DB.prepare(
    "SELECT payload,revision FROM worlds WHERE id=?",
  )
    .bind(key)
    .first<{ payload: string; revision: number }>();
  if (!row) {
    const world = mode === "demo" ? makeDemoWorld() : emptyWorld();
    await env.DB.prepare(
      "INSERT OR IGNORE INTO worlds (id,payload,revision,updated_at) VALUES (?,?,0,?)",
    )
      .bind(key, JSON.stringify(world), Date.now())
      .run();
    row = await env.DB.prepare("SELECT payload,revision FROM worlds WHERE id=?")
      .bind(key)
      .first<{ payload: string; revision: number }>();
  }
  if (!row) throw new Error("Workspace unavailable");
  return { world: JSON.parse(row.payload), revision: row.revision };
}
export async function GET(request: Request) {
  try {
    const { user, mode, actor, key } = await context(request);
    if (!user)
      return reply({
        world: visibleWorld(makeDemoWorld(), "demo-jin"),
        actor: "demo-jin",
        authenticated: false,
        mode: "demo",
      });
    const { world, revision } = await load(key, mode);
    return reply({
      world: visibleWorld(world, actor),
      actor,
      authenticated: true,
      mode,
      revision,
    });
  } catch {
    return reply(
      { error: "공간을 불러오지 못했어요. 잠시 후 다시 시도해 주세요." },
      503,
    );
  }
}
export async function POST(request: Request) {
  try {
    const { user, mode, actor, key } = await context(request);
    if (!user || !actor)
      return reply({ error: "저장하려면 로그인해 주세요." }, 401);
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin)
      return reply({ error: "요청 출처를 확인할 수 없어요." }, 403);
    if (!request.headers.get("content-type")?.includes("application/json"))
      return reply({ error: "JSON 요청이 필요해요." }, 415);
    const raw = await request.text();
    if (raw.length > 12000)
      return reply({ error: "입력 내용이 너무 길어요." }, 413);
    let command;
    try {
      command = JSON.parse(raw);
    } catch {
      return reply({ error: "요청을 읽을 수 없어요." }, 400);
    }
    if (!command || typeof command !== "object" || Array.isArray(command))
      return reply({ error: "올바른 작업을 보내 주세요." }, 400);
    for (let attempt = 0; attempt < 3; attempt++) {
      const { world, revision } = await load(key, mode);
      const next =
        command.type === "reset" && mode === "demo"
          ? makeDemoWorld()
          : reduceWorld(world, actor, command);
      if (JSON.stringify(next).length > 1500000)
        return reply({ error: "현재 프리뷰의 저장 한도에 도달했어요." }, 409);
      const saved = await env
        .DB!.prepare(
          "UPDATE worlds SET payload=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?",
        )
        .bind(JSON.stringify(next), Date.now(), key, revision)
        .run();
      if (saved.meta.changes === 1)
        return reply({
          world: visibleWorld(next, actor),
          actor,
          authenticated: true,
          mode,
          revision: revision + 1,
        });
    }
    return reply(
      { error: "동시에 변경된 내용이 있어요. 다시 시도해 주세요." },
      409,
    );
  } catch (error) {
    if (error instanceof DomainError)
      return reply({ error: error.message }, error.status);
    return reply(
      {
        error: "저장하지 못했어요. 입력 내용은 유지됩니다. 다시 시도해 주세요.",
      },
      503,
    );
  }
}
