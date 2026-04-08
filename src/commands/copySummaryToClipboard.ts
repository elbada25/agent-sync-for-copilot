import * as vscode from 'vscode';
import { AgentSyncPaths, readFile, fileExists } from '../services/fileService';
import { log } from '../utils/logger';

export async function copySummaryToClipboard(workspaceRoot: string): Promise<void> {
    const summaryPath = AgentSyncPaths.summary(workspaceRoot);

    if (!(await fileExists(summaryPath))) {
        const choice = await vscode.window.showWarningMessage(
            'Agent Sync: summary.md not found. Generate it first?',
            'Generate',
            'Cancel'
        );
        if (choice === 'Generate') {
            await vscode.commands.executeCommand('agentSync.generateSummary');
        }
        return;
    }

    try {
        const content = await readFile(summaryPath);
        await vscode.env.clipboard.writeText(content);
        log('Summary copied to clipboard');
        vscode.window.showInformationMessage(
            'Agent summary copied. Paste it into Copilot Chat.'
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(
            `Agent Sync: Failed to copy summary — ${message}`
        );
        log(`ERROR copySummaryToClipboard: ${message}`);
    }
}
