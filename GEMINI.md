# GEMINI.md

Gemini CLI-specific overlay for this autonomy template.

Hard requirement: read `AGENTS.md` first. If you have not read `AGENTS.md` in
this session, stop and read it before taking any action from this file.

`AGENTS.md` is the source of truth. This file only covers Gemini CLI command
format and Gemini-specific runtime behavior.

## Gemini CLI Commands

Project custom commands live in `.gemini/commands/*.toml`.

- `/bootstrap` seeds the queue from a plan or roadmap.
- `/next-agent` claims and runs one queued item.
- `/stop-autonomy` pauses future queue claims.

After editing `.gemini/commands/*.toml`, run `/commands reload` inside Gemini
CLI or restart the session so Gemini sees the updated command definitions.

These commands are prompt adapters. They do not define agents, roles, or queue
policy. Every command must follow `AGENTS.md`, `agents/roster.yaml`,
`agents/queue-policy.md`, and `agents/handoffs/README.md`.

## Runtime Rule

Gemini CLI is the runtime. The active queue item's `owner_agent` is the roster
role being executed.

Do not enqueue `gemini`, `gemini-cli`, `claude`, `claude-code`, `codex`,
`worker`, or `verifier` as `owner_agent` unless the local roster explicitly
defines that id as a role.

Every Gemini handoff must include `Runtime: Gemini CLI`.
