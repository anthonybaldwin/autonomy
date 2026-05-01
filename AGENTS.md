# AGENTS.md

This file is the universal contract for any shell-capable coding agent working
with this repository or with a project that has installed this autonomy kit.

Tool-specific files such as `CLAUDE.md` and `GEMINI.md` may add runtime details,
but they must not replace this file. If a runtime-specific file conflicts with
this file, follow `AGENTS.md` unless the conflict is strictly about that
runtime's own command format or configuration.

## Autonomy Is Opt-In

Do not start or continue an autonomy loop unless the user explicitly asks you to
run queued work, continue as the next agent, bootstrap autonomy, or similar.

For normal repository work, treat this kit as inert project tooling.

## Required Read Order For Autonomy Work

Before claiming queued work:

1. Read this `AGENTS.md`.
2. Read any runtime-specific overlay that applies to you, such as `CLAUDE.md` or
   `GEMINI.md`.
3. Read `agents/roster.yaml`.
4. Read `agents/queue-policy.md`.
5. Read the latest handoff note in `agents/handoffs/`, when present.
6. Run `bun run autonomy:check`.
7. Run `bun run autonomy:activate`.
8. Read the active item in `agents/queue-state.json`.
9. Execute the active item's roster role and bounded scope.

If the active item has an unknown `owner_role`, stop and ask the user to fix
the roster or queue. Do not silently reinterpret it as the current runtime.

## Roster Roles Vs Runtime Tools

`agents/roster.yaml` is the tracked role catalog for the project. It is not a
runtime registry and it does not install separate Claude, Codex, Gemini, worker,
or verifier agents.

`owner_role` must be a roster role id, such as `backend-api`, `frontend-ui`, or
`testing-qa`.

The runtime is the tool executing that role: Codex, Claude Code, Gemini CLI, or
another shell-capable agent. Runtime names are not valid `owner_role` values
unless the local roster explicitly defines them as roles.

Common invalid owners are `codex`, `claude`, `claude-code`, `gemini`,
`gemini-cli`, `worker`, and `verifier`.

Legacy note: older queue files may contain `owner_agent`. Treat that as an alias
for `owner_role` when reading old state, but write `owner_role` for all new
items.

The roster entries are the role definitions. There are no required matching
files such as `agents/roles/backend-api.md`, and the roster does not install
subagents. A runtime should read the matching roster entry and execute the task
while wearing that role.

Every handoff must record both:

- `Role`: the roster id that owned the queue item.
- `Runtime`: the tool that executed the work, such as Codex, Claude Code, or
  Gemini CLI.

## Queue Rules

1. Run `bun run autonomy:check` before claiming work.
2. Run `bun run autonomy:activate` to claim one queued item.
3. Do only the active item's bounded scope.
4. Validate touched files with the narrowest useful checks.
5. Run `bun run autonomy:complete` only after the task is genuinely done.
6. Write a handoff note using `agents/handoffs/README.md`.
7. Enqueue follow-up work only with an `owner_role` from `agents/roster.yaml`.

Use `bun run autonomy:doctor` only when the queue, roster, or install appears
broken.

## Supervisor Rules

When selecting or enqueueing work:

1. Choose `owner_role` from `agents/roster.yaml`.
2. If no role fits, update the roster first or ask the user for a role decision.
3. Keep tasks small enough for one reviewable run.
4. Put acceptance criteria and validation commands into the task description or
   handoff.
5. Do not pre-stuff a large backlog when one or two high-confidence next items
   are enough.

## Worker Rules

When executing work:

1. Treat the active item's `owner_role` as your role for this run.
2. Use that roster entry's ownership and avoid lists to keep scope bounded.
3. Prefer project-local instructions over generic assumptions.
4. Leave unrelated files alone.
5. Run the narrowest useful checks before completion.

## Agent Skill And Command Adapters

The reusable autonomy workflow lives in the `autonomy-queue` Agent Skill.

The canonical skill source is `.agents/skills/autonomy-queue/SKILL.md`.
Provider-specific skill wrappers exist only where a runtime needs a different
discovery directory:

- `.claude/skills/autonomy-queue/SKILL.md`
- `.gemini/skills/autonomy-queue/SKILL.md`

Provider slash commands are optional runtime adapters that invoke the skill.
They are not the source of truth.

The source of truth is this file plus `agents/roster.yaml`,
`agents/queue-policy.md`, `agents/handoffs/README.md`, and
`.agents/skills/autonomy-queue/SKILL.md`.

Current template command support:

| Runtime | Project skill files | Command aliases |
|---|---|---|
| Codex | `.agents/skills/autonomy-queue/SKILL.md` | none in this template |
| Claude Code | `.claude/skills/autonomy-queue/SKILL.md` | `.claude/commands/*.md` |
| Gemini CLI | `.gemini/skills/autonomy-queue/SKILL.md` | `.gemini/commands/*.toml` |

If a slash command exists, it must invoke the `autonomy-queue` skill.

## Handoff Header

Use this header shape for completed work:

```md
Role: backend-api
Runtime: Codex
Queue item: task-123
Status: done
```

The recommended next owner must also be a roster role id.
