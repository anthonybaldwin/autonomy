# Stop Autonomy Queue

Use this prompt to pause future autonomy queue claims.

Hard requirement: read `AGENTS.md` first. If you have not read it in this
session, stop and read it before taking any action.

## Task

1. Run `bun run autonomy:stop`.
2. If the user explicitly asks to clear pending and active runtime state, run
   `bun run autonomy:stop:clear` instead.
3. Explain that the file-based queue stops the next claim. For immediate
   interruption, use the current runtime's own cancel or interrupt control.
4. Preserve handoff state for deterministic resume.
5. Emit the resume command:

   ```bash
   bun run autonomy:resume
   ```
