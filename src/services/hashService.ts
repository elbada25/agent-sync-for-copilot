import * as crypto from 'crypto';
import * as fs from 'fs';

export async function sha256File(filePath: string): Promise<string> {
    const buffer = await fs.promises.readFile(filePath);
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function hashShort(fullHash: string): string {
    return fullHash.slice(0, 12);
}

export function compareHashes(a: string, b: string): boolean {
    return a === b;
}
