# GitHub publishing and contribution

## Current handoff

The connected GitHub tool returned login `troll-the-mage`, but returned no accessible repositories. Its tool surface does not create repositories. Browser GitHub was signed out. No password/token was requested, and no unrelated repository was modified.

The source is ready for a GitHub repository once the human confirms the intended account and provides a new empty repository URL. Sites source synchronization is a separate managed remote and does not prove a push to the user's GitHub account.

## Publish to your own new repository

Create an empty repository in the intended account. Choose public/private intentionally; private is suitable for initial collaboration. Allow the GitHub connector access if using the assistant to push.

If using the terminal, first check the actual remotes and your own Git identity:

```sh
git remote -v
git status
git config user.name
git config user.email
```

When the checkout already has the Sites managed remote, add a separate `github` remote rather than replacing it:

```sh
git remote add github <YOUR_EMPTY_GITHUB_REPOSITORY_URL>
git push -u github HEAD:main
```

Replace the placeholder with the repository the human created. Use ordinary GitHub login/SSH authentication. Never put a token in a remote URL or a committed file. If a `github` remote already exists, inspect it instead of overwriting it.

The source ZIP intentionally excludes `.git`. For a fresh ZIP checkout, configure your genuine Git identity if needed, then:

```sh
git init -b main
git add .
git commit -m "Add Crosscampus working MVP and contributor handoff"
git remote add origin <YOUR_EMPTY_GITHUB_REPOSITORY_URL>
git push -u origin main
```

## Team contribution

Give the teammate `TEAMMATE_START_HERE.md` and repository access or a fork route. They should implement T01 on `feat/sprint-outcomes`, test it, commit genuine changes under their own identity, and open a PR. The README already states AI-assisted implementation; the teammate's PR should describe their actual role and validation.

Do not add fake history, backdate commits, impersonate a teammate or publish sample team activity as real work. No special commit-count threshold was observed in the event's application form.
