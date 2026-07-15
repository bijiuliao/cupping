import { useState } from 'react';
import { Btn, TextInput } from '../components/ui';

export function HomeScreen({
  userName,
  onUserNameChange,
  onJoin,
  onGoSetup,
  onGoArchive,
}: {
  userName: string;
  onUserNameChange: (v: string) => void;
  onJoin: (code: string) => Promise<boolean>;
  onGoSetup: () => void;
  onGoArchive: () => void;
}) {
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const codeChar = (i: number) => code[i] || '';
  const codeBorder = (i: number) => (code.length === i ? 'var(--gold)' : 'var(--border)');

  const hasName = userName.trim().length > 0;

  async function handleJoin() {
    if (code.length !== 4 || joining || !hasName) return;
    setJoining(true);
    setError('');
    const ok = await onJoin(code);
    setJoining(false);
    if (!ok) setError('找不到房間，請確認代碼是否正確');
  }

  return (
    <div
      className="anim-fadeIn"
      style={{
        padding: '48px 28px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 26,
        flex: 1,
        background: 'radial-gradient(120% 60% at 50% 0%,#33241539 0%,transparent 60%)',
      }}
    >
      <div
        className="anim-fadeUp"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          alignItems: 'center',
          textAlign: 'center',
          marginTop: 14,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -26,
            left: '50%',
            width: 190,
            height: 190,
            marginLeft: -95,
            borderRadius: '50%',
            border: '1px solid rgba(224,184,119,.14)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: -14,
            left: '50%',
            width: 166,
            height: 166,
            marginLeft: -83,
            borderRadius: '50%',
            border: '1px dashed rgba(224,184,119,.10)',
            pointerEvents: 'none',
            animation: 'ringSpin 90s linear infinite',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          <div style={{ display: 'flex', gap: 7, alignItems: 'flex-end', height: 20, marginBottom: 2 }}>
            <div style={{ width: 2, height: 12, borderRadius: 2, background: 'var(--gold)', animation: 'steam 2.6s ease-in-out .2s infinite' }} />
            <div style={{ width: 2, height: 15, borderRadius: 2, background: 'var(--gold)', animation: 'steam 2.6s ease-in-out .9s infinite' }} />
            <div style={{ width: 2, height: 11, borderRadius: 2, background: 'var(--gold)', animation: 'steam 2.6s ease-in-out 1.6s infinite' }} />
          </div>
          <div style={{ width: 44, height: 24, border: '2px solid var(--gold)', borderTop: 'none', borderRadius: '0 0 24px 24px', position: 'relative' }}>
            <div style={{ position: 'absolute', right: -11, top: 1, width: 9, height: 11, border: '2px solid var(--gold)', borderLeft: 'none', borderRadius: '0 8px 8px 0' }} />
          </div>
          <div style={{ width: 26, height: 2, background: 'var(--gold)', marginTop: 4, borderRadius: 1 }} />
        </div>
        <div style={{ fontFamily: "'Noto Serif TC',serif", fontSize: 34, fontWeight: 600, letterSpacing: '.14em', marginTop: 6 }}>杯測會</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '10.5px', letterSpacing: '.34em', color: 'var(--muted)' }}>
          <div style={{ width: 22, height: 1, background: 'var(--border-strong)' }} />
          CUPPING SESSION
          <div style={{ width: 22, height: 1, background: 'var(--border-strong)' }} />
        </div>
      </div>

      <div className="anim-fadeUp" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10, animationDelay: '.08s' }}>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          你的名字 <span style={{ fontSize: 11, color: 'var(--muted-3)' }}>必填 · 辨識身份 · 跨場次累積成績</span>
        </div>
        <TextInput value={userName} onChange={(e) => onUserNameChange(e.target.value)} placeholder="例：小魏" />
      </div>

      <div className="anim-fadeUp" style={{ display: 'flex', flexDirection: 'column', gap: 14, animationDelay: '.16s' }}>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>輸入房間代碼加入</div>
        <div style={{ position: 'relative', display: 'flex', gap: 8 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 60,
                borderRadius: 6,
                background: 'var(--bg-card)',
                border: '1px solid ' + codeBorder(i),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Cormorant Garamond',serif",
                fontSize: 30,
              }}
            >
              {codeChar(i)}
            </div>
          ))}
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase().slice(0, 4));
              setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleJoin();
            }}
            maxLength={4}
            autoCapitalize="characters"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              opacity: 0,
              fontSize: 30,
              background: 'transparent',
              border: 'none',
              letterSpacing: '2em',
              color: 'transparent',
              caretColor: 'transparent',
            }}
          />
        </div>
        {error && <div style={{ fontSize: 12, color: 'var(--danger)', textAlign: 'center' }}>{error}</div>}
        <Btn variant="solid" full onClick={handleJoin} disabled={code.length !== 4 || joining || !hasName}>
          {joining ? '加入中…' : '加入房間'}
        </Btn>
      </div>

      <div className="anim-fadeUp" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--muted-3)', fontSize: 12, animationDelay: '.22s' }}>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,transparent,#3a2c1e)' }} />或
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(270deg,transparent,#3a2c1e)' }} />
      </div>
      <Btn variant="outline" full onClick={onGoSetup} disabled={!hasName} className="anim-fadeUp" style={{ animationDelay: '.28s' }}>
        建立房間（房主）
      </Btn>
      <Btn
        variant="ghost"
        full
        onClick={onGoArchive}
        className="anim-fadeUp link-muted"
        style={{ height: 50, borderRadius: 6, animationDelay: '.34s' }}
      >
        杯測豆歷史資料庫
      </Btn>

      <div
        className="anim-fadeUp"
        style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontSize: '10.5px',
          letterSpacing: '.18em',
          color: 'var(--muted-3)',
          animationDelay: '.4s',
        }}
      >
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border)' }} />
        CUP OF EXCELLENCE 評分規範 · 36–100
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border)' }} />
      </div>
    </div>
  );
}
