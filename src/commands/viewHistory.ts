import * as vscode from 'vscode';
import { AgentSyncPaths, readFile, fileExists } from '../services/fileService';
import { log } from '../utils/logger';

interface HistoryEntry {
    ts: string;
    type: string;
    text: string;
}

function parseHistory(raw: string): HistoryEntry[] {
    return raw
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .map((l) => {
            try {
                return JSON.parse(l) as HistoryEntry;
            } catch {
                return null;
            }
        })
        .filter((e): e is HistoryEntry => e !== null);
}

function formatEntryLabel(entry: HistoryEntry): string {
    const date = new Date(entry.ts);
    const dateStr = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    const typeLabel = entry.type === 'decision' ? '📝' : '⚡';
    const preview = entry.text.length > 80 ? entry.text.slice(0, 80) + '…' : entry.text;
    return `${typeLabel}  ${preview}`;
}

export async function viewHistory(workspaceRoot: string): Promise<void> {
    const historyPath = AgentSyncPaths.history(workspaceRoot);

    if (!(await fileExists(historyPath))) {
        vscode.window.showInformationMessage(
            'Agent Sync: No history found. Start by initializing a workspace and appending decisions.'
        );
        return;
    }

    let entries: HistoryEntry[];
    try {
        const raw = await readFile(historyPath);
        entries = parseHistory(raw);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Agent Sync: Failed to read history — ${msg}`);
        return;
    }

    if (entries.length === 0) {
        vscode.window.showInformationMessage('Agent Sync: History file exists but contains no entries.');
        return;
    }

    // Show newest first
    const sorted = [...entries].reverse();

    const items: vscode.QuickPickItem[] = sorted.map((entry) => {
        const date = new Date(entry.ts);
        const dateStr = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        return {
            label: formatEntryLabel(entry),
            description: dateStr,
            detail: entry.text,
        };
    });

    log(`viewHistory: showing ${entries.length} entries`);

    const selected = await vscode.window.showQuickPick(items, {
        title: `Agent Sync — History (${entries.length} entries, newest first)`,
        placeHolder: 'Select an entry to copy its text to clipboard',
        matchOnDetail: true,
        matchOnDescription: true,
    });

    if (selected?.detail) {
        await vscode.env.clipboard.writeText(selected.detail);
        vscode.window.showInformationMessage('Agent Sync: Entry copied to clipboard.');
    }
}
