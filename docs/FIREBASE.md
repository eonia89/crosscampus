# Deployment and operations

Project: `crosscampus-kr` · [Live demo](https://crosscampus-kr.web.app) · [Firebase Console](https://console.firebase.google.com/project/crosscampus-kr/overview)

Firebase Hosting serves the Vite build. Google Authentication identifies users; Firestore Standard in Seoul (`asia-northeast3`) stores live records. The project uses the Spark free tier with no linked billing account as of 2026-11-05. Monitor quota use before expanding the pilot.

## Deployment

```sh
npm ci
npm test
npm run test:rules
npm run typecheck
npm run format:check
npm run build
npx firebase login
npm run deploy:firebase -- --project crosscampus-kr
```

Only maintainers with deployment approval should run the final command. Verify the project before deploying. Hosting releases can be rolled back in the console; restore Firestore Rules separately from the intended source revision.

The browser loads public client configuration from `/__/firebase/init.json`. Never put administrator credentials in frontend configuration. Google provider configuration is managed separately; routine Hosting/Rules deployment does not change it. For a new Firebase project, register a web app, enable Google sign-in, create the default Firestore database, and configure authorized domains.

## Invitations

An administrator grants a named pilot participant access by creating `access/{verified Google email}` with Boolean field `enabled: true`. Setting it to false revokes live database access. Client users cannot enumerate or change invitations.

The public demo does not read the live collections. Profiles are visible within the invited space, application notes only to applicant/leader, and sprint content only to team members. Reports are create-only for clients; administrators review them in the console.

## Local development and credentials

Follow [Contributing](../CONTRIBUTING.md) for emulator setup. The emulator seed uses the fixed `demo-crosscampus` project and loopback host. It cannot target production.

Keep Firebase CLI credentials, owner-specific provider settings (`firebase-config.local.json`), emulator state, and debug logs out of Git. Google sign-in does not establish school enrollment. Private repository access and live-product invitations are managed separately.

## Limits

Spark quotas can interrupt service when exhausted. Monitor [Firebase usage](https://console.firebase.google.com/project/crosscampus-kr/usage/details), especially Firestore reads. The current adapter reloads bounded lists after writes. Broad recruitment requires pagination, a moderation process, and abuse controls.

The previous hosted prototype remains separate. No live records required migration; its historical source is available at Git revision `e5a1b47`.
