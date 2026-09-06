import { useEffect, useRef, useState } from 'react';
import { Btn, Chip, Segmented } from '../components/ui';
import { getBackend } from '../lib/backend';
import { CATS, FLAVOR_TAGS, fmtTime, scaleMin, sheetTotal } from '../lib/coe';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { useElapsedSeconds } from '../hooks/useRoomSnapshot';
import { scoreFor, guessFor } from '../lib/selectors';
import type { CatKey, RoomBean, RoomSnapshot, ScoreMode } from '../lib/types';

const DEFAULT_VALS: Record<CatKey, number> = {
  clean: 6,
  sweet: 6,
  acid: 6,
  mouth: 6,
  flavor: 6,
  after: 6,
  balance: 6,
  overall: 6,
};

function beanDetailRows(bean: RoomBean): [string, string][] {
  return (
    [
      ['Area', bean.area],
      ['Country', bean.origin],
      ['Process', bean.process],
      ['Varietal(s)', bean.variety],
      ['Altitude', bean.elevation],
      ['Decaf', bean.decaf ? '是' : '否'],
      ['Roaster', bean.roaster],
      ['Producer', bean.producer],
    ] as [string, string][]
  ).filter(([, v]) => v);
}

function BeanDetailGrid({ bean }: { bean: RoomBean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
        {beanDetailRows(bean).map(([label, v]) => (
          <div key={label}>
            <span style={{ color: 'var(--muted-2)' }}>{label}：</span>
            {v}
          </div>
        ))}
      </div>
      {bean.flavorNotes && (
        <div style={{ fontSize: 12, color: 'var(--sub)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <span style={{ color: 'var(--muted-2)' }}>風味敘述：</span>
          {bean.flavorNotes}
        </div>
      )}
    </div>
  );
}

/** 'open' mode only — bean identity is already visible there, so a full detail
 * card for the current sample doesn't leak anything new. */
function BeanInfoCard({ bean }: { bean: RoomBean }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          🌱 {bean.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--gold)', flex: 'none', marginLeft: 8 }}>{open ? '收起 ▴' : '豆子資訊 ▾'}</div>
      </button>
      {open && <div style={{ padding: '0 14px 14px' }}><BeanDetailGrid bean={bean} /></div>}
    </div>
  );
}

/**
 * 'blind' mode only — shows every bean's full info as a reference sheet,
 * same spirit as the existing "我猜這支是" candidate picker which already
 * lists every bean name. What it deliberately does NOT do is tie any of
 * this to the current sample — that mapping is the whole guessing game.
 * (leaderboard mode skips this: per-attribute guessing is exactly what this
 * reference sheet would trivially hand you the answers to.)
 */
function BeanReferenceListCard({ beans }: { beans: RoomBean[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)' }}>🌱 豆單參考</div>
        <div style={{ fontSize: 11, color: 'var(--gold)', flex: 'none', marginLeft: 8 }}>{open ? '收起 ▴' : '今日豆單 ▾'}</div>
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--muted-3)' }}>只列出候選豆子本身的資訊，不會透露對應到哪支樣本</div>
          {beans.map((b) => (
            <div key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)' }}>{b.name}</div>
              <BeanDetailGrid bean={b} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ScoringScreen({
  snap,
  myParticipantId,
}: {
  snap: RoomSnapshot;
  myParticipantId: string;
}) {
  const backend = getBackend();
  const { room, beans } = snap;
  const sampleCount = beans.length;
  const [sampleIdx, setSampleIdx] = useState(0);
  const elapsed = useElapsedSeconds(room.scoringStartedAt);

  const serverEntry = scoreFor(snap, myParticipantId, sampleIdx);
  const [scoreMode, setScoreMode] = useState<ScoreMode>(serverEntry?.scoreMode ?? 'pro');
  const [vals, setVals] = useState<Record<CatKey, number>>(serverEntry?.vals ?? DEFAULT_VALS);
  const [defInt, setDefInt] = useState(serverEntry?.defInt ?? 0);
  const [easyScore, setEasyScore] = useState(serverEntry?.easyScore ?? 86);
  const [notes, setNotes] = useState(serverEntry?.notes ?? '');
  // Local echo of the blind-mode candidate picker (guess_entries.candidates)
  // — kept separate from the score fields above since it lives on a
  // different backend row (GuessEntry, not ScoreEntry), but synced the same
  // way: instant local update on click, reconciled from the server on
  // sample switch. Without this, clicking a candidate button waited for the
  // full write→realtime→refetch round trip before it visibly toggled.
  const [candidates, setCandidates] = useState<number[]>(guessFor(snap, myParticipantId, sampleIdx)?.candidates ?? []);
  // Carries the most recently used scoreMode across sample switches, so a
  // sample visited for the first time starts in whichever mode (pro/easy)
  // you were just using — not hard-coded back to 'pro' every time.
  const lastModeRef = useRef<ScoreMode>(serverEntry?.scoreMode ?? 'pro');

  // re-init local draft when the sample changes, and make sure a score row
  // exists as soon as a sample is visited — otherwise someone who accepts every
  // default (never touches a slider) would have no row at all and get silently
  // excluded from averages/history instead of counting with the default score.
  useEffect(() => {
    const e = scoreFor(snap, myParticipantId, sampleIdx);
    const initialMode = e?.scoreMode ?? lastModeRef.current;
    setScoreMode(initialMode);
    lastModeRef.current = initialMode;
    setVals(e?.vals ?? DEFAULT_VALS);
    setDefInt(e?.defInt ?? 0);
    setEasyScore(e?.easyScore ?? 86);
    setNotes(e?.notes ?? '');
    setCandidates(guessFor(snap, myParticipantId, sampleIdx)?.candidates ?? []);
    if (!e) {
      backend.upsertScore(room.id, myParticipantId, sampleIdx, {
        scoreMode: initialMode,
        vals: DEFAULT_VALS,
        defInt: 0,
        easyScore: 86,
        notes: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sampleIdx, myParticipantId]);

  const persist = useDebouncedCallback((patch: Parameters<typeof backend.upsertScore>[3]) => {
    backend.upsertScore(room.id, myParticipantId, sampleIdx, patch);
  }, 250);

  function setCat(key: CatKey, v: number) {
    setVals((old) => {
      const next = { ...old, [key]: v };
      persist({ vals: next });
      return next;
    });
  }
  function setDef(v: number) {
    setDefInt(v);
    backend.upsertScore(room.id, myParticipantId, sampleIdx, { defInt: v });
  }
  function setMode(m: ScoreMode) {
    setScoreMode(m);
    lastModeRef.current = m;
    backend.upsertScore(room.id, myParticipantId, sampleIdx, { scoreMode: m });
  }
  function changeEasy(v: number) {
    const clamped = Math.min(100, Math.max(0, v));
    setEasyScore(clamped);
    persist({ easyScore: clamped });
  }
  function changeNotes(v: string) {
    setNotes(v);
    persist({ notes: v });
  }

  function toggleFlavorTag(tag: string) {
    const parts = notes.split('、').map((s) => s.trim()).filter(Boolean);
    const next = parts.includes(tag) ? parts.filter((p) => p !== tag) : parts.concat([tag]);
    changeNotes(next.join('、'));
  }

  const isBlind = room.mode === 'blind' || room.mode === 'leaderboard';
  const bean = beans.find((b) => b.sampleIdx === sampleIdx);
  const min = scaleMin();
  const total = sheetTotal(vals, defInt, scoreMode, easyScore);
  const isLast = sampleIdx === sampleCount - 1;

  function toggleCandidate(beanIdx: number) {
    const next = candidates.includes(beanIdx) ? candidates.filter((x) => x !== beanIdx) : candidates.concat([beanIdx]);
    setCandidates(next);
    backend.upsertGuessCandidates(room.id, myParticipantId, sampleIdx, next);
  }

  async function handleSubmit() {
    await backend.markSubmitted(myParticipantId);
  }

  return (
    <div className="anim-fadeUp" style={{ padding: '20px 22px 150px', display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
      {room.mode === 'open' && bean && <BeanInfoCard bean={bean} />}
      {room.mode === 'blind' && <BeanReferenceListCard beans={beans} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 11, letterSpacing: '.25em', color: 'var(--muted)' }}>
            {isBlind
              ? (room.mode === 'leaderboard' ? '排行榜' : '盲測') + ' · ' + (sampleIdx + 1) + ' / ' + sampleCount
              : room.mode === 'competition'
                ? '競賽 · ' + (sampleIdx + 1) + ' / ' + sampleCount
                : '公開 · ' + (sampleIdx + 1) + ' / ' + sampleCount + '（' + [bean?.origin, bean?.process].filter(Boolean).join(' · ') + '）'}
          </div>
          <div style={{ fontFamily: "'Noto Serif TC',serif", fontSize: 26, fontWeight: 600 }}>{isBlind ? '樣本 ' + (sampleIdx + 1) : bean?.name || ''}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 14px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', animation: 'pulseDot 2.2s ease-out infinite' }} />
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: 'var(--cream)' }}>{fmtTime(elapsed)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {beans.map((_, i) => {
          const active = i === sampleIdx;
          return (
            <button
              key={i}
              onClick={() => setSampleIdx(i)}
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: 13,
                background: active ? 'var(--gold)' : 'var(--bg-card)',
                border: '1px solid ' + (active ? 'var(--gold)' : 'var(--border)'),
                color: active ? '#241a12' : 'var(--muted-2)',
                fontWeight: active ? 700 : 400,
              }}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, color: 'var(--muted-2)' }}>評分方式</div>
        <Segmented
          value={scoreMode}
          onChange={setMode}
          options={[
            { value: 'pro', label: '專業評分' },
            { value: 'easy', label: '簡易評分' },
          ]}
        />
      </div>

      {scoreMode === 'pro' ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {CATS.map((c) => {
              const raw = vals[c.key];
              const pct = (((raw - min) / (8 - min)) * 100).toFixed(1) + '%';
              return (
                <div key={c.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {c.label} <span style={{ fontSize: 11, color: 'var(--muted-2)' }}>{c.en}</span>
                    </div>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: 'var(--gold)' }}>{raw.toFixed(2)}</div>
                  </div>
                  <div style={{ position: 'relative', height: 28, display: 'flex', alignItems: 'center' }}>
                    <div style={{ position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2, background: 'var(--border)' }} />
                    <div style={{ position: 'absolute', left: 0, height: 4, borderRadius: 2, background: 'linear-gradient(90deg,#8a6f52,#e0b877)', width: pct }} />
                    <input
                      className="rng"
                      type="range"
                      min={min}
                      max={8}
                      step={0.25}
                      value={raw}
                      onChange={(e) => setCat(c.key, parseFloat(e.target.value))}
                      style={{ position: 'absolute', left: -2, right: -2, width: '100%' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted-3)' }}>
                    {Array.from({ length: 8 - min + 1 }, (_, i) => (
                      <span key={i}>{min + i}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>
                缺點扣分 <span style={{ fontSize: 11, color: 'var(--muted-2)' }}>Defects</span>
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: 'var(--danger)' }}>−{defInt}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>以 1 杯計</div>
              <div style={{ display: 'flex', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: 8, padding: 3 }}>
                {[
                  { v: 0, label: '無' },
                  { v: 2, label: '輕微 −2' },
                  { v: 4, label: '明顯 −4' },
                ].map((opt) => {
                  const active = defInt === opt.v;
                  return (
                    <button
                      key={opt.v}
                      onClick={() => setDef(opt.v)}
                      style={{
                        height: 30,
                        padding: '0 14px',
                        borderRadius: 6,
                        border: 'none',
                        fontSize: 12,
                        cursor: 'pointer',
                        background: active ? (opt.v === 4 ? 'var(--danger)' : 'var(--gold)') : 'transparent',
                        color: active ? '#241a12' : 'var(--muted-2)',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>快速選擇總分</div>
            <div style={{ fontSize: 11, color: 'var(--muted-2)' }}>點選 80–90，再用 ± 微調 0.25</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {Array.from({ length: 11 }, (_, i) => 80 + i).map((n) => {
              const active = Math.trunc(easyScore) === n;
              return (
                <button
                  key={n}
                  onClick={() => changeEasy(n)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: active ? 700 : 400,
                    cursor: 'pointer',
                    background: active ? 'var(--gold)' : 'var(--bg-app)',
                    border: '1px solid ' + (active ? 'var(--gold)' : 'var(--border)'),
                    color: active ? '#241a12' : 'var(--sub)',
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center' }}>
            <button
              onClick={() => changeEasy(easyScore - 0.25)}
              style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-app)', border: '1px solid var(--border)', color: 'var(--gold)', fontSize: 20, cursor: 'pointer' }}
            >
              −
            </button>
            <div
              style={{
                width: 130,
                height: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Cormorant Garamond',serif",
                fontSize: 34,
                background: 'var(--bg-app)',
                border: '1.5px solid var(--gold)',
                borderRadius: 6,
                color: 'var(--gold)',
              }}
            >
              {easyScore.toFixed(2)}
            </div>
            <button
              onClick={() => changeEasy(easyScore + 0.25)}
              style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-app)', border: '1px solid var(--border)', color: 'var(--gold)', fontSize: 20, cursor: 'pointer' }}
            >
              ＋
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>風味備註</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {FLAVOR_TAGS.map((tag) => {
            const active = notes.split('、').map((s) => s.trim()).includes(tag);
            return (
              <Chip key={tag} active={active} onClick={() => toggleFlavorTag(tag)} style={{ height: 30, padding: '0 12px', fontSize: 11 }}>
                {tag}
              </Chip>
            );
          })}
        </div>
        <textarea
          value={notes}
          onChange={(e) => changeNotes(e.target.value)}
          placeholder="點選常見字卡，或手動輸入…"
          style={{ borderRadius: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '12px 14px', fontSize: 14, color: 'var(--cream)', minHeight: 64, resize: 'vertical', outline: 'none' }}
        />
      </div>

      {room.mode === 'blind' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>我猜這支是</div>
            <div style={{ fontSize: 11, color: 'var(--muted-3)' }}>可複選候選 · 鎖定後再定案</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {beans.map((b) => {
              const sel = candidates.includes(b.idx);
              return (
                <button
                  key={b.id}
                  onClick={() => toggleCandidate(b.idx)}
                  style={{
                    height: 36,
                    padding: '0 14px',
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: 'pointer',
                    background: sel ? 'var(--gold)' : 'var(--bg-app)',
                    border: '1px solid ' + (sel ? 'var(--gold)' : 'var(--border)'),
                    color: sel ? '#241a12' : 'var(--sub)',
                  }}
                >
                  {b.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'radial-gradient(140% 160% at 0% 0%,#443019 0%,#3a2a1a 55%)',
          border: '1px solid var(--gold)',
          borderRadius: 8,
          padding: '14px 18px',
          boxShadow: '0 6px 24px rgba(0,0,0,.35),inset 0 1px 0 rgba(224,184,119,.18)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 11, letterSpacing: '.2em', color: 'var(--muted)' }}>本樣本總分</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 36, lineHeight: 1, color: 'var(--gold)' }}>{total.toFixed(2)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setSampleIdx((i) => Math.max(0, i - 1))}
            style={{ width: 46, height: 46, borderRadius: '50%', background: 'transparent', border: '1.5px solid var(--border-strong)', color: 'var(--gold)', fontSize: 16, cursor: 'pointer' }}
          >
            ←
          </button>
          {isLast ? (
            <Btn variant="solid" onClick={handleSubmit} style={{ height: 46, padding: '0 22px', borderRadius: 6 }}>
              交卷 ✓
            </Btn>
          ) : (
            <Btn variant="solid" onClick={() => setSampleIdx((i) => Math.min(sampleCount - 1, i + 1))} style={{ height: 46, padding: '0 22px', borderRadius: 6 }}>
              下一支 →
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}
