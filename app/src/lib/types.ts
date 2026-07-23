export type Mode = 'blind' | 'open' | 'leaderboard';
export type Stage = 'waiting' | 'scoring' | 'locked' | 'reveal';
export type Role = 'host' | 'participant';
export type ScoreMode = 'pro' | 'easy';

export const CAT_KEYS = [
  'clean',
  'sweet',
  'acid',
  'mouth',
  'flavor',
  'after',
  'balance',
  'overall',
] as const;

export type CatKey = (typeof CAT_KEYS)[number];

export interface Bean {
  name: string;
  area: string; // continent/region-level, e.g. "Africa" — separate from origin ("Country", e.g. "Ethiopia")
  origin: string;
  process: string;
  variety: string;
  roaster: string;
  producer: string;
  elevation: string;
  decaf: boolean;
}

export interface RoomBean extends Bean {
  id: string;
  idx: number; // 1-based entry order
  sampleIdx: number | null; // 0-based physical serving slot, null until assigned (blind)
}

export interface Room {
  id: string;
  code: string;
  mode: Mode;
  activityName: string;
  subtitle: string;
  sessionDate: string | null; // ISO
  stage: Stage;
  scoringStartedAt: string | null;
  answerConfirmed: boolean;
  hostName: string;
  archivedDone: boolean;
  createdAt: string;
}

export interface Participant {
  id: string;
  roomId: string;
  clientId: string;
  name: string;
  role: Role;
  joinedAt: string;
  submittedAt: string | null;
  guessSubmittedAt: string | null;
}

export interface ScoreEntry {
  id: string;
  roomId: string;
  participantId: string;
  sampleIdx: number;
  scoreMode: ScoreMode;
  vals: Record<CatKey, number>;
  defInt: number;
  easyScore: number;
  notes: string;
}

export interface GuessEntry {
  id: string;
  roomId: string;
  participantId: string;
  sampleIdx: number;
  candidates: number[]; // bean idx[]
  finalGuess: number | null; // bean idx
}

/**
 * LEADERBOARD mode only — per-attribute blind guesses for one sample, scored
 * independently (partial credit), unlike GuessEntry's all-or-nothing bean pick.
 * elevationGuess/decafGuess are bucketed choices ('above'|'below', 'yes'|'no'),
 * not free text — matches leaderboard.coffee's tasting-card categories.
 */
export interface LeaderboardGuessEntry {
  id: string;
  roomId: string;
  participantId: string;
  sampleIdx: number;
  areaGuess: string;
  originGuess: string; // "Country"
  processGuess: string;
  varietyGuess: string;
  elevationGuess: string; // '' | 'above' | 'below' (relative to 1600m)
  decafGuess: string; // '' | 'yes' | 'no'
}

export interface HistorySession {
  id: string;
  activityName: string;
  subtitle: string;
  sessionDate: string | null;
  avgScore: number;
  beans: string[];
  /** blind mode only: participant name -> correct guess count for that session */
  guessTally: Record<string, number>;
  roomId: string | null;
}

export interface BeanCatalogEntry extends Bean {
  id: string;
}

export interface BeanHistoryEntry {
  id: string;
  participantName: string;
  beanName: string;
  sub: string;
  myScore: number;
  sessionLabel: string;
  sessionDate: string | null;
}

export interface Identity {
  clientId: string;
  userName: string;
}

/** Full live snapshot of one room, as consumed by the UI. */
export interface RoomSnapshot {
  room: Room;
  beans: RoomBean[];
  participants: Participant[];
  scores: ScoreEntry[];
  guesses: GuessEntry[];
  leaderboardGuesses: LeaderboardGuessEntry[];
}
