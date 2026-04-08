<!-- agent-sync:start -->

# Agent Summary

> Generated: 2026-04-08T23:22:01.8589556+02:00


## Project Overview
**Project:** Agent Sync for Copilot — VS Code Extension
**Publisher:** agent-sync (GitHub: elbada25/agent-sync-for-copilot)
**Stack:** TypeScript, VS Code Extension API v1.90+, Node.js built-ins (https, crypto, child_process), no runtime npm dependencies
**Repo:** https://github.com/elbada25/agent-sync-for-copilot

The extension maintains a `.agent-sync/` folder in each workspace with `context.md`, `summary.md`, `history.jsonl`, and `config.json`. It syncs context across machines via a private GitHub repository and automatically injects project context into Copilot Chat via `.github/copilot-instructions.md`.


## Current Goals
- [x] v0.1.0: Core local context management (6 commands, sidebar panel, SSH support)
- [x] v0.2.0: Cloud sync via private GitHub repo (push/pull with history merge)
- [x] v0.2.1: Tooltips, View History command, cloudDataRepo setting
- [x] v0.3.1: Fix viewHistory crash (entry.text undefined), surface workspace slug in cloud pull warnings


## Key Architecture Decisions
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-08 | extensionKind: ["ui"] | Makes extension run locally even over Remote SSH |
| 2026-04-08 | vscode.workspace.fs for all I/O | Transparent over SSH, WSL, Dev Containers |
| 2026-04-08 | vscode.SecretStorage for GitHub PAT | Token never written to disk |
| 2026-04-08 | GitHub Contents API via Node.js https | Zero npm runtime dependencies |
| 2026-04-08 | history.jsonl merge by ts deduplication | No data loss on multi-machine pull |
| 2026-04-08 | .github/copilot-instructions.md markers | Preserves user content outside agent-sync section |
| 2026-04-08 | Chat Participant @agent-sync | Interactive commands: /save /context /history |


## Known Issues / Bugs
- None currently known.


## Next Tasks
1. Publish to VS Code Marketplace (requires publisher account setup)
2. Add `.agent-sync/` to `.gitignore` recommendation in README
3. Consider prompt.md files for structured prompts per workspace
4. Show workspace slug in Cloud Sync sidebar node for easy cross-machine comparison

<!-- agent-sync:end -->
