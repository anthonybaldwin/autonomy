# Bootstrap Autonomy Queue

Use this prompt to seed the autonomy queue from a project plan or roadmap.

Hard requirement: read `AGENTS.md` first. If you have not read it in this
session, stop and read it before taking any action.

Then read the applicable runtime overlay, `agents/roster.yaml`,
`agents/queue-policy.md`, and `agents/handoffs/README.md`.

## Task

1. Locate the project plan or roadmap, such as `PLAN.md`, `ROADMAP.md`,
   `.plans/`, or a milestone section in `README.md`. If none exists, ask before
   inventing one.
2. Identify the current phase and one or two next bounded tasks.
3. Choose `--role` values only from `agents/roster.yaml` role ids.
4. Enqueue items with:

   ```bash
   bun run autonomy:enqueue --id <id> --role <role-id> --priority <high|normal|low> --description "<desc>"
   ```

5. Do not use runtime names such as `codex`, `claude`, `claude-code`,
   `gemini`, `gemini-cli`, `worker`, or `verifier` unless the roster explicitly
   defines them as roles.
6. Do not mark tasks done without verification.
7. If queue or roster setup behaves unexpectedly, run
   `bun run autonomy:doctor` and report the findings.

Stop after seeding the queue unless the user explicitly asks you to continue.
