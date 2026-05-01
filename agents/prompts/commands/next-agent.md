# Run Next Autonomy Item

Use this prompt to claim and execute one autonomy queue item.

Hard requirement: read `AGENTS.md` first. If you have not read it in this
session, stop and read it before taking any action.

Then read the applicable runtime overlay, `agents/roster.yaml`,
`agents/queue-policy.md`, the latest handoff note in `agents/handoffs/` when
present, and the current queue state.

## Task

1. Run `bun run autonomy:check` before claiming work.
2. Run `bun run autonomy:activate` to claim one item.
3. Execute only the active item's bounded scope.
4. Treat `owner_role` as a roster role id, not as the runtime name.
5. Do not use runtime names such as `codex`, `claude`, `claude-code`,
   `gemini`, `gemini-cli`, `worker`, or `verifier` as `owner_role` unless the
   roster explicitly defines them.
6. Run the narrowest useful validation commands for the touched files.
7. Complete the item with `bun run autonomy:complete` only after the work is
   genuinely done.
8. Write a handoff note that includes:

   ```md
   Role: <owner_role>
   Runtime: <current runtime name>
   Queue item: <active item id>
   Status: done
   ```

9. Enqueue at most one or two concrete follow-ups, and only with roster role
   ids.
10. Stop after this one queue item unless the user explicitly asked for a
    longer loop.
