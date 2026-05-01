# Agents Bundle

This folder defines the agent orchestration model used by the supervisor loop.

## Files
1. `roster.yaml` - canonical role catalog and ownership. Customize this for your project before serious use.
2. `queue-policy.md` - queue semantics, owner role rules, and kill-switch behavior.
3. `queue-state.example.json` - seed state for local runtime queue state.
4. `handoffs/README.md` - handoff note contract and naming policy.
5. `prompts/` - prompt contracts for supervisor, worker, and verifier runs.

## Runtime notes
1. Runtime queue state is stored in `queue-state.json` (gitignored).
2. Runtime handoff notes are stored in `handoffs/` (gitignored except README).
3. Queue `owner_agent` values must be role ids from `roster.yaml`; Codex, Claude, and Gemini are runtimes, not role ids.
4. The provider-neutral runtime contract lives in the repository root `AGENTS.md`.
