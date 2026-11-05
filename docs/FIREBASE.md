# Firebase deployment and operations

Project: `crosscampus-kr` · Hosting: https://crosscampus-kr.web.app · [Console](https://console.firebase.google.com/project/crosscampus-kr/overview)

The owner approved Firebase CLI OAuth for the deployment. Standard Firestore is in Seoul (`asia-northeast3`), with its free tier enabled. Billing is disabled and no billing account is linked. Google sign-in is enabled. No Cloud Functions, App Hosting, Storage bucket, analytics, payment card or service-account key is required.

## Deploy

```sh
npm ci
npm test
npm run test:rules
npm run typecheck
npm run build
npx firebase login
npm run deploy:firebase -- --project crosscampus-kr
```

Run deploy only with the owner's authorization. Do not deploy the historical Sites Worker as a server. `.firebaserc` selects the project; explicitly checking the target is still required. The browser obtains public Firebase client configuration from Hosting's `/__/firebase/init.json`. Firebase web API keys are client configuration, not administrative secrets; Rules protect data. No private key belongs in frontend environment variables.

The one-time Google provider setup used Firebase CLI's [auth provider configuration](https://firebase.google.com/docs/auth/configure-providers-cli). Owner-specific `supportEmail` is kept in ignored `firebase-config.local.json`, not committed. This email may be shown on the Google consent screen. Repeated Hosting/Rules deployments do not change Authentication configuration. For a different Firebase project, register a web app, configure Google sign-in, create the default Firestore database, and verify authorized domains before deploying.

## Pilot access

The public site contains only the fictional demo. Live Firestore records require a verified Google account with an enabled invite. Currently only the project owner's Google email has an enabled invite; no student or collaborator has been added.

When the human authorizes a specific pilot member, a Firebase administrator creates `access/{exact verified Google email}` with Boolean field `enabled: true` through the console. Disable that field to revoke live DB access. An app user cannot edit invitations, enumerate emails or grant access to others. GitHub collaboration access is separate. Google sign-in is identity verification, not school-enrollment verification.

## Local development

No cloud access is needed for the demo. `npm run dev` uses browser storage. For live development use Java 21+, `npm run emulators` and `VITE_USE_EMULATORS=true npm run dev`. This flag is honored only for a development build on loopback. Production builds cannot switch to emulators through a URL/query parameter.

The Rules tests seed verified test identities and invitations using `@firebase/rules-unit-testing`, then exercise the same live adapter as the app. No real Google token is involved. For manual local UI testing, seed a test invitation into the emulator with an admin context (see the test setup), then use the Auth emulator's simulated Google login. Never seed fictional users into the real project.

## Limits and recovery

Spark has finite Hosting transfer and Firestore read/write quotas. Exceeding a quota can make a feature unavailable; no paid plan has been enabled. Monitor [usage](https://console.firebase.google.com/project/crosscampus-kr/usage/details). Lists are deliberately bounded (see ARCHITECTURE) but each mutation reloads data, so this remains a small pilot. Pagination and abuse controls are required before broad recruitment.

Old Sites/D1 state remains at the historical private URL. Migration inventory found one demo row and no live workspace; no real student data needed transfer. Browser-local demo changes are specific to a browser/account and do not sync across devices.

Keep source changes in a reviewable PR. Firebase Hosting releases can be rolled back from the console, but database Rules must be separately restored from the intended Git revision. The prior complete Sites source is `e5a1b47`; use that revision for a Sites rollback.
