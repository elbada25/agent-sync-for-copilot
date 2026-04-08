import * as cp from 'child_process';
import * as path from 'path';

/**
 * Returns a stable, URL-safe slug for a workspace.
 * Tries git remote "origin" first, falls back to folder name.
 * Examples:
 *   https://github.com/elbada25/my-api.git → elbada25-my-api
 *   git@github.com:elbada25/my-api.git    → elbada25-my-api
 *   /home/user/projects/my-app             → my-app
 */
export function getWorkspaceSlug(workspaceRoot: string): string {
    try {
        const remote = cp
            .execSync('git remote get-url origin', {
                cwd: workspaceRoot,
                timeout: 3000,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe'],
            })
            .trim();
        return slugFromRemote(remote);
    } catch {
        return slugFromPath(workspaceRoot);
    }
}

function slugFromRemote(remote: string): string {
    // Match owner/repo from https or ssh remote
    const match = remote.match(/[:/]([^/]+)\/([^/.]+?)(\.git)?$/);
    if (match) {
        return sanitize(`${match[1]}-${match[2]}`);
    }
    return sanitize(remote);
}

function slugFromPath(p: string): string {
    return sanitize(path.basename(p));
}

function sanitize(s: string): string {
    return (
        s
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 60) || 'workspace'
    );
}
