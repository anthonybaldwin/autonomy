---
name: autonomy-queue
description: Use when the user explicitly asks to bootstrap, seed, continue, run the next item from, stop, pause, resume, inspect, or troubleshoot the autonomy queue. Do not use for ordinary repository work unless the user asks for the autonomy queue or queued agent workflow.
---

# Autonomy Queue

Use this skill to operate the file-based autonomy queue with the least possible
runtime-specific behavior.

Hard requirement: read `AGENTS.md` first. If you have not read it in this
session, stop and read it before taking any action from this skill.

## Source of truth

Follow these files in order:

1. `AGENTS.md`
2. The applicable runtime overlay, such as `CLAUDE.md`
3. `agents/roster.yaml`
4. `agents/queue-policy.md`
5. The latest handoff note in `agents/handoffs/`, when present
6. `agents/queue-state.json`, when present

## Terminology

- Runtime: the tool executing the work, such as Codex or Claude Code.
- Owner role: the roster role that owns the queue item.
- Queue items must use `owner_role`, not runtime names.

Never enqueue `codex`, `claude`, `claude-code`, `gemini`, `gemini-cli`,
`worker`, or `verifier` as `owner_role` unless the roster explicitly defines
that id as a role.

Legacy queue state may contain `owner_agent`. Treat it as an alias for
`owner_role` when reading old state, but write `owner_role` for new items.

## Choose the operation

Choose exactly one operation from the user's request:

- Bootstrap: seed the queue from a plan or roadmap.
- Next: claim and execute one queued item.
- Stop: pause future queue claims.
- Doctor: troubleshoot a broken or suspicious install.

Do not start or continue an autonomy loop unless the user explicitly asks.

## Bootstrap

Use when the user asks to bootstrap, seed, or initialize autonomy work.

1. Locate the project plan or roadmap, such as `PLAN.md`, `ROADMAP.md`,
   `.plans/`, or a milestone section in `README.md`. If none exists, ask before
   inventing one.
2. Identify the current phase and one or two next bounded tasks.
3. Choose `--role` values only from `agents/roster.yaml` role ids.
4. Enqueue items with:

   ```bash
   bun run autonomy:enqueue --id <id> --role <role-id> --priority <high|normal|low> --description "<desc>"
   ```

5. Stop after seeding unless the user explicitly asks you to continue.

## Next

Use when the user asks to continue, run the next item, or pick up queued work.

1. Run `bun run autonomy:check`.
2. Run `bun run autonomy:activate`.
3. Execute only the active item's bounded scope.
4. Treat `owner_role` as the roster role for this run.
5. Run the narrowest useful validation commands for touched files.
6. Write a handoff note using `agents/handoffs/README.md`.
7. Run `bun run autonomy:complete` only after the work is genuinely done.
8. Enqueue at most one or two concrete follow-ups, and only with roster role ids.
9. Stop after this one queue item unless the user explicitly asked for a longer
   loop.

## Stop

Use when the user asks to stop, pause, halt, or clear autonomy work.

1. Run `bun run autonomy:stop`.
2. If the user explicitly asks to clear pending and active runtime state, run
   `bun run autonomy:stop:clear` instead.
3. Explain that the file-based queue stops the next claim. For immediate
   interruption, use the current runtime's own cancel or interrupt control.
4. Preserve handoff state for deterministic resume.
5. Emit the resume command: `bun run autonomy:resume`.

## Doctor

Use only when queue setup, roster validation, ignored runtime state, package
scripts, or provider-skill wiring appears broken.

Run:

```bash
bun run autonomy:doctor
```

Report errors first, then warnings, then the narrowest fix.

## Handoff header

Every completed queue item must leave a handoff with this header shape:

```md
Role: <owner_role>
Runtime: <current runtime name>
Queue item: <active item id>
Status: done
```
