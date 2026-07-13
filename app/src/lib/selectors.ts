import { CATS, beanSub, sheetTotal } from './coe';
import type { GuessEntry, HistorySession, Participant, RoomBean, RoomSnapshot, ScoreEntry } from './types';

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

export function buildExportText(snap: RoomSnapshot): string {
  const lines: string[] = [];
  lines.push('☕ 杯測結果 — 房間 ' + snap.room.code + '（' + (snap.room.mode === 'blind' ? '盲測' : '公開') + '模式）');
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
  return lines.join('\n');
}
