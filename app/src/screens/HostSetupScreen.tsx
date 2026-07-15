import { useEffect, useState } from 'react';
import { Btn, Card, Field, ScreenShell, SelectInput, TextInput } from '../components/ui';
import type { Bean, Mode } from '../lib/types';
import { getBackend } from '../lib/backend';
import { AddBeanSheet } from '../components/AddBeanSheet';
import { useLoffeeOptions } from '../hooks/useLoffeeOptions';

export interface DraftBean extends Bean {
  localId: string;
}

function localUid() {
  return Math.random().toString(36).slice(2);
}

export function HostSetupScreen({
  onBack,
  onCreateRoom,
}: {
  onBack: () => void;
  onCreateRoom: (input: {
    mode: Mode;
    activityName: string;
    subtitle: string;
    sessionDate: string | null;
    beans: Bean[];
  }) => Promise<void>;
}) {
  const { origins: ORIGINS, processes: PROCESSES, varieties: VARIETIES } = useLoffeeOptions();
  const [mode, setMode] = useState<Mode>('blind');
  const [activities, setActivities] = useState<string[]>([]);
  const [activity, setActivity] = useState('');
  const [addActOpen, setAddActOpen] = useState(false);
  const [newActName, setNewActName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [sessDate, setSessDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [beans, setBeans] = useState<DraftBean[]>([]);
  const [addSheet, setAddSheet] = useState<null | 'menu' | 'db' | 'scan' | 'loffee'>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getBackend()
      .listActivities()
      .then((list) => {
        setActivities(list);
        setActivity((cur) => cur || list[0] || '咖啡社杯測');
      });
  }, []);

  function updateBean(localId: string, patch: Partial<Bean>) {
    setBeans((bs) => bs.map((b) => (b.localId === localId ? { ...b, ...patch } : b)));
  }
  function removeBean(localId: string) {
    setBeans((bs) => bs.filter((b) => b.localId !== localId));
  }
  function addBean(bean: Bean) {
    setBeans((bs) => bs.concat([{ ...bean, localId: localUid() }]));
    setAddSheet(null);
  }

  async function confirmAddActivity() {
    const name = newActName.trim();
    if (!name) {
      setAddActOpen(false);
      return;
    }
    if (!activities.includes(name)) {
      await getBackend().addActivity(name);
      setActivities((a) => a.concat([name]));
    }
    setActivity(name);
    setAddActOpen(false);
    setNewActName('');
  }

  const validBeans = beans.filter((b) => b.name.trim());
  const canCreate = validBeans.length > 0 && !creating;

  async function handleCreate() {
    if (!canCreate) return;
    setCreating(true);
    try {
      await onCreateRoom({
        mode,
        activityName: activity || '咖啡社杯測',
        subtitle,
        sessionDate: sessDate ? new Date(sessDate).toISOString() : null,
        beans: validBeans.map(({ localId: _localId, ...b }) => b),
      });
    } finally {
      setCreating(false);
    }
  }

  return (
    <ScreenShell>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Btn variant="icon" onClick={onBack}>
          ←
        </Btn>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{ fontSize: '9.5px', letterSpacing: '.32em', color: 'var(--muted-2)' }}>HOST SETUP</div>
          <div style={{ fontFamily: "'Noto Serif TC',serif", fontSize: 24, fontWeight: 600 }}>建立房間</div>
        </div>
      </div>

      <Field label="杯測模式">
        <div style={{ display: 'flex', gap: 10 }}>
          {(
            [
              { key: 'blind' as Mode, title: '盲測', desc: '只看編號，公佈後猜豆排行' },
              { key: 'open' as Mode, title: '公開', desc: '顯示豆名，公佈平均與自評' },
            ] as const
          ).map((m) => {
            const active = mode === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                style={{
                  flex: 1,
                  padding: '14px 10px',
                  borderRadius: 8,
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: active ? 'var(--bg-card-2)' : 'transparent',
                  border: '1.5px solid ' + (active ? 'var(--gold)' : 'var(--border)'),
                  color: active ? 'var(--gold)' : 'var(--muted)',
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 700 }}>{m.title}</div>
                <div style={{ fontSize: 11, marginTop: 4, opacity: 0.75 }}>{m.desc}</div>
              </button>
            );
          })}
        </div>
      </Field>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>杯測活動</div>
          <div style={{ fontSize: 11, color: 'var(--muted-3)' }}>同一活動可跨場比較成績</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {activities.map((a) => {
            const active = activity === a;
            return (
              <button
                key={a}
                onClick={() => setActivity(a)}
                style={{
                  height: 38,
                  padding: '0 16px',
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: 'pointer',
                  background: active ? 'var(--bg-card-2)' : 'transparent',
                  border: '1px solid ' + (active ? 'var(--gold)' : 'var(--border)'),
                  color: active ? 'var(--gold)' : 'var(--muted)',
                }}
              >
                {a}
              </button>
            );
          })}
          <button
            onClick={() => setAddActOpen((v) => !v)}
            style={{
              height: 38,
              padding: '0 14px',
              borderRadius: 6,
              fontSize: 13,
              cursor: 'pointer',
              background: 'transparent',
              border: '1px dashed var(--muted)',
              color: 'var(--gold)',
            }}
          >
            ＋ 新增活動
          </button>
        </div>
        {addActOpen && (
          <div style={{ display: 'flex', gap: 8 }}>
            <TextInput
              value={newActName}
              onChange={(e) => setNewActName(e.target.value)}
              placeholder="活動名稱 例：店內品鑑會"
              style={{ height: 44, fontSize: 14, flex: 1, minWidth: 0 }}
              onKeyDown={(e) => e.key === 'Enter' && confirmAddActivity()}
            />
            <Btn variant="solid" onClick={confirmAddActivity} style={{ height: 44, borderRadius: 6, fontSize: 13, flex: 'none', padding: '0 18px' }}>
              新增
            </Btn>
          </div>
        )}
        <TextInput
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="場次副標題 例：五月訂閱"
          style={{ height: 44, fontSize: 14 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--muted-2)', flex: 'none' }}>杯測時間</div>
          <input
            type="datetime-local"
            value={sessDate}
            onChange={(e) => setSessDate(e.target.value)}
            style={{
              flex: 1,
              height: 44,
              background: 'var(--bg-app)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--cream)',
              fontSize: 13,
              padding: '0 12px',
              outline: 'none',
              minWidth: 0,
              colorScheme: 'dark',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>評分計時</div>
        <div style={{ fontSize: 12, color: 'var(--muted-2)' }}>正計時 · 無時間上限</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          今日豆單 <span style={{ color: 'var(--muted-3)' }}>{validBeans.length} 支</span>
        </div>
        <Btn variant="outline" onClick={() => setAddSheet('menu')} style={{ height: 36, borderRadius: 6, fontSize: 13, padding: '0 16px' }}>
          ＋ 新增
        </Btn>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {beans.map((b, i) => (
          <Card key={b.localId}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-strong)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  color: 'var(--muted)',
                  flex: 'none',
                }}
              >
                {i + 1}
              </div>
              <TextInput
                value={b.name}
                onChange={(e) => updateBean(b.localId, { name: e.target.value })}
                placeholder="豆名（必填）"
                style={{ flex: 1, height: 38, fontSize: 14, borderRadius: 6 }}
              />
              <button
                onClick={() => removeBean(b.localId)}
                style={{ width: 32, height: 32, borderRadius: '50%', background: 'transparent', border: 'none', color: 'var(--muted-2)', fontSize: 16, cursor: 'pointer', flex: 'none' }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <SelectInput value={b.origin} onChange={(e) => updateBean(b.localId, { origin: e.target.value })}>
                <option value="">產區/國家</option>
                {ORIGINS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </SelectInput>
              <SelectInput value={b.process} onChange={(e) => updateBean(b.localId, { process: e.target.value })}>
                <option value="">處理法</option>
                {PROCESSES.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </SelectInput>
              <SelectInput value={b.variety} onChange={(e) => updateBean(b.localId, { variety: e.target.value })}>
                <option value="">品種</option>
                {VARIETIES.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </SelectInput>
              <TextInput
                value={b.roaster}
                onChange={(e) => updateBean(b.localId, { roaster: e.target.value })}
                placeholder="烘焙商"
                style={{ height: 36, fontSize: 12, borderRadius: 6, padding: '0 10px' }}
              />
              <TextInput
                value={b.producer}
                onChange={(e) => updateBean(b.localId, { producer: e.target.value })}
                placeholder="生產者"
                style={{ height: 36, fontSize: 12, borderRadius: 6, padding: '0 10px' }}
              />
            </div>
          </Card>
        ))}
      </div>

      {beans.length === 0 && (
        <div style={{ border: '1.5px dashed var(--border)', borderRadius: 8, padding: 22, textAlign: 'center', fontSize: 13, color: 'var(--muted-2)' }}>
          尚未新增豆子，點「＋ 新增」建立今日豆單
        </div>
      )}

      <Btn variant="solid" full onClick={handleCreate} disabled={!canCreate} style={{ marginTop: 8 }}>
        {creating ? '建立中…' : '建立房間 →'}
      </Btn>

      <AddBeanSheet
        state={addSheet}
        onClose={() => setAddSheet(null)}
        onAddManual={() => addBean({ name: '', origin: '', process: '', variety: '', roaster: '', producer: '' })}
        onOpenDb={() => setAddSheet('db')}
        onOpenScan={() => setAddSheet('scan')}
        onOpenLoffee={() => setAddSheet('loffee')}
        onPickFromDb={addBean}
        onScanResult={addBean}
      />
    </ScreenShell>
  );
}
