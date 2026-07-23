import { useState } from 'react';
import { Btn } from '../components/ui';
import { ExportSheet } from '../components/ExportSheet';
import { HistoryCompare } from '../components/HistoryCompare';
import { beanSub } from '../lib/coe';
import { ELEVATION_THRESHOLD_M, LB_MAX_PER_SAMPLE, computeLeaderboardRankRows, leaderboardSampleDetails } from '../lib/selectors';
import type { RoomSnapshot } from '../lib/types';

function Mark({ ok }: { ok: boolean }) {
  return <span style={{ color: ok ? '#7fae6b' : 'var(--danger)' }}>{ok ? '✓' : '✗'}</span>;
}

function elevationGuessLabel(g: string) {
  if (g === 'above') return `${ELEVATION_THRESHOLD_M}m 以上`;
  if (g === 'below') return `${ELEVATION_THRESHOLD_M}m 以下`;
  return '（未答）';
}

function decafGuessLabel(g: string) {
  if (g === 'yes') return '是';
  if (g === 'no') return '否';
  return '（未答）';
}

export function RevealLeaderboardScreen({
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

  const details = leaderboardSampleDetails(snap, myParticipantId);
  const rankRows = computeLeaderboardRankRows(snap);
  const myRank = rankRows.find((r) => r.participantId === myParticipantId);

  return (
    <div className="anim-fadeUp" style={{ padding: '24px 22px 120px', display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11, letterSpacing: '.25em', color: 'var(--muted)' }}>結果公佈 · 排行榜揭曉</div>
          <div style={{ fontFamily: "'Noto Serif TC',serif", fontSize: 26, fontWeight: 600 }}>正確答案</div>
        </div>
        <Btn variant="outline" onClick={() => setExportOpen(true)} style={{ height: 40, padding: '0 18px', borderRadius: 6, fontSize: 13 }}>
          匯出 ↓
        </Btn>
      </div>

      {myRank && (
        <div style={{ background: 'var(--bg-card-2)', border: '1px solid var(--gold)', borderRadius: 8, padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, color: 'var(--gold)' }}>你的名次 第 {myRank.rank} 名</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: 'var(--gold)' }}>{myRank.points}</span> / {myRank.maxPoints} 分
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {details.map((d) => (
          <div key={d.sampleIdx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '13px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                {d.sampleIdx + 1}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.bean.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{beanSub(d.bean)}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <div style={{ fontSize: 10, color: 'var(--muted-2)' }}>本樣本得分</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, lineHeight: 1, color: 'var(--gold)' }}>
                  {d.points}/{LB_MAX_PER_SAMPLE}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
              <div>
                <Mark ok={d.areaCorrect} /> Area：你猜 {d.areaGuess || '（未答）'}
              </div>
              <div>
                <Mark ok={d.originCorrect} /> Country：你猜 {d.originGuess || '（未答）'}
              </div>
              <div>
                <Mark ok={d.processCorrect} /> Process：你猜 {d.processGuess || '（未答）'}
              </div>
              <div>
                <Mark ok={d.varietyCorrect} /> Varietal(s)：你猜 {d.varietyGuess || '（未答）'}
              </div>
              <div>
                <Mark ok={d.elevationCorrect} /> Altitude：你猜 {elevationGuessLabel(d.elevationGuess)}
              </div>
              <div>
                <Mark ok={d.decafCorrect} /> Decaf：你猜 {decafGuessLabel(d.decafGuess)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontFamily: "'Noto Serif TC',serif", fontSize: 20, fontWeight: 600, marginTop: 4 }}>LEADERBOARD 排行榜</div>
        {rankRows.map((r) => {
          const isMe = r.participantId === myParticipantId;
          return (
            <div
              key={r.participantId}
              style={{ background: isMe ? 'var(--bg-card-2)' : 'var(--bg-card)', border: '1px solid ' + (isMe ? 'var(--gold)' : 'var(--border)'), borderRadius: 8, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 14 }}
            >
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: r.rank === 1 ? 'var(--gold)' : 'var(--muted-2)', minWidth: 26, textAlign: 'center' }}>{r.rank}</div>
              <div style={{ fontSize: 14, fontWeight: isMe ? 700 : 400, flex: 1, color: isMe ? 'var(--gold)' : 'var(--cream)' }}>{r.name}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: 'var(--gold)' }}>{r.points}</span> / {r.maxPoints} 分
              </div>
            </div>
          );
        })}
      </div>

      <HistoryCompare snap={snap} />

      <Btn variant="ghost" full onClick={onResetAll} style={{ height: 50, borderRadius: 6, border: '1.5px solid var(--muted)', color: 'var(--gold)', fontSize: 14, marginTop: 6 }}>
        {isHost ? '結束杯測 · 回到首頁' : '離開房間 · 回到首頁'}
      </Btn>

      <ExportSheet snap={snap} open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}
