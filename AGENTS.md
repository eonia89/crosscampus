# Crosscampus agent instructions

Read `README.md`, `docs/ARCHITECTURE.md`, and the assigned task before editing.

## Product contract

- Preserve the distinction between fictional demo workspaces and real projects.
- Never present sample users, school affiliations, accepted demo applications, or completed demo tasks as real traction.
- No fake AI output, fabricated verification badge, fake matching percentage, or fabricated Git authorship/history.
- Existing features must keep working: discover/filter/save, profiles, projects, applications, decisions and first-sprint board.
- Keep all private authorization on the server. Live actor comes only from authenticated identity. Never trust a client-supplied actor for live writes.
- Do not expose another student's application note, contact information, or private team content.
- Current site audience is private. Do not change access, deploy another site, message students, or send invitations unless the human requests it.

## Implementation

- Primary team task is `docs/tasks/T01-sprint-outcomes.md`. Do that task only unless the user assigns a different task.
- Keep changes small enough to review; do not replace the app or upgrade the framework incidentally.
- Extract a focused UI component if touching the large main component; preserve the visual language.
- `lib/domain.mjs` owns pure state transitions and validation. Avoid mutating its input.
- `visibleWorld` is the privacy boundary for payloads; extend its projection when adding data.
- Backward compatibility: older saved worlds may lack newly added optional fields.
- Migrations already applied are immutable. Append migrations if the actual database schema changes.
- Use actual current dates and honest Git identity. No backdating, fake commits, or attribution to another teammate.

## Verification and handoff

Run `npm test`, `npm run typecheck`, and `npm run build`. Add tests for changed permission or business rules. Inspect the relevant UI at desktop and narrow widths when browser tools are available. If a tool is unavailable, report the limit rather than claiming a pass.

Update the assigned task status and `docs/STATUS.md` with verified outcomes. Create a feature branch and a reviewable PR when remote access exists; do not merge. If no remote or Git identity is configured, finish local implementation and supply exact next steps. Do not access personal credentials or change global Git settings.
