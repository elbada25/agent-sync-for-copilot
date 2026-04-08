import * as vscode from 'vscode';

export class StatusBarManager implements vscode.Disposable {
    private item: vscode.StatusBarItem;

    constructor() {
        this.item = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.item.command = 'agentSync.copySummaryToClipboard';
        this.item.tooltip = 'Click to copy agent summary to clipboard';
        this.setReady();
    }

    setReady(): void {
        this.item.text = '$(sync) AgentSync: Ready';
        this.item.backgroundColor = undefined;
    }

    setOutdated(): void {
        this.item.text = '$(warning) AgentSync: Outdated';
        this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }

    show(): void {
        this.item.show();
    }

    dispose(): void {
        this.item.dispose();
    }
}
