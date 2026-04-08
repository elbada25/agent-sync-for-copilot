import * as vscode from 'vscode';

const TOKEN_KEY = 'agentSync.githubToken';
const REPO_KEY = 'agentSync.dataRepo';

export async function saveToken(secrets: vscode.SecretStorage, token: string): Promise<void> {
    await secrets.store(TOKEN_KEY, token);
}

export async function getToken(secrets: vscode.SecretStorage): Promise<string | undefined> {
    return secrets.get(TOKEN_KEY);
}

export async function clearToken(secrets: vscode.SecretStorage): Promise<void> {
    await secrets.delete(TOKEN_KEY);
}

export async function saveDataRepo(secrets: vscode.SecretStorage, repoName: string): Promise<void> {
    await secrets.store(REPO_KEY, repoName);
}

export async function getDataRepo(secrets: vscode.SecretStorage): Promise<string | undefined> {
    return secrets.get(REPO_KEY);
}
