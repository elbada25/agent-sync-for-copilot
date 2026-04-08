# Agent Sync for Copilot

A Visual Studio Code extension that keeps a **persistent, structured agent context** in your workspace and syncs it across any number of machines via a private GitHub repository. Keep GitHub Copilot Chat grounded in your project's real state — paste a fresh summary in one click from anywhere.

---

## Quick Start (5 minutes)

### 1. Install the extension

Download the latest `.vsix` from [Releases](https://github.com/elbada25/agent-sync-for-copilot/releases) and install it:

```bash
code --install-extension agent-sync-for-copilot-0.2.1.vsix --force
```

Or install from source (requires Node.js ≥ 18):

```bash
git clone https://github.com/elbada25/agent-sync-for-copilot.git
cd agent-sync-for-copilot
npm install
npm run package
code --install-extension agent-sync-for-copilot-0.2.1.vsix --force
```

### 2. Open a workspace

Open any folder or remote SSH workspace in VS Code. The **Agent Sync** icon will appear in the Activity Bar on the left.

### 3. Initialize the workspace

Click the Agent Sync icon → click **Initialize Workspace** (or use `Ctrl+Shift+P` → `Agent Sync: Initialize Workspace`).

This creates a `.agent-sync/` folder with four files:

| File | Purpose |
|------|---------|
| `context.md` | Your main project context: goals, decisions, architecture, open questions |
| `summary.md` | Auto-generated concise digest — paste this into Copilot Chat |
| `history.jsonl` | Append-only log of all decisions and events |
| `config.json` | Per-workspace settings |

### 4. Fill in your context

Click **Open Context** to open `context.md` and describe your project:
- What it does and the tech stack
- Current goals and what you are working on
- Key architecture decisions already made

### 5. Use it with Copilot Chat

```
Agent Sync: Generate Summary        ← builds summary.md from context.md
Agent Sync: Copy Summary to Clipboard  ← one click
```

Paste the summary as the **first message** in a Copilot Chat session:

```
[paste summary here]

Now help me with: <your question>
```

Copilot now has full awareness of your project without you re-explaining anything.

---

## Sidebar Panel

Click the **Agent Sync** icon in the Activity Bar to open the panel. It has three sections:

### Status
Shows the local sync state:
- `Ready` — `summary.md` is up to date
- `Outdated` — `context.md` changed since the last summary

### Actions
All local commands as clickable buttons. Hover over any button to see a description of what it does.

| Button | What it does |
|--------|-------------|
| Initialize Workspace | Creates `.agent-sync/` with template files (safe to run again) |
| Open Context | Opens `context.md` in the editor |
| Append Decision | Prompts for a note, appends it with timestamp to `context.md` and logs to `history.jsonl` |
| Generate Summary | Rebuilds `summary.md` from your `context.md` |
| Copy Summary to Clipboard | Copies `summary.md` — ready to paste into Copilot Chat |
| View History | Opens a searchable list of all logged decisions; select one to copy its text |
| Sync Now | Recomputes SHA-256 hashes and refreshes the status bar |

### Cloud Sync
Sync your context across machines via a private GitHub repo. Hover any item to see details.

| Item / Button | What it shows / does |
|---------------|----------------------|
| Status | Whether cloud sync is configured on this machine |
| Last Push | Timestamp of the last upload from this machine |
| Last Pull | Timestamp of the last download to this machine |
| Configure Cloud Sync | 3-step wizard to connect your GitHub account |
| Push to Cloud | Uploads all 4 files to your GitHub data repo |
| Pull from Cloud | Downloads files from GitHub and merges history |

---

## Cloud Sync — Multi-machine Setup

Cloud sync uses a **private GitHub repository** as a neutral store. It works with any GitHub account.

### Prerequisites

A GitHub **Personal Access Token** (PAT) with the `repo` scope:
1. Go to [github.com/settings/tokens](https://github.com/settings/tokens) → **Generate new token (classic)**
2. Enable the `repo` scope
3. Copy the token

### Configure on each machine

1. Click **Configure Cloud Sync** in the sidebar (or `Ctrl+Shift+P` → `Agent Sync: Configure Cloud Sync`)
2. **Step 1** — Enter your GitHub PAT. The token is validated immediately and stored in the OS keychain (never written to disk).
3. **Step 2** — Enter the data repo name (default: `agent-sync-data`). This is a private repo that will be created automatically in your GitHub account if it doesn't exist yet.
4. **Step 3** — Confirmation. The wizard shows your username and the workspace slug (derived from the git remote or folder name) that identifies this workspace in the repo.

The configuration is per-machine. You can pre-fill the repo name via VS Code settings (see [Settings](#settings)) so the wizard always suggests the correct name without you typing it.

### Daily multi-machine workflow

```
Machine A (morning):
  → Push to Cloud          ← uploads your latest context

Machine B (continue work):
  → Pull from Cloud        ← downloads context + merges history
  → Open Context / work
  → Append Decision        ← logs decisions locally
  → Push to Cloud          ← sync back

Machine A (later):
  → Pull from Cloud        ← picks up changes from Machine B
```

History entries are **merged by timestamp** — no data is lost when pulling, even if both machines have new entries.

### Data structure in your GitHub repo

```
agent-sync-data/                     ← your private data repo
└── workspaces/
    ├── myorg-my-api/                ← slug from git remote (owner-repo)
    │   ├── context.md
    │   ├── summary.md
    │   ├── history.jsonl
    │   └── config.json
    └── my-local-project/            ← slug from folder name (fallback)
        └── ...
```

Each workspace has its own folder identified by a slug derived from the git remote URL (`owner-repo`) or the workspace folder name if there is no git remote.

---

## All Commands

Available in the Command Palette (`Ctrl+Shift+P`) under the `Agent Sync` category, and as buttons in the sidebar panel.

| Command | Description |
|---------|-------------|
| `Agent Sync: Initialize Workspace` | Creates `.agent-sync/` with template files. Idempotent — never overwrites existing files. |
| `Agent Sync: Open Context` | Opens `context.md` in the editor. |
| `Agent Sync: Append Decision` | Prompts for a decision or note, appends it with timestamp to `context.md` and records it in `history.jsonl`. |
| `Agent Sync: Generate Summary` | Reads `context.md` and produces a concise `summary.md` (no LLM required — uses heuristic section extraction). |
| `Agent Sync: Copy Summary to Clipboard` | Copies `summary.md` to clipboard with a prompt to paste it into Copilot Chat. |
| `Agent Sync: View History` | Shows all `history.jsonl` entries in a searchable Quick Pick list (newest first). Select an entry to copy its text. |
| `Agent Sync: Sync Now` | Computes SHA-256 hashes of context files, stores them, and updates the status bar. |
| `Agent Sync: Configure Cloud Sync` | Opens the 3-step wizard to link a GitHub account and data repo. |
| `Agent Sync: Push to Cloud` | Uploads `context.md`, `summary.md`, `history.jsonl`, `config.json` to the GitHub data repo. |
| `Agent Sync: Pull from Cloud` | Downloads files from the GitHub data repo. History is merged — local entries are preserved. |

---

## Settings

Configure via **VS Code Settings** (`Ctrl+,`, search `Agent Sync`) or by editing `.agent-sync/config.json` directly. `config.json` takes priority.

| VS Code Setting | Type | Default | Description |
|-----------------|------|---------|-------------|
| `agentSync.cloudDataRepo` | `string` | `agent-sync-data` | Name of the private GitHub repo used for cloud sync. Shared across machines via settings sync. The token is always stored in the OS keychain separately. |
| `agentSync.autoGenerateSummaryOnSave` | `boolean` | `true` | Automatically regenerate `summary.md` when `context.md` changes. |
| `agentSync.maxSummaryLines` | `number` | `50` | Maximum number of lines in the generated summary. |
| `agentSync.includeWorkspaceFiles` | `boolean` | `false` | Include a list of tracked workspace files in the generated summary. |

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

The status bar item at the bottom shows the current state:

| State | Meaning |
|-------|---------|
| `$(sync) AgentSync: Ready` | Summary is up to date |
| `$(warning) AgentSync: Outdated` | `context.md` changed since the last summary |

**Click** the status bar item to instantly copy the summary to clipboard.

---

## history.jsonl Format

Every decision and summary generation is recorded as a JSON Lines entry:

```jsonl
{"ts":"2026-04-08T10:30:00.000Z","type":"decision","text":"Switched to PostgreSQL for better JSON support"}
{"ts":"2026-04-08T10:35:00.000Z","type":"summary_generated"}
```

Entries are deduplicated by `ts` during cloud pull — so pulling from multiple machines never creates duplicate records.

---

## Remote SSH & Dev Containers

This extension runs on the **local machine** (`"extensionKind": ["ui"]`) even when the workspace is on a remote host. This means:

- The sidebar, cloud sync, and all commands work over Remote SSH, WSL, and Dev Containers
- All file I/O uses `vscode.workspace.fs` — the VS Code virtual filesystem, transparent over any connection
- The GitHub token is stored in the **local** OS keychain (not on the remote server)
- The `.agent-sync/` folder lives on the **remote** machine, inside the workspace — accessible from any client connecting to the same host

---

## Project Structure

```
src/
├── extension.ts
├── commands/
│   ├── initializeWorkspace.ts
│   ├── openContext.ts
│   ├── appendDecision.ts
│   ├── generateSummary.ts
│   ├── copySummaryToClipboard.ts
│   ├── syncNow.ts
│   ├── viewHistory.ts           # Quick Pick history browser
│   ├── configureSync.ts         # Cloud sync wizard (3 steps)
│   ├── cloudPush.ts             # Upload to GitHub data repo
│   └── cloudPull.ts             # Download + merge from GitHub data repo
├── services/
│   ├── configService.ts
│   ├── fileService.ts
│   ├── hashService.ts
│   ├── watcherService.ts
│   ├── stateService.ts          # In-memory state (status, cloud timestamps)
│   ├── secretService.ts         # vscode.SecretStorage wrapper (GitHub PAT)
│   ├── workspaceIdService.ts    # Derives workspace slug from git remote
│   ├── githubSyncService.ts     # GitHub Contents API (no npm deps)
│   └── cloudSyncService.ts      # Push/pull orchestrator with history merge
├── views/
│   └── agentSyncTreeProvider.ts # Sidebar tree with tooltips
└── utils/
    ├── logger.ts
    ├── statusBar.ts
    └── templates.ts
```
```

---

## License

MIT
