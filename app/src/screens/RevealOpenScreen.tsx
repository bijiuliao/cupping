import { useState } from 'react';
import { Btn } from '../components/ui';
import { ExportSheet } from '../components/ExportSheet';
import { HistoryCompare } from '../components/HistoryCompare';
import { computeResultRows } from '../lib/selectors';
import type { RoomSnapshot } from '../lib/types';

export function RevealOpenScreen({
  snap,
  myParticipantId,
  isHost,
  onResetAll,
}: {
  snap: RoomSnapshot;
  myParticipantId: string;
  isHost: boolean;
  onResetAll: () => void;
}) {
  const [exportOpen, setExportOpen] = useState(false);
  const rows = computeResultRows(snap, myParticipantId);

  return (
    <div className="anim-fadeUp" style={{ padding: '24px 22px 120px', display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11, letterSpacing: '.25em', color: 'var(--muted)' }}>結果公佈 · 公開模式</div>
          <div style={{ fontFamily: "'Noto Serif TC',serif", fontSize: 26, fontWeight: 600 }}>今日成績</div>
        </div>
        <Btn variant="outline" onClick={() => setExportOpen(true)} style={{ height: 40, padding: '0 18px', borderRadius: 20, fontSize: 13 }}>
          匯出 ↓
        </Btn>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map((r) => (
          <div
            key={r.bean.id}
            style={{ background: 'var(--bg-card)', border: '1px solid ' + (r.rank === 1 ? 'var(--gold)' : 'var(--border)'), borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}
          >
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, color: r.rank === 1 ? 'var(--gold)' : 'var(--muted-2)', minWidth: 30, textAlign: 'center' }}>{r.rank}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.bean.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sub}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                你打 {r.mine.toFixed(2)} 分（{r.diff}）
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ fontSize: 10, letterSpacing: '.2em', color: 'var(--muted-2)' }}>平均</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, lineHeight: 1, color: 'var(--gold)' }}>{r.avg.toFixed(2)}</div>
            </div>
          </div>
        ))}
      </div>

      <HistoryCompare snap={snap} />

      <Btn variant="ghost" full onClick={onResetAll} style={{ height: 50, borderRadius: 25, border: '1.5px solid var(--muted)', color: 'var(--gold)', fontSize: 14, marginTop: 6 }}>
        {isHost ? '結束杯測 · 回到首頁' : '離開房間 · 回到首頁'}
      </Btn>

      <ExportSheet snap={snap} open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}
