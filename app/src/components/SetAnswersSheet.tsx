import { useEffect, useState } from 'react';
import { Sheet } from './ui';
import { getBackend } from '../lib/backend';
import type { RoomBean, RoomSnapshot } from '../lib/types';

export function SetAnswersSheet({
  snap,
  open,
  onClose,
  onConfirmed,
}: {
  snap: RoomSnapshot;
  open: boolean;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const backend = getBackend();
  const { room, beans } = snap;
  const sampleCount = beans.length;

  // Optimistic local override, keyed by bean id — without it, clicking a
  // bean waits for the assign→realtime→refetch round trip before the click
  // visibly registers. Mirrors assignAnswer's swap semantics locally, then
  // self-clears per bean once the server snapshot confirms that bean's slot.
  const [override, setOverride] = useState<Record<string, number | null>>({});

  useEffect(() => {
    setOverride((cur) => {
      if (Object.keys(cur).length === 0) return cur;
      let changed = false;
      const next = { ...cur };
      for (const b of beans) {
        if (b.id in next && next[b.id] === b.sampleIdx) {
          delete next[b.id];
          changed = true;
        }
      }
      return changed ? next : cur;
    });
  }, [beans]);

  function assignedSlot(bean: RoomBean): number | null {
    return bean.id in override ? override[bean.id] : bean.sampleIdx;
  }

  function pick(sampleIdx: number, bean: RoomBean) {
    const prevSlot = assignedSlot(bean);
    const occupant = beans.find((b) => b.id !== bean.id && assignedSlot(b) === sampleIdx);
    setOverride((cur) => {
      const next = { ...cur, [bean.id]: sampleIdx };
      if (occupant) next[occupant.id] = prevSlot;
      return next;
    });
    backend.assignAnswer(room.id, sampleIdx, bean.idx);
  }

  const allAssigned = beans.every((b) => assignedSlot(b) !== null);
  const unassignedSamples = Array.from({ length: sampleCount }, (_, i) => i).filter(
    (i) => !beans.some((b) => assignedSlot(b) === i),
  );
  const unusedBeans = beans.filter((b) => assignedSlot(b) === null);

  async function confirm() {
    if (!allAssigned) return;
    await backend.confirmAnswers(room.id);
    onConfirmed();
  }

  return (
    <Sheet open={open} onClose={onClose} maxHeight="80vh">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontFamily: "'Noto Serif TC',serif", fontSize: 20, fontWeight: 600 }}>設定正確答案 🔑</div>
        <div style={{ fontSize: 11, color: 'var(--muted-3)' }}>僅房主可見</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted-2)', lineHeight: 1.6 }}>依實際出杯順序，指定每支樣本對應的豆子。每支豆只能對應一個樣本。</div>

      {!allAssigned && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--gold)', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--muted)' }}>
          {unassignedSamples.length > 0 && (
            <div>尚未指定豆子的樣本：{unassignedSamples.map((i) => '樣本 ' + (i + 1)).join('、')}</div>
          )}
          {unusedBeans.length > 0 && (
            <div>尚未使用的豆子：{unusedBeans.map((b) => b.name).join('、')}</div>
          )}
        </div>
      )}

      {Array.from({ length: sampleCount }, (_, sampleIdx) => {
        const assignedHere = beans.some((b) => assignedSlot(b) === sampleIdx);
        return (
          <div key={sampleIdx} style={{ background: 'var(--bg-card)', border: '1px solid ' + (assignedHere ? 'var(--border)' : 'var(--gold)'), borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>樣本 {sampleIdx + 1}</div>
              {!assignedHere && <div style={{ fontSize: 10, color: 'var(--gold)' }}>尚未選擇</div>}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {beans.map((b) => {
                const sel = assignedSlot(b) === sampleIdx;
                const usedElsewhere = !sel && assignedSlot(b) !== null;
                return (
                  <button
                    key={b.id}
                    onClick={() => pick(sampleIdx, b)}
                    style={{
                      height: 34,
                      padding: '0 13px',
                      borderRadius: 6,
                      fontSize: 12,
                      cursor: 'pointer',
                      opacity: usedElsewhere ? 0.55 : 1,
                      background: sel ? 'var(--gold)' : 'var(--bg-app)',
                      border: '1px solid ' + (sel ? 'var(--gold)' : 'var(--border)'),
                      color: sel ? '#241a12' : 'var(--sub)',
                    }}
                  >
                    {b.name}
                    {usedElsewhere ? ' ✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <button
        onClick={confirm}
        disabled={!allAssigned}
        style={{
          height: 52,
          borderRadius: 6,
          border: 'none',
          fontSize: 15,
          fontWeight: 700,
          cursor: allAssigned ? 'pointer' : 'default',
          background: allAssigned ? 'var(--gold)' : 'var(--bg-card)',
          color: allAssigned ? '#241a12' : 'var(--muted-2)',
        }}
      >
        {allAssigned ? '確認答案' : '每支樣本都要指定豆子（' + beans.filter((b) => assignedSlot(b) !== null).length + '/' + sampleCount + '）'}
      </button>
    </Sheet>
  );
}
