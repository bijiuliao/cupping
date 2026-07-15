import { useRef, useState } from 'react';
import { Btn, ScreenShell, TextInput } from '../components/ui';
import { AddBeanSheet } from '../components/AddBeanSheet';
import { ORIGINS, PROCESSES, VARIETIES, beanSub } from '../lib/coe';
import { getBackend } from '../lib/backend';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import type { Bean, RoomBean, RoomSnapshot } from '../lib/types';

function EditableBeanRow({ bean, onRemove }: { bean: RoomBean; onRemove: () => void }) {
  const backend = getBackend();
  const [local, setLocal] = useState(bean);
  // Debounced flush merges everything typed across all fields since the last
  // flush — each call to `set` used to hand the debouncer only its own patch,
  // so typing in two fields within the debounce window silently dropped the
  // earlier field's edit (the later call's patch replaced it entirely).
  const pending = useRef<Partial<Bean>>({});
  const flush = useDebouncedCallback(() => {
    const patch = pending.current;
    pending.current = {};
    backend.updateRoomBean(bean.id, patch);
  }, 300);

  function set(patch: Partial<Bean>) {
    setLocal((cur) => ({ ...cur, ...patch }));
    pending.current = { ...pending.current, ...patch };
    flush();
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '12px 14px',
      }}
    >
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
            color: 'var(--gold)',
            flex: 'none',
          }}
        >
          {bean.idx}
        </div>
        <TextInput
          value={local.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="豆名（必填）"
          style={{ flex: 1, height: 38, fontSize: 14, borderRadius: 6 }}
        />
        <button
          onClick={onRemove}
          style={{ width: 32, height: 32, borderRadius: '50%', background: 'transparent', border: 'none', color: 'var(--muted-2)', fontSize: 16, cursor: 'pointer', flex: 'none' }}
        >
          ✕
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <TextInput
          list="lobby-origin-list"
          value={local.origin}
          onChange={(e) => set({ origin: e.target.value })}
          placeholder="產區/國家"
          style={{ height: 36, fontSize: 12, borderRadius: 6, padding: '0 10px' }}
        />
        <TextInput
          list="lobby-process-list"
          value={local.process}
          onChange={(e) => set({ process: e.target.value })}
          placeholder="處理法"
          style={{ height: 36, fontSize: 12, borderRadius: 6, padding: '0 10px' }}
        />
        <TextInput
          list="lobby-variety-list"
          value={local.variety}
          onChange={(e) => set({ variety: e.target.value })}
          placeholder="品種"
          style={{ height: 36, fontSize: 12, borderRadius: 6, padding: '0 10px' }}
        />
        <TextInput
          value={local.roaster}
          onChange={(e) => set({ roaster: e.target.value })}
          placeholder="烘焙商"
          style={{ height: 36, fontSize: 12, borderRadius: 6, padding: '0 10px' }}
        />
        <TextInput
          value={local.producer}
          onChange={(e) => set({ producer: e.target.value })}
          placeholder="生產者"
          style={{ height: 36, fontSize: 12, borderRadius: 6, padding: '0 10px' }}
        />
      </div>
    </div>
  );
}

export function LobbyScreen({ snap, myClientId }: { snap: RoomSnapshot; myClientId: string }) {
  const backend = getBackend();
  const { room, beans, participants } = snap;
  const [addSheet, setAddSheet] = useState<null | 'menu' | 'db' | 'scan' | 'loffee'>(null);
  const isHost = participants.find((p) => p.clientId === myClientId)?.role === 'host';
  const canEditBeans = isHost && room.stage === 'waiting';

  const sessDateLabel = room.sessionDate
    ? new Date(room.sessionDate).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\//g, '/')
    : '';
  const activityLabel = room.subtitle ? room.activityName + ' · ' + room.subtitle : room.activityName;

  function addBean(bean: Bean) {
    backend.addRoomBean(room.id, bean);
    setAddSheet(null);
  }

  return (
    <ScreenShell padBottom={120}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', textAlign: 'center', marginTop: 8 }}>
        <div style={{ fontSize: 12, letterSpacing: '.25em', color: 'var(--muted)' }}>房間代碼</div>
        <div
          style={{
            border: '1.5px dashed var(--muted)',
            borderRadius: 6,
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
                borderRadius: 6,
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>今日豆單</div>
          {canEditBeans && (
            <Btn variant="outline" onClick={() => setAddSheet('menu')} style={{ height: 32, borderRadius: 6, fontSize: 12, padding: '0 14px' }}>
              ＋ 新增
            </Btn>
          )}
        </div>

        {canEditBeans && (
          <>
            <datalist id="lobby-origin-list">
              {ORIGINS.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
            <datalist id="lobby-process-list">
              {PROCESSES.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
            <datalist id="lobby-variety-list">
              {VARIETIES.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          </>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {beans.map((b) =>
            canEditBeans ? (
              <EditableBeanRow key={b.id} bean={b} onRemove={() => backend.removeRoomBean(b.id)} />
            ) : (
              <div
                key={b.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
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
            ),
          )}
        </div>
        {room.mode === 'blind' && (
          <div style={{ fontSize: 11, color: 'var(--muted-2)', textAlign: 'center' }}>盲測模式：評分時只會看到樣本編號，順序已打亂</div>
        )}
      </div>

      {canEditBeans && (
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
      )}
    </ScreenShell>
  );
}
