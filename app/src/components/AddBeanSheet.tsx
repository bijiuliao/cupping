import { Sheet } from './ui';
import { BEAN_DB } from '../lib/coe';
import { beanSub } from '../lib/coe';
import type { Bean } from '../lib/types';

function MenuButton({ icon, title, desc, onClick }: { icon: string; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        borderRadius: 14,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        padding: 16,
        textAlign: 'left',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--cream)' }}>
        {icon} {title}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted-2)' }}>{desc}</div>
    </button>
  );
}

export function AddBeanSheet({
  state,
  onClose,
  onAddManual,
  onOpenDb,
  onOpenScan,
  onPickFromDb,
  onScanResult,
}: {
  state: null | 'menu' | 'db' | 'scan';
  onClose: () => void;
  onAddManual: () => void;
  onOpenDb: () => void;
  onOpenScan: () => void;
  onPickFromDb: (bean: Bean) => void;
  onScanResult: (bean: Bean) => void;
}) {
  return (
    <>
      <Sheet open={state === 'menu'} onClose={onClose}>
        <div style={{ fontFamily: "'Noto Serif TC',serif", fontSize: 20, fontWeight: 600 }}>新增豆子</div>
        <MenuButton icon="✏️" title="手動輸入" desc="直接填寫豆名、產區、處理法等欄位" onClick={onAddManual} />
        <MenuButton icon="🗂" title="從豆單資料庫選擇" desc="下拉選擇資料庫豆單 · 預留 API 串接" onClick={onOpenDb} />
        <MenuButton icon="📷" title="拍照掃描豆袋" desc="OCR 文字辨識自動填入 · 預留功能" onClick={onOpenScan} />
      </Sheet>

      <Sheet open={state === 'db'} onClose={onClose} maxHeight="70vh">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontFamily: "'Noto Serif TC',serif", fontSize: 20, fontWeight: 600 }}>豆單資料庫</div>
          <div style={{ fontSize: 11, color: 'var(--muted-3)' }}>示意資料 · 預留 API 串接</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {BEAN_DB.map((b) => (
            <button
              key={b.name}
              onClick={() => onPickFromDb(b)}
              style={{
                borderRadius: 12,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                padding: '13px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--cream)' }}>{b.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted-2)' }}>{beanSub(b)}</div>
              </div>
              <div style={{ color: 'var(--gold)', fontSize: 18 }}>＋</div>
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={state === 'scan'} onClose={onClose}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontFamily: "'Noto Serif TC',serif", fontSize: 20, fontWeight: 600 }}>拍照掃描豆袋</div>
          <div style={{ fontSize: 11, color: 'var(--muted-3)' }}>預留功能</div>
        </div>
        <div
          style={{
            border: '1.5px dashed var(--border-strong)',
            borderRadius: 16,
            height: 200,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            color: 'var(--muted-2)',
          }}
        >
          <div style={{ fontSize: 34 }}>📷</div>
          <div style={{ fontSize: 13 }}>對準豆袋標籤拍照</div>
          <div style={{ fontSize: 11, color: 'var(--muted-3)', fontFamily: 'ui-monospace,Menlo,monospace' }}>預留：OCR 辨識文字後自動填入欄位</div>
        </div>
        <button
          onClick={() =>
            onScanResult({ name: '掃描：肯特山 AB', origin: 'Kenya', process: 'Washed', variety: 'SL34', roaster: '晨光咖啡' })
          }
          style={{
            height: 50,
            borderRadius: 25,
            background: 'var(--gold)',
            color: '#241a12',
            border: 'none',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          模擬掃描結果（demo）
        </button>
      </Sheet>
    </>
  );
}
