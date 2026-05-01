# autonomy

A tiny, tool-agnostic queue + handoff kit for letting AI coding agents (Claude Code, Codex, anything else with shell access) run bounded tasks back-to-back without stomping each other.

The whole system is ~200 lines of TypeScript, a JSON file, and a few markdown contracts. No daemon, no service, no SDK — just files an agent reads and scripts it runs.

---

## Why

You want an agent to keep working while you're away, but:
- A single 10-hour task is brittle, expensive, and impossible to review.
- Two agents running at once will overwrite each other's work.
- Without a paper trail, the next agent (or the next *you*) has no idea what just happened.

This kit gives you:
- **Bounded tasks**: each "run" is one queue item with explicit scope.
- **Single-active mutex**: only one item is `active` at a time. Claiming work fails if someone's already in.
- **Handoff notes**: every completed run leaves a markdown note for the next agent.
- **Kill switch**: one command pauses the whole loop; agents check the flag before claiming work.

---

## Install

Drop the `scripts/` and `agents/` folders into any repo. Add the `autonomy:*` scripts from `package.json`. Done.

Requires [Bun](https://bun.com) (1.x). No other dependencies.

---

## Quickstart

```bash
# 1. seed an item
bun run autonomy:enqueue \
  --id task-001 \
  --agent backend \
  --priority normal \
  --description "Refactor the auth middleware"

# 2. before each turn, check the kill switch
bun run autonomy:check
# exits 0 if runnable, 1 if paused/stopped

# 3. claim the next item (moves it from items[] → active)
bun run autonomy:activate

# 4. ... agent does the work, writes code, runs tests ...

# 5. mark it done (moves active → completed[])
bun run autonomy:complete

# 6. write a handoff note
#    agents/handoffs/YYYYMMDD-HHMMSS-<agent>.md
#    (template in agents/handoffs/README.md)

# 7. enqueue follow-up if needed, then loop back to step 2
```

The state lives in `agents/queue-state.json` (gitignored).

---

## The agent loop

```
┌─────────────────────────────────────────────────────┐
│  autonomy:check  →  autonomy:activate  →  do work   │
│       ▲                                       │     │
│       │              autonomy:enqueue ────────┤     │
│       │                                       │     │
│       └─────────────  handoff note  ←  autonomy:complete
└─────────────────────────────────────────────────────┘
```

Any agent that can run shell commands and write files can drive this loop. The contract is:

1. Read `agents/queue-policy.md` for queue semantics.
2. Read the latest file in `agents/handoffs/` to pick up context.
3. Run the loop above.
4. Respect the stop flag (`autonomy:check` returning non-zero) before claiming.

---

## Queue model

Each item in `agents/queue-state.json`:

| Field | Values | Notes |
|---|---|---|
| `id` | string | Stable identifier you choose |
| `priority` | `high` / `normal` / `low` | High preempts normal/low (unless current step is atomic) |
| `execution_policy` | `run-now` / `run-after-current-step` / `run-next-turn` | When the supervisor should pick it up |
| `owner_agent` | string | Free-form role label — see `agents/roster.yaml.example` |
| `status` | `pending` / `running` / `blocked` / `done` / `failed` / `cancelled` | |
| `requires_approval` | bool | If true, item stays `blocked` until you flip it |

Single-active invariant: `autonomy:activate` refuses if `active` is non-null. `autonomy:complete` refuses if `active` is null. This is the mutex.

---

## Stop / resume

```bash
bun run autonomy:stop          # pause; next check exits non-zero
bun run autonomy:stop:clear    # pause + clear pending items + clear active
bun run autonomy:resume        # unpause
bun run autonomy:check         # exit 0 if runnable, 1 if stopped
```

Agents must `autonomy:check` before claiming work, so a stop takes effect at the next turn boundary. No mid-task interruption.

---

## File map

```
.claude/commands/         # Optional Claude Code slash commands
  bootstrap.md            #   /bootstrap — seed queue from a plan
  next-agent.md           #   /next-agent — supervisor turn
  stop-autonomy.md        #   /stop-autonomy — kill switch

agents/
  README.md               # Folder overview
  queue-policy.md         # Queue semantics + stop behavior
  queue-state.example.json  # Seed for fresh installs
  roster.yaml.example     # Agent role catalog (copy → roster.yaml, customize)
  handoffs/
    README.md             # Handoff note contract + naming
  prompts/
    supervisor.md         # What a supervisor agent should output
    worker-template.md    # What a worker agent should output
    verifier.md           # Optional verifier role contract

scripts/
  autonomy-state.ts       # The whole system (~180 lines)

package.json              # autonomy:* script aliases
```

---

## Notes on agent runtimes

- **Claude Code**: the `.claude/commands/*.md` files are picked up as slash commands (`/next-agent`, `/stop-autonomy`, `/bootstrap`). Optional — you can also call `bun run autonomy:*` directly.
- **Codex**: doesn't have project-scoped slash commands. Just call `bun run autonomy:*` from your prompt or wrap it in your own automation.
- **Anything else**: the contract is shell + filesystem. No SDK required.

The `owner_agent` field is a free-form string. Validation happens at the social layer (your roster doc), not in code — pick a convention that makes sense for your project.

---

## Customizing for your project

Before first use:
1. `cp agents/roster.yaml.example agents/roster.yaml` and edit to match your project's actual agent roles.
2. Skim `agents/queue-policy.md` and `agents/handoffs/README.md` — these are the contracts every agent reads.
3. Optionally edit `.claude/commands/bootstrap.md` to point at your project's plan/roadmap doc.

That's it. Start enqueueing.
