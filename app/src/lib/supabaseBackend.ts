import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Backend, CreateRoomInput, ScorePatch } from './backend';
import { CATS, beanSub, sheetTotal } from './coe';
import type {
  BeanHistoryEntry,
  CatKey,
  GuessEntry,
  HistorySession,
  Participant,
  Role,
  Room,
  RoomBean,
  RoomSnapshot,
  ScoreEntry,
  Stage,
} from './types';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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

// ---- row <-> domain mapping -------------------------------------------------

function mapRoom(r: any): Room {
  return {
    id: r.id,
    code: r.code,
    mode: r.mode,
    activityName: r.activity_name,
    subtitle: r.subtitle ?? '',
    sessionDate: r.session_date,
    stage: r.stage,
    scoringStartedAt: r.scoring_started_at,
    answerConfirmed: r.answer_confirmed,
    hostName: r.host_name,
    archivedDone: r.archived_done,
    createdAt: r.created_at,
  };
}

function mapBean(r: any): RoomBean {
  return {
    id: r.id,
    idx: r.idx,
    sampleIdx: r.sample_idx,
    name: r.name,
    origin: r.origin ?? '',
    process: r.process ?? '',
    variety: r.variety ?? '',
    roaster: r.roaster ?? '',
  };
}

function mapParticipant(r: any): Participant {
  return {
    id: r.id,
    roomId: r.room_id,
    clientId: r.client_id,
    name: r.name,
    role: r.role,
    joinedAt: r.joined_at,
    submittedAt: r.submitted_at,
    guessSubmittedAt: r.guess_submitted_at,
  };
}

function mapScore(r: any): ScoreEntry {
  return {
    id: r.id,
    roomId: r.room_id,
    participantId: r.participant_id,
    sampleIdx: r.sample_idx,
    scoreMode: r.score_mode,
    vals: {
      clean: Number(r.clean),
      sweet: Number(r.sweet),
      acid: Number(r.acid),
      mouth: Number(r.mouth),
      flavor: Number(r.flavor),
      after: Number(r.after),
      balance: Number(r.balance),
      overall: Number(r.overall),
    },
    defInt: Number(r.def_int),
    easyScore: Number(r.easy_score),
    notes: r.notes ?? '',
  };
}

function mapGuess(r: any): GuessEntry {
  return {
    id: r.id,
    roomId: r.room_id,
    participantId: r.participant_id,
    sampleIdx: r.sample_idx,
    candidates: r.candidates ?? [],
    finalGuess: r.final_guess,
  };
}

function mapHistorySession(r: any): HistorySession {
  return {
    id: r.id,
    activityName: r.activity_name,
    subtitle: r.subtitle ?? '',
    sessionDate: r.session_date,
    avgScore: Number(r.avg_score),
    beans: r.beans ?? [],
    guessTally: r.guess_tally ?? {},
    roomId: r.room_id,
  };
}

function mapBeanHistory(r: any): BeanHistoryEntry {
  return {
    id: r.id,
    participantName: r.participant_name,
    beanName: r.bean_name,
    sub: r.sub ?? '',
    myScore: Number(r.my_score),
    sessionLabel: r.session_label,
    sessionDate: r.session_date,
  };
}

export function createSupabaseBackend(url: string, anonKey: string): Backend {
  const supabase: SupabaseClient = createClient(url, anonKey);

  async function fetchSnapshot(roomId: string): Promise<RoomSnapshot | null> {
    const { data: roomRow } = await supabase.from('rooms').select('*').eq('id', roomId).maybeSingle();
    if (!roomRow) return null;
    const [beansRes, partsRes, scoresRes, guessesRes] = await Promise.all([
      supabase.from('room_beans').select('*').eq('room_id', roomId).order('idx'),
      supabase.from('participants').select('*').eq('room_id', roomId).order('joined_at'),
      supabase.from('score_entries').select('*').eq('room_id', roomId),
      supabase.from('guess_entries').select('*').eq('room_id', roomId),
    ]);
    return {
      room: mapRoom(roomRow),
      beans: (beansRes.data ?? []).map(mapBean),
      participants: (partsRes.data ?? []).map(mapParticipant),
      scores: (scoresRes.data ?? []).map(mapScore),
      guesses: (guessesRes.data ?? []).map(mapGuess),
    };
  }

  return {
    async createRoom(input: CreateRoomInput) {
      let code = randomCode();
      let roomId: string | null = null;
      for (let attempt = 0; attempt < 10 && !roomId; attempt++) {
        const { data, error } = await supabase
          .from('rooms')
          .insert({
            code,
            mode: input.mode,
            activity_name: input.activityName,
            subtitle: input.subtitle,
            session_date: input.sessionDate,
            host_name: input.hostName,
            stage: 'waiting',
            answer_confirmed: input.mode === 'open',
          })
          .select('id')
          .single();
        if (!error && data) {
          roomId = data.id;
        } else if (error && error.code === '23505') {
          code = randomCode();
        } else if (error) {
          throw error;
        }
      }
      if (!roomId) throw new Error('無法配置房間代碼，請再試一次');
      const beanRows = input.beans.map((b, i) => ({
        room_id: roomId,
        idx: i + 1,
        sample_idx: input.mode === 'open' ? i : null,
        name: b.name,
        origin: b.origin,
        process: b.process,
        variety: b.variety,
        roaster: b.roaster,
      }));
      if (beanRows.length) {
        const { error } = await supabase.from('room_beans').insert(beanRows);
        if (error) throw error;
      }
      return { roomId, code };
    },

    async findRoomByCode(code: string) {
      const { data } = await supabase
        .from('rooms')
        .select('id')
        .eq('code', code.trim().toUpperCase())
        .maybeSingle();
      return data ? data.id : null;
    },

    async ensureParticipant(roomId: string, clientId: string, name: string, role: Role) {
      const { error } = await supabase
        .from('participants')
        .upsert(
          { room_id: roomId, client_id: clientId, name, role },
          { onConflict: 'room_id,client_id' },
        );
      if (error) throw error;
    },

    subscribeRoom(roomId: string, cb: (snap: RoomSnapshot | null) => void) {
      let cancelled = false;
      const refresh = () => {
        if (cancelled) return;
        fetchSnapshot(roomId).then((snap) => {
          if (!cancelled) cb(snap);
        });
      };
      refresh();
      const channel = supabase
        .channel('room-' + roomId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_beans', filter: `room_id=eq.${roomId}` }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `room_id=eq.${roomId}` }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'score_entries', filter: `room_id=eq.${roomId}` }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'guess_entries', filter: `room_id=eq.${roomId}` }, refresh)
        .subscribe();
      return () => {
        cancelled = true;
        supabase.removeChannel(channel);
      };
    },

    async setStage(roomId: string, stage: Stage, extra) {
      const patch: Record<string, unknown> = { stage };
      if (extra && 'scoringStartedAt' in extra) patch.scoring_started_at = extra.scoringStartedAt ?? null;
      const { error } = await supabase.from('rooms').update(patch).eq('id', roomId);
      if (error) throw error;
    },

    async assignAnswer(roomId: string, sampleIdx: number, beanIdx: number) {
      const { data } = await supabase.from('room_beans').select('*').eq('room_id', roomId);
      const beans = (data ?? []).map(mapBean);
      const target = beans.find((b) => b.idx === beanIdx);
      if (!target) return;
      const occupant = beans.find((b) => b.sampleIdx === sampleIdx);
      const prevSlot = target.sampleIdx;
      await supabase.from('room_beans').update({ sample_idx: sampleIdx }).eq('id', target.id);
      if (occupant && occupant.id !== target.id) {
        await supabase.from('room_beans').update({ sample_idx: prevSlot }).eq('id', occupant.id);
      }
    },

    async confirmAnswers(roomId: string) {
      const { error } = await supabase.from('rooms').update({ answer_confirmed: true }).eq('id', roomId);
      if (error) throw error;
    },

    async finalizeReveal(roomId: string) {
      // Atomic claim so we only ever compute + write this once, even if
      // multiple clients race to trigger it.
      const { data: claimed } = await supabase
        .from('rooms')
        .update({ archived_done: true })
        .eq('id', roomId)
        .eq('archived_done', false)
        .select('id');
      if (!claimed || claimed.length === 0) return;

      const { data: roomRow } = await supabase.from('rooms').select('*').eq('id', roomId).maybeSingle();
      if (!roomRow) return;
      const room = mapRoom(roomRow);
      const [beansRes, partsRes, scoresRes, guessesRes] = await Promise.all([
        supabase.from('room_beans').select('*').eq('room_id', roomId),
        supabase.from('participants').select('*').eq('room_id', roomId),
        supabase.from('score_entries').select('*').eq('room_id', roomId),
        supabase.from('guess_entries').select('*').eq('room_id', roomId),
      ]);
      const beans = (beansRes.data ?? []).map(mapBean);
      const participants = (partsRes.data ?? []).map(mapParticipant);
      const scores = (scoresRes.data ?? []).map(mapScore);
      const guesses = (guessesRes.data ?? []).map(mapGuess);

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
      const historyEntries: Omit<BeanHistoryEntry, 'id'>[] = [];
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

      await supabase.from('history_sessions').insert({
        activity_name: room.activityName,
        subtitle: room.subtitle,
        session_date: sessionDate,
        avg_score: overallAvg,
        beans: beans.map((b) => b.name),
        guess_tally: guessTally,
        room_id: roomId,
      });

      if (historyEntries.length) {
        await supabase.from('bean_history').insert(
          historyEntries.map((h) => ({
            participant_name: h.participantName,
            bean_name: h.beanName,
            sub: h.sub,
            my_score: h.myScore,
            session_label: h.sessionLabel,
            session_date: h.sessionDate,
            room_id: roomId,
          })),
        );
      }
    },

    async upsertScore(roomId: string, participantId: string, sampleIdx: number, patch: ScorePatch) {
      const { data: existingRow } = await supabase
        .from('score_entries')
        .select('*')
        .eq('participant_id', participantId)
        .eq('sample_idx', sampleIdx)
        .maybeSingle();
      const base = existingRow
        ? mapScore(existingRow)
        : ({
            scoreMode: 'pro',
            vals: defaultVals(),
            defInt: 0,
            easyScore: 80,
            notes: '',
          } as Pick<ScoreEntry, 'scoreMode' | 'vals' | 'defInt' | 'easyScore' | 'notes'>);
      const vals = { ...base.vals, ...(patch.vals ?? {}) };
      const { error } = await supabase.from('score_entries').upsert(
        {
          room_id: roomId,
          participant_id: participantId,
          sample_idx: sampleIdx,
          score_mode: patch.scoreMode ?? base.scoreMode,
          clean: vals.clean,
          sweet: vals.sweet,
          acid: vals.acid,
          mouth: vals.mouth,
          flavor: vals.flavor,
          after: vals.after,
          balance: vals.balance,
          overall: vals.overall,
          def_int: patch.defInt ?? base.defInt,
          easy_score: patch.easyScore ?? base.easyScore,
          notes: patch.notes ?? base.notes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'participant_id,sample_idx' },
      );
      if (error) throw error;
    },

    async markSubmitted(participantId: string) {
      const { error } = await supabase
        .from('participants')
        .update({ submitted_at: new Date().toISOString() })
        .eq('id', participantId);
      if (error) throw error;
    },

    async upsertGuessCandidates(roomId: string, participantId: string, sampleIdx: number, candidates: number[]) {
      const { error } = await supabase
        .from('guess_entries')
        .upsert(
          { room_id: roomId, participant_id: participantId, sample_idx: sampleIdx, candidates },
          { onConflict: 'participant_id,sample_idx' },
        );
      if (error) throw error;
    },

    async setFinalGuess(roomId: string, participantId: string, sampleIdx: number, beanIdx: number) {
      const { error } = await supabase
        .from('guess_entries')
        .upsert(
          { room_id: roomId, participant_id: participantId, sample_idx: sampleIdx, final_guess: beanIdx },
          { onConflict: 'participant_id,sample_idx' },
        );
      if (error) throw error;
    },

    async autoFillFinalGuesses(roomId: string, participantId: string) {
      const { data } = await supabase
        .from('guess_entries')
        .select('*')
        .eq('room_id', roomId)
        .eq('participant_id', participantId);
      const rows = (data ?? []).map(mapGuess).filter((g) => g.finalGuess === null && g.candidates.length === 1);
      await Promise.all(
        rows.map((g) =>
          supabase.from('guess_entries').update({ final_guess: g.candidates[0] }).eq('id', g.id),
        ),
      );
    },

    async markGuessSubmitted(participantId: string) {
      const { error } = await supabase
        .from('participants')
        .update({ guess_submitted_at: new Date().toISOString() })
        .eq('id', participantId);
      if (error) throw error;
    },

    async listActivities() {
      const { data } = await supabase.from('activities').select('name').order('name');
      return (data ?? []).map((r) => r.name as string);
    },

    async addActivity(name: string) {
      await supabase.from('activities').upsert({ name }, { onConflict: 'name', ignoreDuplicates: true });
    },

    async listHistorySessions(activityName: string) {
      const { data } = await supabase
        .from('history_sessions')
        .select('*')
        .eq('activity_name', activityName)
        .order('session_date', { ascending: true });
      return (data ?? []).map(mapHistorySession);
    },

    async addHistorySession(session) {
      const { error } = await supabase.from('history_sessions').insert({
        activity_name: session.activityName,
        subtitle: session.subtitle,
        session_date: session.sessionDate,
        avg_score: session.avgScore,
        beans: session.beans,
        guess_tally: session.guessTally,
        room_id: session.roomId,
      });
      if (error) throw error;
    },

    async listBeanHistory(participantName: string) {
      const { data } = await supabase
        .from('bean_history')
        .select('*')
        .eq('participant_name', participantName)
        .order('session_date', { ascending: false });
      return (data ?? []).map(mapBeanHistory);
    },

    async appendBeanHistory(entries) {
      if (!entries.length) return;
      const { error } = await supabase.from('bean_history').insert(
        entries.map((e) => ({
          participant_name: e.participantName,
          bean_name: e.beanName,
          sub: e.sub,
          my_score: e.myScore,
          session_label: e.sessionLabel,
          session_date: e.sessionDate,
        })),
      );
      if (error) throw error;
    },
  };
}
