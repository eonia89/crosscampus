# Status — 2026-11-05 (Asia/Seoul)

## Implemented

Working early MVP: project discovery/filtering/bookmarks, editable profiles, project creation, role-specific applications, withdrawal, leader acceptance/rejection, close/reopen, private first-sprint boards, per-role small starting tasks, and persistent changes in D1.

Demo uses fictional students/schools and per-account saved workspaces. Real projects use the authenticated identity and a separate shared workspace. Hosting remains owner-private. No real student recruitment, traction or school partnership has been claimed.

## Verification evidence

- 17 domain tests passed: input/date validation, duplicate/owner/closed applications, decision ownership, role capacity, withdrawal, team authorization, private projection, explainable matching, report deduplication and role-specific kickoff tasks.
- Local API smoke passed: unauthenticated write rejection, wrong Origin rejection, apply→accept→sprint, persistence after a fresh request, outsider projection and live identity binding.
- Final TypeScript check and deployment build passed through the source packaging workflow.
- GitHub Actions also passed on source commit `27abd46510abfa9d6a068ca95c4fb502d669e8f6`: dependency install, tests, TypeScript and build. Evidence: https://github.com/eonia89/crosscampus/actions/runs/42026885612.
- Browser: signed in locally, submitted a design application as fictional Jin, accepted it as fictional Mina, confirmed the sprint appeared. Created a local test profile and a real-space project through the UI.
- Desktop screenshot inspected; 390px mobile viewport inspected inside a local QA iframe. The temporary QA page is removed from the deliverable.
- Fresh local database migration succeeded; running the local migration script again reported no pending migrations.
- Preview, local testing data and auth cookie are excluded from source export. Local data was never copied into hosted D1.

## Pending product work

- **T01: sprint outcome links and peer reflection** is intentionally unimplemented for the teammate. See the full agent-ready task.
- Real student validation, membership verification, durable moderation workflow, rate limiting, pagination and a normalized multi-user schema before broader rollout.
- No email notifications, file uploads or AI API calls.
- The current JSON workspace is appropriate for evaluating a small MVP, not an unbounded public network.

## GitHub handoff

The human signed into GitHub as `eonia89` and approved GitHub CLI authorization. The assistant created https://github.com/eonia89/crosscampus as a private repository and pushed the existing source commits to `main`. Source paths were verified through GitHub. The teammate's T01 task is tracked at https://github.com/eonia89/crosscampus/issues/1. No collaborator invitation has been sent. Managed Sites source storage is separate from GitHub.

See the final handoff note for the verified deployment URL and downloadable source. A private preview requires authorized access and is not a public application portfolio link.
