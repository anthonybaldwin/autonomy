# Queue Policy

## Queue fields
1. `id`
2. `priority` (`high|normal|low`)
3. `execution_policy` (`run-now|run-after-current-step|run-next-turn`)
4. `owner_agent`
5. `status` (`pending|running|blocked|done|failed|cancelled`)
6. `requires_approval` (bool)

## Rules
1. High-priority items preempt normal/low unless an in-flight step is marked atomic.
2. Approval-required items remain blocked until explicit user approval.
3. Queue reorder is allowed for pending items.
4. Supervisor must emit queue state after every completed run.
5. Queue runtime state is persisted in `agents/queue-state.json`.

## Stop behavior
1. `STOP_AUTONOMY=true` cancels active worker and pauses scheduler.
2. `STOP_AND_CLEAR=true` cancels active worker and clears all pending queue entries.
3. Stop/resume wrapper scripts must be the preferred control surface.
