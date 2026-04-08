import * as vscode from 'vscode';
import {
    AgentSyncPaths,
    readFile,
    writeFile,
    appendToFile,
    fileExists,
} from '../services/fileService';
import { AgentConfig } from '../services/configService';
import { log } from '../utils/logger';

const IMPORTANT_SECTIONS = [
    'Project Overview',
    'Current Goals',
    'Key Architecture Decisions',
    'Known Issues',
    'Next Tasks',
];

function extractSummary(content: string, maxLines: number): string {
    const lines = content.split('\n');
    const header = [
        '# Agent Summary',
        '',
        `> Generated: ${new Date().toISOString()}`,
        '',
    ];

    const maxLinesPerSection = Math.max(
        8,
        Math.floor(maxLines / IMPORTANT_SECTIONS.length)
    );

    const body: string[] = [];
    let inImportantSection = false;
    let sectionContentLines = 0;

    for (const line of lines) {
        if (line.startsWith('## ')) {
            const heading = line.slice(3).trim();
            const isImportant = IMPORTANT_SECTIONS.some(s =>
                heading.toLowerCase().includes(s.toLowerCase())
            );
            if (isImportant) {
                inImportantSection = true;
                sectionContentLines = 0;
                body.push('', line);
            } else {
                inImportantSection = false;
            }
            continue;
        }

        if (inImportantSection && sectionContentLines < maxLinesPerSection) {
            // Skip leading blank lines at section start
            if (line.trim() !== '' || sectionContentLines > 0) {
                body.push(line);
                if (line.trim() !== '') {
                    sectionContentLines++;
                }
            }
        }
    }

    // Trim body to maxLines
    const trimmedBody = body.slice(0, maxLines);
    return [...header, ...trimmedBody].join('\n');
}

export async function generateSummary(
    workspaceRoot: string,
    config: AgentConfig
): Promise<string | undefined> {
    const contextPath = AgentSyncPaths.context(workspaceRoot);
    const summaryPath = AgentSyncPaths.summary(workspaceRoot);
    const historyPath = AgentSyncPaths.history(workspaceRoot);

    if (!(await fileExists(contextPath))) {
        vscode.window.showErrorMessage(
            'Agent Sync: context.md not found. Run "Initialize Workspace" first.'
        );
        return undefined;
    }

    try {
        const content = await readFile(contextPath);
        const summaryText = extractSummary(content, config.maxSummaryLines);
        await writeFile(summaryPath, summaryText);

        const ts = new Date().toISOString();
        const record = JSON.stringify({ ts, type: 'summary_generated' });
        await appendToFile(historyPath, record + '\n');

        log('Summary generated and written to summary.md');
        vscode.window.showInformationMessage('Agent Sync: Summary generated.');
        return summaryText;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(
            `Agent Sync: Failed to generate summary — ${message}`
        );
        log(`ERROR generateSummary: ${message}`);
        return undefined;
    }
}
