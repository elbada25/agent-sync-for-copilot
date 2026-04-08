import * as vscode from 'vscode';
import { log, getChannel, disposeChannel } from './utils/logger';
import { StatusBarManager } from './utils/statusBar';
import { WatcherService } from './services/watcherService';
import { loadConfig } from './services/configService';
import { setState } from './services/stateService';
import { AgentSyncTreeProvider } from './views/agentSyncTreeProvider';
import { initializeWorkspace } from './commands/initializeWorkspace';
import { openContext } from './commands/openContext';
import { appendDecision } from './commands/appendDecision';
import { generateSummary } from './commands/generateSummary';
import { copySummaryToClipboard } from './commands/copySummaryToClipboard';
import { syncNow } from './commands/syncNow';
import { configureSync } from './commands/configureSync';
import { cloudPush } from './commands/cloudPush';
import { cloudPull } from './commands/cloudPull';
import { viewHistory } from './commands/viewHistory';

export function activate(ctx: vscode.ExtensionContext): void {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        // No workspace open — extension is loaded but idle
        return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    // Initialize singletons
    getChannel(); // ensure channel is created early
    const statusBar = new StatusBarManager();
    statusBar.show();

    const treeProvider = new AgentSyncTreeProvider();
    const treeView = vscode.window.createTreeView('agentSyncView', {
        treeDataProvider: treeProvider,
        showCollapseAll: false,
    });

    log(`Extension activated. Workspace root: ${workspaceRoot}`);

    // File watcher
    const watcher = new WatcherService(
        workspaceRoot,
        // context.md changed
        async () => {
            setState({ status: 'outdated' });
            statusBar.setOutdated();
            treeProvider.refresh();
            const config = await loadConfig(workspaceRoot);
            if (config.autoGenerateSummaryOnSave) {
                log('Auto-generating summary on context.md change…');
                await generateSummary(workspaceRoot, config);
            }
        },
        // summary.md changed
        () => {
            setState({ status: 'ready' });
            statusBar.setReady();
            treeProvider.refresh();
        }
    );
    watcher.start();

    // Register commands
    ctx.subscriptions.push(
        vscode.commands.registerCommand(
            'agentSync.initializeWorkspace',
            () => initializeWorkspace(workspaceRoot)
        ),
        vscode.commands.registerCommand(
            'agentSync.openContext',
            () => openContext(workspaceRoot)
        ),
        vscode.commands.registerCommand(
            'agentSync.appendDecision',
            () => appendDecision(workspaceRoot)
        ),
        vscode.commands.registerCommand(
            'agentSync.generateSummary',
            async () => {
                const config = await loadConfig(workspaceRoot);
                await generateSummary(workspaceRoot, config);
            }
        ),
        vscode.commands.registerCommand(
            'agentSync.copySummaryToClipboard',
            () => copySummaryToClipboard(workspaceRoot)
        ),
        vscode.commands.registerCommand(
            'agentSync.syncNow',
            async () => {
                await syncNow(workspaceRoot, ctx.globalState, statusBar);
                treeProvider.refresh();
            }
        ),
        vscode.commands.registerCommand(
            'agentSync.refreshView',
            () => treeProvider.refresh()
        ),
        vscode.commands.registerCommand(
            'agentSync.viewHistory',
            () => viewHistory(workspaceRoot)
        ),
        vscode.commands.registerCommand(
            'agentSync.configureSync',
            async () => {
                const ok = await configureSync(workspaceRoot, ctx.secrets);
                if (ok) { treeProvider.refresh(); }
            }
        ),
        vscode.commands.registerCommand(
            'agentSync.cloudPush',
            async () => {
                await cloudPush(workspaceRoot, ctx.secrets);
                treeProvider.refresh();
            }
        ),
        vscode.commands.registerCommand(
            'agentSync.cloudPull',
            async () => {
                await cloudPull(workspaceRoot, ctx.secrets);
                treeProvider.refresh();
            }
        ),
        treeView,
        statusBar,
        watcher,
        { dispose: () => disposeChannel() }
    );

    log('All commands registered. Ready.');
}

export function deactivate(): void {
    // Cleanup is handled through ctx.subscriptions registered in activate()
}
