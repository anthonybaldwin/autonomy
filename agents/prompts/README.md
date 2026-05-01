# Prompt Templates

This folder contains reusable prompt contracts for the autonomy kit.

## Command prompt templates

`commands/*.md` files are the provider-neutral source of truth for reusable
autonomy prompts:

- `commands/bootstrap.md`
- `commands/next-agent.md`
- `commands/stop-autonomy.md`

Provider command files should be thin adapters that load these prompt templates.
Do not duplicate the full workflow in `.claude/commands/` or
`.gemini/commands/` unless a provider cannot load the shared file.

## Runtime support

- Claude Code loads project commands from `.claude/commands/*.md`.
- Gemini CLI loads project commands from `.gemini/commands/*.toml`.
- Codex should be pointed at these prompt templates directly or use Codex
  skills; Codex custom prompts are not project-local and are deprecated in the
  current official docs.
- MCP prompts are a separate mechanism that requires an MCP server. This
  template does not ship an MCP server.
