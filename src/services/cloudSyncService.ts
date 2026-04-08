import * as vscode from 'vscode';
import { AgentSyncPaths, readFile, writeFile, fileExists } from './fileService';
import { getFile, putFile, GitHubFileContent } from './githubSyncService';
import { log } from '../utils/logger';

export interface CloudSyncConfig {
    token: string;
    owner: string;
    dataRepo: string;
    slug: string;
}

interface SyncFile {
    name: string;
    localPath: string;
    remotePath: string;
    isHistory: boolean;
}

function decodeGitHubBase64(encoded: string): string {
    // GitHub base64 includes line breaks every 60 chars — strip before decoding
    return Buffer.from(encoded.replace(/\n/g, ''), 'base64').toString('utf8');
}

function mergeHistoryJsonl(local: string, remote: string): string {
    const parseLines = (text: string): Array<{ ts: string }> =>
        text
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0)
            .map((l) => {
                try {
                    return JSON.parse(l) as { ts: string };
                } catch {
                    return null;
                }
            })
            .filter((x): x is { ts: string } => x !== null);

    const seen = new Set<string>();
    const merged: Array<{ ts: string }> = [];

    for (const entry of [...parseLines(remote), ...parseLines(local)]) {
        if (!seen.has(entry.ts)) {
            seen.add(entry.ts);
            merged.push(entry);
        }
    }

    merged.sort((a, b) => a.ts.localeCompare(b.ts));
    return merged.map((e) => JSON.stringify(e)).join('\n') + '\n';
}

function getSyncFiles(workspaceRoot: string, slug: string): SyncFile[] {
    return [
        {
            name: 'context.md',
            localPath: AgentSyncPaths.context(workspaceRoot),
            remotePath: `workspaces/${slug}/context.md`,
            isHistory: false,
        },
        {
            name: 'summary.md',
            localPath: AgentSyncPaths.summary(workspaceRoot),
            remotePath: `workspaces/${slug}/summary.md`,
            isHistory: false,
        },
        {
            name: 'history.jsonl',
            localPath: AgentSyncPaths.history(workspaceRoot),
            remotePath: `workspaces/${slug}/history.jsonl`,
            isHistory: true,
        },
        {
            name: 'config.json',
            localPath: AgentSyncPaths.config(workspaceRoot),
            remotePath: `workspaces/${slug}/config.json`,
            isHistory: false,
        },
    ];
}

export async function cloudPushFiles(
    workspaceRoot: string,
    cfg: CloudSyncConfig,
    progress?: vscode.Progress<{ message?: string }>
): Promise<void> {
    const files = getSyncFiles(workspaceRoot, cfg.slug);

    for (const f of files) {
        progress?.report({ message: `Pushing ${f.name}…` });

        if (!(await fileExists(f.localPath))) {
            log(`Cloud push: ${f.name} not found locally — skipped`);
            continue;
        }

        let localContent = await readFile(f.localPath);
        const remote: GitHubFileContent | null = await getFile(
            cfg.token,
            cfg.owner,
            cfg.dataRepo,
            f.remotePath
        );

        // Merge history instead of overwrite
        if (f.isHistory && remote !== null) {
            const remoteContent = decodeGitHubBase64(remote.content);
            localContent = mergeHistoryJsonl(localContent, remoteContent);
            await writeFile(f.localPath, localContent);
        }

        await putFile(
            cfg.token,
            cfg.owner,
            cfg.dataRepo,
            f.remotePath,
            localContent,
            remote?.sha
        );
        log(`Cloud push: ${f.name} → ${cfg.owner}/${cfg.dataRepo}/${f.remotePath}`);
    }
}

export async function cloudPullFiles(
    workspaceRoot: string,
    cfg: CloudSyncConfig,
    progress?: vscode.Progress<{ message?: string }>
): Promise<{ pulled: string[]; skipped: string[] }> {
    const files = getSyncFiles(workspaceRoot, cfg.slug);
    const pulled: string[] = [];
    const skipped: string[] = [];

    for (const f of files) {
        progress?.report({ message: `Pulling ${f.name}…` });

        const remote: GitHubFileContent | null = await getFile(
            cfg.token,
            cfg.owner,
            cfg.dataRepo,
            f.remotePath
        );

        if (!remote) {
            skipped.push(f.name);
            log(`Cloud pull: ${f.name} not in remote — skipped`);
            continue;
        }

        const remoteContent = decodeGitHubBase64(remote.content);

        if (f.isHistory && (await fileExists(f.localPath))) {
            const localContent = await readFile(f.localPath);
            await writeFile(f.localPath, mergeHistoryJsonl(localContent, remoteContent));
        } else {
            await writeFile(f.localPath, remoteContent);
        }

        pulled.push(f.name);
        log(`Cloud pull: ${f.name} ← ${cfg.owner}/${cfg.dataRepo}/${f.remotePath}`);
    }

    return { pulled, skipped };
}
