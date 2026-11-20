// src/financas/FinanceIcons.tsx — Ícones SVG nativos, formatadores e controles reutilizáveis
import { useState, useRef, useEffect, type CSSProperties, type ReactNode } from 'react';
import type { ActiveProfileInfo, BalancoTableItem, IconName } from './financeTypes';

const CAT_ICON_RULES: ReadonlyArray<readonly [RegExp, IconName]> = [
  [/academia|treino|esporte|muscula|pilates|crossfit/, 'dumbbell'],
  [/restaur|comida|mercado|supermerc|lanche|ifood|aliment|padaria|feira|bar\b|cafe/, 'utensils'],
  [/dieta|nutri|saude|farmacia|medic|consulta|suplement|terapia|dentista/, 'leaf'],
  [/uber|transporte|carro|combust|gasolina|onibus|metro|estacion|moto|pedagio/, 'car'],
  [/salao|cabelo|barbear|barba|beleza|estetica|unha/, 'scissors'],
  [/desejo|presente|lista|lazer|viagem|compras|roupa/, 'gift'],
  [/parcelad|cartao|fatura|emprestimo|divida|financiamento/, 'card'],
  [/casa|aluguel|condominio|luz|agua|internet|energia|moradia/, 'home'],
  [/estudo|curso|livro|escola|faculdade|mensalidade/, 'book'],
];

export function catIconName(cat?: string | null): IconName {
  const normalized = String(cat || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  for (const [re, name] of CAT_ICON_RULES) {
    if (re.test(normalized)) return name;
  }
  return 'dots';
}

export function tableIconName(t: Pick<BalancoTableItem, 'id' | 'name' | 'type' | 'sign'>): IconName {
  if (t.type === 'entradas') return 'trendUp';
  if (t.type === 'faturas_auto' || t.id === 'faturas') return 'card';
  if (t.id === 'banco') return 'landmark';
  if (t.sign === 1) return 'trendUp';
  if (t.sign === -1) return 'trendDown';
  const fromCat = catIconName(t.name);
  return fromCat === 'dots' ? 'wallet' : fromCat;
}

export const PROFILE_COLORS: readonly string[] = [
  'var(--p0)',
  'var(--p1)',
  'var(--p2)',
  'var(--p3)',
  'var(--p4)',
  'var(--p5)',
  'var(--p6)',
  'var(--p7)',
  'var(--p8)',
  'var(--p9)',
];

export function getProfileColor(idx: number): string {
  return PROFILE_COLORS[idx % PROFILE_COLORS.length];
}

export function fmtRaw(v: number | string | null | undefined): string {
  const n = parseFloat(String(v ?? 0)) || 0;
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtMoney(v: number | string | null | undefined, masked: boolean): string {
  return masked ? 'R$ ••••' : fmtRaw(v);
}

export function formatDateBR(iso?: string | null): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

const MES_ABR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const;

export function monthLabelFromISO(iso?: string | null): string {
  const m = /^(\d{4})-(\d{2})/.exec(iso || '');
  if (!m) return '';
  const idx = Number(m[2]) - 1;
  return idx >= 0 && idx < 12 ? `${MES_ABR[idx]}/${m[1]}` : '';
}

export function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function elasticWidth(
  value: string | number | null | undefined,
  placeholder = '0,00',
  minPx = 70,
  maxPx = 260,
  charPx = 10.5,
): number {
  const str = value !== undefined && value !== null && String(value) !== '' ? String(value) : placeholder;
  return Math.min(maxPx, Math.max(minPx, str.length * charPx + 24));
}

function renderIconChildren(name: IconName): ReactNode {
  switch (name) {
    case 'search':
      return (
        <>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </>
      );
    case 'x':
      return (
        <>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </>
      );
    case 'plus':
      return (
        <>
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </>
      );
    case 'check':
      return <path d="M20 6 9 17l-5-5" />;
    case 'eye':
      return (
        <>
          <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
          <circle cx="12" cy="12" r="3" />
        </>
      );
    case 'eyeOff':
      return (
        <>
          <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
          <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
          <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
          <path d="m2 2 20 20" />
        </>
      );
    case 'trash':
      return (
        <>
          <path d="M3 6h18" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </>
      );
    case 'copy':
      return (
        <>
          <rect width="14" height="14" x="8" y="8" rx="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </>
      );
    case 'camera':
      return (
        <>
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
          <circle cx="12" cy="13" r="3" />
        </>
      );
    case 'image':
      return (
        <>
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </>
      );
    case 'fileText':
      return (
        <>
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="M10 9H8" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
        </>
      );
    case 'users':
      return (
        <>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </>
      );
    case 'user':
      return (
        <>
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </>
      );
    case 'trendUp':
      return (
        <>
          <path d="M22 7 13.5 15.5 8.5 10.5 2 17" />
          <path d="M16 7h6v6" />
        </>
      );
    case 'trendDown':
      return (
        <>
          <path d="M22 17 13.5 8.5 8.5 13.5 2 7" />
          <path d="M16 17h6v-6" />
        </>
      );
    case 'landmark':
      return (
        <>
          <path d="M3 22h18" />
          <path d="M6 18v-7" />
          <path d="M10 18v-7" />
          <path d="M14 18v-7" />
          <path d="M18 18v-7" />
          <path d="m12 2 9 5H3z" />
        </>
      );
    case 'card':
      return (
        <>
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <path d="M2 10h20" />
        </>
      );
    case 'utensils':
      return (
        <>
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
          <path d="M7 2v20" />
          <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
        </>
      );
    case 'car':
      return (
        <>
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
          <circle cx="7" cy="17" r="2" />
          <path d="M9 17h6" />
          <circle cx="17" cy="17" r="2" />
        </>
      );
    case 'scissors':
      return (
        <>
          <circle cx="6" cy="6" r="3" />
          <path d="M8.12 8.12 12 12" />
          <path d="M20 4 8.12 15.88" />
          <circle cx="6" cy="18" r="3" />
          <path d="M14.8 14.8 20 20" />
        </>
      );
    case 'gift':
      return (
        <>
          <rect x="3" y="8" width="18" height="4" rx="1" />
          <path d="M12 8v13" />
          <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
          <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
        </>
      );
    case 'home':
      return (
        <>
          <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
          <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </>
      );
    case 'book':
      return (
        <>
          <path d="M12 7v14" />
          <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
        </>
      );
    case 'leaf':
      return (
        <>
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </>
      );
    case 'dumbbell':
      return (
        <>
          <path d="M6.5 6.5v11" />
          <path d="M17.5 6.5v11" />
          <path d="M3.5 9v6" />
          <path d="M20.5 9v6" />
          <path d="M6.5 12h11" />
        </>
      );
    case 'wallet':
      return (
        <>
          <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
          <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
        </>
      );
    case 'link':
      return (
        <>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </>
      );
    case 'dots':
    default:
      return (
        <>
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </>
      );
  }
}

export function FinanceIcon({
  name,
  size = 18,
  strokeWidth = 1.75,
  label,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  return (
    <svg
      className="ic"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {renderIconChildren(name)}
    </svg>
  );
}

export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`ic chev${open ? ' open' : ''}`}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{
        transition: 'transform .15s',
        transform: `rotate(${open ? 90 : 0}deg)`,
      }}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export interface NumericInputProps {
  value: number | string | null | undefined;
  onValueChange: (num: number, raw: string) => void;
  placeholder?: string;
  emptyWhenZero?: boolean;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  minPx?: number;
  maxPx?: number;
}

export function NumericInput({
  value,
  onValueChange,
  placeholder = '0,00',
  emptyWhenZero = false,
  disabled = false,
  className,
  style,
  ariaLabel,
  minPx,
  maxPx,
}: NumericInputProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');

  const externalDisplay = (() => {
    if (disabled) return '';
    if (value === null || value === undefined || value === '') return '';
    if (emptyWhenZero && (Number(value) === 0 || value === '0')) return '';
    return String(value);
  })();

  const shown = focused ? draft : externalDisplay;
  const computedStyle: CSSProperties | undefined =
    minPx !== undefined && maxPx !== undefined
      ? { width: elasticWidth(shown, placeholder, minPx, maxPx), ...style }
      : style;

  return (
    <input
      type="number"
      step="0.01"
      value={shown}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      style={computedStyle}
      aria-label={ariaLabel}
      onFocus={() => {
        setDraft(externalDisplay);
        setFocused(true);
      }}
      onChange={e => {
        const raw = e.target.value;
        setDraft(raw);
        onValueChange(parseFloat(raw) || 0, raw);
      }}
      onBlur={() => {
        setFocused(false);
      }}
    />
  );
}

export function ProfileChips({
  profiles,
  selectedIdx,
  onChange,
}: {
  profiles: ActiveProfileInfo[];
  selectedIdx: number | null;
  onChange: (nextIdx: number | null) => void;
}) {
  return (
    <div className="profile-select">
      {profiles.map(({ name, idx }) => (
        <span
          key={idx}
          className={`chip${selectedIdx === idx ? ' selected' : ''}`}
          data-p={idx}
          role="button"
          tabIndex={0}
          onClick={() => onChange(selectedIdx === idx ? null : idx)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onChange(selectedIdx === idx ? null : idx);
            }
          }}
        >
          {name}
        </span>
      ))}
    </div>
  );
}

export function ReceiptControl({
  receiptPath,
  uploading,
  onUploadFile,
  onView,
  onRemove,
}: {
  receiptPath?: string;
  uploading?: boolean;
  onUploadFile: (file: File) => void;
  onView: (path: string) => void;
  onRemove: (path: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (receiptPath) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          aria-label="Ver recibo"
          title="Ver recibo"
          onClick={() => onView(receiptPath)}
        >
          <FinanceIcon name="image" />
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          aria-label="Remover recibo"
          title="Remover recibo"
          onClick={() => onRemove(receiptPath)}
        >
          <FinanceIcon name="x" />
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) onUploadFile(f);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        aria-label="Anexar foto do recibo"
        title="Anexar foto do recibo"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
      >
        <FinanceIcon name="camera" />
      </button>
    </div>
  );
}

export function ReceiptModal({
  signedUrl,
  onClose,
}: {
  signedUrl: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!signedUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [signedUrl, onClose]);

  if (!signedUrl) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Foto do recibo"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(16, 22, 18, 0.68)',
        zIndex: 2600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          maxWidth: 680,
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <strong style={{ fontSize: 15 }}>Foto do recibo</strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              style={{ textDecoration: 'none' }}
            >
              Abrir em nova aba
            </a>
            <button type="button" className="btn btn-ghost btn-sm" aria-label="Fechar recibo" onClick={onClose}>
              <FinanceIcon name="x" />
            </button>
          </div>
        </div>
        <div style={{ padding: 16, overflow: 'auto', display: 'flex', justifyContent: 'center', background: 'var(--surface2)' }}>
          <img
            src={signedUrl}
            alt="Recibo anexado"
            style={{ maxWidth: '100%', maxHeight: '72vh', objectFit: 'contain', borderRadius: 12 }}
          />
        </div>
      </div>
    </div>
  );
}
