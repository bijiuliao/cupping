import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function Kicker({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 11, letterSpacing: '.25em', color: 'var(--muted)' }}>{children}</div>
  );
}

export function ScreenTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontFamily: "'Noto Serif TC',serif", fontSize: 26, fontWeight: 600 }}>{children}</div>
  );
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'outline' | 'ghost' | 'icon';
  full?: boolean;
}

export function Btn({ variant = 'solid', full, style, className, children, disabled, ...rest }: BtnProps) {
  const base: React.CSSProperties = {
    border: 'none',
    cursor: disabled ? 'default' : 'pointer',
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: '.06em',
    borderRadius: 27,
    height: 54,
    width: full ? '100%' : undefined,
    padding: '0 22px',
  };
  let variantStyle: React.CSSProperties = {};
  if (variant === 'solid') {
    variantStyle = {
      background: disabled ? 'var(--bg-card)' : 'var(--gold)',
      color: disabled ? 'var(--muted-2)' : '#241a12',
    };
  } else if (variant === 'outline') {
    variantStyle = {
      background: 'transparent',
      border: '1.5px solid var(--gold)',
      color: 'var(--gold)',
      fontWeight: 500,
    };
  } else if (variant === 'ghost') {
    variantStyle = {
      background: 'transparent',
      border: '1px solid var(--border)',
      color: 'var(--muted)',
      fontWeight: 400,
      fontSize: 14,
    };
  } else if (variant === 'icon') {
    variantStyle = {
      width: 40,
      height: 40,
      borderRadius: '50%',
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      color: 'var(--gold)',
      fontSize: 16,
      padding: 0,
    };
  }
  return (
    <button
      className={(variant === 'outline' ? 'btn-outline-gold ' : '') + (className ?? '')}
      style={{ ...base, ...variantStyle, ...style }}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>
        {label} {hint && <span style={{ fontSize: 11, color: 'var(--muted-3)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const inputBase: React.CSSProperties = {
  height: 48,
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  color: 'var(--cream)',
  fontSize: 15,
  padding: '0 16px',
  outline: 'none',
  width: '100%',
};

export function TextInput({ style, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input style={{ ...inputBase, ...style }} {...rest} />;
}

export function TextArea({ style, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      style={{
        borderRadius: 12,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        padding: '12px 14px',
        fontSize: 14,
        color: 'var(--cream)',
        minHeight: 64,
        resize: 'vertical',
        outline: 'none',
        width: '100%',
        ...style,
      }}
      {...rest}
    />
  );
}

export function SelectInput({ style, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      style={{
        height: 36,
        background: 'var(--bg-app)',
        border: '1px solid var(--border)',
        borderRadius: 9,
        color: 'var(--sub)',
        fontSize: 12,
        padding: '0 8px',
        outline: 'none',
        minWidth: 0,
        appearance: 'auto',
        ...style,
      }}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Card({ style, children }: { style?: React.CSSProperties; children: ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
  style,
  danger,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  style?: React.CSSProperties;
  danger?: boolean;
}) {
  return (
    <button
      className="chip"
      onClick={onClick}
      style={{
        height: 36,
        padding: '0 14px',
        borderRadius: 18,
        fontSize: 12,
        cursor: 'pointer',
        background: active ? (danger ? '#c96f4a' : 'var(--gold)') : 'transparent',
        border: '1px solid ' + (active ? (danger ? '#c96f4a' : 'var(--gold)') : 'var(--border)'),
        color: active ? '#241a12' : 'var(--muted)',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 3 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              height: 32,
              padding: '0 14px',
              borderRadius: 15,
              border: 'none',
              fontSize: 12,
              cursor: 'pointer',
              background: active ? 'var(--gold)' : 'transparent',
              color: active ? '#241a12' : 'var(--muted)',
              fontWeight: active ? 700 : 400,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Sheet({ open, onClose, children, maxHeight }: { open: boolean; onClose: () => void; children: ReactNode; maxHeight?: string }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(14,10,6,.78)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 20,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        animation: 'fadeIn .22s ease both',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 430,
          maxHeight,
          overflowY: maxHeight ? 'auto' : undefined,
          background: 'linear-gradient(180deg,#2a1e13,#241a12 60px)',
          borderTop: '1px solid #5a4530',
          borderRadius: '22px 22px 0 0',
          boxShadow: '0 -18px 50px rgba(0,0,0,.5)',
          animation: 'sheetUp .32s cubic-bezier(.2,.8,.2,1) both',
          padding: '22px 22px 34px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxSizing: 'border-box',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function ScreenShell({ children, padBottom }: { children: ReactNode; padBottom?: number }) {
  return (
    <div
      className="anim-fadeUp"
      style={{
        padding: '24px 22px ' + (padBottom ?? 40) + 'px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        flex: 1,
      }}
    >
      {children}
    </div>
  );
}
