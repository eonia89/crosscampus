# T01 — First sprint outcomes & reflection

Status: **READY / NOT IMPLEMENTED**
Owner: teammate + their coding agent
Suggested branch: `feat/sprint-outcomes`

## Problem

A team can currently accept members, agree a kickoff goal, and check first-week tasks, including a small role-specific contribution for each accepted member. The app does not yet capture what they made or what they learned. Add a private, team-only outcome and feedback loop inside `우리 팀 · 첫 주`.

## Scope and default design

1. Add a '첫 결과물' section below a sprint checklist.
2. Accepted members and the leader can add an HTTPS result link, title, their contribution and a short reflection.
3. A teammate can leave a short feedback note on an outcome. Show author display name and submitted time.
4. The author can edit their own outcome and delete it after an in-app confirmation. Other team members cannot edit/delete it.
5. The outcome and feedback survive reload and appear for another authenticated team member.
6. Demo workspaces keep working, with examples clearly separated from real projects. Do not automatically create outcomes or mark them complete.

No global showcase, auto-generated recommendation, file upload, external notifications, endorsement score or public profile expansion in this task.

## Suggested data contract

Prefer optional arrays on the existing `world` object. No new SQL migration is needed if only JSON payload structure changes.

```ts
outcomes?: Array<{
 id: string;
 projectId: string;
 userId: string;
 title: string;        // 3–80 characters
 url: string;          // 1 HTTPS URL, <= 2048 characters
 contribution: string;// 10–500 characters
 reflection: string;  // 10–1000 characters
 createdAt: number;
 updatedAt: number;
}>;
feedback?: Array<{
 id: string;
 outcomeId: string;
 projectId: string;
 userId: string;
 body: string;         // 5–500 characters
 createdAt: number;
}>;
```

Defaults for old saved worlds are `[]`. Do not overwrite or reset the world on upgrade. Set a sensible bounded per-team record count (for example 20 outcomes and 100 comments), and document it.

## Domain actions

Add `outcome.create`, `outcome.update`, `outcome.delete`, `feedback.create` to `lib/domain.mjs`.

- Derive identity only from the server actor, never a request body userId.
- Use `canJoinSprint` plus an existing sprint check for reads and writes.
- Project leader and accepted applicants are members. Pending/rejected/withdrawn applicants are not.
- Validate URLs with `new URL`, require `https:`, reject embedded credentials, localhost/loopback URLs and invalid syntax. Do not fetch links server-side or generate previews.
- Render links as escaped text with `target="_blank" rel="noopener noreferrer"`.
- Delete feedback belonging to a deleted outcome in the same transition.
- For this version, feedback is append-only. No notifications or arbitrary user lookup.
- `visibleWorld` must exclude all outcomes and feedback belonging to teams the actor cannot access.

The API route already applies authentication, origin checks, size bounds and optimistic concurrency. Preserve them. Increase the body limit only if requirements actually need it (current content should fit).

## UI integration points

- `app/crosscampus.tsx`: `view === 'teams'`, sprint rendering and `action(...)` callback.
- Extract a new `app/components/sprint-outcomes.tsx` component. Pass sprint/project/actor/world/actions as props rather than introducing another state store.
- Keep the ink/cream/cobalt palette, rounded cards, legible mobile forms and explicit success/failure states.
- Disable duplicate submits while saving. Keep entered content on a server error.
- Empty state: '첫 번째 결과물을 남겨봐. 작은 초안도 좋아.'
- Do not add a large feature unrelated to this task while refactoring.

## Acceptance checks

- [ ] Leader can submit an outcome; accepted member can read it and comment.
- [ ] Accepted member can submit/edit/delete their own outcome.
- [ ] Another member cannot edit/delete that outcome.
- [ ] Outsider and pending applicant cannot read or write outcomes/feedback even by direct API request.
- [ ] Reject `javascript:`, `http:`, credential-bearing, loopback and malformed URLs.
- [ ] Input text is escaped and never inserted as HTML.
- [ ] Refresh retains outcomes/feedback.
- [ ] Deleting an outcome removes related comments.
- [ ] Older payloads without arrays work without data loss.
- [ ] Changing demo actor does not cross workspace or live identity boundaries.
- [ ] Desktop and 390px mobile view are usable with keyboard-accessible labels.
- [ ] Existing 15+ domain tests still pass; add meaningful tests for the new invariants.
- [ ] `npm test`, `npm run typecheck`, `npm run build` pass.

## Suggested real commit units

1. Domain model, authorization, validation and tests.
2. Outcome/feedback UI and API wiring.
3. Integration fixes, verified screenshots and documentation.

Commit only completed, reviewed changes. This sequence is guidance, not a target commit count.

## PR evidence

Describe the user-visible before/after, demonstrate leader → accepted member → outsider, include test commands/results, and note remaining limitations. Reference this task file. Do not claim real student adoption from demo testing.
