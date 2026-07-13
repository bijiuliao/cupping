import { useEffect, useState } from 'react';
import { Sheet, TextInput } from './ui';
import { getBackend } from '../lib/backend';
import type { HistorySession, RoomSnapshot } from '../lib/types';
import { computeResultRows } from '../lib/selectors';

export function HistoryCompare({ snap, onHistoryLoaded }: { snap: RoomSnapshot; onHistoryLoaded?: (h: HistorySession[]) => void }) {
  const backend = getBackend();
  const { room, beans } = snap;
  const [history, setHistory] = useState<HistorySession[]>([]);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newSub, setNewSub] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newAvg, setNewAvg] = useState('');
  const [newBeans, setNewBeans] = useState('');

  useEffect(() => {
    backend.listHistorySessions(room.activityName).then((h) => {
      setHistory(h);
      onHistoryLoaded?.(h);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.activityName]);

  const curRows = computeResultRows(snap, undefined);
  const curAvg = curRows.length > 0 ? curRows.reduce((sum, r) => sum + r.avg, 0) / curRows.length : 0;
  const label = room.subtitle ? '本場 · ' + room.subtitle : '本場';
  const bars = history
    .map((h) => ({ label: h.subtitle || h.activityName, val: h.avgScore, beans: h.beans, date: h.sessionDate, me: false }))
    .concat([{ label, val: curAvg, beans: beans.map((b) => b.name), date: null, me: true }]);

  const vs = bars.map((b) => b.val);
  const lo = Math.min(...vs) - 1.5;
  const hi = Math.max(...vs) + 0.5;

  async function confirmAdd() {
    const sub = newSub.trim();
    const avg = parseFloat(newAvg);
    if (!sub || isNaN(avg)) {
      setAddOpen(false);
      return;
    }
    const beanList = newBeans
      .split(/[,，]/)
      .map((x) => x.trim())
      .filter(Boolean);
    await backend.addHistorySession({
      activityName: room.activityName,
      subtitle: sub,
      sessionDate: newDate || null,
      avgScore: avg,
      beans: beanList,
      guessTally: {},
      roomId: null,
    });
    setHistory(await backend.listHistorySessions(room.activityName));
    setAddOpen(false);
    setNewSub('');
    setNewDate('');
    setNewAvg('');
    setNewBeans('');
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{room.activityName} · 歷史比較</div>
        <button
          onClick={() => setAddOpen(true)}
          style={{ height: 32, padding: '0 12px', borderRadius: 16, background: 'transparent', border: '1px solid var(--gold)', color: 'var(--gold)', fontSize: 11, cursor: 'pointer' }}
        >
          ＋ 新增場次
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 110 }}>
        {bars.map((b, i) => {
          const open = openIdx === i;
          const h = hi === lo ? 50 : ((b.val - lo) / (hi - lo)) * 100;
          return (
            <button
              key={i}
              onClick={() => setOpenIdx((cur) => (cur === i ? null : i))}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 15, color: b.me ? 'var(--gold)' : 'var(--muted-2)' }}>{b.val.toFixed(2)}</div>
              <div
                style={{
                  width: '100%',
                  maxWidth: 44,
                  borderRadius: '6px 6px 0 0',
                  background: b.me ? 'var(--gold)' : 'var(--border-strong)',
                  height: Math.max(4, h) + '%',
                  outline: open ? '2px solid var(--cream)' : 'none',
                  transformOrigin: 'bottom',
                  animation: 'growBar .7s cubic-bezier(.2,.8,.2,1) both',
                }}
              />
              <div style={{ fontSize: 10, color: b.me ? 'var(--gold)' : 'var(--muted-2)', lineHeight: 1.3 }}>{b.label}</div>
            </button>
          );
        })}
      </div>
      {openIdx !== null && bars[openIdx] && (
        <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>
              {bars[openIdx].label} · {bars[openIdx].val.toFixed(2)}
              {bars[openIdx].date ? ' · ' + bars[openIdx].date : ''}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted-2)' }}>豆單</div>
          </div>
          {bars[openIdx].beans.map((n, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--sub)' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--border-strong)', flex: 'none' }} />
              {n}
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: 10, color: 'var(--muted-3)' }}>點長條看該場豆單</div>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontFamily: "'Noto Serif TC',serif", fontSize: 20, fontWeight: 600 }}>新增歷史場次</div>
          <div style={{ fontSize: 11, color: 'var(--muted-3)' }}>補登過去場次</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--muted-2)' }}>場次副標題</div>
          <TextInput value={newSub} onChange={(e) => setNewSub(e.target.value)} placeholder="例：四月例會" style={{ height: 46, fontSize: 14 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--muted-2)' }}>杯測日期</div>
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            style={{ height: 46, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 11, color: 'var(--cream)', fontSize: 14, padding: '0 14px', outline: 'none', colorScheme: 'dark' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--muted-2)' }}>全場平均分</div>
          <TextInput value={newAvg} onChange={(e) => setNewAvg(e.target.value)} inputMode="decimal" placeholder="例：85.2" style={{ height: 46, fontSize: 14 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--muted-2)' }}>豆單（逗號分隔）</div>
          <TextInput value={newBeans} onChange={(e) => setNewBeans(e.target.value)} placeholder="例：花魁, 肯亞 AA, 藝伎" style={{ height: 46, fontSize: 14 }} />
        </div>
        <button
          onClick={confirmAdd}
          style={{ height: 50, borderRadius: 25, background: 'var(--gold)', color: '#241a12', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
        >
          新增場次
        </button>
      </Sheet>
    </div>
  );
}
