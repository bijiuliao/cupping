import { useEffect, useState } from 'react';
import { Btn, ComboBox, SelectInput, Sheet, TextArea, TextInput } from './ui';
import { AREAS, PROCESSES, VARIETIES, beanSub, countriesForArea } from '../lib/coe';
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

const EMPTY_DRAFT: Bean = { name: '', area: '', origin: '', process: '', variety: '', roaster: '', producer: '', elevation: '', decaf: false, flavorNotes: '' };

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
  // Sheet stays open across multiple picks (see onPickFromDb) — track which
  // ones were just added in this visit so each row can confirm it went in,
  // since there's no other feedback once you're not bounced back to the sheet.
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  function refresh() {
    backend.listBeanCatalog().then(setCatalog);
  }

  useEffect(() => {
    if (open) {
      refresh();
      setAddedIds(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function pick(b: BeanCatalogEntry) {
    onPick(b);
    setAddedIds((s) => new Set(s).add(b.id));
  }

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
      <div style={{ fontSize: 11, color: 'var(--muted-2)' }}>可連續點選多支豆子，選完再按下方「完成」返回</div>

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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <ComboBox
              value={draft.area}
              onChange={(v) =>
                setDraft((d) => {
                  const validCountries = countriesForArea(v);
                  return { ...d, area: v, origin: validCountries.includes(d.origin) ? d.origin : '' };
                })
              }
              options={AREAS}
              placeholder="產區大洲 Area"
              style={{ height: 36, fontSize: 12, borderRadius: 6, padding: '0 10px' }}
            />
            <ComboBox
              value={draft.origin}
              onChange={(v) => setDraft((d) => ({ ...d, origin: v }))}
              options={countriesForArea(draft.area)}
              placeholder="國家 Country"
              style={{ height: 36, fontSize: 12, borderRadius: 6, padding: '0 10px' }}
            />
            <ComboBox
              value={draft.process}
              onChange={(v) => setDraft((d) => ({ ...d, process: v }))}
              options={PROCESSES}
              placeholder="處理法"
              style={{ height: 36, fontSize: 12, borderRadius: 6, padding: '0 10px' }}
            />
            <ComboBox
              value={draft.variety}
              onChange={(v) => setDraft((d) => ({ ...d, variety: v }))}
              options={VARIETIES}
              placeholder="品種"
              style={{ height: 36, fontSize: 12, borderRadius: 6, padding: '0 10px' }}
            />
            <TextInput
              value={draft.elevation}
              onChange={(e) => setDraft((d) => ({ ...d, elevation: e.target.value }))}
              placeholder="海拔（公尺）"
              style={{ height: 36, fontSize: 12, borderRadius: 6, padding: '0 10px' }}
            />
            <SelectInput
              value={draft.decaf ? 'yes' : 'no'}
              onChange={(e) => setDraft((d) => ({ ...d, decaf: e.target.value === 'yes' }))}
              style={{ height: 36, fontSize: 12, borderRadius: 6, padding: '0 10px', width: '100%' }}
            >
              <option value="no">低咖啡因：否</option>
              <option value="yes">低咖啡因：是</option>
            </SelectInput>
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
          <TextArea
            value={draft.flavorNotes}
            onChange={(e) => setDraft((d) => ({ ...d, flavorNotes: e.target.value }))}
            placeholder="風味敘述（例：柑橘、蜂蜜、烏龍茶感）"
            style={{ minHeight: 44, fontSize: 12, padding: '8px 10px' }}
          />
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
        {(catalog ?? []).map((b) => {
          const added = addedIds.has(b.id);
          return (
            <div
              key={b.id}
              style={{
                borderRadius: 8,
                background: 'var(--bg-card)',
                border: '1px solid ' + (added ? 'var(--gold)' : 'var(--border)'),
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
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--cream)' }}>{b.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted-2)' }}>{beanSub(b)}</div>
              </button>
              <button
                onClick={() => pick(b)}
                style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: added ? 13 : 18, cursor: 'pointer', flex: 'none', padding: 0 }}
              >
                {added ? '已加入 ✓' : '＋'}
              </button>
              <button
                onClick={() => remove(b.id)}
                style={{ background: 'none', border: 'none', color: 'var(--muted-2)', fontSize: 14, cursor: 'pointer', flex: 'none', padding: 0 }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={onClose}
        style={{ height: 48, borderRadius: 6, background: 'var(--gold)', color: '#241a12', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
      >
        完成
      </button>
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
  // Sheet stays open across multiple picks (see onPickFromDb) — track which
  // result rows were just added in this visit so each can confirm it went
  // in, since there's no other feedback once you're not bounced back to the
  // sheet. Keyed by index into `results`, reset whenever a new search runs.
  const [addedIdx, setAddedIdx] = useState<Set<number>>(new Set());

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
    setAddedIdx(new Set());
    try {
      setResults(await searchLoffeeBeans(query.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : '查詢失敗');
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  function pick(bean: Bean, i: number) {
    backend.upsertBeanToCatalog(bean).catch(() => {});
    onPick(bean);
    setAddedIdx((s) => new Set(s).add(i));
  }

  return (
    <Sheet open={open} onClose={onClose} maxHeight="80vh">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontFamily: "'Noto Serif TC',serif", fontSize: 20, fontWeight: 600 }}>搜尋 Loffee Labs</div>
        <div style={{ fontSize: 11, color: 'var(--muted-3)' }}>全球烘焙商豆單資料庫</div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted-2)' }}>可連續點選多支豆子，選完再按下方「完成」返回</div>
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
        {(results ?? []).map((b, i) => {
          const added = addedIdx.has(i);
          return (
            <div
              key={i}
              style={{
                borderRadius: 8,
                background: 'var(--bg-card)',
                border: '1px solid ' + (added ? 'var(--gold)' : 'var(--border)'),
                padding: '13px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <button
                onClick={() => pick(b, i)}
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
                onClick={() => pick(b, i)}
                style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: added ? 13 : 18, cursor: 'pointer', flex: 'none', padding: 0 }}
              >
                {added ? '已加入 ✓' : '＋'}
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={onClose}
        style={{ height: 48, borderRadius: 6, background: 'var(--gold)', color: '#241a12', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
      >
        完成
      </button>
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
      <Sheet open={state === 'menu'} onClose={onClose} maxHeight="85vh">
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

      <Sheet open={state === 'scan'} onClose={onClose} maxHeight="85vh">
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
            onScanResult({
              name: '掃描：肯特山 AB',
              area: 'Africa',
              origin: 'Kenya',
              process: 'Washed',
              variety: 'SL34',
              roaster: '晨光咖啡',
              producer: '',
              elevation: '',
              decaf: false,
              flavorNotes: '',
            })
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
