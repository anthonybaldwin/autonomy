# Queue Policy

## Required read order
1. Project-level agent instructions (`AGENTS.md`).
2. The applicable runtime overlay, such as `CLAUDE.md` or `GEMINI.md`.
3. `agents/roster.yaml`.
4. `agents/queue-policy.md`.
5. Latest handoff in `agents/handoffs/`, when present.
6. `agents/queue-state.json`.

## Queue fields
1. `id`
2. `priority` (`high|normal|low`)
3. `execution_policy` (`run-now|run-after-current-step|run-next-turn`)
4. `owner_role` (must be a role id from `agents/roster.yaml`)
5. `status` (`pending|running|blocked|done|failed|cancelled`)
6. `requires_approval` (bool)

## Role ownership
1. `owner_role` is a project role, not the runtime that happens to execute the work.
2. Codex, Claude, Gemini, worker, and verifier are runtime names or execution modes. They are not valid owners unless the roster explicitly defines them as role ids.
3. Common invalid owners include `codex`, `claude`, `claude-code`, `gemini`, `gemini-cli`, `worker`, and `verifier`.
4. Supervisors must choose the next `owner_role` from `agents/roster.yaml`.
5. Workers must execute the active item's roster role and include both `Role` and `Runtime` in the handoff.
6. If queue or roster state looks inconsistent, run `bun run autonomy:doctor` and fix the reported issue.

Legacy state files may contain `owner_agent`; read it as an alias for
`owner_role`, but write `owner_role` for new queue items.

## Rules
1. High-priority items preempt normal/low unless an in-flight step is marked atomic.
2. Approval-required items remain blocked until explicit user approval.
3. Queue reorder is allowed for pending items.
4. Supervisor must emit queue state after every completed run.
5. Queue runtime state is persisted in `agents/queue-state.json`.

## Stop behavior
1. `STOP_AUTONOMY=true` pauses the scheduler; agents must observe it before starting the next item.
2. `STOP_AND_CLEAR=true` pauses the scheduler and clears all pending queue entries.
3. Stop/resume wrapper scripts must be the preferred control surface.
4. The file-based kit cannot interrupt an external runtime mid-task; use the runtime's own cancel/interrupt control for immediate cancellation.
