import * as path from 'path';
import * as vscode from 'vscode';
import {
    AgentSyncPaths,
    ensureDir,
    fileExists,
    readFile,
    writeFile,
    appendToFile,
} from '../services/fileService';
import { log } from '../utils/logger';

/** Files to scan, in priority order */
const AGENT_FILE_CANDIDATES: string[] = [
    '.github/copilot-instructions.md',
    'AGENTS.md',
    'CLAUDE.md',
    'GEMINI.md',
    '.github/AGENTS.md',
    'README.md',
    'package.json',
];

/** Glob patterns for per-file instruction files */
const INSTRUCTION_GLOB = '**/*.instructions.md';
const PROMPT_GLOB = '**/*.prompt.md';

interface DetectedSource {
    label: string;
    content: string;
}

async function findGlobFiles(pattern: string): Promise<vscode.Uri[]> {
    return vscode.workspace.findFiles(pattern, '**/node_modules/**', 20);
}

function extractPackageJsonContext(raw: string): string {
    try {
        const pkg = JSON.parse(raw) as Record<string, unknown>;
        const lines: string[] = [];
        if (pkg.name) { lines.push(`**Name:** ${pkg.name}`); }
        if (pkg.description) { lines.push(`**Description:** ${pkg.description}`); }
        if (pkg.version) { lines.push(`**Version:** ${pkg.version}`); }
        if (Array.isArray(pkg.keywords) && pkg.keywords.length > 0) {
            lines.push(`**Keywords:** ${(pkg.keywords as string[]).join(', ')}`);
        }
        if (pkg.main || pkg.module) {
            lines.push(`**Entry:** ${pkg.main || pkg.module}`);
        }
        const deps = pkg.dependencies as Record<string, string> | undefined;
        if (deps) {
            const keys = Object.keys(deps).slice(0, 15);
            if (keys.length > 0) {
                lines.push(`**Dependencies:** ${keys.join(', ')}${Object.keys(deps).length > 15 ? ' …' : ''}`);
            }
        }
        return lines.join('\n');
    } catch {
        return '';
    }
}

function truncate(text: string, maxLines: number): string {
    const lines = text.split('\n');
    if (lines.length <= maxLines) { return text; }
    return lines.slice(0, maxLines).join('\n') + `\n\n*(truncated — ${lines.length - maxLines} more lines)*`;
}

export async function detectContext(workspaceRoot: string): Promise<void> {
    const contextPath = AgentSyncPaths.context(workspaceRoot);
    const historyPath = AgentSyncPaths.history(workspaceRoot);

    // Confirm overwrite if context.md already has content
    if (await fileExists(contextPath)) {
        const existing = await readFile(contextPath);
        // Check if it has meaningful content beyond the template
        if (existing.trim().length > 200) {
            const choice = await vscode.window.showWarningMessage(
                'Agent Sync: context.md already has content. Overwrite with detected context?',
                { modal: true },
                'Overwrite',
                'Cancel'
            );
            if (choice !== 'Overwrite') {
                return;
            }
        }
    }

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Agent Sync: Detecting workspace context…',
            cancellable: false,
        },
        async (progress) => {
            const sources: DetectedSource[] = [];

            // 1. Scan static candidate files
            progress.report({ message: 'Scanning agent files…' });
            for (const rel of AGENT_FILE_CANDIDATES) {
                const fullPath = path.join(workspaceRoot, rel);
                if (await fileExists(fullPath)) {
                    const raw = await readFile(fullPath);
                    if (!raw.trim()) { continue; }

                    let content: string;
                    if (rel === 'package.json') {
                        content = extractPackageJsonContext(raw);
                        if (!content) { continue; }
                    } else if (rel === 'README.md') {
                        // Only first 60 lines of README to avoid noise
                        content = truncate(raw, 60);
                    } else {
                        content = raw.trim();
                    }

                    sources.push({ label: rel, content });
                    log(`detectContext: found ${rel}`);
                }
            }

            // 2. Scan *.instructions.md files
            progress.report({ message: 'Scanning *.instructions.md…' });
            const instructionFiles = await findGlobFiles(INSTRUCTION_GLOB);
            for (const uri of instructionFiles) {
                const rel = path.relative(workspaceRoot, uri.fsPath).replace(/\\/g, '/');
                // Skip .agent-sync folder and copilot-instructions (already in candidates)
                if (rel.startsWith('.agent-sync') || rel.includes('copilot-instructions')) { continue; }
                const raw = await readFile(uri.fsPath);
                if (raw.trim()) {
                    sources.push({ label: rel, content: raw.trim() });
                    log(`detectContext: found ${rel}`);
                }
            }

            // 3. Scan *.prompt.md files
            progress.report({ message: 'Scanning *.prompt.md…' });
            const promptFiles = await findGlobFiles(PROMPT_GLOB);
            for (const uri of promptFiles) {
                const rel = path.relative(workspaceRoot, uri.fsPath).replace(/\\/g, '/');
                if (rel.startsWith('.agent-sync')) { continue; }
                const raw = await readFile(uri.fsPath);
                if (raw.trim()) {
                    sources.push({ label: rel, content: raw.trim() });
                    log(`detectContext: found ${rel}`);
                }
            }

            if (sources.length === 0) {
                vscode.window.showWarningMessage(
                    'Agent Sync: No agent files found in this workspace. ' +
                    'Add a .github/copilot-instructions.md, AGENTS.md, or README.md and try again.'
                );
                return;
            }

            // Build context.md
            progress.report({ message: 'Building context.md…' });
            const ts = new Date().toISOString();
            const today = ts.slice(0, 10);

            const sections = sources.map(
                (s) =>
                    `## Source: \`${s.label}\`\n\n${s.content}`
            );

            const contextContent =
                `# Agent Context\n\n` +
                `> Auto-detected by Agent Sync on ${today} from ${sources.length} workspace file(s).\n` +
                `> Review and edit this file to refine what the agent knows about this project.\n\n` +
                `---\n\n` +
                sections.join('\n\n---\n\n') +
                `\n\n---\n\n## Decisions Log\n\n`;

            await ensureDir(AgentSyncPaths.dir(workspaceRoot));
            await writeFile(contextPath, contextContent);

            // Log to history
            const record = JSON.stringify({
                ts,
                type: 'context_detected',
                text: `Detected context from: ${sources.map((s) => s.label).join(', ')}`,
            });
            await appendToFile(historyPath, record + '\n');

            log(`detectContext: wrote context.md from ${sources.length} source(s)`);

            const msg = `Agent Sync: context.md populated from ${sources.length} file(s): ${sources.map((s) => s.label).join(', ')}`;
            const action = await vscode.window.showInformationMessage(msg, 'Open context.md');
            if (action === 'Open context.md') {
                const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(contextPath));
                await vscode.window.showTextDocument(doc);
            }
        }
    );
}
