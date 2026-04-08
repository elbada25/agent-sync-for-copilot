import * as vscode from 'vscode';
import {
    AgentSyncPaths,
    ensureDir,
    fileExists,
    writeFile,
} from '../services/fileService';
import {
    CONTEXT_MD_TEMPLATE,
    SUMMARY_MD_TEMPLATE,
    HISTORY_JSONL_TEMPLATE,
    CONFIG_JSON_TEMPLATE,
} from '../utils/templates';
import { log } from '../utils/logger';

export async function initializeWorkspace(workspaceRoot: string): Promise<void> {
    try {
        await ensureDir(AgentSyncPaths.dir(workspaceRoot));

        const files: Array<[string, string]> = [
            [AgentSyncPaths.context(workspaceRoot), CONTEXT_MD_TEMPLATE],
            [AgentSyncPaths.summary(workspaceRoot), SUMMARY_MD_TEMPLATE],
            [AgentSyncPaths.history(workspaceRoot), HISTORY_JSONL_TEMPLATE],
            [AgentSyncPaths.config(workspaceRoot), CONFIG_JSON_TEMPLATE],
        ];

        let created = 0;
        let skipped = 0;

        for (const [filePath, template] of files) {
            if (await fileExists(filePath)) {
                log(`Skipped (already exists): ${filePath}`);
                skipped++;
            } else {
                await writeFile(filePath, template);
                log(`Created: ${filePath}`);
                created++;
            }
        }

        vscode.window.showInformationMessage(
            `Agent Sync: Workspace initialized. ${created} file(s) created, ${skipped} already existed.`
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(
            `Agent Sync: Failed to initialize workspace — ${message}`
        );
        log(`ERROR initializeWorkspace: ${message}`);
    }
}
