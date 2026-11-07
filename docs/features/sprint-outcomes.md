# Sprint outcomes and peer feedback

Status: **Implemented on `feat/sprint-outcomes`, in review** · [Issue #1](https://github.com/eonia89/crosscampus/issues/1)
Suggested branch: `feat/sprint-outcomes`
Use the base branch named in the issue.

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

## Implemented storage decision

Embedding feedback in its outcome document makes deletion atomic without any orphan cleanup: there is only one document to delete. The proposed `outcomes/{outcomeId}/feedback/{feedbackId}` subcollection would instead need a batch that deletes the outcome and every feedback document together, plus rules that tie them together. Firestore's [Rules limits](https://firebase.google.com/docs/firestore/security/rules-conditions#access_call_limits) count document-access calls (`get`, `exists`, `getAfter`, `existsAfter`), not writes: 10 per single-document request, and 20 per batch or transaction (each operation also still capped at 10). In the nested design, the outcome-delete rule could not check `existsAfter` for up to 20 feedback IDs, because that is more than 10 calls in one operation. So it would rely on a separately maintained feedback counter (one `getAfter`). Each feedback create and delete would also need its own parent and counter checks, and concurrent comments would have to be coordinated against that counter. That is workable but adds moving parts this bounded feature doesn't need. The implementation therefore uses:

- `sprints/{projectId}/outcomes/{oid}` where `oid` is one of the fixed slots `o01`…`o20`. Rules only allow those IDs, so a team can never hold more than 20 outcomes, including under concurrent creates (two clients claiming the same slot conflict, and the loser moves to the next free slot). Deleting an outcome frees its slot. This replaces the separate counter document.
- Feedback embedded in the outcome as a map `feedback: {feedbackId: {id, userId, body, createdAt}}` (at most 20 entries) plus `lastFeedbackId`. A teammate's append must add exactly the entry named by `lastFeedbackId`, authored by `request.auth.uid` with `createdAt == request.time`. Existing entries cannot change or disappear. Deleting the outcome document removes its feedback in the same single-document write, so orphaned comments are impossible.
- The adapter flattens each document into the `outcomes` / `feedback` view-model arrays below, so the UI and the demo share one shape.

Every rule uses at most three document-access calls (invite, project membership, sprint existence).

Slot IDs are reused after deletion, so an outcome instance is identified by its slot ID together with its `createdAt`. Every command that targets an existing outcome (`outcome.update`, `outcome.delete`, `feedback.create`) carries `outcomeCreatedAt`, built by the shared `outcomeTarget()` helper from the outcome on screen. The live adapter compares it with the transaction snapshot before writing (`expectedOutcome()`, re-checked on every transaction retry), and so does the demo reducer. A stale tab therefore gets "이 결과물은 그사이 삭제되거나 새 결과물로 바뀌었어요…" and keeps its draft, instead of editing, deleting or commenting on a replacement outcome. This is a stale-view correctness guard. Firestore Rules remain the security boundary (author-only edits and deletes, team-only access).

Rules URL constraints are deliberately stricter than generic URL syntax and match `SAFE_URL_PATTERN` in `src/lib/domain.mjs`: `https://` only, a DNS host whose last label is alphabetic or punycode (no IP literals, so no loopback or private addresses), no `@` userinfo, no whitespace or backslash, no `*.localhost`, and at most 2048 characters. The reducer validates with `new URL` first and stores the normalized `href`.

## Suggested data contract

Live records use `sprints/{projectId}/outcomes/{oid}` with embedded feedback (see the storage decision above) and explicit Firestore Rules. Reconstruct optional arrays in the UI world for compatibility; the arrays below are view-model contracts, not a single live JSON blob. No SQL migration is needed.

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

Defaults for old browser demo worlds are `[]`. Do not overwrite or reset state on upgrade. Bound each team to 20 outcomes using the fixed slot IDs and each outcome to 20 feedback notes using the embedded map size; enforce both in Rules, not only UI. Deleting the outcome document atomically removes its embedded feedback.

## Domain actions

Add `outcome.create`, `outcome.update`, `outcome.delete`, `feedback.create` to `src/lib/domain.mjs`.

- For live records bind identity to `request.auth.uid` in Rules; use the current Firebase UID in the adapter, never a request body userId.
- Demo: use `canJoinSprint` plus an existing sprint check. Live: use authoritative project `memberIds`, invite access and existing sprint checks in Rules for reads and writes.
- Project leader and accepted applicants are members. Pending/rejected/withdrawn applicants are not.
- Validate URLs with `new URL`, require `https:`, reject embedded credentials, localhost/loopback URLs and invalid syntax. Do not fetch links server-side or generate previews.
- Render links as escaped text with `target="_blank" rel="noopener noreferrer"`.
- Delete the outcome document and its embedded feedback in one write. Rules allow only the outcome author to delete it; there are no separate feedback documents to clean up. The adapter and demo reducer reject a stale outcome instance before editing, deleting or appending feedback.
- For this version, feedback is append-only. No notifications or arbitrary user lookup.
- `visibleWorld` must exclude other-team demo records. Firestore Rules must independently reject outsider reads/writes, including direct SDK calls. Load only joined-team records in the live adapter.

Extend `src/lib/firebase-store.mjs`, `src/firebase/client.ts` as needed, `firestore.rules`, and `tests/firebase/rules.test.mjs`. Do not route new live features through the historical Sites API. Use server timestamps, immutable creator/project fields, fixed outcome slots, and bounded append-only feedback maps. Add meaningful Rules tests for author-only changes, outsider denial, forged fields and concurrent limit/deletion races.

Validate HTTPS links in the reducer with `new URL`. Firestore Rules must also reject unsafe scheme/credentials/loopback, restrict length and schema; a malicious client can bypass reducer validation. Document any deliberately stricter Rules URL constraints. No server-side fetch, preview service or Cloud Functions.

## UI integration points

- `src/app.tsx`: `view === 'teams'`, sprint rendering and `action(...)` callback.
- Extract a new `src/components/sprint-outcomes.tsx` component. Pass sprint/project/actor/world/actions as props rather than introducing another state store.
- Keep the ink/cream/cobalt palette, rounded cards, legible mobile forms and explicit success/failure states.
- Disable duplicate submits while saving. Keep entered content on a server error.
- Empty state: '첫 번째 결과물을 남겨봐. 작은 초안도 좋아.'
- Do not add a large feature unrelated to this task while refactoring.

## Acceptance checks

- [ ] Leader can submit an outcome; accepted member can read it and comment.
- [ ] Accepted member can submit/edit/delete their own outcome.
- [ ] Another member cannot edit/delete that outcome.
- [ ] Outsider and pending applicant cannot read or write outcomes/feedback even by direct Firestore SDK request.
- [ ] Reject `javascript:`, `http:`, credential-bearing, loopback and malformed URLs.
- [ ] Input text is escaped and never inserted as HTML.
- [ ] Refresh retains outcomes/feedback.
- [ ] Deleting an outcome removes related comments.
- [ ] Older payloads without arrays work without data loss.
- [ ] Changing demo actor does not cross workspace or live identity boundaries.
- [ ] Desktop and 390px mobile view are usable with keyboard-accessible labels.
- [ ] Existing domain tests still pass; add meaningful tests for the new invariants.
- [ ] `npm test`, `npm run test:rules`, `npm run typecheck`, `npm run format:check`, `npm run build` pass.

## Suggested implementation sequence

1. Domain model, authorization, validation and tests.
2. Outcome/feedback UI and API wiring.
3. Integration fixes, verified screenshots and documentation.

Each increment should preserve the existing flow and include its relevant tests.

## PR evidence

Describe the user-visible before/after, demonstrate leader → accepted member → outsider, include test commands/results, and note remaining limitations. Reference this task file. Use clearly identified demo data in screenshots.
