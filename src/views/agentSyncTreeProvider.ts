import * as vscode from 'vscode';
import { getState } from '../services/stateService';

export class AgentSyncNode {
    constructor(
        public readonly id: string,
        public readonly label: string,
        public readonly description: string | undefined,
        public readonly iconId: string | undefined,
        public readonly commandId: string | undefined,
        public readonly children: AgentSyncNode[] | undefined,
        public readonly tooltip?: string
    ) {}
}

export class AgentSyncTreeProvider implements vscode.TreeDataProvider<AgentSyncNode> {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<
        AgentSyncNode | undefined | null | void
    >();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: AgentSyncNode): vscode.TreeItem {
        const item = new vscode.TreeItem(
            element.label,
            element.children !== undefined
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.None
        );

        if (element.description !== undefined) {
            item.description = element.description;
        }

        if (element.iconId) {
            item.iconPath = new vscode.ThemeIcon(element.iconId);
        }

        if (element.tooltip !== undefined) {
            item.tooltip = new vscode.MarkdownString(element.tooltip);
        }

        if (element.commandId) {
            item.command = { command: element.commandId, title: element.label };
            item.contextValue = 'action';
            if (!element.tooltip) {
                item.tooltip = new vscode.MarkdownString(`**${element.label}**\n\nClick to run this action.`);
            }
        }

        item.id = element.id;
        return item;
    }

    getChildren(element?: AgentSyncNode): AgentSyncNode[] {
        if (!element) {
            return this.getRoots();
        }
        return element.children ?? [];
    }

    private getRoots(): AgentSyncNode[] {
        const state = getState();

        const statusLabel =
            state.status === 'ready'
                ? 'Ready'
                : state.status === 'outdated'
                ? 'Outdated'
                : 'Unknown';

        const statusIcon =
            state.status === 'ready'
                ? 'pass'
                : state.status === 'outdated'
                ? 'warning'
                : 'circle-slash';

        const lastSync = state.lastSyncAt
            ? new Date(state.lastSyncAt).toLocaleTimeString()
            : 'Never';

        return [
            new AgentSyncNode(
                'status-section',
                'Status',
                undefined,
                undefined,
                undefined,
                [
                    new AgentSyncNode(
                        'status-state',
                        'State',
                        statusLabel,
                        statusIcon,
                        undefined,
                        undefined,
                        `**Local sync state**\n\n- \`ready\` — summary is up-to-date\n- \`outdated\` — context.md changed since last summary\n- \`unknown\` — not yet determined`
                    ),
                    new AgentSyncNode(
                        'status-lastsync',
                        'Last Sync',
                        lastSync,
                        'history',
                        undefined,
                        undefined,
                        'Timestamp of the last time a summary was generated from context.md'
                    ),
                ],
                'Current local sync state for this workspace'
            ),
            new AgentSyncNode(
                'actions-section',
                'Actions',
                undefined,
                undefined,
                undefined,
                [
                    new AgentSyncNode(
                        'action-init',
                        'Initialize Workspace',
                        undefined,
                        'folder-opened',
                        'agentSync.initializeWorkspace',
                        undefined,
                        'Creates `.agent-sync/` folder with `context.md`, `summary.md`, `history.jsonl`, and `config.json` in the current workspace.'
                    ),
                    new AgentSyncNode(
                        'action-detect',
                        'Detect Context from Workspace',
                        undefined,
                        'search',
                        'agentSync.detectContext',
                        undefined,
                        'Scans the workspace for agent files (`.github/copilot-instructions.md`, `AGENTS.md`, `CLAUDE.md`, `*.instructions.md`, `*.prompt.md`, `README.md`, `package.json`) and uses them to auto-populate `context.md`.'
                    ),
                    new AgentSyncNode(
                        'action-open',
                        'Open Context',
                        undefined,
                        'file-text',
                        'agentSync.openContext',
                        undefined,
                        'Opens `context.md` in the editor — the main file where you document your project context for the AI agent.'
                    ),
                    new AgentSyncNode(
                        'action-decision',
                        'Append Decision',
                        undefined,
                        'add',
                        'agentSync.appendDecision',
                        undefined,
                        'Prompts for a decision or technical note, appends it with a timestamp to `context.md` and logs it in `history.jsonl`.'
                    ),
                    new AgentSyncNode(
                        'action-summary',
                        'Generate Summary',
                        undefined,
                        'list-ordered',
                        'agentSync.generateSummary',
                        undefined,
                        'Generates a condensed `summary.md` from the current `context.md` — use this to give the AI agent a quick overview.'
                    ),
                    new AgentSyncNode(
                        'action-copy',
                        'Copy Summary to Clipboard',
                        undefined,
                        'clippy',
                        'agentSync.copySummaryToClipboard',
                        undefined,
                        'Copies the contents of `summary.md` to the clipboard so you can paste it directly into a chat with the AI agent.'
                    ),
                    new AgentSyncNode(
                        'action-history',
                        'View History',
                        undefined,
                        'list-flat',
                        'agentSync.viewHistory',
                        undefined,
                        'Shows a searchable list of all decisions and events logged in `history.jsonl`. Select an entry to copy its text.'
                    ),
                    new AgentSyncNode(
                        'action-sync',
                        'Sync Now',
                        undefined,
                        'sync',
                        'agentSync.syncNow',
                        undefined,
                        'Checks for changes in `context.md` and regenerates `summary.md` if needed.'
                    ),
                ],
                'Local actions for managing agent context in this workspace'
            ),
            new AgentSyncNode(
                'cloud-section',
                'Cloud Sync',
                undefined,
                undefined,
                undefined,
                [
                    new AgentSyncNode(
                        'cloud-status',
                        'Status',
                        state.cloudConfigured ? 'Configured' : 'Not configured',
                        state.cloudConfigured ? 'cloud' : 'cloud-slash',
                        undefined,
                        undefined,
                        state.cloudConfigured
                            ? 'Cloud sync is configured. Your GitHub token and data repo are stored securely in the OS keychain.'
                            : 'Cloud sync is not configured yet. Click **Configure Cloud Sync** to set up your GitHub account.'
                    ),
                    new AgentSyncNode(
                        'cloud-last-push',
                        'Last Push',
                        state.cloudLastPushAt
                            ? new Date(state.cloudLastPushAt).toLocaleTimeString()
                            : 'Never',
                        'cloud-upload',
                        undefined,
                        undefined,
                        'Last time context files were pushed to your private GitHub data repository from this machine.'
                    ),
                    new AgentSyncNode(
                        'cloud-last-pull',
                        'Last Pull',
                        state.cloudLastPullAt
                            ? new Date(state.cloudLastPullAt).toLocaleTimeString()
                            : 'Never',
                        'cloud-download',
                        undefined,
                        undefined,
                        'Last time context files were pulled from your private GitHub data repository to this machine.'
                    ),
                    new AgentSyncNode(
                        'action-configure-sync',
                        'Configure Cloud Sync',
                        undefined,
                        'gear',
                        'agentSync.configureSync',
                        undefined,
                        'Opens a 3-step wizard to set up cloud sync:\\n1. Enter your GitHub Personal Access Token (scope: `repo`)\\n2. Choose the private data repo name (e.g. `agent-sync-data`)\\n3. Repo is created automatically if it doesn\'t exist\\n\\nWorks with **any GitHub account** — token is stored securely in the OS keychain.'
                    ),
                    new AgentSyncNode(
                        'action-cloud-push',
                        'Push to Cloud',
                        undefined,
                        'cloud-upload',
                        'agentSync.cloudPush',
                        undefined,
                        'Uploads `context.md`, `summary.md`, `history.jsonl`, and `config.json` from this workspace to your private GitHub data repo.\\n\\nHistory entries are merged (deduplicated by timestamp) \u2014 no data is lost.'
                    ),
                    new AgentSyncNode(
                        'action-cloud-pull',
                        'Pull from Cloud',
                        undefined,
                        'cloud-download',
                        'agentSync.cloudPull',
                        undefined,
                        'Downloads `context.md`, `summary.md`, `history.jsonl`, and `config.json` from your private GitHub data repo to this workspace.\\n\\nHistory is merged with local entries \u2014 useful when switching between machines.'
                    ),
                ],
                'Sync context files across machines via a private GitHub repository'
            ),
        ];
    }
}
