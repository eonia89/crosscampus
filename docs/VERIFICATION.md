# Verification

## Automated checks

| Check                  | Coverage                                                                                                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`             | 17 domain tests: validation, proposals, role capacity, withdrawal, team membership, private projections, and first tasks.                                                     |
| `npm run test:rules`   | 14 Firestore integration tests: invitation/identity checks, schema/ownership enforcement, private reads, atomic acceptance, concurrency, revocation, and sprint preservation. |
| `npm run typecheck`    | TypeScript application and build configuration.                                                                                                                               |
| `npm run format:check` | Consistent source and documentation formatting.                                                                                                                               |
| `npm run build`        | Production Vite build.                                                                                                                                                        |

[GitHub Actions](https://github.com/eonia89/crosscampus/actions/workflows/ci.yml) runs these checks for pull requests and pushes to main. Test counts describe the current suite, not a coverage percentage.

## Browser and deployment checks

Verified on 2026-11-05:

- Fictional Jin proposal → Mina acceptance → first-sprint board.
- Task completion survives reload and is visible from the accepted member's demo role.
- Desktop and 390px layout inspection.
- Production HTTPS and Firebase runtime configuration load successfully.
- Google sign-in and the invited owner's empty live workspace load successfully.
- An unauthenticated production Firestore list request is denied (403).

Multi-user live write and access scenarios are exercised in the local Firestore emulator. No fictional student profile or project was inserted into the production workspace to demonstrate usage.

## Known limits

The pilot loads at most 100 projects, 200 profiles, and 200 applications per own/incoming query. It does not paginate, and each mutation reloads bounded lists. Larger use requires incremental queries and usage monitoring. The production JavaScript bundle also has a size advisory; splitting it is a future optimization.

Moderation operations, school membership verification, and real-student demand remain unvalidated. See [Product](PRODUCT.md) for the next experiment and [Architecture](ARCHITECTURE.md) for the access model.
