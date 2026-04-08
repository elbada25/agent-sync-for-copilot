import * as vscode from 'vscode';
import { getToken, getDataRepo } from '../services/secretService';
import { getAuthenticatedUser } from '../services/githubSyncService';
import { cloudPullFiles } from '../services/cloudSyncService';
import { getWorkspaceSlug } from '../services/workspaceIdService';
import { setState } from '../services/stateService';
import { log } from '../utils/logger';

export async function cloudPull(
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

        let result: { pulled: string[]; skipped: string[] } = { pulled: [], skipped: [] };

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Agent Sync: Pulling from cloud…',
                cancellable: false,
            },
            async (progress) => {
                result = await cloudPullFiles(workspaceRoot, cfg, progress);
            }
        );

        const ts = new Date().toISOString();
        setState({ cloudLastPullAt: ts });
        log(
            `Cloud pull complete — slug: "${slug}", pulled: [${result.pulled.join(', ')}], ` +
                `skipped: [${result.skipped.join(', ')}], ts: ${ts}`
        );

        const msg =
            result.pulled.length > 0
                ? `Agent Sync: Pulled ${result.pulled.join(', ')} from ${user.login}/${dataRepo}`
                : `Agent Sync: Nothing new to pull from ${user.login}/${dataRepo}`;
        vscode.window.showInformationMessage(msg);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Agent Sync: Cloud pull failed — ${msg}`);
        log(`ERROR cloudPull: ${msg}`);
    }
}
