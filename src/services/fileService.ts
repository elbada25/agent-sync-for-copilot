import * as path from 'path';
import * as vscode from 'vscode';

export const AGENT_SYNC_DIR = '.agent-sync';

export const AgentSyncPaths = {
    dir: (root: string): string => path.join(root, AGENT_SYNC_DIR),
    context: (root: string): string => path.join(root, AGENT_SYNC_DIR, 'context.md'),
    summary: (root: string): string => path.join(root, AGENT_SYNC_DIR, 'summary.md'),
    history: (root: string): string => path.join(root, AGENT_SYNC_DIR, 'history.jsonl'),
    config: (root: string): string => path.join(root, AGENT_SYNC_DIR, 'config.json'),
};

export async function ensureDir(dirPath: string): Promise<void> {
    await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath));
}

export async function fileExists(filePath: string): Promise<boolean> {
    try {
        await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
        return true;
    } catch {
        return false;
    }
}

export async function readFile(filePath: string): Promise<string> {
    const raw = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
    return Buffer.from(raw).toString('utf8');
}

export async function writeFile(filePath: string, content: string): Promise<void> {
    await vscode.workspace.fs.writeFile(
        vscode.Uri.file(filePath),
        Buffer.from(content, 'utf8')
    );
}

export async function appendToFile(filePath: string, content: string): Promise<void> {
    let existing = '';
    if (await fileExists(filePath)) {
        existing = await readFile(filePath);
    }
    await writeFile(filePath, existing + content);
}
