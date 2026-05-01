# Prompt Contracts

This folder contains prompt contracts for supervisor, worker, and verifier runs.

The reusable autonomy workflow itself lives in the `autonomy-queue` Agent Skill:

- `.agents/skills/autonomy-queue/SKILL.md` - canonical skill source.
- `.claude/skills/autonomy-queue/SKILL.md` - Claude Code project-skill wrapper.
- `.gemini/skills/autonomy-queue/SKILL.md` - Gemini CLI project-skill wrapper.

Provider slash commands, when present, are only aliases that invoke the skill.
