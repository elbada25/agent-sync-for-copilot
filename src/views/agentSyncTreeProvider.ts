import * as vscode from 'vscode';
import { getState } from '../services/stateService';

export class AgentSyncNode {
    constructor(
        public readonly id: string,
        public readonly label: string,
        public readonly description: string | undefined,
        public readonly iconId: string | undefined,
        public readonly commandId: string | undefined,
        public readonly children: AgentSyncNode[] | undefined
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

        if (element.commandId) {
            item.command = { command: element.commandId, title: element.label };
            item.contextValue = 'action';
            item.tooltip = `Run: ${element.label}`;
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
            new AgentSyncNode('status-section', 'Status', undefined, undefined, undefined, [
                new AgentSyncNode(
                    'status-state',
                    'State',
                    statusLabel,
                    statusIcon,
                    undefined,
                    undefined
                ),
                new AgentSyncNode(
                    'status-lastsync',
                    'Last Sync',
                    lastSync,
                    'history',
                    undefined,
                    undefined
                ),
            ]),
            new AgentSyncNode('actions-section', 'Actions', undefined, undefined, undefined, [
                new AgentSyncNode(
                    'action-init',
                    'Initialize Workspace',
                    undefined,
                    'folder-opened',
                    'agentSync.initializeWorkspace',
                    undefined
                ),
                new AgentSyncNode(
                    'action-open',
                    'Open Context',
                    undefined,
                    'file-text',
                    'agentSync.openContext',
                    undefined
                ),
                new AgentSyncNode(
                    'action-decision',
                    'Append Decision',
                    undefined,
                    'add',
                    'agentSync.appendDecision',
                    undefined
                ),
                new AgentSyncNode(
                    'action-summary',
                    'Generate Summary',
                    undefined,
                    'list-ordered',
                    'agentSync.generateSummary',
                    undefined
                ),
                new AgentSyncNode(
                    'action-copy',
                    'Copy Summary to Clipboard',
                    undefined,
                    'clippy',
                    'agentSync.copySummaryToClipboard',
                    undefined
                ),
                new AgentSyncNode(
                    'action-sync',
                    'Sync Now',
                    undefined,
                    'sync',
                    'agentSync.syncNow',
                    undefined
                ),
            ]),
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
                        undefined
                    ),
                    new AgentSyncNode(
                        'cloud-last-push',
                        'Last Push',
                        state.cloudLastPushAt
                            ? new Date(state.cloudLastPushAt).toLocaleTimeString()
                            : 'Never',
                        'cloud-upload',
                        undefined,
                        undefined
                    ),
                    new AgentSyncNode(
                        'cloud-last-pull',
                        'Last Pull',
                        state.cloudLastPullAt
                            ? new Date(state.cloudLastPullAt).toLocaleTimeString()
                            : 'Never',
                        'cloud-download',
                        undefined,
                        undefined
                    ),
                    new AgentSyncNode(
                        'action-configure-sync',
                        'Configure Cloud Sync',
                        undefined,
                        'gear',
                        'agentSync.configureSync',
                        undefined
                    ),
                    new AgentSyncNode(
                        'action-cloud-push',
                        'Push to Cloud',
                        undefined,
                        'cloud-upload',
                        'agentSync.cloudPush',
                        undefined
                    ),
                    new AgentSyncNode(
                        'action-cloud-pull',
                        'Pull from Cloud',
                        undefined,
                        'cloud-download',
                        'agentSync.cloudPull',
                        undefined
                    ),
                ]
            ),
        ];
    }
}
