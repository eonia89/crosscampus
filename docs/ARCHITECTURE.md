# Architecture and contracts

## Current runtime: Firebase Spark

`index.html` → `src/main.tsx` → existing React UI. Vite outputs `dist-firebase/`, served by Firebase Hosting. Google Auth identifies the real actor; Firestore Rules enforce authorization on Google's servers. The browser reducer is input validation, never the security boundary.

| File                            | Responsibility                                                          |
| ------------------------------- | ----------------------------------------------------------------------- |
| `src/lib/domain.mjs`            | Pure transitions, demo seeds, input validation, explainable matching    |
| `src/firebase/client.ts`        | Runtime Firebase config, session, invite check, demo/live routing       |
| `src/lib/firebase-store.mjs`    | Normalized records, scoped queries, atomic writes                       |
| `firestore.rules`               | Authoritative read/write permissions, schemas and acceptance invariants |
| `src/app.tsx`                   | Screens and forms; clears loaded data on auth change                    |
| `tests/firebase/rules.test.mjs` | Real SDK against Firestore Rules emulator, including races              |
| `firebase.json`, `.firebaserc`  | Hosting / Rules deployment target                                       |

## Demo and real data

Demo is fictional, locally persisted per browser and current Firebase UID (or guest). Switching demo actors is simulation only. Reset affects the selected browser's demo key. It neither resets Firestore nor imports demo activity into real projects. `visibleWorld` remains the demo privacy projection.

Live mode requires a verified Google email plus `access/{email}.enabled == true`. Only the Firebase project administrator can grant access. Firestore Rules independently repeat this check on every permitted operation. Profiles contain no email/contact data; they are readable by invited users. Application notes belong to applicant and owner only. Team data is restricted by authoritative project membership. Reports are create-only for users and readable only through administrator tooling.

## Collections

- `access/{verifiedEmail}`: `{enabled: boolean}`, admin-maintained. Caller can get their own entry, never list or change it.
- `profiles/{uid}`: display profile, own writes; all invited users may read.
- `projects/{uuid}`: public-within-pilot project fields plus `deadlineAt` epoch ms, `createdAt` server timestamp, `memberIds`, `filledRoles` role→UID, `lastAcceptedUid`.
- `counters/{uid}`: monotonic project count and last project ID, coupled to project creation (20 per user).
- `applications/{projectId}__{uid}`: deterministic record, ownerId, role, note, status, server timestamp. One application per person/project. Reapplying after rejection/withdrawal overwrites that record; this version does not preserve application history.
- `sprints/{projectId}` and `tasks/{taskId}` subcollection: kickoff goal/meeting and validated tasks. Only team members can read/edit allowed fields.
- `sprints/{projectId}/outcomes/{o01…o20}`: team-only result link, contribution and reflection. Fixed slot IDs bound each team to 20 outcomes. Author-only edits and deletes. `createdAt`, `userId` and `projectId` are immutable. Peer feedback is embedded as an append-only map of at most 20 entries, so deleting an outcome deletes its feedback atomically.
- `users/{uid}/bookmarks/{projectId}`: own records.
- `reports/{projectId}__{uid}`: deduplicated private report.

The adapter reconstructs the existing `world` view model for the UI. Caller identity always comes from Firebase Auth; passing another UID to an SDK call cannot bypass Rules.

## Transactions and rules

Creation atomically increments a counter and creates its project. Acceptance reads application/project/sprint then atomically changes pending→accepted, fills exactly one role, adds exactly one member, and creates or extends the sprint. `getAfter` couples writes across documents. Concurrent acceptances for the same role cannot both commit. Later acceptances preserve prior task completion and kickoff text. Users cannot mint membership or counters independently.

Read queries filter applications by current user or project owner. Loading sprints is limited to joined projects. An auth session change clears the UI; an epoch guard prevents an older mutation response from rendering as the new user.

## Pilot limits

Lists currently load at most 100 projects, 200 profiles, and 200 applications in each own/incoming query. Results beyond those caps are not visible; no pagination is implemented. Writes reload those bounded lists, consuming Firestore reads. This is a small invited pilot, not an unbounded public network. Keep usage visible in the console; add pagination, incremental loading, moderation, abuse controls and evaluated App Check before broader enrollment. Security Rules prevent unauthorized access but are not a general rate limiter.

## Outcomes and feedback

Outcomes live in `sprints/{projectId}/outcomes`, readable and writable only by project members (Rules check `memberIds` and the invite on every request). Feedback is stored inside its outcome document, not in a nested subcollection. A nested collection could not prove orphan-free deletion within Firestore's per-request Rules access limits; see [the feature spec](features/sprint-outcomes.md#implemented-storage-decision). The adapter flattens the documents into `world.outcomes` and `world.feedback`. The demo reducer stores the same arrays, and `withOutcomeDefaults` upgrades older saved demo worlds without resetting them. Result URLs are validated, never fetched, and rendered as `target="_blank" rel="noopener noreferrer"` links only when they still match the safe pattern.

## Historical implementation

The earlier Sites/D1 prototype remains in Git at `e5a1b47`. Its server and template dependencies are not part of the current Firebase application. Use that revision only when investigating the former implementation; current development starts from the Firebase architecture above.
