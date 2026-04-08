import * as vscode from 'vscode';
import { AgentSyncPaths, fileExists } from '../services/fileService';
import { log } from '../utils/logger';

export async function openContext(workspaceRoot: string): Promise<void> {
    const contextPath = AgentSyncPaths.context(workspaceRoot);

    if (!(await fileExists(contextPath))) {
        const choice = await vscode.window.showWarningMessage(
            'Agent Sync: context.md not found. Initialize workspace first?',
            'Initialize',
            'Cancel'
        );
        if (choice === 'Initialize') {
            await vscode.commands.executeCommand('agentSync.initializeWorkspace');
        }
        return;
    }

    try {
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(contextPath));
        await vscode.window.showTextDocument(doc);
        log('Opened context.md in editor');
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(
            `Agent Sync: Could not open context.md — ${message}`
        );
        log(`ERROR openContext: ${message}`);
    }
}
