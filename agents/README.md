# Agents Bundle

This folder defines the role-based orchestration model used by the supervisor
loop.

The roster does not install executable agents. It defines project roles that a
runtime such as Codex or Claude Code can execute for one queue item.

## Files
1. `roster.yaml` - canonical role catalog and ownership. Customize this for your project before serious use.
2. `queue-policy.md` - queue semantics, owner role rules, and kill-switch behavior.
3. `queue-state.example.json` - seed state for local runtime queue state.
4. `handoffs/README.md` - handoff note contract and naming policy.
5. `prompts/` - supervisor, worker, and verifier prompt contracts.

## Runtime notes
1. Runtime queue state is stored in `queue-state.json` (gitignored).
2. Runtime handoff notes are stored in `handoffs/` (gitignored except README).
3. Queue `owner_role` values must be role ids from `roster.yaml`; Codex and Claude are runtimes, not role ids.
4. The provider-neutral runtime contract lives in the repository root `AGENTS.md`.

## Role files

No matching role files are required. `roster.yaml` is the definition source for
roles such as `backend-api`, `frontend-ui`, and `testing-qa`.

If a project later needs longer role instructions, add explicit files and point
to them from `roster.yaml`; do not assume they exist by naming convention.

## Autonomy skill

The reusable autonomy workflow lives in `.agents/skills/autonomy-queue/SKILL.md`.

The Claude provider skill wrapper lives in `.claude/skills/` and points back to
the canonical skill. Slash commands are optional aliases that invoke the skill.
