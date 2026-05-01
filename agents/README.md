# Agents Bundle

This folder defines the agent orchestration model used by the supervisor loop.

## Files
1. `roster.yaml.example` - canonical agent definitions and ownership. **Copy to `roster.yaml` and customize for your project before use.**
2. `queue-policy.md` - queue semantics and kill-switch behavior.
3. `queue-state.example.json` - seed state for local runtime queue state.
4. `handoffs/README.md` - handoff note contract and naming policy.
5. `prompts/` - prompt contracts for supervisor and worker agents.

## Runtime notes
1. Runtime queue state is stored in `queue-state.json` (gitignored).
2. Runtime handoff notes are stored in `handoffs/` (gitignored except README).
