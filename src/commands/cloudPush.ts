import * as vscode from 'vscode';
import { getToken, getDataRepo } from '../services/secretService';
import { getAuthenticatedUser } from '../services/githubSyncService';
import { cloudPushFiles } from '../services/cloudSyncService';
import { getWorkspaceSlug } from '../services/workspaceIdService';
import { setState } from '../services/stateService';
import { log } from '../utils/logger';

export async function cloudPush(
    workspaceRoot: string,
    secrets: vscode.SecretStorage
): Promise<void> {
    const token = await getToken(secrets);
    const dataRepo = await getDataRepo(secrets);

    if (!token || !dataRepo) {
        const choice = await vscode.window.showWarningMessage(
            'Agent Sync Cloud is not configured yet.',
            'Configure Now',
            'Cancel'
        );
        if (choice === 'Configure Now') {
            await vscode.commands.executeCommand('agentSync.configureSync');
        }
        return;
    }

    try {
        const user = await getAuthenticatedUser(token);
        const slug = getWorkspaceSlug(workspaceRoot);
        const cfg = { token, owner: user.login, dataRepo, slug };

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Agent Sync: Pushing to cloud…',
                cancellable: false,
            },
            async (progress) => {
                await cloudPushFiles(workspaceRoot, cfg, progress);
            }
        );

        const ts = new Date().toISOString();
        setState({ cloudLastPushAt: ts });
        log(`Cloud push complete — slug: "${slug}", ts: ${ts}`);
        vscode.window.showInformationMessage(
            `Agent Sync: Pushed to ${user.login}/${dataRepo} (workspace: "${slug}")`
        );
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Agent Sync: Cloud push failed — ${msg}`);
        log(`ERROR cloudPush: ${msg}`);
    }
}
