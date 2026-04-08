import * as vscode from 'vscode';

let channel: vscode.OutputChannel | undefined;

export function getChannel(): vscode.OutputChannel {
    if (!channel) {
        channel = vscode.window.createOutputChannel('Agent Sync');
    }
    return channel;
}

export function log(message: string): void {
    const ts = new Date().toISOString();
    getChannel().appendLine(`[AgentSync] ${ts} ${message}`);
}

export function disposeChannel(): void {
    if (channel) {
        channel.dispose();
        channel = undefined;
    }
}
