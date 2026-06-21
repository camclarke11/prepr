// The wire protocol shared between the Worker/DO and the browser clients.
// (The frontend keeps its own copy of these shapes in Phase 2.)

export interface SyncItem {
  key: string;
  name: string;
  emoji: string;
  category: string;
  qty: number;
  unit: string;
  checked: boolean;
  /** Display name of whoever added it. */
  by: string;
  spec?: string;
  updatedAt: number;
}

export interface SyncMember {
  id: string;
  name: string;
  color: string;
  initial: string;
  joinedAt: number;
}

/** A mutation a client asks the server to apply to the shared list. */
export type Op =
  | {
      kind: 'upsert';
      name: string;
      emoji: string;
      category: string;
      qty?: number;
      unit?: string;
      spec?: string;
    }
  | { kind: 'setQty'; key: string; qty: number }
  | { kind: 'checked'; key: string; checked: boolean }
  | { kind: 'field'; key: string; field: 'unit' | 'spec'; value: string }
  | { kind: 'remove'; key: string }
  | { kind: 'clear' };

/** Messages a client sends over the WebSocket. */
export type ClientMsg = { t: 'op'; op: Op } | { t: 'ping' };

/** Messages the server pushes over the WebSocket. */
export type ServerMsg =
  | { t: 'state'; items: SyncItem[]; members: SyncMember[] }
  | { t: 'item'; item: SyncItem }
  | { t: 'remove'; key: string }
  | { t: 'clear' }
  | { t: 'members'; members: SyncMember[] }
  | { t: 'pong' };
