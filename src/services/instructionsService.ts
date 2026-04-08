import * as vscode from 'vscode';
import * as path from 'path';
import { fileExists, readFile, writeFile } from './fileService';
import { log } from '../utils/logger';

const START_MARKER = '<!-- agent-sync:start -->';
const END_MARKER = '<!-- agent-sync:end -->';

/**
 * Writes the current summary.md into .github/copilot-instructions.md
 * between managed markers, preserving any user content outside them.
 */
export async function syncSummaryToInstructions(workspaceRoot: string): Promise<void> {
    const enabled = vscode.workspace.getConfiguration('agentSync').get<boolean>('syncToInstructions', true);
    if (!enabled) {
        log('syncToInstructions disabled — skipping');
        return;
    }

    const summaryPath = path.join(workspaceRoot, '.agent-sync', 'summary.md');
    if (!(await fileExists(summaryPath))) {
        return;
    }

    const summary = await readFile(summaryPath);
    const githubDir = path.join(workspaceRoot, '.github');
    const instructionsPath = path.join(githubDir, 'copilot-instructions.md');

    await vscode.workspace.fs.createDirectory(vscode.Uri.file(githubDir));

    let before = '';
    let after = '';

    if (await fileExists(instructionsPath)) {
        const existing = await readFile(instructionsPath);
        const startIdx = existing.indexOf(START_MARKER);
        const endIdx = existing.indexOf(END_MARKER);

        if (startIdx !== -1 && endIdx !== -1) {
            before = existing.slice(0, startIdx).trimEnd();
            after = existing.slice(endIdx + END_MARKER.length).trimStart();
        } else if (existing.trim().length > 0) {
            // Existing content has no markers — keep it after our section
            after = existing.trim();
        }
    }

    const parts: string[] = [];
    if (before) { parts.push(before, ''); }
    parts.push(START_MARKER, '', summary.trim(), '', END_MARKER);
    if (after) { parts.push('', after); }

    await writeFile(instructionsPath, parts.join('\n') + '\n');
    log('Synced summary.md → .github/copilot-instructions.md');
}
