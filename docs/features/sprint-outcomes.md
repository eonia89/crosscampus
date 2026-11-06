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

The proposed `outcomes/{outcomeId}/feedback/{feedbackId}` subcollection cannot enforce bounded atomic deletion within Firestore's Rules limits (10 document-access calls per operation, 20 per batch or transaction). Proving that a deleted outcome left no feedback would need an `existsAfter` check for every possible comment ID in one rule, and a 21-write delete batch already exceeds the per-request budget once each write checks membership. The implementation therefore uses:

- `sprints/{projectId}/outcomes/{oid}` where `oid` is one of the fixed slots `o01`…`o20`. Rules only allow those IDs, so a team can never hold more than 20 outcomes, including under concurrent creates (two clients claiming the same slot conflict, and the loser moves to the next free slot). Deleting an outcome frees its slot. This replaces the separate counter document.
- Feedback embedded in the outcome as a map `feedback: {feedbackId: {id, userId, body, createdAt}}` (at most 20 entries) plus `lastFeedbackId`. A teammate's append must add exactly the entry named by `lastFeedbackId`, authored by `request.auth.uid` with `createdAt == request.time`. Existing entries cannot change or disappear. Deleting the outcome document removes its feedback in the same single-document write, so orphaned comments are impossible.
- The adapter flattens each document into the `outcomes` / `feedback` view-model arrays below, so the UI and the demo share one shape.

Every rule uses at most three document-access calls (invite, project membership, sprint existence). Slot IDs are reused after deletion, so the adapter checks that a new comment still targets the outcome version the teammate was viewing. That check is a client-side usability guard, not a security boundary.

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

Defaults for old browser demo worlds are `[]`. Do not overwrite or reset state on upgrade. Bound each team to 20 outcomes and each outcome to 20 feedback notes using a validated transactional counter; enforce both in Rules, not only UI. The small feedback bound also makes atomic deletion practical.

## Domain actions

Add `outcome.create`, `outcome.update`, `outcome.delete`, `feedback.create` to `src/lib/domain.mjs`.

- For live records bind identity to `request.auth.uid` in Rules; use the current Firebase UID in the adapter, never a request body userId.
- Demo: use `canJoinSprint` plus an existing sprint check. Live: use authoritative project `memberIds`, invite access and existing sprint checks in Rules for reads and writes.
- Project leader and accepted applicants are members. Pending/rejected/withdrawn applicants are not.
- Validate URLs with `new URL`, require `https:`, reject embedded credentials, localhost/loopback URLs and invalid syntax. Do not fetch links server-side or generate previews.
- Render links as escaped text with `target="_blank" rel="noopener noreferrer"`.
- Delete feedback belonging to a deleted outcome in the same atomic batch. Use `getAfter`/`existsAfter` with the bounded count to ensure no orphan comments. Rules must permit the outcome author to delete its comments only as part of deleting that outcome.
- For this version, feedback is append-only. No notifications or arbitrary user lookup.
- `visibleWorld` must exclude other-team demo records. Firestore Rules must independently reject outsider reads/writes, including direct SDK calls. Load only joined-team records in the live adapter.

Extend `src/lib/firebase-store.mjs`, `src/firebase/client.ts` as needed, `firestore.rules`, and `tests/firebase/rules.test.mjs`. Do not route new live features through the historical Sites API. Use server timestamps, immutable creator/project fields, and transactional counters. Add meaningful Rules tests for author-only changes, outsider denial, forged fields and concurrent limit/deletion races.

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
