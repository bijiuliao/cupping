import { Sheet } from './ui';
import { getBackend } from '../lib/backend';
import type { RoomSnapshot } from '../lib/types';

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
  const allAssigned = beans.every((b) => b.sampleIdx !== null);

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
      {Array.from({ length: sampleCount }, (_, sampleIdx) => (
        <div key={sampleIdx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>樣本 {sampleIdx + 1}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {beans.map((b) => {
              const sel = b.sampleIdx === sampleIdx;
              return (
                <button
                  key={b.id}
                  onClick={() => backend.assignAnswer(room.id, sampleIdx, b.idx)}
                  style={{
                    height: 34,
                    padding: '0 13px',
                    borderRadius: 17,
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
      ))}
      <button
        onClick={confirm}
        disabled={!allAssigned}
        style={{
          height: 52,
          borderRadius: 26,
          border: 'none',
          fontSize: 15,
          fontWeight: 700,
          cursor: allAssigned ? 'pointer' : 'default',
          background: allAssigned ? 'var(--gold)' : 'var(--bg-card)',
          color: allAssigned ? '#241a12' : 'var(--muted-2)',
        }}
      >
        {allAssigned ? '確認答案' : '每支樣本都要指定豆子（' + beans.filter((b) => b.sampleIdx !== null).length + '/' + sampleCount + '）'}
      </button>
    </Sheet>
  );
}
