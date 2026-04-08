import * as vscode from 'vscode';
import * as path from 'path';
import { AGENT_SYNC_DIR } from './fileService';
import { log } from '../utils/logger';

export class WatcherService implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];

    constructor(
        private readonly workspaceRoot: string,
        private readonly onContextChange: () => void,
        private readonly onSummaryChange: () => void
    ) {}

    start(): void {
        const relContext = path.join(AGENT_SYNC_DIR, 'context.md').replace(/\\/g, '/');
        const relSummary = path.join(AGENT_SYNC_DIR, 'summary.md').replace(/\\/g, '/');

        const contextWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(this.workspaceRoot, relContext)
        );
        const summaryWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(this.workspaceRoot, relSummary)
        );

        contextWatcher.onDidChange(() => {
            log('Detected remote update: context.md');
            this.onContextChange();
        });
        contextWatcher.onDidCreate(() => {
            log('Detected creation: context.md');
            this.onContextChange();
        });

        summaryWatcher.onDidChange(() => {
            log('Detected remote update: summary.md');
            this.onSummaryChange();
        });
        summaryWatcher.onDidCreate(() => {
            log('Detected creation: summary.md');
            this.onSummaryChange();
        });

        this.disposables.push(contextWatcher, summaryWatcher);
        log('File watchers started for context.md and summary.md');
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}
