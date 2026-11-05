# Repository guidance

Read `README.md`, `CONTRIBUTING.md`, `docs/ARCHITECTURE.md`, and the assigned issue/specification before editing.

## Product and data

- Preserve discovery → proposal → acceptance → first-sprint behavior.
- Keep fictional demo data separate from real projects and label it clearly.
- Live identity comes from Firebase Auth. Enforce private reads, writes, and invariants in Firestore Security Rules.
- Application notes are private to the applicant and leader; sprint content is team-only. Do not add contact details to public profiles.
- Keep old demo payloads compatible when adding optional fields.

## Implementation

- `src/lib/domain.mjs` contains pure validation and demo transitions; do not mutate its input.
- `src/lib/firebase-store.mjs` and `firestore.rules` define the live persistence contract. Extend and test both for data features.
- Extract a focused component when adding substantial UI to `src/app.tsx`.
- Avoid unrelated framework upgrades and preserve the existing visual language.
- Use real authorship and current commit dates. Keep credentials and local runtime state out of Git.

## Verification and delivery

Run `npm test`, `npm run test:rules`, `npm run typecheck`, `npm run format:check`, and `npm run build`. Add tests for changed permissions or business rules. Check affected UI at desktop and narrow widths when available; report any verification limits.

Work on a feature branch and open a reviewable PR. Do not merge, deploy, change access, or contact users unless explicitly requested. Update the relevant documentation and describe the actual implementation, assistance, and verification in the PR.
