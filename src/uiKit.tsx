// src/uiKit.tsx — componentes base (Button, Card, Field). Os estilos vivem em
// public/lifeplan-theme.css (classes .lp-*), então valem também para as telas
// que ainda usam CSS próprio (Finanças, Hábitos, Estudos).
import { useId, useState, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  block?: boolean;
  large?: boolean;
  loading?: boolean;
}

export function Button({ variant = 'primary', block, large, loading, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  const cls = ['lp-btn', `lp-btn--${variant}`, block && 'lp-btn--block', large && 'lp-btn--lg', className].filter(Boolean).join(' ');
  return <button type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>{children}</button>;
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** quiet = secundário, sem fundo; hero = destaque da tela (um por tela) */
  tone?: 'plain' | 'quiet' | 'hero';
}

export function Card({ tone = 'plain', className, ...rest }: CardProps) {
  const cls = ['lp-card', tone !== 'plain' && `lp-card--${tone}`, className].filter(Boolean).join(' ');
  return <div className={cls} {...rest} />;
}

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: string;
  error?: string | null;
}

/** Campo com rótulo ligado ao input, dica e erro; type="password" ganha "Mostrar". */
export function Field({ label, hint, error, type = 'text', className, ...rest }: FieldProps) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const isPass = type === 'password';
  const describedBy = [hint && `${id}-h`, error && `${id}-e`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="lp-field">
      <label className="lp-field__label" htmlFor={id}>{label}</label>
      <div className="lp-field__control">
        <input id={id} className={['lp-field__input', className].filter(Boolean).join(' ')} type={isPass && shown ? 'text' : type}
          aria-invalid={error ? true : undefined} aria-describedby={describedBy} style={isPass ? { paddingRight: 72 } : undefined} {...rest} />
        {isPass && (
          <button type="button" className="lp-field__toggle" aria-pressed={shown} onClick={() => setShown(s => !s)}>{shown ? 'Ocultar' : 'Mostrar'}</button>
        )}
      </div>
      {hint && !error && <span id={`${id}-h`} className="lp-field__hint">{hint}</span>}
      {error && <span id={`${id}-e`} className="lp-field__error" role="alert">{error}</span>}
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error'; children: ReactNode }) {
  return <div className={`lp-notice lp-notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>;
}
