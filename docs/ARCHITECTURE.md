# Architecture and contracts

## Files

| File | Responsibility |
| --- | --- |
| `lib/domain.mjs` | Pure business transitions, validation, projection, demo seeds, match explanation |
| `app/api/world/route.ts` | Authentication, origin/content checks, D1 persistence, compare-and-swap |
| `app/crosscampus.tsx` | Client screens, forms, state loading and actions |
| `app/globals.css` | Responsive product design |
| `app/chatgpt-auth.ts` | Maintained Sites identity helper |
| `db/schema.ts`, `drizzle/` | Persistent workspace schema and immutable migrations |
| `tests/domain.test.mjs` | Authorization and product invariant tests |

## API

`GET /api/world?mode=demo|live&actor=demo-jin|demo-mina|demo-yuri`

Returns `{world, actor, authenticated, mode, revision}`. Anonymous requests receive a read-only demo snapshot. Authenticated demo data is scoped to `demo:<actual-user-id>`. Only these three predefined simulated actors can be selected in a demo workspace.

The live workspace key is `live`; live actor always comes from `oai-authenticated-user-id` through the Sites helper. A client actor query parameter cannot impersonate another real person. Hosted Sites dispatch owns identity headers; do not expose this Worker directly without an equivalent trusted authentication boundary.

`POST` to the same URL accepts one domain command, uses JSON only, requires same-origin and authenticated identity, and returns the updated privacy-projected world. API errors contain a human-readable `error`. Caller must preserve the draft on failure.

Actions: `profile`, `create`, `bookmark`, `apply`, `withdraw`, `decide`, `task`, `kickoff`, `close`, `report`. `reset` only resets the caller's demo workspace.

## State

`world = {version, profiles, projects, applications, bookmarks, sprints, reports}`.

Projects have one open slot per role. Application status is pending/accepted/rejected/withdrawn. Only pending applications can be withdrawn or decided. Acceptance opens one sprint and adds a small role-specific first task for each accepted member. Owners and accepted members can edit its goal, meeting and tasks.

`visibleWorld` exposes application notes only to applicant and project owner, sprint data only to team members, bookmarks only to their owner, and no report contents. Aggregate team counts/filled roles are visible without application notes. Profile name/school/skills/bio are visible within the authenticated space and this is disclosed in the profile form. No email or contact address is stored in domain data.

## ADR-001: versioned JSON workspace in D1

This MVP deliberately stores the small workspace as a JSON payload with a numeric revision. A write reads state, executes the pure reducer, then updates `WHERE revision = previousRevision`. It retries three times and reports a conflict rather than overwriting newer data. Business rules (role capacity, duplicate application, access) therefore evaluate against current state on each retry.

Pros: easy pure testing, atomic transitions across applications and sprints, fast teammate onboarding. Limits: one live workspace is a contention/size bottleneck; not suitable for an unbounded public network. It has a 1.5 MB payload guard and 20 owned projects per user, but lacks a full scalable rate-limiting policy. Before broader rollout normalize profiles/projects/applications/membership and paginate. Do not describe this as production scale.

Demo and live use the same reducer but different database keys. A demo actor switch is a simulation feature, not authentication or a real school account.

## Extending

Add optional collections with default empty arrays when reading old payloads. Do not reset saved user state. Extend the privacy projection when adding private team records. T01 should use this path without a SQL migration. If database columns change, generate a new migration; never edit an applied one.

## Deployment

Hosted source and deployment use the Sites workflow. `.openai/hosting.json` identifies the current private site and D1 binding. No application API secret is required. Source credentials, local auth cookies, D1 local state, runtime directories and dependency artifacts must not enter Git or the deliverable ZIP.
