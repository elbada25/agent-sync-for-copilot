# Agent Sync for Copilot

A Visual Studio Code extension that maintains a persistent, structured **agent context** across multiple machines sharing a remote workspace (e.g., via Remote SSH). Keep GitHub Copilot Chat grounded in your project's real state by preparing a concise, always-fresh summary ready to paste in seconds.

---

## What It Does

The extension manages a `.agent-sync/` folder inside your workspace containing four files:

| File | Purpose |
|------|---------|
| `context.md` | Master project context: goals, decisions, architecture, issues, next tasks |
| `summary.md` | Auto-generated concise digest, ready to paste directly into Copilot Chat |
| `history.jsonl` | Append-only event log (JSON Lines): decisions, summary generations |
| `config.json` | Per-workspace configuration (overrides VS Code settings) |

Key features:
- **Persistent context** — edit `context.md` on any machine; it lives on the remote
- **Instant Copilot injection** — one click copies a structured summary to clipboard
- **Auto-summary** — whenever `context.md` changes, `summary.md` is regenerated automatically (configurable)
- **SHA-256 integrity** — `Sync Now` computes and stores file hashes so you can verify both machines see the same state
- **Remote SSH compatible** — all file I/O uses `vscode.workspace.fs`, which works identically over SSH, Dev Containers, and WSL

---

## Installation (Development Mode)

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- [Visual Studio Code](https://code.visualstudio.com/) ≥ 1.85

### Steps

```bash
# 1. Open this folder in VS Code
cd agent-sync-for-copilot

# 2. Install dev dependencies
npm install

# 3. Compile TypeScript
npm run compile

# 4. Press F5 to launch the Extension Development Host
```

VS Code will open a new **Extension Development Host** window with the extension loaded. Open any folder or remote workspace in that window to start using it.

To compile in watch mode (recommended during development):

```bash
npm run watch
```

---

## Commands

All commands are available in the **Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`) under the `Agent Sync` category:

| Command | ID | Description |
|---------|----|-------------|
| **Initialize Workspace** | `agentSync.initializeWorkspace` | Creates `.agent-sync/` with default template files. Idempotent — safe to run multiple times; existing files are never overwritten. |
| **Open Context** | `agentSync.openContext` | Opens `context.md` in the editor. |
| **Append Decision** | `agentSync.appendDecision` | Prompts for a note or technical decision, appends it to `context.md` under the Decisions Log section, and records it in `history.jsonl`. |
| **Generate Summary** | `agentSync.generateSummary` | Reads `context.md` and produces a concise `summary.md` using heuristic section extraction (no LLM required). |
| **Copy Summary to Clipboard** | `agentSync.copySummaryToClipboard` | Copies `summary.md` to clipboard and shows a reminder to paste it into Copilot Chat. |
| **Sync Now** | `agentSync.syncNow` | Computes SHA-256 hashes of both files, stores them in persistent extension state, and updates the status bar. |

---

## Recommended Workflow with Copilot Chat

### One-time setup

1. Open your workspace (local or remote SSH) in VS Code.
2. Run **`Agent Sync: Initialize Workspace`** — creates `.agent-sync/` with professional templates.
3. Open **`context.md`** (via **`Agent Sync: Open Context`**) and fill in:
   - _Project Overview_ — describe your stack, purpose, and team
   - _Current Goals_ — what you are actively working on
   - _Key Architecture Decisions_ — significant design choices

### Daily workflow

```
Start of session:
  → Agent Sync: Sync Now          — verify state and refresh status bar
  → Agent Sync: Generate Summary  — rebuild summary from latest context
  → Agent Sync: Copy Summary to Clipboard → paste into Copilot Chat as opening message

During work:
  → Agent Sync: Append Decision   — log significant technical choices as you make them
  → Edit context.md directly      — auto-summary triggers on save (if enabled)

End of session:
  → Agent Sync: Generate Summary  — finalize summary
  → Commit .agent-sync/ or leave on remote — it persists automatically
```

### Starting a Copilot Chat session

Paste the copied summary as your **first message**, then ask your question:

```
[Paste summary here]

Now help me with: <your specific question>
```

This gives Copilot full awareness of your project's architecture, goals, and recent decisions without re-explaining everything from scratch.

---

## Settings

Configure via **VS Code Settings** (`Ctrl+,`, search "Agent Sync") or by editing `.agent-sync/config.json` directly. The `config.json` file takes priority over VS Code settings.

| Setting | Key in `config.json` | Type | Default | Description |
|---------|----------------------|------|---------|-------------|
| Auto-generate summary on save | `autoGenerateSummaryOnSave` | `boolean` | `true` | Automatically regenerate `summary.md` when `context.md` changes. |
| Max summary lines | `maxSummaryLines` | `number` | `50` | Maximum number of lines in the generated summary. |
| Include workspace files | `includeWorkspaceFiles` | `boolean` | `false` | Include a list of tracked workspace files in the generated summary. |

Example `.agent-sync/config.json`:

```json
{
  "maxSummaryLines": 80,
  "autoGenerateSummaryOnSave": true,
  "includeWorkspaceFiles": false
}
```

---

## Status Bar

The status bar item at the bottom-left shows the current agent state:

| State | Appearance | Meaning |
|-------|-----------|---------|
| Ready | `$(sync) AgentSync: Ready` | Summary is up to date |
| Outdated | `$(warning) AgentSync: Outdated` | Context changed since last sync or summary is missing |

**Click** the status bar item to instantly copy the summary to clipboard.

The status bar is updated:
- When **`Sync Now`** runs
- When `context.md` changes (sets Outdated)
- When `summary.md` changes (sets Ready)

---

## history.jsonl Format

Every decision and summary generation is recorded as a JSON Lines entry:

```jsonl
{"ts":"2026-04-08T10:30:00.000Z","type":"decision","text":"Switched to PostgreSQL"}
{"ts":"2026-04-08T10:35:00.000Z","type":"summary_generated"}
```

This file is append-only and can be used for audit, diffing, or feeding into future tooling.

---

## Remote SSH Notes

This extension is designed for remote-first usage:

- **`vscode.workspace.fs`** is used for all file I/O — it is the VS Code virtual filesystem API, which works identically over local, Remote SSH, Dev Container, and WSL connections.
- The `.agent-sync/` folder lives **on the remote machine** inside the workspace, so it is automatically accessible from any machine connecting to the same remote.
- The SHA-256 hash from **`Sync Now`** lets you verify that both machines are looking at exactly the same version of `context.md`.
- File watchers (`createFileSystemWatcher`) detect changes made from any machine connected to the remote, including background edits by other tools.

---

## Project Structure

```
src/
├── extension.ts                  # Entry point — activate / deactivate
├── commands/
│   ├── initializeWorkspace.ts    # Creates .agent-sync/ with template files
│   ├── openContext.ts            # Opens context.md in editor
│   ├── appendDecision.ts         # Logs a decision to context.md + history.jsonl
│   ├── generateSummary.ts        # Heuristic summary extraction → summary.md
│   ├── copySummaryToClipboard.ts # Copies summary.md to clipboard
│   └── syncNow.ts                # SHA-256 integrity check + status bar update
├── services/
│   ├── configService.ts          # Loads config.json / VS Code settings
│   ├── fileService.ts            # All file I/O via vscode.workspace.fs
│   ├── hashService.ts            # SHA-256 via Node.js built-in crypto
│   └── watcherService.ts         # FileSystemWatcher lifecycle management
└── utils/
    ├── logger.ts                 # Output channel "Agent Sync"
    ├── statusBar.ts              # Status bar item (Ready / Outdated)
    └── templates.ts              # Default content for generated files
```

---

## License

MIT
