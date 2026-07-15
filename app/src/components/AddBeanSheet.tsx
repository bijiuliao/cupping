import { useEffect, useState } from 'react';
import { Btn, Sheet, TextInput } from './ui';
import { ORIGINS, PROCESSES, VARIETIES, beanSub } from '../lib/coe';
import { getBackend } from '../lib/backend';
import { hasLoffeeProxy, searchLoffeeBeans } from '../lib/loffeeLabs';
import type { Bean, BeanCatalogEntry } from '../lib/types';

function MenuButton({ icon, title, desc, onClick }: { icon: string; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        borderRadius: 8,
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

const EMPTY_DRAFT: Bean = { name: '', origin: '', process: '', variety: '', roaster: '', producer: '' };

function BeanCatalogSheet({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (bean: Bean) => void;
}) {
  const backend = getBackend();
  const [catalog, setCatalog] = useState<BeanCatalogEntry[] | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<Bean>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  function refresh() {
    backend.listBeanCatalog().then(setCatalog);
  }

  useEffect(() => {
    if (open) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function confirmAdd() {
    const name = draft.name.trim();
    if (!name) return;
    setSaving(true);
    try {
      await backend.upsertBeanToCatalog({ ...draft, name });
      setDraft(EMPTY_DRAFT);
      setAddOpen(false);
      refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await backend.removeBeanFromCatalog(id);
    refresh();
  }

  return (
    <Sheet open={open} onClose={onClose} maxHeight="80vh">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontFamily: "'Noto Serif TC',serif", fontSize: 20, fontWeight: 600 }}>豆單資料庫</div>
        <div style={{ fontSize: 11, color: 'var(--muted-3)' }}>共用 · 大家新增的豆子都會累積在這裡</div>
      </div>

      <Btn variant="outline" onClick={() => setAddOpen((v) => !v)} style={{ height: 38, borderRadius: 6, fontSize: 13 }}>
        {addOpen ? '取消新增' : '＋ 新增豆子到資料庫'}
      </Btn>

      {addOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <TextInput
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="豆名（必填）"
            style={{ height: 40, fontSize: 14, borderRadius: 6 }}
          />
          <datalist id="catalog-origin-list">
            {ORIGINS.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
          <datalist id="catalog-process-list">
            {PROCESSES.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
          <datalist id="catalog-variety-list">
            {VARIETIES.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <TextInput
              list="catalog-origin-list"
              value={draft.origin}
              onChange={(e) => setDraft((d) => ({ ...d, origin: e.target.value }))}
              placeholder="產區/國家"
              style={{ height: 36, fontSize: 12, borderRadius: 6, padding: '0 10px' }}
            />
            <TextInput
              list="catalog-process-list"
              value={draft.process}
              onChange={(e) => setDraft((d) => ({ ...d, process: e.target.value }))}
              placeholder="處理法"
              style={{ height: 36, fontSize: 12, borderRadius: 6, padding: '0 10px' }}
            />
            <TextInput
              list="catalog-variety-list"
              value={draft.variety}
              onChange={(e) => setDraft((d) => ({ ...d, variety: e.target.value }))}
              placeholder="品種"
              style={{ height: 36, fontSize: 12, borderRadius: 6, padding: '0 10px' }}
            />
            <TextInput
              value={draft.roaster}
              onChange={(e) => setDraft((d) => ({ ...d, roaster: e.target.value }))}
              placeholder="烘焙商"
              style={{ height: 36, fontSize: 12, borderRadius: 6, padding: '0 10px' }}
            />
            <TextInput
              value={draft.producer}
              onChange={(e) => setDraft((d) => ({ ...d, producer: e.target.value }))}
              placeholder="生產者"
              style={{ height: 36, fontSize: 12, borderRadius: 6, padding: '0 10px' }}
            />
          </div>
          <Btn variant="solid" onClick={confirmAdd} disabled={!draft.name.trim() || saving} style={{ height: 40, fontSize: 13 }}>
            {saving ? '儲存中…' : '儲存到資料庫'}
          </Btn>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {catalog === null && <div style={{ fontSize: 12, color: 'var(--muted-2)', textAlign: 'center', padding: '20px 0' }}>載入中…</div>}
        {catalog !== null && catalog.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--muted-2)', textAlign: 'center', padding: '20px 0', lineHeight: 1.7 }}>
            資料庫還沒有豆子。
            <br />
            手動新增一支，或建立房間輸入豆子後會自動存進來。
          </div>
        )}
        {(catalog ?? []).map((b) => (
          <div
            key={b.id}
            style={{
              borderRadius: 8,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              padding: '13px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <button
              onClick={() => onPick(b)}
              style={{
                background: 'none',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                flex: 1,
                minWidth: 0,
                padding: 0,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--cream)' }}>{b.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted-2)' }}>{beanSub(b)}</div>
            </button>
            <button
              onClick={() => onPick(b)}
              style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 18, cursor: 'pointer', flex: 'none', padding: 0 }}
            >
              ＋
            </button>
            <button
              onClick={() => remove(b.id)}
              style={{ background: 'none', border: 'none', color: 'var(--muted-2)', fontSize: 14, cursor: 'pointer', flex: 'none', padding: 0 }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

function LoffeeSearchSheet({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (bean: Bean) => void;
}) {
  const backend = getBackend();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Bean[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults(null);
      setError('');
    }
  }, [open]);

  async function runSearch() {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      setResults(await searchLoffeeBeans(query.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : '查詢失敗');
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  function pick(bean: Bean) {
    backend.upsertBeanToCatalog(bean).catch(() => {});
    onPick(bean);
  }

  return (
    <Sheet open={open} onClose={onClose} maxHeight="80vh">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontFamily: "'Noto Serif TC',serif", fontSize: 20, fontWeight: 600 }}>搜尋 Loffee Labs</div>
        <div style={{ fontSize: 11, color: 'var(--muted-3)' }}>全球烘焙商豆單資料庫</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <TextInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          placeholder="搜尋豆名、產區、烘焙商…"
          style={{ height: 44, fontSize: 14, flex: 1, minWidth: 0 }}
        />
        <Btn variant="solid" onClick={runSearch} disabled={!query.trim() || loading} style={{ height: 44, fontSize: 13, flex: 'none', padding: '0 18px' }}>
          {loading ? '搜尋中…' : '搜尋'}
        </Btn>
      </div>

      {error && <div style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {results !== null && results.length === 0 && !error && (
          <div style={{ fontSize: 12, color: 'var(--muted-2)', textAlign: 'center', padding: '20px 0' }}>沒有找到符合的豆子</div>
        )}
        {(results ?? []).map((b, i) => (
          <div
            key={i}
            style={{
              borderRadius: 8,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              padding: '13px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <button
              onClick={() => pick(b)}
              style={{
                background: 'none',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                flex: 1,
                minWidth: 0,
                padding: 0,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--cream)' }}>{b.name || '（無名稱）'}</div>
              <div style={{ fontSize: 11, color: 'var(--muted-2)' }}>{beanSub(b)}</div>
            </button>
            <button
              onClick={() => pick(b)}
              style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 18, cursor: 'pointer', flex: 'none', padding: 0 }}
            >
              ＋
            </button>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

export function AddBeanSheet({
  state,
  onClose,
  onAddManual,
  onOpenDb,
  onOpenScan,
  onOpenLoffee,
  onPickFromDb,
  onScanResult,
}: {
  state: null | 'menu' | 'db' | 'scan' | 'loffee';
  onClose: () => void;
  onAddManual: () => void;
  onOpenDb: () => void;
  onOpenScan: () => void;
  onOpenLoffee: () => void;
  onPickFromDb: (bean: Bean) => void;
  onScanResult: (bean: Bean) => void;
}) {
  return (
    <>
      <Sheet open={state === 'menu'} onClose={onClose}>
        <div style={{ fontFamily: "'Noto Serif TC',serif", fontSize: 20, fontWeight: 600 }}>新增豆子</div>
        <MenuButton icon="✏️" title="手動輸入" desc="直接填寫豆名、產區、處理法等欄位" onClick={onAddManual} />
        <MenuButton icon="🗂" title="從豆單資料庫選擇" desc="共用資料庫 · 大家新增過的豆子都在這裡" onClick={onOpenDb} />
        {hasLoffeeProxy && (
          <MenuButton icon="🌐" title="搜尋 Loffee Labs" desc="全球烘焙商豆單資料庫" onClick={onOpenLoffee} />
        )}
        <MenuButton icon="📷" title="拍照掃描豆袋" desc="OCR 文字辨識自動填入 · 預留功能" onClick={onOpenScan} />
      </Sheet>

      <BeanCatalogSheet open={state === 'db'} onClose={onClose} onPick={onPickFromDb} />

      <LoffeeSearchSheet open={state === 'loffee'} onClose={onClose} onPick={onPickFromDb} />

      <Sheet open={state === 'scan'} onClose={onClose}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontFamily: "'Noto Serif TC',serif", fontSize: 20, fontWeight: 600 }}>拍照掃描豆袋</div>
          <div style={{ fontSize: 11, color: 'var(--muted-3)' }}>預留功能</div>
        </div>
        <div
          style={{
            border: '1.5px dashed var(--border-strong)',
            borderRadius: 8,
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
            onScanResult({ name: '掃描：肯特山 AB', origin: 'Kenya', process: 'Washed', variety: 'SL34', roaster: '晨光咖啡', producer: '' })
          }
          style={{
            height: 50,
            borderRadius: 6,
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
