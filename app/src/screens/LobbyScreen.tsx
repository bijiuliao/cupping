import { ScreenShell } from '../components/ui';
import { beanSub } from '../lib/coe';
import type { RoomSnapshot } from '../lib/types';

export function LobbyScreen({ snap, myClientId }: { snap: RoomSnapshot; myClientId: string }) {
  const { room, beans, participants } = snap;
  const sessDateLabel = room.sessionDate
    ? new Date(room.sessionDate).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\//g, '/')
    : '';
  const activityLabel = room.subtitle ? room.activityName + ' · ' + room.subtitle : room.activityName;

  return (
    <ScreenShell padBottom={120}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', textAlign: 'center', marginTop: 8 }}>
        <div style={{ fontSize: 12, letterSpacing: '.25em', color: 'var(--muted)' }}>房間代碼</div>
        <div
          style={{
            border: '1.5px dashed var(--muted)',
            borderRadius: 14,
            padding: '14px 32px',
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 44,
            color: 'var(--gold)',
          }}
        >
          <span style={{ letterSpacing: '.35em', marginRight: '-.35em', fontVariantNumeric: 'lining-nums' }}>{room.code}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted-2)' }}>
          {activityLabel} · {room.mode === 'blind' ? '盲測' : '公開'}模式 · {beans.length} 支豆 · {sessDateLabel}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          杯測師 <span style={{ color: 'var(--muted-3)' }}>{participants.length} 位</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {participants.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--bg-card)',
                border: '1px solid ' + (p.clientId === myClientId ? 'var(--gold)' : 'var(--border)'),
                borderRadius: 20,
                padding: '8px 14px',
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7fae6b' }} />
              <div style={{ fontSize: 13, color: 'var(--cream)' }}>{p.name}</div>
              {p.role === 'host' && <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: '.1em' }}>HOST</div>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>今日豆單</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {beans.map((b) => (
            <div
              key={b.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '12px 14px',
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
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
                {b.idx}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{beanSub(b)}</div>
              </div>
            </div>
          ))}
        </div>
        {room.mode === 'blind' && (
          <div style={{ fontSize: 11, color: 'var(--muted-2)', textAlign: 'center' }}>盲測模式：評分時只會看到樣本編號，順序已打亂</div>
        )}
      </div>
    </ScreenShell>
  );
}
