import * as vscode from 'vscode';
import {
    AgentSyncPaths,
    readFile,
    writeFile,
    appendToFile,
    fileExists,
} from '../services/fileService';
import { log } from '../utils/logger';

const DECISIONS_HEADER = '## Decisions Log';

export async function appendDecision(workspaceRoot: string): Promise<void> {
    const contextPath = AgentSyncPaths.context(workspaceRoot);
    const historyPath = AgentSyncPaths.history(workspaceRoot);

    if (!(await fileExists(contextPath))) {
        vscode.window.showErrorMessage(
            'Agent Sync: context.md not found. Run "Initialize Workspace" first.'
        );
        return;
    }

    const decision = await vscode.window.showInputBox({
        title: 'Agent Sync: Append Decision',
        prompt: 'Enter a decision, note, or technical observation',
        placeHolder: 'e.g. Switched to PostgreSQL for better JSON support',
        ignoreFocusOut: true,
    });

    if (!decision || decision.trim() === '') {
        return;
    }

    const ts = new Date().toISOString();
    const trimmed = decision.trim();

    try {
        let content = await readFile(contextPath);
        const entry = `\n- [${ts}] ${trimmed}`;

        if (content.includes(DECISIONS_HEADER)) {
            content = content + entry;
        } else {
            content = content + `\n\n${DECISIONS_HEADER}\n${entry}`;
        }

        await writeFile(contextPath, content);

        const record = JSON.stringify({ ts, type: 'decision', text: trimmed });
        await appendToFile(historyPath, record + '\n');

        const preview = trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
        log(`Decision appended: ${preview}`);
        vscode.window.showInformationMessage('Agent Sync: Decision logged.');
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(
            `Agent Sync: Failed to append decision — ${message}`
        );
        log(`ERROR appendDecision: ${message}`);
    }
}
