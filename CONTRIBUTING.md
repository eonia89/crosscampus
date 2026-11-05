# Contributing

Start with an open issue and its linked specification. Keep a change focused on one user-visible result. Current priority: [sprint outcomes and peer feedback (#1)](https://github.com/eonia89/crosscampus/issues/1).

## Development

Use Node.js 24.12+, npm 11.6.2, and Java 21+.

```sh
npm ci
npm run dev
```

For live-data flows, start the emulators in one terminal:

```sh
npm run emulators
```

In another terminal, seed local invitations and start the app:

```sh
npm run seed:emulators
VITE_USE_EMULATORS=true npm run dev
```

The seed command grants local access to `owner@example.test` and `member@example.test`. It writes only to the Firestore emulator for `demo-crosscampus` at `127.0.0.1:8080` and leaves existing test projects intact. Choose Google login in the app and create a simulated account with one of those emails in the Auth emulator popup. Use separate browser profiles for the two accounts. Complete each profile through the app. No production credentials are needed.

## Branch and review

Use the base branch named in the issue; otherwise start from current `main`. Create a focused feature branch such as `feat/sprint-outcomes` and submit a PR against that base. Repository access is required for this private project; contact the maintainer if access is missing.

Read `AGENTS.md` and `docs/ARCHITECTURE.md` before editing. A feature involving private data must include both demo behavior and Firestore persistence/Rules. Client validation alone does not enforce access.

Before requesting review:

```sh
npm run format
npm test
npm run test:rules
npm run typecheck
npm run format:check
npm run build
```

Stop a running Firestore emulator before `test:rules`, which starts its own instance. Alternatively run `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node --test tests/firebase/*.test.mjs` against the running local emulator. The test suite clears its test database.

Check the changed flow at desktop and narrow widths, and describe the checks in the PR. Include a short before/after explanation, the related issue, test results, and any remaining limits. Do not deploy, merge, or change pilot access as part of a feature PR unless the maintainer requests it.

## Tooling and attribution

The initial implementation used AI coding assistance. Contributors may use coding agents; the contributor is responsible for understanding and reviewing the change, validating its behavior, and explaining their work. Use your own Git identity and describe material assistance and verification in the PR.
