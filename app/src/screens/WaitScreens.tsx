import { fmtTime } from '../lib/coe';
import { submittedCount } from '../lib/selectors';
import { useElapsedSeconds } from '../hooks/useRoomSnapshot';
import type { Mode, RoomSnapshot } from '../lib/types';

const centerShell: React.CSSProperties = {
  padding: '60px 32px 140px',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  alignItems: 'center',
  textAlign: 'center',
  flex: 1,
  justifyContent: 'center',
};

export function WaitSubmittedScreen({ snap }: { snap: RoomSnapshot }) {
  const elapsed = useElapsedSeconds(snap.room.scoringStartedAt);
  return (
    <div className="anim-fadeUp" style={centerShell}>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          border: '1.5px solid var(--gold)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 30,
          color: 'var(--gold)',
          animation: 'popIn .5s cubic-bezier(.2,.8,.2,1) both',
        }}
      >
        ✓
      </div>
      <div style={{ fontFamily: "'Noto Serif TC',serif", fontSize: 26, fontWeight: 600 }}>已交卷</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>
        評分已送出。為避免爆雷，
        <br />
        結果將由房主統一公佈。
      </div>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: 'var(--gold)' }}>
          {submittedCount(snap)}/{snap.participants.length}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted-2)' }}>位已交卷</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted-3)' }}>計時 {fmtTime(elapsed)}</div>
    </div>
  );
}

export function WaitRevealScreen({ mode }: { mode: Mode }) {
  return (
    <div className="anim-fadeUp" style={centerShell}>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          border: '1.5px dashed var(--muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
          color: 'var(--gold)',
          animation: 'ringSpin 24s linear infinite',
        }}
      >
        <div style={{ animation: 'ringSpin 24s linear infinite reverse' }}>⏳</div>
      </div>
      <div style={{ fontFamily: "'Noto Serif TC',serif", fontSize: 26, fontWeight: 600 }}>等待房主公佈結果</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>
        {mode !== 'open' ? (
          <>
            你的猜測已送出。
            <br />
            房主公佈後將顯示答案與排行榜。
          </>
        ) : (
          <>
            所有評分已鎖定。
            <br />
            房主公佈後將顯示每支豆的平均分。
          </>
        )}
      </div>
    </div>
  );
}
