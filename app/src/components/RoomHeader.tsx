import type { Mode } from '../lib/types';

export function RoomHeader({ code, mode }: { code: string; mode: Mode }) {
  return (
    <div
      style={{
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-dim)',
        position: 'sticky',
        top: 0,
        background: 'var(--bg-app)',
        zIndex: 5,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '6px 12px',
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 18,
            letterSpacing: '.2em',
            color: 'var(--gold)',
          }}
        >
          {code}
        </div>
        <div style={{ fontSize: 11, padding: '4px 10px', borderRadius: 10, background: 'var(--bg-card)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
          {mode === 'blind' ? '盲測' : '公開'}
        </div>
      </div>
    </div>
  );
}
