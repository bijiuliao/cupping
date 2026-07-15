import { DEFAULT_ACTIVITY } from './coe';
import type {
  BeanCatalogEntry,
  BeanHistoryEntry,
  GuessEntry,
  HistorySession,
  Participant,
  Room,
  RoomBean,
  ScoreEntry,
} from './types';

export interface LocalDB {
  rooms: Record<string, Room>;
  beans: Record<string, RoomBean & { roomId: string }>;
  participants: Record<string, Participant>;
  scores: Record<string, ScoreEntry>; // key: participantId::sampleIdx
  guesses: Record<string, GuessEntry>; // key: participantId::sampleIdx
  activities: string[];
  historySessions: HistorySession[];
  beanHistory: BeanHistoryEntry[];
  beanCatalog: Record<string, BeanCatalogEntry>;
}

const KEY = 'cupping.localdb.v1';

function emptyDB(): LocalDB {
  return {
    rooms: {},
    beans: {},
    participants: {},
    scores: {},
    guesses: {},
    activities: [DEFAULT_ACTIVITY],
    historySessions: [],
    beanHistory: [],
    beanCatalog: {},
  };
}

function loadDB(): LocalDB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...emptyDB(), ...JSON.parse(raw) };
  } catch {
    // ignore corrupt data
  }
  return emptyDB();
}

let db: LocalDB = loadDB();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify(db));
  notify();
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      db = loadDB();
      notify();
    }
  });
}

export function getDB(): LocalDB {
  return db;
}

/**
 * Mutate the DB, then persist + notify all subscribers (incl. this tab).
 *
 * Reloads from localStorage immediately before applying `fn`, since each tab
 * keeps its own in-memory copy that's only refreshed when the native `storage`
 * event fires — which never fires in the tab that made the write, and can lag
 * behind writes from other tabs. On its own, that reload narrows but doesn't
 * close the race: two tabs can each reload at nearly the same instant, before
 * either has persisted, and then both write — the later write wins and
 * silently discards the other tab's change. The Web Locks API (supported in
 * all evergreen browsers) serializes the whole reload-mutate-persist sequence
 * across tabs so that can't happen; without it (very old browsers) we fall
 * back to the same best-effort, still-racy sequence.
 */
export async function mutate(fn: (draft: LocalDB) => void): Promise<void> {
  const run = () => {
    db = loadDB();
    fn(db);
    persist();
  };
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    await navigator.locks.request('cupping-localdb', run);
  } else {
    run();
  }
}

export function onChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function uid(): string {
  return crypto.randomUUID();
}

export function scoreKey(participantId: string, sampleIdx: number) {
  return participantId + '::' + sampleIdx;
}
