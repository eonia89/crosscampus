import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const root = process.cwd();
const source = path.join(root, "dist/server/wrangler.json");
if (!fs.existsSync(source))
  throw new Error("Run npm run build before npm run db:local.");
const config = JSON.parse(fs.readFileSync(source, "utf8"));
config.main = path.resolve(root, "dist/server", config.main);
config.assets.directory = path.resolve(
  root,
  "dist/server",
  config.assets.directory,
);
for (const db of config.d1_databases ?? [])
  db.migrations_dir = path.join(root, "drizzle");
fs.mkdirSync(".sites-runtime", { recursive: true });
fs.writeFileSync(
  ".sites-runtime/local-migrations.json",
  JSON.stringify(config),
);
const r = spawnSync(
  process.execPath,
  [
    "--import",
    "./scripts/sites-env.mjs",
    "./node_modules/wrangler/bin/wrangler.js",
    "d1",
    "migrations",
    "apply",
    "DB",
    "--local",
    "--config",
    ".sites-runtime/local-migrations.json",
    "--persist-to",
    ".wrangler/state",
  ],
  { stdio: "inherit", env: { ...process.env, CI: "true" } },
);
process.exit(r.status ?? 1);
