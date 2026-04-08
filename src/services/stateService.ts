export type SyncStatus = 'ready' | 'outdated' | 'unknown';

export interface SyncStateData {
    status: SyncStatus;
    lastSyncAt: string | null;
    cloudLastPushAt: string | null;
    cloudLastPullAt: string | null;
    cloudConfigured: boolean;
}

let state: SyncStateData = {
    status: 'unknown',
    lastSyncAt: null,
    cloudLastPushAt: null,
    cloudLastPullAt: null,
    cloudConfigured: false,
};

export function setState(partial: Partial<SyncStateData>): void {
    state = { ...state, ...partial };
}

export function getState(): Readonly<SyncStateData> {
    return state;
}
