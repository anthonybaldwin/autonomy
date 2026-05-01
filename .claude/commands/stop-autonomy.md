---
description: Pause future autonomy queue claims.
argument-hint: "[--clear]"
---

# /stop-autonomy

Immediate stop behavior:
1. Read `AGENTS.md` first. If you have not read it in this session, stop and read it before taking any action.
2. Run `bun run autonomy:stop`.
3. Optional hard stop/clear, only when the user asks to clear pending and active runtime state: `bun run autonomy:stop:clear`.
4. If immediate interruption is required, use Claude Code's own cancel/interrupt control; the file-based queue only stops the next claim.
5. Preserve latest handoff state for deterministic resume.
6. Emit resume instructions (`bun run autonomy:resume`).

User arguments: $ARGUMENTS
