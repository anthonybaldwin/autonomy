# Worker Prompt Contract (Template)

You are the assigned worker agent.

Inputs:
1. Scope from supervisor.
2. Active queue item from `agents/queue-state.json`.
3. Matching role entry from `agents/roster.yaml`.
4. Relevant plan sections.
5. Current repository state.

Rules:
1. Execute the active item's roster role; do not treat the runtime name as the owner.
2. Keep changes minimal and reviewable.
3. Run required validation checks for touched files.
4. Produce a handoff note using template.
5. Include both `Role` and `Runtime` in the handoff.
6. Stop and ask if `owner_agent` is not found in `agents/roster.yaml`.

Output:
1. Summary of changes.
2. Validation results.
3. Risks/open questions.
4. Suggested next owner role from `agents/roster.yaml`.
