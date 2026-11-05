# GitHub publishing and contribution

## Current handoff

Repository: https://github.com/eonia89/crosscampus (private).

The human signed into GitHub as `eonia89`; the assistant created this private repository through that authenticated browser session. After the human approved GitHub CLI access, the source and existing commits were pushed to `main`. The separate connected GitHub tool used `troll-the-mage`, so it was not used to write into another account's repositories.

Team task: https://github.com/eonia89/crosscampus/issues/1. The copyable agent prompt is in `TEAMMATE_START_HERE.md`.

GitHub is the collaboration destination. Firebase Hosting serves the new demo, and Firestore real data has separate invite controls. The previous Sites deployment remains untouched.

## Current migration branch

Firebase work is on `feat/firebase-hosting`. Open a PR against `main` and keep it reviewable; do not merge automatically. T01 should branch from the Firebase branch until that PR is merged, then from main. Check actual remotes before pushing. Never overwrite the managed Sites remote, force-push ZIP history, or put tokens in URLs.

The Git bundle preserves history; the ZIP is a snapshot. Prefer clone/bundle for contributions. Verify your real Git identity locally before committing. GitHub credentials and Firebase CLI credentials are separate and never included in the source archive.

## Team contribution

Give the teammate `TEAMMATE_START_HERE.md` and repository access. Because this repository is private, the owner must first invite the intended teammate by their actual GitHub username; no collaborator invitation has been sent. A fork route is available only if the account's private-fork settings permit it. They should implement T01 on `feat/sprint-outcomes`, test it, commit genuine changes under their own identity, and open a PR. The README already states AI-assisted implementation; the teammate's PR should describe their actual role and validation.

Do not add fake history, backdate commits, impersonate a teammate or publish sample team activity as real work. No special commit-count threshold was observed in the event's application form.
