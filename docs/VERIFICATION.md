# Verification

## Automated checks

| Check                  | Coverage                                                                                                                                                                                                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`             | 25 domain tests: validation, proposals, role capacity, withdrawal, team membership, private projections, first tasks, and sprint outcomes/feedback (author rights, URL safety, limits, old payloads).                                                                                        |
| `npm run test:rules`   | 25 Firestore integration tests: invitation/identity checks, schema/ownership enforcement, private reads, atomic acceptance, concurrency, revocation, sprint preservation, outcome/feedback access, forgery, deletion and limit races, and stale edits/deletes against a reused outcome slot. |
| `npm run typecheck`    | TypeScript application and build configuration.                                                                                                                                                                                                                                              |
| `npm run format:check` | Consistent source and documentation formatting.                                                                                                                                                                                                                                              |
| `npm run build`        | Production Vite build.                                                                                                                                                                                                                                                                       |

[GitHub Actions](https://github.com/eonia89/crosscampus/actions/workflows/ci.yml) runs these checks for pull requests and pushes to main. Test counts describe the current suite, not a coverage percentage.

## Browser and deployment checks

Verified on 2026-11-05:

- Fictional Jin proposal → Mina acceptance → first-sprint board.
- Task completion survives reload and is visible from the accepted member's demo role.
- Desktop and 390px layout inspection.
- Production HTTPS and Firebase runtime configuration load successfully.
- Google sign-in and the invited owner's empty live workspace load successfully.
- An unauthenticated production Firestore list request is denied (403).

Sprint outcomes review history (2026-11-06):

- Commit `9785100` (first submission): the maintainer ran `npm test` 24/24, `npm run test:rules` 22/22 (local Firestore emulator, Java 21), typecheck, format check and build, all passing. Review then found that a stale tab's edit or delete could hit a replacement outcome in a reused slot. The maintainer reproduced it in the emulator and supplied two regression tests.
- Fix commit (stale-instance check): see the PR for results. The contributor's agent environment cannot download the Firestore emulator, so the Rules suite for the fix has to be run by the maintainer or in CI.

Sprint outcomes walkthrough (2026-11-06, run by the contributor's AI agent with Playwright, local dev server, fictional demo data, desktop 1360px and 390px mobile): Mina (leader) recorded an outcome after an unsafe `https://localhost` link was rejected with the typed text kept. Jin (accepted) saw it after reload, commented, posted, edited and deleted his own outcome through the confirmation step, and his feedback was removed along with it. Jin and Mina saw no edit/delete controls on each other's outcomes. Yuri (pending applicant) saw no board or outcomes. A saved demo world without the new arrays loaded with its tasks intact. The 390px layout had no horizontal overflow. After the stale-instance fix, the same setup was checked again. The demo store was changed so the slot held a replacement outcome while an old view stayed open. The old view's edit and delete were both refused with the 새로고침 message, the edit draft was kept, the replacement was unchanged, and after a refresh the replacement could be edited and deleted normally.

Multi-user live write and access scenarios are exercised in the local Firestore emulator. No fictional student profile or project was inserted into the production workspace to demonstrate usage.

## Known limits

The pilot loads at most 100 projects, 200 profiles, and 200 applications per own/incoming query. It does not paginate, and each mutation reloads bounded lists. Larger use requires incremental queries and usage monitoring. The production JavaScript bundle also has a size advisory; splitting it is a future optimization.

Moderation operations, school membership verification, and real-student demand remain unvalidated. See [Product](PRODUCT.md) for the next experiment and [Architecture](ARCHITECTURE.md) for the access model.
