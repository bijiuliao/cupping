import { useEffect, useState } from 'react';
import { Btn } from '../components/ui';
import { getBackend } from '../lib/backend';
import { guessFor, totalOf, scoreFor } from '../lib/selectors';
import type { RoomSnapshot } from '../lib/types';

export function GuessScreen({ snap, myParticipantId }: { snap: RoomSnapshot; myParticipantId: string }) {
  const backend = getBackend();
  const { room, beans } = snap;

  useEffect(() => {
    backend.autoFillFinalGuesses(room.id, myParticipantId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, myParticipantId]);

  // Optimistic local override, keyed by sample index — without it, clicking a
  // bean waits for the write→realtime→refetch round trip before the click
  // visibly registers. Mirrors setFinalGuess's swap semantics locally, then
  // self-clears per sample once the server snapshot confirms that sample's guess.
  const [override, setOverride] = useState<Record<number, number | null>>({});

  useEffect(() => {
    setOverride((cur) => {
      if (Object.keys(cur).length === 0) return cur;
      let changed = false;
      const next = { ...cur };
      for (const key of Object.keys(next)) {
        const sampleIdx = Number(key);
        const serverVal = guessFor(snap, myParticipantId, sampleIdx)?.finalGuess ?? null;
        if (next[sampleIdx] === serverVal) {
          delete next[sampleIdx];
          changed = true;
        }
      }
      return changed ? next : cur;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.guesses]);

  function guessedBeanIdx(sampleIdx: number): number | null {
    if (sampleIdx in override) return override[sampleIdx];
    return guessFor(snap, myParticipantId, sampleIdx)?.finalGuess ?? null;
  }

  // Sample slots exist independently of the (still-unassigned, in blind mode)
  // sample->bean mapping, which the host only sets after everyone has guessed.
  const rows = beans.map((_, i) => {
    const g = guessFor(snap, myParticipantId, i);
    const myScore = totalOf(scoreFor(snap, myParticipantId, i));
    return { sampleIdx: i, guess: g, myScore };
  });

  const allGuessed = rows.length > 0 && rows.every((r) => guessedBeanIdx(r.sampleIdx) != null);
  const guessedCount = rows.filter((r) => guessedBeanIdx(r.sampleIdx) != null).length;

  function pick(sampleIdx: number, beanIdx: number) {
    setOverride((cur) => {
      const next = { ...cur, [sampleIdx]: beanIdx };
      rows.forEach((r) => {
        if (r.sampleIdx !== sampleIdx && guessedBeanIdx(r.sampleIdx) === beanIdx) {
          next[r.sampleIdx] = null;
        }
      });
      return next;
    });
    backend.setFinalGuess(room.id, myParticipantId, sampleIdx, beanIdx);
  }

  async function submit() {
    if (!allGuessed) return;
    await backend.markGuessSubmitted(myParticipantId);
  }

  return (
    <div className="anim-fadeUp" style={{ padding: '24px 22px 150px', display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 11, letterSpacing: '.25em', color: 'var(--muted)' }}>評分已鎖定 · 盲測揭曉前</div>
        <div style={{ fontFamily: "'Noto Serif TC',serif", fontSize: 26, fontWeight: 600 }}>猜猜每支樣本是哪支豆？</div>
        <div style={{ fontSize: 12, color: 'var(--muted-2)' }}>金框＝評分時勾選的候選；每支樣本點選一個定案，猜對數量決定排行榜名次</div>
      </div>

      {!allGuessed && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--gold)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: 'var(--muted)' }}>
          尚未選擇的樣本：
          {rows
            .filter((r) => guessedBeanIdx(r.sampleIdx) == null)
            .map((r) => '樣本 ' + (r.sampleIdx + 1))
            .join('、')}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map((r) => {
          const myGuess = guessedBeanIdx(r.sampleIdx);
          const assignedHere = myGuess != null;
          return (
            <div key={r.sampleIdx} style={{ background: 'var(--bg-card)', border: '1px solid ' + (assignedHere ? 'var(--border)' : 'var(--gold)'), borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>樣本 {r.sampleIdx + 1}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  {!assignedHere && <div style={{ fontSize: 10, color: 'var(--gold)' }}>尚未選擇</div>}
                  <div style={{ fontSize: 11, color: 'var(--muted-2)' }}>你的總分 {r.myScore.toFixed(2)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {beans.map((b) => {
                  const sel = myGuess === b.idx;
                  const cand = (r.guess?.candidates ?? []).includes(b.idx);
                  return (
                    <button
                      key={b.id}
                      onClick={() => pick(r.sampleIdx, b.idx)}
                      style={{
                        height: 36,
                        padding: '0 14px',
                        borderRadius: 6,
                        fontSize: 12,
                        cursor: 'pointer',
                        background: sel ? 'var(--gold)' : 'var(--bg-app)',
                        border: '1px solid ' + (sel || cand ? 'var(--gold)' : 'var(--border)'),
                        color: sel ? '#241a12' : cand ? 'var(--gold)' : 'var(--sub)',
                      }}
                    >
                      {b.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Btn variant="solid" full onClick={submit} disabled={!allGuessed}>
        {allGuessed ? '送出猜測 ✓' : `請為每支樣本選一支豆（${guessedCount}/${rows.length}）`}
      </Btn>
    </div>
  );
}
