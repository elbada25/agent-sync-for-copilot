import * as vscode from 'vscode';
import { AgentSyncPaths } from './fileService';

export interface AgentConfig {
    maxSummaryLines: number;
    autoGenerateSummaryOnSave: boolean;
    includeWorkspaceFiles: boolean;
}

const DEFAULTS: AgentConfig = {
    maxSummaryLines: 50,
    autoGenerateSummaryOnSave: true,
    includeWorkspaceFiles: false,
};

export async function loadConfig(workspaceRoot: string): Promise<AgentConfig> {
    const configPath = AgentSyncPaths.config(workspaceRoot);
    try {
        const raw = await vscode.workspace.fs.readFile(vscode.Uri.file(configPath));
        const parsed = JSON.parse(Buffer.from(raw).toString('utf8')) as Partial<AgentConfig>;
        return {
            maxSummaryLines:
                typeof parsed.maxSummaryLines === 'number'
                    ? parsed.maxSummaryLines
                    : DEFAULTS.maxSummaryLines,
            autoGenerateSummaryOnSave:
                typeof parsed.autoGenerateSummaryOnSave === 'boolean'
                    ? parsed.autoGenerateSummaryOnSave
                    : DEFAULTS.autoGenerateSummaryOnSave,
            includeWorkspaceFiles:
                typeof parsed.includeWorkspaceFiles === 'boolean'
                    ? parsed.includeWorkspaceFiles
                    : DEFAULTS.includeWorkspaceFiles,
        };
    } catch {
        // Fall back to VS Code settings
        const cfg = vscode.workspace.getConfiguration('agentSync');
        return {
            maxSummaryLines: cfg.get<number>('maxSummaryLines', DEFAULTS.maxSummaryLines),
            autoGenerateSummaryOnSave: cfg.get<boolean>(
                'autoGenerateSummaryOnSave',
                DEFAULTS.autoGenerateSummaryOnSave
            ),
            includeWorkspaceFiles: cfg.get<boolean>(
                'includeWorkspaceFiles',
                DEFAULTS.includeWorkspaceFiles
            ),
        };
    }
}
