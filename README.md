# autonomy

A small, tool-agnostic queue and handoff kit for AI coding agents. It lets
Codex, Claude Code, or another shell-capable runtime work through bounded queue
items without treating runtime names as project roles.

The kit is just files:

- `AGENTS.md` for the universal runtime contract.
- `agents/roster.yaml` for project role ownership.
- `agents/queue-state.json` for local runtime queue state.
- `scripts/autonomy-state.ts` for queue commands.
- `.agents/skills/autonomy-queue/SKILL.md` for the canonical reusable skill.
- Optional Claude skill wrapper and slash-command adapters.

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
- Role validation: queue `owner_role` values must come from `agents/roster.yaml`.

## Install

Drop these files into any repo:

1. `AGENTS.md`
2. `agents/`
3. `scripts/`
4. The `autonomy:*` scripts from `package.json`
5. `.agents/skills/`
6. Optional for Claude Code: `CLAUDE.md`, `.claude/skills/`, and `.claude/commands/`

If the target repo already has agent instruction files, merge the guidance
instead of replacing project-specific rules.

Requires [Bun](https://bun.com) 1.1 or newer. No other dependencies are
required.

Do not copy or commit `agents/queue-state.json`; it is runtime state and is
gitignored. The first state-changing queue command creates it from
`agents/queue-state.example.json`.

## First Setup

1. Read `AGENTS.md`.
2. Edit `agents/roster.yaml` so its role ids match the target project.
3. Merge `CLAUDE.md` only when Claude Code is used.
4. Keep `.claude/skills/` and `.claude/commands/` only for Claude Code.
5. Run `bun autonomy:check` to confirm the queue is runnable.

`bun autonomy:doctor` is for troubleshooting a broken or suspicious setup.
It is not the first setup step.

## Quickstart

```bash
bun autonomy:enqueue \
  --id task-001 \
  --role backend-api \
  --priority normal \
  --description "Refactor the auth middleware"

bun autonomy:check
bun autonomy:activate

# Agent does the bounded active work, validates it, and writes a handoff.

bun autonomy:complete
```

`--role` means roster role id. Use values from `agents/roster.yaml`, such as
`backend-api`, `frontend-ui`, or `testing-qa`.

`--agent` is accepted only as a legacy alias for older queues and scripts. New
docs and queue state should use `owner_role` / `--role`.

Do not use runtime names like `codex`, `claude`, `claude-code`, `gemini`,
`gemini-cli`, `worker`, or `verifier` unless the roster explicitly defines them
as roles.

## Agent Loop

Any runtime with shell and filesystem access can drive the loop:

1. Read `AGENTS.md`.
2. Read the applicable overlay, such as `CLAUDE.md`.
3. Read `agents/roster.yaml`.
4. Read `agents/queue-policy.md`.
5. Read the latest handoff in `agents/handoffs/`, when present.
6. Run `bun autonomy:check`.
7. Run `bun autonomy:activate`.
8. Execute the active item's bounded scope.
9. Validate touched files.
10. Write a handoff note.
11. Run `bun autonomy:complete`.

Do not keep looping unless the user explicitly asked for a longer autonomy run.

## Queue Model

Each item in `agents/queue-state.json` has:

| Field | Values | Notes |
|---|---|---|
| `id` | string | Stable identifier you choose. |
| `priority` | `high`, `normal`, `low` | High preempts normal and low before activation. |
| `execution_policy` | `run-now`, `run-after-current-step`, `run-next-turn` | Scheduling hint. |
| `owner_role` | string | Role id from `agents/roster.yaml`. |
| `status` | `pending`, `running`, `blocked`, `done`, `failed`, `cancelled` | Queue state. |
| `requires_approval` | bool | If true, item remains blocked until approved. |

`autonomy:activate` refuses to claim work if another item is already active.
`autonomy:complete` refuses to complete when no item is active.
`autonomy:enqueue` validates `owner_role` against the tracked roster.

Legacy queue files may still contain `owner_agent`. The script can read that
field, but it writes `owner_role` for new items.

## Roles Vs Runtimes

The roster does not install agents. It defines project roles.

| Term | Example | Meaning |
|---|---|---|
| Role | `backend-api`, `testing-qa`, `docs-release-ops` | The ownership lane selected for a queue item. |
| Runtime | Codex, Claude Code | The tool executing the selected role. |

There do not need to be matching files such as `agents/roles/backend-api.md`.
`agents/roster.yaml` is the definition source unless a project deliberately adds
extra role files and references them from the roster.

The queue field is named `owner_role` for this reason. It means "which roster
role owns this task," not "which AI CLI should run this task."

Handoffs must record both:

```md
Role: backend-api
Runtime: Codex
Queue item: task-001
Status: done
```

## Skills And Slash Adapters

The reusable autonomy workflow lives in one Agent Skill:

```text
.agents/skills/autonomy-queue/SKILL.md
```

That is the canonical source for bootstrap, next-item, stop, and doctor
behavior.

The Claude-specific skill wrapper exists only because Claude Code discovers
project skills in its own directory. It points back to the canonical skill:

```text
.claude/skills/autonomy-queue/SKILL.md
```

Slash commands are optional aliases that invoke the skill. They do not install
separate agents and should not duplicate the workflow.

| Runtime | Skill support in this template | Slash aliases |
|---|---|---|
| Codex | `.agents/skills/autonomy-queue/SKILL.md` | none |
| Claude Code | `.claude/skills/autonomy-queue/SKILL.md` | `/bootstrap`, `/next-agent`, `/stop-autonomy` |

Codex custom prompts are not used here. Codex has repo-scoped skills, so use
`$autonomy-queue` or ask Codex to use the autonomy queue skill.

Gemini CLI is not shipped as a provider-specific target in this template. Its
current docs support workspace Agent Skills from `.agents/skills/`, so a future
Gemini user can still use the canonical skill without adding `.gemini/*` files.

MCP prompts are a separate option: they require an MCP server that exposes
prompt templates. This template keeps the default install file-only and does not
ship an MCP server.

## Stop And Resume

```bash
bun autonomy:stop          # pause future claims
bun autonomy:stop:clear    # pause and clear pending/active runtime state
bun autonomy:resume        # unpause
bun autonomy:check         # exit 0 if runnable, 1 if stopped
```

The file-based stop only affects the next claim boundary. For immediate
interruption, use the current runtime's own cancel or interrupt control.

## File Map

```text
AGENTS.md                 universal runtime contract
CLAUDE.md                 Claude Code overlay
package.json              autonomy:* script aliases

.agents/skills/
  autonomy-queue/
    SKILL.md              canonical reusable autonomy skill

.claude/skills/
  autonomy-queue/
    SKILL.md              Claude project-skill wrapper

.claude/commands/         optional Claude Code project slash commands
  bootstrap.md
  next-agent.md
  stop-autonomy.md

agents/
  README.md
  roster.yaml             tracked role catalog
  queue-policy.md
  queue-state.example.json
  handoffs/
    README.md
  prompts/
    README.md
    supervisor.md
    worker-template.md
    verifier.md

scripts/
  autonomy-state.ts
```

## Runtime Notes

- Claude Code: `CLAUDE.md` is an overlay only. The project skill wrapper is in
  `.claude/skills/`; slash commands are aliases for the skill.
- Codex: `AGENTS.md` is the durable project instruction file, and the repo skill
  lives in `.agents/skills/`.

Start by editing the roster, then enqueue one bounded item.
