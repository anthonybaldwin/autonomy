# /stop-autonomy

Immediate stop behavior:
1. Run `bun run autonomy:stop`.
2. Optional hard stop/clear: `bun run autonomy:stop:clear`.
3. Cancel active task.
4. Preserve latest handoff state for deterministic resume.
5. Emit resume instructions (`bun run autonomy:resume`).
