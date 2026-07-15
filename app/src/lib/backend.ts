import type {
  Bean,
  BeanCatalogEntry,
  BeanHistoryEntry,
  CatKey,
  HistorySession,
  Mode,
  Role,
  RoomSnapshot,
  ScoreMode,
  Stage,
} from './types';
import { localBackend } from './localBackend';
import { createSupabaseBackend } from './supabaseBackend';

export interface CreateRoomInput {
  mode: Mode;
  activityName: string;
  subtitle: string;
  sessionDate: string | null; // ISO
  hostName: string;
  hostClientId: string;
  beans: { name: string; origin: string; process: string; variety: string; roaster: string; producer: string }[];
}

export interface ScorePatch {
  scoreMode?: ScoreMode;
  vals?: Partial<Record<CatKey, number>>;
  defInt?: number;
  easyScore?: number;
  notes?: string;
}

/**
 * Storage + realtime-sync contract used by the whole app. Two implementations:
 *  - localBackend: localStorage + the browser's native `storage` event, so multiple
 *    *tabs on one device/browser* stay in sync — no server needed, used for local dev.
 *  - supabaseBackend: real Postgres + Supabase Realtime, so multiple *phones* stay
 *    in sync over the network. Swap in by setting VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
 */
export interface Backend {
  /** Host creates a room + its initial bean list. Returns the room id and code. */
  createRoom(input: CreateRoomInput): Promise<{ roomId: string; code: string }>;

  /** Look up a room id by its 4-character code (case-insensitive). */
  findRoomByCode(code: string): Promise<string | null>;

  /** Join (or rejoin, idempotent by clientId) a room as host/participant. */
  ensureParticipant(roomId: string, clientId: string, name: string, role: Role): Promise<void>;

  /** Live snapshot of a room: fires immediately, then on every relevant change. Returns unsubscribe. */
  subscribeRoom(roomId: string, cb: (snap: RoomSnapshot | null) => void): () => void;

  setStage(roomId: string, stage: Stage, extra?: { scoringStartedAt?: string | null }): Promise<void>;

  /** Assign sample slot `sampleIdx` (0-based) to the bean with entry-order `beanIdx` (1-based). Swaps if taken. */
  assignAnswer(roomId: string, sampleIdx: number, beanIdx: number): Promise<void>;
  confirmAnswers(roomId: string): Promise<void>;

  /** Idempotent: computes averages, records this session into history + everyone's bean archive. */
  finalizeReveal(roomId: string): Promise<void>;

  upsertScore(roomId: string, participantId: string, sampleIdx: number, patch: ScorePatch): Promise<void>;
  markSubmitted(participantId: string): Promise<void>;

  upsertGuessCandidates(roomId: string, participantId: string, sampleIdx: number, candidates: number[]): Promise<void>;
  setFinalGuess(roomId: string, participantId: string, sampleIdx: number, beanIdx: number): Promise<void>;
  autoFillFinalGuesses(roomId: string, participantId: string): Promise<void>;
  markGuessSubmitted(participantId: string): Promise<void>;

  listActivities(): Promise<string[]>;
  addActivity(name: string): Promise<void>;

  listHistorySessions(activityName: string): Promise<HistorySession[]>;
  addHistorySession(session: Omit<HistorySession, 'id'>): Promise<void>;

  listBeanHistory(participantName: string): Promise<BeanHistoryEntry[]>;
  appendBeanHistory(entries: Omit<BeanHistoryEntry, 'id'>[]): Promise<void>;

  /** Shared, cross-room bean catalog ("豆單資料庫"). Upsert is by-name (idempotent). */
  listBeanCatalog(): Promise<BeanCatalogEntry[]>;
  upsertBeanToCatalog(bean: Bean): Promise<void>;
  removeBeanFromCatalog(id: string): Promise<void>;
}

export const usingSupabase = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
);

let cached: Backend | null = null;

export function getBackend(): Backend {
  if (cached) return cached;
  if (usingSupabase) {
    cached = createSupabaseBackend(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_ANON_KEY!);
  } else {
    cached = localBackend;
  }
  return cached;
}
