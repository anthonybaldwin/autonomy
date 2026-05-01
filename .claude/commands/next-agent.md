---
description: Claim and execute one autonomy queue item using the selected roster role.
argument-hint: "[optional focus]"
---

# /next-agent

Run supervisor mode:
1. Read `AGENTS.md` first. If you have not read it in this session, stop and read it before taking any action.
2. Read `CLAUDE.md`, `agents/roster.yaml`, `agents/queue-policy.md`, and latest handoff notes.
3. Run `bun run autonomy:check` before claiming work.
4. Run `bun run autonomy:activate` to claim one item.
5. Work only the active item's bounded scope.
6. Treat `owner_agent` as a roster role id, not as the runtime name.
7. Do not use runtime names (`claude`, `claude-code`, `codex`, `gemini`, `gemini-cli`, `worker`, `verifier`) as `owner_agent` unless the roster explicitly defines them.
8. Run the narrowest useful validation commands for touched files.
9. Complete with `bun run autonomy:complete` only after the work is genuinely done.
10. Write a handoff with both `Role` (roster id) and `Runtime` (`Claude Code`).
11. Enqueue at most one or two concrete follow-ups, and only with roster role ids.
12. Stop after this one queue item unless the user explicitly asked for a longer loop.

User arguments: $ARGUMENTS
