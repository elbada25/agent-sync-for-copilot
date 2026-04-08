import * as https from 'https';

const GH_API = 'api.github.com';

interface ApiRequestOptions {
    method: string;
    path: string;
    token: string;
    body?: object;
}

function request<T>(opts: ApiRequestOptions): Promise<T> {
    return new Promise((resolve, reject) => {
        const bodyStr = opts.body ? JSON.stringify(opts.body) : undefined;
        const options: https.RequestOptions = {
            hostname: GH_API,
            port: 443,
            path: opts.path,
            method: opts.method,
            headers: {
                Authorization: `Bearer ${opts.token}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'AgentSyncForCopilot/0.2',
                ...(bodyStr
                    ? {
                          'Content-Type': 'application/json',
                          'Content-Length': String(Buffer.byteLength(bodyStr)),
                      }
                    : {}),
            },
        };

        const req = https.request(options, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk: Buffer) => chunks.push(chunk));
            res.on('end', () => {
                const raw = Buffer.concat(chunks).toString('utf8');
                const status = res.statusCode ?? 0;

                if (status === 404) {
                    resolve(null as unknown as T);
                    return;
                }
                if (status >= 400) {
                    let detail = raw;
                    try {
                        detail = (JSON.parse(raw) as { message?: string }).message ?? raw;
                    } catch { /* keep raw */ }
                    reject(new Error(`GitHub API ${status}: ${detail.slice(0, 300)}`));
                    return;
                }
                try {
                    resolve(raw ? (JSON.parse(raw) as T) : (null as unknown as T));
                } catch {
                    resolve(raw as unknown as T);
                }
            });
        });

        req.on('error', reject);
        if (bodyStr) {
            req.write(bodyStr);
        }
        req.end();
    });
}

export interface GitHubFileContent {
    content: string; // base64 encoded (GitHub adds newlines — strip before decoding)
    sha: string;
    name: string;
    path: string;
}

export async function getAuthenticatedUser(token: string): Promise<{ login: string }> {
    return request<{ login: string }>({ method: 'GET', path: '/user', token });
}

export async function repoExists(token: string, owner: string, repo: string): Promise<boolean> {
    const r = await request<{ name?: string } | null>({
        method: 'GET',
        path: `/repos/${owner}/${repo}`,
        token,
    });
    return r !== null && typeof (r as { name?: string }).name === 'string';
}

export async function createRepo(token: string, name: string, isPrivate = true): Promise<void> {
    await request<unknown>({
        method: 'POST',
        path: '/user/repos',
        token,
        body: {
            name,
            private: isPrivate,
            auto_init: true,
            description: 'Agent Sync for Copilot — cloud context data',
        },
    });
}

export async function getFile(
    token: string,
    owner: string,
    repo: string,
    filePath: string
): Promise<GitHubFileContent | null> {
    return request<GitHubFileContent | null>({
        method: 'GET',
        path: `/repos/${owner}/${repo}/contents/${filePath}`,
        token,
    });
}

export async function putFile(
    token: string,
    owner: string,
    repo: string,
    filePath: string,
    content: string,
    sha?: string,
    message?: string
): Promise<void> {
    const b64 = Buffer.from(content, 'utf8').toString('base64');
    await request<unknown>({
        method: 'PUT',
        path: `/repos/${owner}/${repo}/contents/${filePath}`,
        token,
        body: {
            message: message ?? `AgentSync: update ${filePath}`,
            content: b64,
            ...(sha ? { sha } : {}),
        },
    });
}
