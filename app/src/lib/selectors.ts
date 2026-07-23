import { CATS, beanSub, sheetTotal } from './coe';
import type { GuessEntry, HistorySession, LeaderboardGuessEntry, Participant, RoomBean, RoomSnapshot, ScoreEntry } from './types';

export function findParticipant(snap: RoomSnapshot, clientId: string): Participant | undefined {
  return snap.participants.find((p) => p.clientId === clientId);
}

export function beanAtSample(snap: RoomSnapshot, sampleIdx: number): RoomBean | undefined {
  return snap.beans.find((b) => b.sampleIdx === sampleIdx);
}

export function scoreFor(snap: RoomSnapshot, participantId: string, sampleIdx: number): ScoreEntry | undefined {
  return snap.scores.find((s) => s.participantId === participantId && s.sampleIdx === sampleIdx);
}

export function guessFor(snap: RoomSnapshot, participantId: string, sampleIdx: number): GuessEntry | undefined {
  return snap.guesses.find((g) => g.participantId === participantId && g.sampleIdx === sampleIdx);
}

export function leaderboardGuessFor(snap: RoomSnapshot, participantId: string, sampleIdx: number): LeaderboardGuessEntry | undefined {
  return snap.leaderboardGuesses.find((g) => g.participantId === participantId && g.sampleIdx === sampleIdx);
}

export function totalOf(s: ScoreEntry | undefined): number {
  if (!s) return 36;
  return sheetTotal(s.vals, s.defInt, s.scoreMode, s.easyScore);
}

/** Mean score across every participant who has an entry for this sample. Null if nobody has scored it yet. */
export function sampleAverage(snap: RoomSnapshot, sampleIdx: number): number | null {
  const entries = snap.scores.filter((s) => s.sampleIdx === sampleIdx);
  if (entries.length === 0) return null;
  return entries.reduce((sum, e) => sum + totalOf(e), 0) / entries.length;
}

export function submittedCount(snap: RoomSnapshot): number {
  return snap.participants.filter((p) => p.submittedAt).length;
}

export function guessSubmittedCount(snap: RoomSnapshot): number {
  return snap.participants.filter((p) => p.guessSubmittedAt).length;
}

export interface ResultRow {
  rank: number;
  bean: RoomBean;
  sub: string;
  avg: number;
  mine: number;
  diff: string;
}

/** Open-mode reveal: every bean ranked by average score, with "my score" alongside. */
export function computeResultRows(snap: RoomSnapshot, myParticipantId: string | undefined): ResultRow[] {
  const rows = snap.beans
    .filter((b) => b.sampleIdx !== null)
    .map((b) => {
      const avg = sampleAverage(snap, b.sampleIdx as number) ?? 36;
      const mine = myParticipantId ? totalOf(scoreFor(snap, myParticipantId, b.sampleIdx as number)) : 36;
      return { bean: b, sub: beanSub(b), avg, mine };
    })
    .sort((a, b) => b.avg - a.avg);
  return rows.map((r, i) => ({
    rank: i + 1,
    bean: r.bean,
    sub: r.sub,
    avg: r.avg,
    mine: r.mine,
    diff: (r.mine - r.avg >= 0 ? '+' : '') + (r.mine - r.avg).toFixed(2) + ' vs 平均',
  }));
}

export interface AnswerRow {
  sample: number;
  bean: RoomBean;
  avg: number;
  myGuessName: string | null;
  correct: boolean;
}

/** Blind-mode reveal: correct answer per sample, plus whether "I" guessed right. */
export function computeAnswerRows(snap: RoomSnapshot, myParticipantId: string | undefined): AnswerRow[] {
  return snap.beans
    .filter((b) => b.sampleIdx !== null)
    .sort((a, b) => (a.sampleIdx as number) - (b.sampleIdx as number))
    .map((bean) => {
      const sampleIdx = bean.sampleIdx as number;
      const avg = sampleAverage(snap, sampleIdx) ?? 36;
      const myGuess = myParticipantId ? guessFor(snap, myParticipantId, sampleIdx)?.finalGuess ?? null : null;
      const guessedBean = myGuess !== null ? snap.beans.find((b) => b.idx === myGuess) : undefined;
      return {
        sample: sampleIdx + 1,
        bean,
        avg,
        myGuessName: myGuess === null ? null : guessedBean?.name ?? null,
        correct: myGuess === bean.idx,
      };
    });
}

export interface LeaderRow {
  rank: number;
  participantId: string;
  name: string;
  correct: number;
  total: number;
}

/** This session's blind guess leaderboard, computed from real submitted guesses. */
export function computeLeaderRows(snap: RoomSnapshot): LeaderRow[] {
  const total = snap.beans.filter((b) => b.sampleIdx !== null).length;
  const rows = snap.participants.map((p) => {
    const correct = snap.beans.filter(
      (b) => b.sampleIdx !== null && guessFor(snap, p.id, b.sampleIdx as number)?.finalGuess === b.idx,
    ).length;
    return { participantId: p.id, name: p.name, correct, total };
  });
  rows.sort((a, b) => b.correct - a.correct);
  return rows.map((r, i) => ({ rank: i + 1, ...r }));
}

export interface CumulativeRow {
  rank: number;
  name: string;
  points: number;
}

/** Cumulative blind leaderboard across this session + real recorded history for the activity. */
export function computeCumulativeRows(snap: RoomSnapshot, history: HistorySession[]): CumulativeRow[] {
  const totals = new Map<string, number>();
  const current = computeLeaderRows(snap);
  current.forEach((r) => totals.set(r.name, (totals.get(r.name) ?? 0) + r.correct));
  history.forEach((h) => {
    Object.entries(h.guessTally ?? {}).forEach(([name, count]) => {
      totals.set(name, (totals.get(name) ?? 0) + count);
    });
  });
  const rows = Array.from(totals.entries()).map(([name, points]) => ({ name, points }));
  rows.sort((a, b) => b.points - a.points);
  return rows.map((r, i) => ({ rank: i + 1, ...r }));
}

/** All 8 category totals for one score entry, matching the COE order. */
export function catValues(s: ScoreEntry | undefined) {
  return CATS.map((c) => ({ key: c.key, label: c.label, en: c.en, raw: s ? s.vals[c.key] : 6 }));
}

// ---------------------------------------------------------------------------
// LEADERBOARD mode — per-attribute blind guessing, scored independently
// (partial credit), modeled after leaderboard.coffee's real scoring weights
// (area/country/process/variety/elevation/decaf). We only track origin,
// process, variety and elevation (the fields this app's Bean actually has).
// ---------------------------------------------------------------------------
const LB_WEIGHTS = { origin: 2, process: 2, variety: 2, elevation: 1 };
export const LB_MAX_PER_SAMPLE = LB_WEIGHTS.origin + LB_WEIGHTS.process + LB_WEIGHTS.variety + LB_WEIGHTS.elevation;

function lbNorm(s: string) {
  return s.trim().toLowerCase();
}

function lbTextMatch(guess: string, actual: string): boolean {
  if (!guess.trim() || !actual.trim()) return false;
  return lbNorm(guess) === lbNorm(actual);
}

const ELEVATION_TOLERANCE_M = 100;

function parseElevationMeters(s: string): number | null {
  const m = s.match(/\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

/** Elevation is free-typed, so an exact string match is too strict — credit any guess within ±100m. */
function lbElevationMatch(guess: string, actual: string): boolean {
  const g = parseElevationMeters(guess);
  const a = parseElevationMeters(actual);
  if (g === null || a === null) return false;
  return Math.abs(g - a) <= ELEVATION_TOLERANCE_M;
}

export interface LeaderboardSampleDetail {
  sampleIdx: number;
  bean: RoomBean;
  originGuess: string;
  processGuess: string;
  varietyGuess: string;
  elevationGuess: string;
  originCorrect: boolean;
  processCorrect: boolean;
  varietyCorrect: boolean;
  elevationCorrect: boolean;
  points: number;
}

/** Per-sample breakdown of one participant's LEADERBOARD guesses vs. the real beans, sorted by sample order. */
export function leaderboardSampleDetails(snap: RoomSnapshot, participantId: string): LeaderboardSampleDetail[] {
  return snap.beans
    .filter((b) => b.sampleIdx !== null)
    .sort((a, b) => (a.sampleIdx as number) - (b.sampleIdx as number))
    .map((bean) => {
      const sampleIdx = bean.sampleIdx as number;
      const g = leaderboardGuessFor(snap, participantId, sampleIdx);
      const originGuess = g?.originGuess ?? '';
      const processGuess = g?.processGuess ?? '';
      const varietyGuess = g?.varietyGuess ?? '';
      const elevationGuess = g?.elevationGuess ?? '';
      const originCorrect = lbTextMatch(originGuess, bean.origin);
      const processCorrect = lbTextMatch(processGuess, bean.process);
      const varietyCorrect = lbTextMatch(varietyGuess, bean.variety);
      const elevationCorrect = lbElevationMatch(elevationGuess, bean.elevation);
      const points =
        (originCorrect ? LB_WEIGHTS.origin : 0) +
        (processCorrect ? LB_WEIGHTS.process : 0) +
        (varietyCorrect ? LB_WEIGHTS.variety : 0) +
        (elevationCorrect ? LB_WEIGHTS.elevation : 0);
      return {
        sampleIdx,
        bean,
        originGuess,
        processGuess,
        varietyGuess,
        elevationGuess,
        originCorrect,
        processCorrect,
        varietyCorrect,
        elevationCorrect,
        points,
      };
    });
}

export function leaderboardPointsFor(snap: RoomSnapshot, participantId: string): number {
  return leaderboardSampleDetails(snap, participantId).reduce((sum, d) => sum + d.points, 0);
}

export interface LeaderboardRankRow {
  rank: number;
  participantId: string;
  name: string;
  points: number;
  maxPoints: number;
}

/** This session's LEADERBOARD ranking, computed from real submitted per-attribute guesses. */
export function computeLeaderboardRankRows(snap: RoomSnapshot): LeaderboardRankRow[] {
  const maxPoints = snap.beans.filter((b) => b.sampleIdx !== null).length * LB_MAX_PER_SAMPLE;
  const rows = snap.participants.map((p) => ({
    participantId: p.id,
    name: p.name,
    points: leaderboardPointsFor(snap, p.id),
    maxPoints,
  }));
  rows.sort((a, b) => b.points - a.points);
  return rows.map((r, i) => ({ rank: i + 1, ...r }));
}

export function buildExportText(snap: RoomSnapshot): string {
  const lines: string[] = [];
  const modeLabel = snap.room.mode === 'blind' ? '盲測' : snap.room.mode === 'leaderboard' ? '排行榜' : '公開';
  lines.push('☕ 杯測結果 — 房間 ' + snap.room.code + '（' + modeLabel + '模式）');
  lines.push('杯測師 ' + snap.participants.length + ' 位 · 豆子 ' + snap.beans.length + ' 支');
  lines.push('────────────────');
  const rows = computeResultRows(snap, undefined)
    .slice()
    .sort((a, b) => b.avg - a.avg);
  rows.forEach((r, i) => {
    const sampleIdx = r.bean.sampleIdx as number;
    lines.push((i + 1) + '. ' + r.bean.name + '（' + r.sub + '）');
    const entries = snap.scores.filter((s) => s.sampleIdx === sampleIdx);
    const notes = entries.map((e) => e.notes).filter(Boolean).join(' / ');
    lines.push('   平均 ' + r.avg.toFixed(2) + (notes ? ' ／ 備註：' + notes : ''));
  });
  if (snap.room.mode === 'blind') {
    lines.push('────────────────');
    lines.push('猜豆排行榜：');
    computeLeaderRows(snap).forEach((l) => {
      lines.push(l.rank + '. ' + l.name + ' 猜對 ' + l.correct + '/' + l.total);
    });
  }
  if (snap.room.mode === 'leaderboard') {
    lines.push('────────────────');
    lines.push('LEADERBOARD 排行榜：');
    computeLeaderboardRankRows(snap).forEach((l) => {
      lines.push(l.rank + '. ' + l.name + ' ' + l.points + '/' + l.maxPoints + ' 分');
    });
  }
  return lines.join('\n');
}
