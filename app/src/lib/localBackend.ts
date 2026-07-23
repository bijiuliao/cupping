import type { Backend, CreateRoomInput, LeaderboardGuessPatch, ScorePatch } from './backend';
import { CATS, beanSub, sheetTotal } from './coe';
import { getDB, mutate, onChange, scoreKey, uid } from './localStore';
import type { CatKey, GuessEntry, LeaderboardGuessEntry, Role, RoomSnapshot, ScoreEntry, Stage } from './types';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/I/1 ambiguity

function randomCode(): string {
  let s = '';
  for (let i = 0; i < 4; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

function defaultVals(): Record<CatKey, number> {
  const v = {} as Record<CatKey, number>;
  CATS.forEach((c) => (v[c.key] = 6));
  return v;
}

function buildSnapshot(roomId: string): RoomSnapshot | null {
  const db = getDB();
  const room = db.rooms[roomId];
  if (!room) return null;
  const beans = Object.values(db.beans)
    .filter((b) => b.roomId === roomId)
    .sort((a, b) => a.idx - b.idx);
  const participants = Object.values(db.participants)
    .filter((p) => p.roomId === roomId)
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
  const scores = Object.values(db.scores).filter((s) => s.roomId === roomId);
  const guesses = Object.values(db.guesses).filter((g) => g.roomId === roomId);
  const leaderboardGuesses = Object.values(db.leaderboardGuesses).filter((g) => g.roomId === roomId);
  return { room, beans, participants, scores, guesses, leaderboardGuesses };
}

export const localBackend: Backend = {
  async createRoom(input: CreateRoomInput) {
    const roomId = uid();
    let code = randomCode();
    await mutate((db) => {
      while (Object.values(db.rooms).some((r) => r.code === code)) code = randomCode();
      db.rooms[roomId] = {
        id: roomId,
        code,
        mode: input.mode,
        activityName: input.activityName,
        subtitle: input.subtitle,
        sessionDate: input.sessionDate,
        stage: 'waiting',
        scoringStartedAt: null,
        answerConfirmed: input.mode === 'open',
        hostName: input.hostName,
        archivedDone: false,
        createdAt: new Date().toISOString(),
      };
      input.beans.forEach((b, i) => {
        const id = uid();
        db.beans[id] = {
          id,
          roomId,
          idx: i + 1,
          sampleIdx: input.mode === 'open' ? i : null,
          ...b,
        };
      });
    });
    return { roomId, code };
  },

  async findRoomByCode(code: string) {
    const db = getDB();
    const c = code.trim().toUpperCase();
    const room = Object.values(db.rooms).find((r) => r.code === c);
    return room ? room.id : null;
  },

  async ensureParticipant(roomId: string, clientId: string, name: string, role: Role) {
    await mutate((db) => {
      const existing = Object.values(db.participants).find(
        (p) => p.roomId === roomId && p.clientId === clientId,
      );
      if (existing) {
        existing.name = name;
        return;
      }
      const id = uid();
      db.participants[id] = {
        id,
        roomId,
        clientId,
        name,
        role,
        joinedAt: new Date().toISOString(),
        submittedAt: null,
        guessSubmittedAt: null,
      };
    });
  },

  subscribeRoom(roomId: string, cb: (snap: RoomSnapshot | null) => void) {
    cb(buildSnapshot(roomId));
    return onChange(() => cb(buildSnapshot(roomId)));
  },

  async setStage(roomId: string, stage: Stage, extra) {
    await mutate((db) => {
      const room = db.rooms[roomId];
      if (!room) return;
      room.stage = stage;
      if (extra && 'scoringStartedAt' in extra) room.scoringStartedAt = extra.scoringStartedAt ?? null;
    });
  },

  async closeRoom(roomId: string) {
    await mutate((db) => {
      delete db.rooms[roomId];
      Object.keys(db.beans).forEach((id) => {
        if (db.beans[id].roomId === roomId) delete db.beans[id];
      });
      Object.keys(db.participants).forEach((id) => {
        if (db.participants[id].roomId === roomId) delete db.participants[id];
      });
      Object.keys(db.scores).forEach((key) => {
        if (db.scores[key].roomId === roomId) delete db.scores[key];
      });
      Object.keys(db.guesses).forEach((key) => {
        if (db.guesses[key].roomId === roomId) delete db.guesses[key];
      });
      Object.keys(db.leaderboardGuesses).forEach((key) => {
        if (db.leaderboardGuesses[key].roomId === roomId) delete db.leaderboardGuesses[key];
      });
    });
  },

  async assignAnswer(roomId: string, sampleIdx: number, beanIdx: number) {
    await mutate((db) => {
      const beans = Object.values(db.beans).filter((b) => b.roomId === roomId);
      const target = beans.find((b) => b.idx === beanIdx);
      if (!target) return;
      const occupant = beans.find((b) => b.sampleIdx === sampleIdx);
      const prevSlot = target.sampleIdx;
      target.sampleIdx = sampleIdx;
      if (occupant && occupant.id !== target.id) occupant.sampleIdx = prevSlot;
    });
  },

  async confirmAnswers(roomId: string) {
    await mutate((db) => {
      const room = db.rooms[roomId];
      if (room) room.answerConfirmed = true;
    });
  },

  async addRoomBean(roomId: string, bean) {
    await mutate((db) => {
      const room = db.rooms[roomId];
      const existing = Object.values(db.beans).filter((b) => b.roomId === roomId);
      const nextIdx = existing.length > 0 ? Math.max(...existing.map((b) => b.idx)) + 1 : 1;
      const id = uid();
      db.beans[id] = {
        id,
        roomId,
        idx: nextIdx,
        sampleIdx: room?.mode === 'open' ? nextIdx - 1 : null,
        ...bean,
      };
    });
  },

  async updateRoomBean(beanId: string, patch) {
    await mutate((db) => {
      const bean = db.beans[beanId];
      if (bean) Object.assign(bean, patch);
    });
  },

  async removeRoomBean(beanId: string) {
    await mutate((db) => {
      delete db.beans[beanId];
    });
  },

  async finalizeReveal(roomId: string) {
    const db = getDB();
    const room = db.rooms[roomId];
    if (!room || room.archivedDone) return;
    const beans = Object.values(db.beans).filter((b) => b.roomId === roomId);
    const participants = Object.values(db.participants).filter((p) => p.roomId === roomId);
    const scores = Object.values(db.scores).filter((s) => s.roomId === roomId);
    const guesses = Object.values(db.guesses).filter((g) => g.roomId === roomId);

    const guessTally: Record<string, number> = {};
    if (room.mode === 'blind') {
      participants.forEach((p) => {
        const correct = beans.filter(
          (b) =>
            b.sampleIdx !== null &&
            guesses.find((g) => g.participantId === p.id && g.sampleIdx === b.sampleIdx)?.finalGuess === b.idx,
        ).length;
        guessTally[p.name] = correct;
      });
    }

    const sampleAverages: number[] = [];
    const historyEntries: Omit<import('./types').BeanHistoryEntry, 'id'>[] = [];
    const sessionLabel = room.subtitle ? room.activityName + ' · ' + room.subtitle : room.activityName;
    const sessionDate = room.sessionDate ? room.sessionDate.slice(0, 10) : null;

    beans.forEach((b) => {
      if (b.sampleIdx === null) return;
      const entries = scores.filter((s) => s.sampleIdx === b.sampleIdx);
      if (entries.length === 0) return;
      const totals = entries.map((e) => sheetTotal(e.vals, e.defInt, e.scoreMode, e.easyScore));
      const avg = totals.reduce((a, x) => a + x, 0) / totals.length;
      sampleAverages.push(avg);
      entries.forEach((e) => {
        const p = participants.find((pp) => pp.id === e.participantId);
        if (!p) return;
        historyEntries.push({
          participantName: p.name,
          beanName: b.name,
          sub: beanSub(b),
          myScore: sheetTotal(e.vals, e.defInt, e.scoreMode, e.easyScore),
          sessionLabel,
          sessionDate,
        });
      });
    });

    const overallAvg =
      sampleAverages.length > 0 ? sampleAverages.reduce((a, x) => a + x, 0) / sampleAverages.length : 0;

    await mutate((d) => {
      const r = d.rooms[roomId];
      if (!r || r.archivedDone) return;
      r.archivedDone = true;
      d.historySessions.push({
        id: uid(),
        activityName: room.activityName,
        subtitle: room.subtitle,
        sessionDate,
        avgScore: overallAvg,
        beans: beans.map((b) => b.name),
        guessTally,
        roomId,
      });
      historyEntries.forEach((h) => {
        d.beanHistory.push({ id: uid(), ...h });
      });
    });
  },

  async upsertScore(roomId: string, participantId: string, sampleIdx: number, patch: ScorePatch) {
    await mutate((db) => {
      const key = scoreKey(participantId, sampleIdx);
      const existing = db.scores[key];
      const base: ScoreEntry =
        existing ?? {
          id: uid(),
          roomId,
          participantId,
          sampleIdx,
          scoreMode: 'pro',
          vals: defaultVals(),
          defInt: 0,
          easyScore: 80,
          notes: '',
        };
      if (patch.scoreMode !== undefined) base.scoreMode = patch.scoreMode;
      if (patch.vals) base.vals = { ...base.vals, ...patch.vals };
      if (patch.defInt !== undefined) base.defInt = patch.defInt;
      if (patch.easyScore !== undefined) base.easyScore = patch.easyScore;
      if (patch.notes !== undefined) base.notes = patch.notes;
      db.scores[key] = base;
    });
  },

  async markSubmitted(participantId: string) {
    await mutate((db) => {
      const p = db.participants[participantId];
      if (p) p.submittedAt = new Date().toISOString();
    });
  },

  async upsertGuessCandidates(roomId: string, participantId: string, sampleIdx: number, candidates: number[]) {
    await mutate((db) => {
      const key = scoreKey(participantId, sampleIdx);
      const existing = db.guesses[key];
      const base: GuessEntry =
        existing ?? { id: uid(), roomId, participantId, sampleIdx, candidates: [], finalGuess: null };
      base.candidates = candidates;
      db.guesses[key] = base;
    });
  },

  async setFinalGuess(roomId: string, participantId: string, sampleIdx: number, beanIdx: number) {
    await mutate((db) => {
      Object.values(db.guesses).forEach((g) => {
        if (g.participantId === participantId && g.sampleIdx !== sampleIdx && g.finalGuess === beanIdx) {
          g.finalGuess = null;
        }
      });
      const key = scoreKey(participantId, sampleIdx);
      const existing = db.guesses[key];
      const base: GuessEntry =
        existing ?? { id: uid(), roomId, participantId, sampleIdx, candidates: [], finalGuess: null };
      base.finalGuess = beanIdx;
      db.guesses[key] = base;
    });
  },

  async autoFillFinalGuesses(roomId: string, participantId: string) {
    await mutate((db) => {
      Object.values(db.guesses)
        .filter((g) => g.roomId === roomId && g.participantId === participantId)
        .forEach((g) => {
          if (g.finalGuess === null && g.candidates.length === 1) {
            g.finalGuess = g.candidates[0];
          }
        });
    });
  },

  async markGuessSubmitted(participantId: string) {
    await mutate((db) => {
      const p = db.participants[participantId];
      if (p) p.guessSubmittedAt = new Date().toISOString();
    });
  },

  async upsertLeaderboardGuess(roomId: string, participantId: string, sampleIdx: number, patch: LeaderboardGuessPatch) {
    await mutate((db) => {
      const key = scoreKey(participantId, sampleIdx);
      const existing = db.leaderboardGuesses[key];
      const base: LeaderboardGuessEntry =
        existing ?? { id: uid(), roomId, participantId, sampleIdx, originGuess: '', processGuess: '', varietyGuess: '', elevationGuess: '' };
      if (patch.originGuess !== undefined) base.originGuess = patch.originGuess;
      if (patch.processGuess !== undefined) base.processGuess = patch.processGuess;
      if (patch.varietyGuess !== undefined) base.varietyGuess = patch.varietyGuess;
      if (patch.elevationGuess !== undefined) base.elevationGuess = patch.elevationGuess;
      db.leaderboardGuesses[key] = base;
    });
  },

  async listActivities() {
    return [...getDB().activities];
  },

  async addActivity(name: string) {
    await mutate((db) => {
      if (!db.activities.includes(name)) db.activities.push(name);
    });
  },

  async listHistorySessions(activityName: string) {
    return getDB()
      .historySessions.filter((h) => h.activityName === activityName)
      .sort((a, b) => (a.sessionDate ?? '').localeCompare(b.sessionDate ?? ''));
  },

  async addHistorySession(session) {
    await mutate((db) => {
      db.historySessions.push({ id: uid(), ...session });
    });
  },

  async listBeanHistory(participantName: string) {
    return getDB()
      .beanHistory.filter((h) => h.participantName === participantName)
      .sort((a, b) => (b.sessionDate ?? '').localeCompare(a.sessionDate ?? ''));
  },

  async appendBeanHistory(entries) {
    await mutate((db) => {
      entries.forEach((e) => db.beanHistory.push({ id: uid(), ...e }));
    });
  },

  async listBeanCatalog() {
    return Object.values(getDB().beanCatalog).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
  },

  async upsertBeanToCatalog(bean) {
    await mutate((db) => {
      const existing = Object.values(db.beanCatalog).find((b) => b.name === bean.name);
      if (existing) {
        Object.assign(existing, bean);
      } else {
        const id = uid();
        db.beanCatalog[id] = { id, ...bean };
      }
    });
  },

  async removeBeanFromCatalog(id: string) {
    await mutate((db) => {
      delete db.beanCatalog[id];
    });
  },
};
