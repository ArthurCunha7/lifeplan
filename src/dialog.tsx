// src/dialog.tsx — diálogos próprios no lugar de alert()/confirm() do navegador.
// Uso: `if (!(await confirmDialog('Excluir?', { danger: true }))) return;`
//      `await alertDialog('Preencha o nome.')`
// O <DialogHost /> precisa estar montado uma vez (App.tsx).
import { useEffect, useRef, useState } from 'react';

export interface DialogOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Ação destrutiva: botão de confirmar em vermelho e foco no "Cancelar". */
  danger?: boolean;
}

interface DialogRequest extends DialogOptions {
  id: number;
  kind: 'alert' | 'confirm';
  message: string;
  resolve: (ok: boolean) => void;
}

let nextId = 1;
let push: ((r: DialogRequest) => void) | null = null;

function open(kind: DialogRequest['kind'], message: string, opts: DialogOptions = {}): Promise<boolean> {
  return new Promise(resolve => {
    // Sem host montado (ex.: testes), alert vira no-op e confirm nega por segurança.
    if (!push) { resolve(kind === 'alert'); return; }
    push({ id: nextId++, kind, message, resolve, ...opts });
  });
}

export function confirmDialog(message: string, opts?: DialogOptions): Promise<boolean> {
  return open('confirm', message, opts);
}

export async function alertDialog(message: string, opts?: DialogOptions): Promise<void> {
  await open('alert', message, opts);
}

export function DialogHost() {
  const [queue, setQueue] = useState<DialogRequest[]>([]);
  const current = queue[0];
  const returnFocus = useRef<HTMLElement | null>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    push = r => setQueue(q => [...q, r]);
    return () => { push = null; };
  }, []);

  useEffect(() => {
    if (!current) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    (current.danger ? cancelRef.current : primaryRef.current)?.focus();
    return () => { returnFocus.current?.focus?.(); };
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) return null;

  const close = (ok: boolean) => {
    current.resolve(ok);
    setQueue(q => q.slice(1));
  };
  const isConfirm = current.kind === 'confirm';
  const titleId = `lp-dlg-t-${current.id}`;
  const bodyId = `lp-dlg-b-${current.id}`;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(false); return; }
    if (e.key === 'Tab') { // mantém o foco dentro do diálogo
      const f = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };

  return (
    <div className="lp-dialog-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && isConfirm) close(false); }}>
      <div className="lp-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId} onKeyDown={onKeyDown}>
        <h2 id={titleId} className="lp-dialog__title">{current.title ?? (isConfirm ? 'Confirmar' : 'Aviso')}</h2>
        <p id={bodyId} className="lp-dialog__body">{current.message}</p>
        <div className="lp-dialog__actions">
          {isConfirm && (
            <button ref={cancelRef} type="button" className="lp-btn lp-btn--secondary" onClick={() => close(false)}>
              {current.cancelLabel ?? 'Cancelar'}
            </button>
          )}
          <button ref={primaryRef} type="button" className={`lp-btn ${current.danger ? 'lp-btn--danger' : 'lp-btn--primary'}`} onClick={() => close(true)}>
            {current.confirmLabel ?? (isConfirm ? 'Confirmar' : 'Entendi')}
          </button>
        </div>
      </div>
    </div>
  );
}
