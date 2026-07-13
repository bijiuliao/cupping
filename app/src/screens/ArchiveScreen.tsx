import { useEffect, useState } from 'react';
import { Btn, ScreenShell } from '../components/ui';
import { getBackend } from '../lib/backend';
import type { BeanHistoryEntry } from '../lib/types';

export function ArchiveScreen({ userName, onBack }: { userName: string; onBack: () => void }) {
  const [rows, setRows] = useState<BeanHistoryEntry[] | null>(null);

  useEffect(() => {
    const name = userName.trim() || '你';
    getBackend()
      .listBeanHistory(name)
      .then(setRows);
  }, [userName]);

  return (
    <ScreenShell>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Btn variant="icon" onClick={onBack}>
          ←
        </Btn>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontFamily: "'Noto Serif TC',serif", fontSize: 24, fontWeight: 600 }}>杯測豆歷史</div>
          <div style={{ fontSize: 11, color: 'var(--muted-2)' }}>{rows?.length ?? 0} 筆紀錄 · 依日期排序</div>
        </div>
      </div>

      {rows && rows.length === 0 && (
        <div style={{ border: '1.5px dashed var(--border)', borderRadius: 14, padding: 22, textAlign: 'center', fontSize: 13, color: 'var(--muted-2)' }}>
          {userName.trim() ? '還沒有杯測紀錄，完成一場杯測後會自動記錄在這裡' : '先在首頁輸入你的名字，才能對應到你的杯測紀錄'}
        </div>
      )}

      {(rows ?? []).map((ar) => (
        <div key={ar.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ar.beanName}</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flex: 'none' }}>
              <div style={{ fontSize: 10, color: 'var(--muted-2)' }}>我的分數</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, lineHeight: 1, color: 'var(--gold)' }}>{ar.myScore.toFixed(2)}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{ar.sub}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--muted-2)' }}>☕ {ar.sessionLabel}</div>
            <div style={{ fontSize: 11, color: 'var(--muted-2)', fontFamily: 'ui-monospace,Menlo,monospace' }}>{ar.sessionDate ?? ''}</div>
          </div>
        </div>
      ))}
    </ScreenShell>
  );
}
