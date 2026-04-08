import * as vscode from 'vscode';
import { AgentSyncPaths, fileExists } from '../services/fileService';
import { sha256File, hashShort } from '../services/hashService';
import { StatusBarManager } from '../utils/statusBar';
import { setState } from '../services/stateService';
import { log } from '../utils/logger';

interface SyncState {
    contextHash: string;
    summaryHash: string;
    timestamp: string;
}

const MEMENTO_KEY = 'agentSync.lastSyncState';

export async function syncNow(
    workspaceRoot: string,
    memento: vscode.Memento,
    statusBar: StatusBarManager
): Promise<void> {
    const contextPath = AgentSyncPaths.context(workspaceRoot);
    const summaryPath = AgentSyncPaths.summary(workspaceRoot);

    try {
        if (!(await fileExists(contextPath))) {
            vscode.window.showWarningMessage(
                'Agent Sync: context.md not found. Run "Initialize Workspace" first.'
            );
            return;
        }

        const summaryExists = await fileExists(summaryPath);

        const contextHash = await sha256File(contextPath);
        const summaryHash = summaryExists ? await sha256File(summaryPath) : '';
        const timestamp = new Date().toISOString();

        // Retrieve previous state to detect if context changed since last sync
        const previous = memento.get<SyncState>(MEMENTO_KEY);
        const contextChangedSinceLastSync =
            previous !== undefined && previous.contextHash !== contextHash;

        const state: SyncState = { contextHash, summaryHash, timestamp };
        await memento.update(MEMENTO_KEY, state);

        const isOutdated = !summaryExists || contextChangedSinceLastSync;
        if (isOutdated) {
            statusBar.setOutdated();
        } else {
            statusBar.setReady();
        }
        setState({ status: isOutdated ? 'outdated' : 'ready', lastSyncAt: timestamp });

        const contextShort = hashShort(contextHash);
        const summaryShort = summaryExists ? hashShort(summaryHash) : 'n/a';
        const statusLabel = isOutdated ? 'Outdated' : 'Ready';

        log(
            `Sync complete — status: ${statusLabel}, context: ${contextShort}, ` +
            `summary: ${summaryShort}, ts: ${timestamp}`
        );

        vscode.window.showInformationMessage(
            `Agent Sync: Synced at ${new Date().toLocaleTimeString()}. ` +
            `Context hash: ${contextShort}… | Status: ${statusLabel}`
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Agent Sync: Sync failed — ${message}`);
        log(`ERROR syncNow: ${message}`);
    }
}
