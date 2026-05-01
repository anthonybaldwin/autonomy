---
description: Seed the autonomy queue from a project plan using roster role ids.
argument-hint: "[optional plan source]"
---

# /bootstrap

Seed the autonomy queue from the project's plan or roadmap.

Requirements:
1. Read `AGENTS.md` first. If you have not read it in this session, stop and read it before taking any action.
2. Read `CLAUDE.md`, `agents/roster.yaml`, `agents/queue-policy.md`, and `agents/handoffs/README.md`.
3. Locate the project plan/roadmap (e.g. `PLAN.md`, `ROADMAP.md`, `.plans/`, or the README's milestone section). If none exists, ask the user before inventing one.
4. Identify the current phase or one or two next-up tasks.
5. Choose `--role` values only from `agents/roster.yaml` role ids.
6. Enqueue items via `bun run autonomy:enqueue --id <id> --role <role-id> --priority <pri> --description "<desc>"`.
7. Do not use runtime names like `claude`, `claude-code`, `codex`, `gemini`, `gemini-cli`, `worker`, or `verifier` unless the roster explicitly defines them as roles.
8. Do not skip phases or mark tasks done without verification.
9. If queue or roster setup behaves unexpectedly, run `bun run autonomy:doctor` and report the findings.

User arguments: $ARGUMENTS
