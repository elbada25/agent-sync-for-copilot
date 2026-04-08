import * as vscode from 'vscode';
import { saveToken, saveDataRepo, getToken, getDataRepo } from '../services/secretService';
import { getAuthenticatedUser, repoExists, createRepo } from '../services/githubSyncService';
import { getWorkspaceSlug } from '../services/workspaceIdService';
import { setState } from '../services/stateService';
import { log } from '../utils/logger';

export async function configureSync(
    workspaceRoot: string,
    secrets: vscode.SecretStorage
): Promise<boolean> {
    // Step 1: GitHub token
    const existingToken = await getToken(secrets);
    const token = await vscode.window.showInputBox({
        title: 'Agent Sync Cloud — Step 1/3: GitHub Token',
        prompt: 'Enter your GitHub Personal Access Token (required scope: repo)',
        value: existingToken ?? '',
        password: true,
        ignoreFocusOut: true,
        placeHolder: 'ghp_…',
    });
    if (!token || token.trim() === '') {
        return false;
    }

    // Verify token and get username
    let owner: string;
    try {
        const user = await getAuthenticatedUser(token.trim());
        owner = user.login;
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Agent Sync: Token validation failed — ${msg}`);
        return false;
    }

    // Step 2: Data repository name
    const existingRepo = (await getDataRepo(secrets)) ?? 'agent-sync-data';
    const repoName = await vscode.window.showInputBox({
        title: `Agent Sync Cloud — Step 2/3: Data Repository (user: ${owner})`,
        prompt: 'Name of the private GitHub repo to store your sync data (created automatically if needed)',
        value: existingRepo,
        ignoreFocusOut: true,
        placeHolder: 'agent-sync-data',
        validateInput: (v) =>
            /^[a-zA-Z0-9_.-]+$/.test(v.trim())
                ? null
                : 'Only letters, numbers, hyphens, dots and underscores allowed',
    });
    if (!repoName || repoName.trim() === '') {
        return false;
    }

    // Step 3: Create repo if it doesn't exist yet
    const exists = await repoExists(token.trim(), owner, repoName.trim());
    if (!exists) {
        const choice = await vscode.window.showInformationMessage(
            `Repository "${owner}/${repoName}" does not exist. Create it as private?`,
            'Create',
            'Cancel'
        );
        if (choice !== 'Create') {
            return false;
        }
        try {
            await createRepo(token.trim(), repoName.trim(), true);
            log(`Cloud: created private repo ${owner}/${repoName}`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(`Agent Sync: Failed to create repo — ${msg}`);
            return false;
        }
    }

    // Persist to SecretStorage
    await saveToken(secrets, token.trim());
    await saveDataRepo(secrets, repoName.trim());
    setState({ cloudConfigured: true });

    const slug = getWorkspaceSlug(workspaceRoot);
    log(`Cloud sync configured: ${owner}/${repoName}, workspace slug: "${slug}"`);
    vscode.window.showInformationMessage(
        `Agent Sync Cloud ready! (Step 3/3) ✓\nAccount: ${owner} · Repo: ${repoName} · Workspace: "${slug}"`
    );
    return true;
}
