import type { Stage } from '../lib/types';

const STAGES: { key: Stage; label: string }[] = [
  { key: 'waiting', label: '等待中' },
  { key: 'scoring', label: '評分中' },
  { key: 'locked', label: '鎖定' },
  { key: 'reveal', label: '公佈' },
];

export function HostControlBar({
  stage,
  hint,
  actionLabel,
  onAction,
  showAction,
}: {
  stage: Stage;
  hint: string;
  actionLabel: string;
  onAction: () => void;
  showAction: boolean;
}) {
  const curIdx = STAGES.findIndex((s) => s.key === stage);
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ width: '100%', maxWidth: 430, boxSizing: 'border-box', padding: '10px 14px 14px', pointerEvents: 'auto' }}>
        <div
          style={{
            background: 'var(--bg-card-2)',
            border: '1.5px solid var(--gold)',
            borderRadius: 8,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 -6px 30px rgba(0,0,0,.5)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {STAGES.map((s, i) => (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: i <= curIdx ? 'var(--gold)' : 'transparent',
                      border: '1px solid ' + (i <= curIdx ? 'var(--gold)' : 'var(--border-strong)'),
                    }}
                  />
                  <div style={{ fontSize: 10, color: i === curIdx ? 'var(--gold)' : 'var(--muted-2)' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{hint}</div>
          </div>
          {showAction && (
            <button
              onClick={onAction}
              style={{
                height: 46,
                padding: '0 18px',
                borderRadius: 6,
                background: 'var(--gold)',
                color: '#241a12',
                border: 'none',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                flex: 'none',
              }}
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
