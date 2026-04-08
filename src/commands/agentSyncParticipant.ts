import * as vscode from 'vscode';
import * as path from 'path';
import { fileExists, readFile, appendToFile } from '../services/fileService';
import { getState } from '../services/stateService';
import { log } from '../utils/logger';

const AGENT_SYNC_DIR = '.agent-sync';

export function registerChatParticipant(
    ctx: vscode.ExtensionContext,
    workspaceRoot: string
): vscode.Disposable {
    const participant = vscode.chat.createChatParticipant(
        'agentSync.assistant',
        async (request, _chatCtx, stream, _token) => {
            const summaryPath = path.join(workspaceRoot, AGENT_SYNC_DIR, 'summary.md');
            const contextPath = path.join(workspaceRoot, AGENT_SYNC_DIR, 'context.md');
            const historyPath = path.join(workspaceRoot, AGENT_SYNC_DIR, 'history.jsonl');

            // /save <text> — append a decision
            if (request.command === 'save') {
                const text = request.prompt.trim();
                if (!text) {
                    stream.markdown('Please provide the decision text: `@agent-sync /save <your decision>`');
                    return;
                }
                const ts = new Date().toISOString();
                const record = JSON.stringify({ ts, type: 'decision', text });
                await appendToFile(historyPath, record + '\n');

                // Also append to context.md decisions log
                if (await fileExists(contextPath)) {
                    let ctx2 = await readFile(contextPath);
                    const header = '## Decisions Log';
                    const entry = `\n- [${ts}] ${text}`;
                    if (ctx2.includes(header)) {
                        ctx2 = ctx2 + entry;
                    } else {
                        ctx2 = ctx2 + `\n\n${header}\n${entry}`;
                    }
                    const { writeFile } = await import('../services/fileService');
                    await writeFile(contextPath, ctx2);
                }

                log(`Chat participant saved decision: ${text}`);
                stream.markdown(`**Decision saved** ✓\n\n> ${text}\n\nLogged to \`history.jsonl\` and \`context.md\`.`);
                return;
            }

            // /context — show full context.md
            if (request.command === 'context') {
                if (!(await fileExists(contextPath))) {
                    stream.markdown('No `context.md` found. Run **Agent Sync: Initialize Workspace** first.');
                    return;
                }
                const content = await readFile(contextPath);
                stream.markdown(`## context.md\n\n\`\`\`markdown\n${content}\n\`\`\``);
                return;
            }

            // /history — show last 10 entries
            if (request.command === 'history') {
                if (!(await fileExists(historyPath))) {
                    stream.markdown('No history yet. Use **Append Decision** or `@agent-sync /save` to log entries.');
                    return;
                }
                const raw = await readFile(historyPath);
                const entries = raw
                    .split('\n')
                    .map(l => l.trim())
                    .filter(l => l.length > 0)
                    .map(l => { try { return JSON.parse(l); } catch { return null; } })
                    .filter(Boolean)
                    .reverse()
                    .slice(0, 10);

                if (entries.length === 0) {
                    stream.markdown('History file exists but contains no entries.');
                    return;
                }

                const lines = entries.map((e: any) => {
                    const d = new Date(e.ts).toLocaleString();
                    return `- **${e.type}** — ${e.text ?? ''} *(${d})*`;
                });
                stream.markdown(`## Last ${entries.length} history entries\n\n${lines.join('\n')}`);
                return;
            }

            // Default — show summary + state
            const state = getState();
            const stateLabel = state.status === 'ready' ? '✅ Ready' : state.status === 'outdated' ? '⚠️ Outdated' : '❓ Unknown';

            stream.markdown(`## Agent Sync Status\n\n**Local state:** ${stateLabel}`);

            if (!(await fileExists(summaryPath))) {
                stream.markdown('\n\nNo summary yet. Run **Agent Sync: Generate Summary** first.');
                return;
            }

            const summary = await readFile(summaryPath);
            stream.markdown(`\n\n---\n\n${summary}`);
            stream.markdown(`\n\n---\n\n*Tip: use \`@agent-sync /save <decision>\` to log a decision, \`/context\` to view full context.md, \`/history\` for the decision log.*`);
        }
    );

    participant.iconPath = new vscode.ThemeIcon('sync');
    ctx.subscriptions.push(participant);
    log('Chat participant @agent-sync registered');
    return participant;
}