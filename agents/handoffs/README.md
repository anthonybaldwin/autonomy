# Handoffs Directory

Write one handoff file per completed agent run.

## File naming
- `YYYYMMDD-HHMMSS-<role-id>.md`
- Use the roster role id for `<role-id>`, not the runtime name.

## Required sections
1. Header metadata:
   - `Role`: the active queue item's roster `owner_role`.
   - `Runtime`: the tool that executed the work, such as Codex or Claude Code.
   - `Queue item`: active item id.
   - `Status`: `done`, `failed`, `blocked`, or `cancelled`.
2. Scope and constraints handled.
3. Files changed.
4. Validation commands and outcomes.
5. Risks/open questions.
6. Next recommended owner role and queue priority.

The next recommended owner must be a role id from `agents/roster.yaml`. Do not
write `codex`, `claude`, `claude-code`, `gemini`, `gemini-cli`, `worker`, or
`verifier` unless the roster explicitly defines that id as a role.

## Header example

```md
Role: backend-api
Runtime: Claude Code
Queue item: auth-123
Status: done
```
