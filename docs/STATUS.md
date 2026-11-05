# Status — 2026-11-05 (Asia/Seoul)

## Firebase migration

Live URL: https://crosscampus-kr.web.app
Project: `crosscampus-kr`, owned by the Google account approved by the human.
Hosting and Firestore Rules deployed successfully. Google sign-in enabled; Seoul Standard Firestore reports `freeTier: true`. Billing reports `billingEnabled: false`, with no linked billing account.

Public demo uses fictional students and browser-local persistence. Actual projects are invite-only; only the owner is allowlisted. Application notes remain private to applicant/leader, and sprint boards to accepted members. The original private Sites deployment and its single demo row are untouched. No live workspace was found there, and no real student data was migrated.

## Verified

- 17 pure domain tests passed.
- 14 Firestore emulator integration tests passed, including uninvited/unverified access denial, forged membership/fields, private notes and boards, duplicate applications, simultaneous same-role acceptance, counter integrity, revocation, and preservation of prior sprint work.
- TypeScript and Vite production build passed. Bundle-size advisory remains (~254 KB gzip JS); optimization is future work.
- Local browser: fictional Jin applied, Mina accepted, the first-sprint board appeared, and its task completion persisted through reload and switching back to Jin.
- Desktop and 390px mobile frame inspected. Production HTTPS page rendered with six fictional demo projects.
- Production Google popup login succeeded for the owner; live mode loaded its empty Firestore workspace. No fictional profile/project was inserted into production.
- HTTPS and runtime config returned 200; unauthenticated production Firestore listing returned 403.
- GitHub CI result is recorded in the final handoff after the migration PR check.

## Pending product work

T01 outcome links and peer reflection remain READY / NOT IMPLEMENTED for the teammate. Its contract now includes Firestore adapter changes, author/team Rules, transactional limits and emulator tests.

This is an invited early pilot, not a validated student network. Real student discovery, school membership verification, moderation operations, pagination, abuse/rate controls and usage optimization remain. No messages, invitations, fake adoption numbers, file uploads or AI API calls were added.

## Collaboration

Private repository: https://github.com/eonia89/crosscampus
Migration branch: `feat/firebase-hosting`; keep its PR open for review, do not auto-merge.
Task: https://github.com/eonia89/crosscampus/issues/1
Teammate should base T01 on the Firebase branch until it is merged, then use main. No GitHub collaborator invitation has been sent.
