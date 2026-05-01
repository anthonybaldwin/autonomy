# /bootstrap

Seed the autonomy queue from the project's plan or roadmap.

Requirements:
1. Locate the project plan/roadmap (e.g. `PLAN.md`, `ROADMAP.md`, `.plans/`, or the README's milestone section). If none exists, ask the user before inventing one.
2. Identify the current phase or set of next-up tasks.
3. Enqueue items via `bun run autonomy:enqueue --id <id> --agent <agent> --priority <pri> --description "<desc>"`.
4. Do not skip phases or mark tasks done without verification.
