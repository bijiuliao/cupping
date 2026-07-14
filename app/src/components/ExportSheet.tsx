import { useState } from 'react';
import { Sheet } from './ui';
import { buildExportText } from '../lib/selectors';
import type { RoomSnapshot } from '../lib/types';

export function ExportSheet({ snap, open, onClose }: { snap: RoomSnapshot; open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = open ? buildExportText(snap) : '';

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard API may be unavailable; the text is still visible to copy manually
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: "'Noto Serif TC',serif", fontSize: 20, fontWeight: 600 }}>匯出結果</div>
        <button
          onClick={onClose}
          style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: 15, cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>
      <textarea
        readOnly
        value={text}
        style={{
          borderRadius: 6,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          padding: '12px 14px',
          fontSize: 12,
          color: 'var(--sub)',
          minHeight: 220,
          resize: 'none',
          outline: 'none',
          fontFamily: 'ui-monospace,Menlo,monospace',
          lineHeight: 1.6,
        }}
      />
      <button
        onClick={copy}
        style={{ height: 50, borderRadius: 6, background: 'var(--gold)', color: '#241a12', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
      >
        {copied ? '已複製 ✓' : '複製到剪貼簿'}
      </button>
    </Sheet>
  );
}
