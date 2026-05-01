# autonomy

A small, tool-agnostic queue and handoff kit for AI coding agents. It lets
Claude Code, Gemini CLI, Codex, or another shell-capable runtime work through
bounded queue items without treating runtime names as project roles.

The kit is just files:

- `AGENTS.md` for the universal runtime contract.
- `agents/roster.yaml` for project role ownership.
- `agents/queue-state.json` for local runtime queue state.
- `scripts/autonomy-state.ts` for queue commands.
- Optional Claude and Gemini slash-command adapters.

No daemon, service, or SDK is required.

## Why

You want an agent to keep moving through work, but:

- A single huge task is brittle and hard to review.
- Parallel agents can overwrite each other's work.
- Without handoffs, the next agent has no useful state.
- Runtime labels like `codex` or `claude` are too vague to own real work.

This kit gives you:

- Bounded tasks: one queue item per run.
- Single-active mutex: only one item can be active at a time.
- Handoff notes: every completed run leaves context for the next run.
- Kill switch: agents check the stop flag before claiming work.
- Role validation: queue owners must come from `agents/roster.yaml`.

## Install

Drop these files into any repo:

1. `AGENTS.md`
2. `agents/`
3. `scripts/`
4. The `autonomy:*` scripts from `package.json`
5. Optional for Claude Code: `CLAUDE.md` and `.claude/commands/`
6. Optional for Gemini CLI: `GEMINI.md` and `.gemini/commands/`

If the target repo already has agent instruction files, merge the guidance
instead of replacing project-specific rules.

Requires [Bun](https://bun.com) 1.x. No other dependencies are required.

Do not copy or commit `agents/queue-state.json`; it is runtime state and is
gitignored. The first state-changing queue command creates it from
`agents/queue-state.example.json`.

## First Setup

1. Read `AGENTS.md`.
2. Edit `agents/roster.yaml` so its role ids match the target project.
3. Merge `CLAUDE.md` or `GEMINI.md` only when that runtime is used.
4. Keep `.claude/commands/` only for Claude Code and `.gemini/commands/` only
   for Gemini CLI.
5. Run `bun run autonomy:check` to confirm the queue is runnable.

`bun run autonomy:doctor` is for troubleshooting a broken or suspicious setup.
It is not the first setup step.

## Quickstart

```bash
bun run autonomy:enqueue \
  --id task-001 \
  --agent backend-api \
  --priority normal \
  --description "Refactor the auth middleware"

bun run autonomy:check
bun run autonomy:activate

# Agent does the bounded active work, validates it, and writes a handoff.

bun run autonomy:complete
```

`--agent` means roster role id. Use values from `agents/roster.yaml`, such as
`backend-api`, `frontend-ui`, or `testing-qa`.

Do not use runtime names like `codex`, `claude`, `claude-code`, `gemini`,
`gemini-cli`, `worker`, or `verifier` unless the roster explicitly defines them
as roles.

## Agent Loop

Any runtime with shell and filesystem access can drive the loop:

1. Read `AGENTS.md`.
2. Read the applicable overlay, such as `CLAUDE.md` or `GEMINI.md`.
3. Read `agents/roster.yaml`.
4. Read `agents/queue-policy.md`.
5. Read the latest handoff in `agents/handoffs/`, when present.
6. Run `bun run autonomy:check`.
7. Run `bun run autonomy:activate`.
8. Execute the active item's bounded scope.
9. Validate touched files.
10. Write a handoff note.
11. Run `bun run autonomy:complete`.

Do not keep looping unless the user explicitly asked for a longer autonomy run.

## Queue Model

Each item in `agents/queue-state.json` has:

| Field | Values | Notes |
|---|---|---|
| `id` | string | Stable identifier you choose. |
| `priority` | `high`, `normal`, `low` | High preempts normal and low before activation. |
| `execution_policy` | `run-now`, `run-after-current-step`, `run-next-turn` | Scheduling hint. |
| `owner_agent` | string | Role id from `agents/roster.yaml`. |
| `status` | `pending`, `running`, `blocked`, `done`, `failed`, `cancelled` | Queue state. |
| `requires_approval` | bool | If true, item remains blocked until approved. |

`autonomy:activate` refuses to claim work if another item is already active.
`autonomy:complete` refuses to complete when no item is active.
`autonomy:enqueue` validates `owner_agent` against the tracked roster.

## Roles Vs Runtimes

The roster does not install agents. It defines project roles.

| Term | Example | Meaning |
|---|---|---|
| Role | `backend-api`, `testing-qa`, `docs-release-ops` | The ownership lane selected for a queue item. |
| Runtime | Codex, Claude Code, Gemini CLI | The tool executing the selected role. |

Handoffs must record both:

```md
Role: backend-api
Runtime: Codex
Queue item: task-001
Status: done
```

## Slash Commands

Slash commands are adapters for repeated prompts. They are not the source of
truth, and they do not install separate agents.

| Runtime | Project command support | Included files |
|---|---|---|
| Claude Code | Yes, Markdown commands in `.claude/commands/*.md`. | `/bootstrap`, `/next-agent`, `/stop-autonomy` |
| Gemini CLI | Yes, TOML commands in `.gemini/commands/*.toml`. | `/bootstrap`, `/next-agent`, `/stop-autonomy` |
| Codex | No project command files in this template. | Use `AGENTS.md`, normal prompts, and `bun run autonomy:*`. |

Codex has built-in slash commands for its own session controls, but this
template does not add repo-local Codex command files.

## Stop And Resume

```bash
bun run autonomy:stop          # pause future claims
bun run autonomy:stop:clear    # pause and clear pending/active runtime state
bun run autonomy:resume        # unpause
bun run autonomy:check         # exit 0 if runnable, 1 if stopped
```

The file-based stop only affects the next claim boundary. For immediate
interruption, use the current runtime's own cancel or interrupt control.

## File Map

```text
AGENTS.md                 universal runtime contract
CLAUDE.md                 Claude Code overlay
GEMINI.md                 Gemini CLI overlay
package.json              autonomy:* script aliases

.claude/commands/         optional Claude Code project slash commands
  bootstrap.md
  next-agent.md
  stop-autonomy.md

.gemini/commands/         optional Gemini CLI project custom commands
  bootstrap.toml
  next-agent.toml
  stop-autonomy.toml

agents/
  README.md
  roster.yaml             tracked role catalog
  queue-policy.md
  queue-state.example.json
  handoffs/
    README.md
  prompts/
    supervisor.md
    worker-template.md
    verifier.md

scripts/
  autonomy-state.ts
```

## Runtime Notes

- Claude Code: `CLAUDE.md` is an overlay only. Commands in
  `.claude/commands/*.md` must still read `AGENTS.md` first.
- Gemini CLI: `GEMINI.md` is an overlay only. Commands in
  `.gemini/commands/*.toml` must still read `AGENTS.md` first. Run
  `/commands reload` after editing command files.
- Codex: `AGENTS.md` is the durable project instruction file. Use normal prompts
  or direct `bun run autonomy:*` commands for this kit.

Start by editing the roster, then enqueue one bounded item.
