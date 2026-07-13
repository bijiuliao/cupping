import { useEffect, useState } from 'react';
import { Btn } from '../components/ui';
import { ExportSheet } from '../components/ExportSheet';
import { HistoryCompare } from '../components/HistoryCompare';
import { getBackend } from '../lib/backend';
import { computeAnswerRows, computeCumulativeRows, computeLeaderRows } from '../lib/selectors';
import type { HistorySession, RoomSnapshot } from '../lib/types';

export function RevealBlindScreen({
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
  const [history, setHistory] = useState<HistorySession[]>([]);

  useEffect(() => {
    getBackend()
      .listHistorySessions(snap.room.activityName)
      .then(setHistory);
  }, [snap.room.activityName]);

  const answerRows = computeAnswerRows(snap, myParticipantId);
  const leaderRows = computeLeaderRows(snap);
  const cumRows = computeCumulativeRows(snap, history);

  return (
    <div className="anim-fadeUp" style={{ padding: '24px 22px 120px', display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11, letterSpacing: '.25em', color: 'var(--muted)' }}>結果公佈 · 盲測揭曉</div>
          <div style={{ fontFamily: "'Noto Serif TC',serif", fontSize: 26, fontWeight: 600 }}>正確答案</div>
        </div>
        <Btn variant="outline" onClick={() => setExportOpen(true)} style={{ height: 40, padding: '0 18px', borderRadius: 20, fontSize: 13 }}>
          匯出 ↓
        </Btn>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {answerRows.map((a) => (
          <div key={a.sample} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-strong)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                color: 'var(--gold)',
                flex: 'none',
              }}
            >
              {a.sample}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.bean.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted-2)' }}>{a.myGuessName === null ? '你未作答' : '你猜：' + a.myGuessName}</div>
            </div>
            <div style={{ fontSize: 16, color: a.correct ? '#7fae6b' : 'var(--danger)' }}>{a.correct ? '✓' : '✗'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ fontSize: 10, color: 'var(--muted-2)' }}>平均</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, lineHeight: 1, color: 'var(--gold)' }}>{a.avg.toFixed(2)}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontFamily: "'Noto Serif TC',serif", fontSize: 20, fontWeight: 600, marginTop: 4 }}>猜豆排行榜</div>
        {leaderRows.map((l) => {
          const isMe = l.participantId === myParticipantId;
          return (
            <div
              key={l.participantId}
              style={{ background: isMe ? 'var(--bg-card-2)' : 'var(--bg-card)', border: '1px solid ' + (isMe ? 'var(--gold)' : 'var(--border)'), borderRadius: 14, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 14 }}
            >
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: l.rank === 1 ? 'var(--gold)' : 'var(--muted-2)', minWidth: 26, textAlign: 'center' }}>{l.rank}</div>
              <div style={{ fontSize: 14, fontWeight: isMe ? 700 : 400, flex: 1, color: isMe ? 'var(--gold)' : 'var(--cream)' }}>{l.name}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                猜對 <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: 'var(--gold)' }}>{l.correct}</span> / {l.total}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>盲測累積排行榜</div>
          <div style={{ fontSize: 11, color: 'var(--muted-2)' }}>近 {history.length + 1} 場猜對總數</div>
        </div>
        {(() => {
          const maxPts = Math.max(...cumRows.map((c) => c.points), 1);
          return cumRows.map((c) => {
            const isMe = c.name === snap.participants.find((p) => p.id === myParticipantId)?.name;
            return (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 6px', borderRadius: 10, background: isMe ? 'var(--bg-card-2)' : 'transparent' }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: c.rank === 1 ? 'var(--gold)' : 'var(--muted-2)', minWidth: 22, textAlign: 'center' }}>{c.rank}</div>
                <div style={{ fontSize: 13, fontWeight: isMe ? 700 : 400, flex: 1, color: isMe ? 'var(--gold)' : 'var(--cream)' }}>{c.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 2 }}>
                  <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--bg-app)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        borderRadius: 3,
                        background: isMe ? 'var(--gold)' : 'var(--border-strong)',
                        width: ((c.points / maxPts) * 100).toFixed(0) + '%',
                        transformOrigin: 'left',
                        animation: 'growW .8s cubic-bezier(.2,.8,.2,1) both',
                      }}
                    />
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: 'var(--gold)', minWidth: 30, textAlign: 'right' }}>{c.points}</div>
                </div>
              </div>
            );
          });
        })()}
        <div style={{ fontSize: 10, color: 'var(--muted-3)' }}>依名字辨識身份，累積各場猜對數</div>
      </div>

      <HistoryCompare snap={snap} />

      <Btn variant="ghost" full onClick={onResetAll} style={{ height: 50, borderRadius: 25, border: '1.5px solid var(--muted)', color: 'var(--gold)', fontSize: 14, marginTop: 6 }}>
        {isHost ? '結束杯測 · 回到首頁' : '離開房間 · 回到首頁'}
      </Btn>

      <ExportSheet snap={snap} open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}
