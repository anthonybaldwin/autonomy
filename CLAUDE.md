# CLAUDE.md

Claude Code-specific overlay for this autonomy template.

Hard requirement: read `AGENTS.md` first. If you have not read `AGENTS.md` in
this session, stop and read it before taking any action from this file.

`AGENTS.md` is the source of truth. This file only covers Claude Code command
format and Claude-specific runtime behavior.

## Claude Code Commands

Project slash commands live in `.claude/commands/*.md`.

- `/bootstrap` seeds the queue from a plan or roadmap.
- `/next-agent` claims and runs one queued item.
- `/stop-autonomy` pauses future queue claims.

These commands are prompt adapters. They do not define agents, roles, or queue
policy. Every command must follow `AGENTS.md`, `agents/roster.yaml`,
`agents/queue-policy.md`, and `agents/handoffs/README.md`.

## Runtime Tool Vs Owner Role

Claude Code is the runtime. The active queue item's `owner_role` is the roster
role being executed.

Do not enqueue `claude`, `claude-code`, `codex`, `gemini`, `gemini-cli`,
`worker`, or `verifier` as `owner_role` unless the local roster explicitly
defines that id as a role.

Every Claude handoff must include `Runtime: Claude Code`.
