export type SyncStatus = 'ready' | 'outdated' | 'unknown';

export interface SyncStateData {
    status: SyncStatus;
    lastSyncAt: string | null;
}

let state: SyncStateData = {
    status: 'unknown',
    lastSyncAt: null,
};

export function setState(partial: Partial<SyncStateData>): void {
    state = { ...state, ...partial };
}

export function getState(): Readonly<SyncStateData> {
    return state;
}
