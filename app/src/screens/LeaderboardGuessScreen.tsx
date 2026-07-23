import { useRef, useState } from 'react';
import { Btn, ComboBox, Segmented } from '../components/ui';
import { getBackend } from '../lib/backend';
import type { LeaderboardGuessPatch } from '../lib/backend';
import { AREAS, PROCESSES, VARIETIES, countriesForArea } from '../lib/coe';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { ELEVATION_THRESHOLD_M, LB_MAX_PER_SAMPLE, leaderboardGuessFor, totalOf, scoreFor } from '../lib/selectors';
import type { RoomSnapshot } from '../lib/types';

interface GuessFields {
  areaGuess: string;
  originGuess: string;
  processGuess: string;
  varietyGuess: string;
  elevationGuess: string;
  decafGuess: string;
}

function SampleGuessCard({
  roomId,
  participantId,
  sampleIdx,
  myScore,
  initial,
}: {
  roomId: string;
  participantId: string;
  sampleIdx: number;
  myScore: number;
  initial: GuessFields;
}) {
  const backend = getBackend();
  const [local, setLocal] = useState(initial);
  // Same accumulate-then-flush pattern as the Lobby's bean editor: without it,
  // typing in two fields inside one debounce window would drop the earlier edit.
  const pending = useRef<LeaderboardGuessPatch>({});
  const flush = useDebouncedCallback(() => {
    const patch = pending.current;
    pending.current = {};
    backend.upsertLeaderboardGuess(roomId, participantId, sampleIdx, patch);
  }, 300);

  function set(patch: LeaderboardGuessPatch) {
    setLocal((cur) => ({ ...cur, ...patch }));
    pending.current = { ...pending.current, ...patch };
    flush();
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>樣本 {sampleIdx + 1}</div>
        <div style={{ fontSize: 11, color: 'var(--muted-2)' }}>你的總分 {myScore.toFixed(2)}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <ComboBox
          value={local.areaGuess}
          onChange={(v) => {
            const validCountries = countriesForArea(v);
            set({ areaGuess: v, originGuess: validCountries.includes(local.originGuess) ? local.originGuess : '' });
          }}
          options={AREAS}
          placeholder="猜大洲 Area"
          style={{ height: 38, fontSize: 13, borderRadius: 6, padding: '0 10px' }}
        />
        <ComboBox
          value={local.originGuess}
          onChange={(v) => set({ originGuess: v })}
          options={countriesForArea(local.areaGuess)}
          placeholder="猜國家 Country"
          style={{ height: 38, fontSize: 13, borderRadius: 6, padding: '0 10px' }}
        />
        <ComboBox
          value={local.processGuess}
          onChange={(v) => set({ processGuess: v })}
          options={PROCESSES}
          placeholder="猜處理法"
          style={{ height: 38, fontSize: 13, borderRadius: 6, padding: '0 10px' }}
        />
        <ComboBox
          value={local.varietyGuess}
          onChange={(v) => set({ varietyGuess: v })}
          options={VARIETIES}
          placeholder="猜品種 Varietal(s)"
          style={{ height: 38, fontSize: 13, borderRadius: 6, padding: '0 10px' }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 11, color: 'var(--muted-2)' }}>猜海拔 Altitude</div>
        <Segmented
          value={local.elevationGuess as 'above' | 'below' | ''}
          onChange={(v) => set({ elevationGuess: v })}
          options={[
            { value: 'above', label: `${ELEVATION_THRESHOLD_M}m 以上` },
            { value: 'below', label: `${ELEVATION_THRESHOLD_M}m 以下` },
          ]}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 11, color: 'var(--muted-2)' }}>猜是否低咖啡因 Decaf</div>
        <Segmented
          value={local.decafGuess as 'yes' | 'no' | ''}
          onChange={(v) => set({ decafGuess: v })}
          options={[
            { value: 'no', label: '否' },
            { value: 'yes', label: '是' },
          ]}
        />
      </div>
    </div>
  );
}

export function LeaderboardGuessScreen({ snap, myParticipantId }: { snap: RoomSnapshot; myParticipantId: string }) {
  const backend = getBackend();
  const { room, beans } = snap;

  const rows = beans.map((_, sampleIdx) => {
    const g = leaderboardGuessFor(snap, myParticipantId, sampleIdx);
    const myScore = totalOf(scoreFor(snap, myParticipantId, sampleIdx));
    return {
      sampleIdx,
      myScore,
      initial: {
        areaGuess: g?.areaGuess ?? '',
        originGuess: g?.originGuess ?? '',
        processGuess: g?.processGuess ?? '',
        varietyGuess: g?.varietyGuess ?? '',
        elevationGuess: g?.elevationGuess ?? '',
        decafGuess: g?.decafGuess ?? '',
      },
    };
  });

  const filledCount = rows.filter(
    (r) =>
      r.initial.areaGuess.trim() &&
      r.initial.originGuess.trim() &&
      r.initial.processGuess.trim() &&
      r.initial.varietyGuess.trim() &&
      r.initial.elevationGuess &&
      r.initial.decafGuess,
  ).length;
  const allFilled = rows.length > 0 && filledCount === rows.length;

  async function submit() {
    if (!allFilled) return;
    await backend.markGuessSubmitted(myParticipantId);
  }

  return (
    <div className="anim-fadeUp" style={{ padding: '24px 22px 150px', display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 11, letterSpacing: '.25em', color: 'var(--muted)' }}>評分已鎖定 · 排行榜揭曉前</div>
        <div style={{ fontFamily: "'Noto Serif TC',serif", fontSize: 26, fontWeight: 600 }}>猜猜每支樣本的身份？</div>
        <div style={{ fontSize: 12, color: 'var(--muted-2)' }}>
          逐項猜 Area/Country/Process/Varietal(s)/Altitude/Decaf，猜對哪項就拿哪項的分（滿分每支樣本 {LB_MAX_PER_SAMPLE} 分），不用整支豆子都對才有分
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map((r) => (
          <SampleGuessCard
            key={r.sampleIdx}
            roomId={room.id}
            participantId={myParticipantId}
            sampleIdx={r.sampleIdx}
            myScore={r.myScore}
            initial={r.initial}
          />
        ))}
      </div>

      <Btn variant="solid" full onClick={submit} disabled={!allFilled}>
        {allFilled ? '送出猜測 ✓' : `請填完每支樣本的六項猜測（${filledCount}/${rows.length}）`}
      </Btn>
    </div>
  );
}
