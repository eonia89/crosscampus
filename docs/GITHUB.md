# GitHub publishing and contribution

## Current handoff

Repository: https://github.com/eonia89/crosscampus (private).

The human signed into GitHub as `eonia89`; the assistant created this private repository through that authenticated browser session. After the human approved GitHub CLI access, the source and existing commits were pushed to `main`. The separate connected GitHub tool used `troll-the-mage`, so it was not used to write into another account's repositories.

Team task: https://github.com/eonia89/crosscampus/issues/1. The copyable agent prompt is in `TEAMMATE_START_HERE.md`.

Sites source synchronization is a separate managed remote. GitHub is the source collaboration destination; the private Sites preview has its own access controls.

## Publish to your own new repository

The original repository already exists at `https://github.com/eonia89/crosscampus.git`. Do not create a duplicate. Use an authenticated Git client with access to this private repository.

If using the terminal, first check the actual remotes and your own Git identity:

```sh
git remote -v
git status
git config user.name
git config user.email
```

When the checkout already has the Sites managed remote, add a separate `github` remote rather than replacing it:

```sh
git remote add github https://github.com/eonia89/crosscampus.git
git push -u github HEAD:main
```

Use ordinary GitHub login/SSH authentication. Never put a token in a remote URL or a committed file. If a `github` remote already exists, inspect it instead of overwriting it. Prefer cloning the repository (or the provided Git bundle) to preserve history. Do not force-push a freshly initialized ZIP over existing history.

The source ZIP intentionally excludes `.git`. For a fresh ZIP checkout, configure your genuine Git identity if needed, then:

```sh
git init -b main
git add .
git commit -m "Add Crosscampus working MVP and contributor handoff"
git remote add origin <YOUR_EMPTY_GITHUB_REPOSITORY_URL>
git push -u origin main
```

## Team contribution

Give the teammate `TEAMMATE_START_HERE.md` and repository access. Because this repository is private, the owner must first invite the intended teammate by their actual GitHub username; no collaborator invitation has been sent. A fork route is available only if the account's private-fork settings permit it. They should implement T01 on `feat/sprint-outcomes`, test it, commit genuine changes under their own identity, and open a PR. The README already states AI-assisted implementation; the teammate's PR should describe their actual role and validation.

Do not add fake history, backdate commits, impersonate a teammate or publish sample team activity as real work. No special commit-count threshold was observed in the event's application form.
