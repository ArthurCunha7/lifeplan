// src/LockScreen.jsx — tela de bloqueio (PIN / biometria) e ajustes de privacidade do aparelho.
import { useState, useEffect, useRef } from "react";
import { Icon } from "./ui";
import { supabase } from "./supabaseClient";
import {
  PIN_LEN, MAX_FAILS, LOCK_AFTER_OPTIONS, getPrivacy, setPrivacy, clearLock,
  savePin, verifyPin, bioAvailable, bioEnroll, bioUnlock,
} from "./privacySettings";

const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, margin: '0 16px 12px', padding: 16 };
const labelStyle = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: .8 };
const btnBase = { border: '1px solid var(--border)', borderRadius: 10, minHeight: 48, padding: '12px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', background: 'var(--surface2)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 };

// ── Teclado numérico com bolinhas ────────────────────────────────────────────
export function PinPad({ title, subtitle, error, warn, disabled, onComplete, bioButton }) {
  const [value, setValue] = useState('');
  const ref = useRef(null);
  const valueRef = useRef('');
  valueRef.current = value;

  function press(d) {
    if (disabled) return;
    const next = (valueRef.current + d).slice(0, PIN_LEN);
    if (next.length === PIN_LEN) { setValue(''); onComplete(next); }
    else setValue(next);
  }
  function back() { if (!disabled) setValue(v => v.slice(0, -1)); }

  useEffect(() => {
    const onKey = e => {
      if (ref.current && ref.current.closest('[inert]')) return; // outra tela está por cima
      if (e.key >= '0' && e.key <= '9') { press(e.key); e.preventDefault(); }
      else if (e.key === 'Backspace') { back(); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // sem dependências: sempre usa o press atual

  const key = { width: 72, height: 72, borderRadius: 36, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 26, fontFamily: 'var(--font-display)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, touchAction: 'manipulation' };
  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500, color: 'var(--text)', textAlign: 'center' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6, textAlign: 'center', lineHeight: 1.45 }}>{subtitle}</div>}
      <div role="status" aria-label={`${value.length} de ${PIN_LEN} dígitos`} style={{ display: 'flex', gap: 14, margin: '24px 0 10px' }}>
        {Array.from({ length: PIN_LEN }).map((_, i) => (
          <span key={i} style={{ width: 14, height: 14, borderRadius: 7, border: '2px solid var(--accent)', background: i < value.length ? 'var(--accent)' : 'transparent' }} />
        ))}
      </div>
      <div style={{ minHeight: 40, fontSize: 14, textAlign: 'center', padding: '0 12px', lineHeight: 1.4, color: 'var(--warning)' }} role="alert">{error || warn || ''}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 72px)', gap: 14, marginTop: 6 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <button key={n} style={key} onClick={() => press(String(n))} disabled={disabled} aria-label={String(n)}>{n}</button>)}
        {bioButton
          ? <button style={{ ...key, fontSize: 14 }} onClick={bioButton} aria-label="Usar biometria" disabled={disabled}><Icon name="fingerprint" size={30} /></button>
          : <span />}
        <button style={key} onClick={() => press('0')} disabled={disabled} aria-label="0">0</button>
        <button style={{ ...key, border: 'none', background: 'transparent' }} onClick={back} disabled={disabled || !value} aria-label="Apagar último dígito"><Icon name="backspace" size={28} /></button>
      </div>
    </div>
  );
}

// ── Cobertura simples (quando o app vai para segundo plano) ──────────────────
export function PrivacyCover() {
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: 'var(--accent)' }}>LifePlan</div>
    </div>
  );
}

// ── Tela de bloqueio ─────────────────────────────────────────────────────────
export function LockScreen({ onUnlock, onForgot, onWipe }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [until, setUntil] = useState(() => getPrivacy().lockedUntil);
  const [now, setNow] = useState(Date.now());
  const hasBio = !!getPrivacy().bioCredId;
  const waitLeft = Math.max(0, Math.ceil((until - now) / 1000));

  useEffect(() => {
    if (until <= Date.now()) return;
    const t = setInterval(() => { setNow(Date.now()); if (Date.now() >= until) { clearInterval(t); setError(''); } }, 500);
    return () => clearInterval(t);
  }, [until]);

  async function tryBio() {
    try { if (await bioUnlock()) onUnlock(); } catch { /* cancelado: continua no PIN */ }
  }
  useEffect(() => { if (hasBio) tryBio(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(pin) {
    if (busy || waitLeft > 0) return;
    setBusy(true);
    let r;
    try { r = await verifyPin(pin); } catch (e) { setBusy(false); setError(e.message || 'Não foi possível conferir o PIN.'); return; }
    setBusy(false);
    if (r.ok) { onUnlock(); return; }
    if (r.reason === 'wipe') { onWipe(); return; }
    setNow(Date.now());
    if (r.waitMs) { setUntil(Date.now() + r.waitMs); setError('PIN incorreto. Muitas tentativas: aguarde para tentar de novo.'); }
    else if (r.reason === 'wrong') setError(`PIN incorreto. ${r.left === 1 ? 'Resta 1 tentativa' : `Restam ${r.left} tentativas`} antes de uma pausa.`);
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="App bloqueado" style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'var(--bg)', fontFamily: 'var(--font-body)', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', boxSizing: 'border-box' }}>
      <div style={{ color: 'var(--accent)', marginBottom: 6 }}><Icon name="lock" size={30} /></div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--muted)', marginBottom: 22 }}>LifePlan</div>
      <PinPad
        title="Digite seu PIN"
        subtitle={`${PIN_LEN} dígitos`}
        error={waitLeft > 0 ? `Muitas tentativas. Tente de novo em ${waitLeft} s.` : error}
        disabled={busy || waitLeft > 0}
        onComplete={submit}
        bioButton={hasBio ? tryBio : null}
      />
      <button onClick={() => { if (window.confirm('Para redefinir o PIN, você vai sair da conta neste aparelho e entrar de novo com sua senha. Continuar?')) onForgot(); }}
        style={{ marginTop: 22, background: 'none', border: 'none', color: 'var(--accent)', fontSize: 14, fontWeight: 700, minHeight: 44, padding: '0 12px', cursor: 'pointer', textDecoration: 'underline' }}>
        Esqueci o PIN
      </button>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Após {MAX_FAILS} erros seguidos você é desconectado deste aparelho.</div>
    </div>
  );
}

// ── Interruptor acessível ────────────────────────────────────────────────────
function Switch({ checked, onChange, label, disabled }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      style={{ width: 56, height: 44, background: 'none', border: 'none', padding: 0, cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: disabled ? .5 : 1 }}>
      <span style={{ width: 52, height: 32, borderRadius: 16, border: '1px solid var(--border)', background: checked ? 'var(--accent)' : 'var(--surface2)', position: 'relative', display: 'block', transition: 'background .15s' }}>
        <span style={{ position: 'absolute', top: 3, left: checked ? 23 : 3, width: 24, height: 24, borderRadius: 12, background: checked ? 'var(--on-accent)' : 'var(--muted)', transition: 'left .15s' }} />
      </span>
    </button>
  );
}

// ── Fluxos de PIN dentro de uma janela (criar, alterar, desligar) ────────────
function PinFlow({ mode, onClose, onDone, onWipe }) {
  // create: new → confirm | change: old → new → confirm | disable: old
  const [step, setStep] = useState(mode === 'create' ? 'new' : 'old');
  const [first, setFirst] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const titles = { old: 'Digite seu PIN atual', new: mode === 'create' ? 'Crie um PIN' : 'Crie o novo PIN', confirm: 'Repita o PIN' };
  const subs = { old: mode === 'disable' ? 'Para desligar o bloqueio.' : 'Para continuar.', new: `${PIN_LEN} dígitos. Evite datas e sequências.`, confirm: 'Digite de novo para confirmar.' };

  async function onComplete(pin) {
    setError('');
    if (step === 'old') {
      setBusy(true);
      let r; try { r = await verifyPin(pin); } catch (e) { setBusy(false); setError(e.message); return; }
      setBusy(false);
      if (r.reason === 'wipe') { onWipe(); return; }
      if (!r.ok) { setError(r.reason === 'wait' ? `Aguarde ${Math.ceil(r.waitMs / 1000)} s para tentar de novo.` : 'PIN incorreto.'); return; }
      if (mode === 'disable') { clearLock(); onDone(); return; }
      setStep('new');
    } else if (step === 'new') {
      if (/^(\d)\1+$/.test(pin) || '0123456789'.includes(pin) || '9876543210'.includes(pin)) { setError('Esse PIN é fácil de adivinhar. Escolha outro.'); return; }
      setFirst(pin); setStep('confirm');
    } else {
      if (pin !== first) { setError('Os PINs não são iguais. Comece de novo.'); setFirst(''); setStep('new'); return; }
      setBusy(true);
      try { await savePin(pin); onDone(); } catch (e) { setError(e.message || 'Não foi possível salvar o PIN.'); }
      setBusy(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(16,22,18,0.55)', zIndex: 450, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => !busy && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="PIN" onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', fontFamily: 'var(--font-body)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, padding: '20px 16px 24px', maxHeight: '94vh', overflowY: 'auto', boxSizing: 'border-box' }}>
        <PinPad key={step} title={titles[step]} subtitle={subs[step]} error={error} disabled={busy} onComplete={onComplete} />
        <button onClick={onClose} style={{ ...btnBase, width: '100%', marginTop: 18 }}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Cartão de ajustes (Perfil) ───────────────────────────────────────────────
export function LockSettings({ userId, onLockNow, onWipe }) {
  const [priv, setPriv] = useState(getPrivacy());
  const [flow, setFlow] = useState(null);      // 'create' | 'change' | 'disable' | null
  const [bioOk, setBioOk] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const refresh = () => setPriv(getPrivacy());

  useEffect(() => { bioAvailable().then(setBioOk); }, []);

  async function toggleBio(on) {
    setErr(''); setMsg('');
    if (!on) { setPrivacy({ bioCredId: null }); refresh(); return; }
    try {
      let email = null;
      try { const { data: { user } } = await supabase.auth.getUser(); email = user && user.email; } catch { /* sem e-mail: segue */ }
      await bioEnroll(userId, email);
      setMsg('Biometria ativada. O PIN continua valendo como alternativa.');
    } catch (e) {
      setErr(e && e.name === 'NotAllowedError' ? 'Cadastro cancelado ou negado pelo aparelho.' : 'Não foi possível ativar a biometria neste aparelho.');
    }
    refresh();
  }

  const row = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 48 };
  const rowText = { fontSize: 15, color: 'var(--text)' };
  const hint = { fontSize: 13, color: 'var(--muted)', lineHeight: 1.45, marginTop: 2 };

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={labelStyle}>BLOQUEIO E VALORES</div>

      <div style={row}>
        <div><div style={rowText}>Esconder valores por padrão</div><div style={hint}>Finanças começam com os valores ocultos; você mostra com o olhinho.</div></div>
        <Switch checked={priv.hideValues} label="Esconder valores por padrão" onChange={v => { setPrivacy({ hideValues: v }); refresh(); }} />
      </div>

      <div style={row}>
        <div><div style={rowText}>Bloquear o app com PIN</div><div style={hint}>Pede o PIN ao abrir e quando você volta ao app.</div></div>
        <Switch checked={priv.lockEnabled} label="Bloquear o app com PIN" onChange={v => setFlow(v ? 'create' : 'disable')} />
      </div>

      {priv.lockEnabled && (
        <>
          <div style={row}>
            <label htmlFor="lock-after" style={rowText}>Bloquear</label>
            <select id="lock-after" value={priv.lockAfter} onChange={e => { setPrivacy({ lockAfter: Number(e.target.value) }); refresh(); }}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 14, padding: '10px 12px', minHeight: 44 }}>
              {LOCK_AFTER_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {bioOk && (
            <div style={row}>
              <div><div style={rowText}>Usar biometria</div><div style={hint}>Digital ou rosto, quando o aparelho tiver.</div></div>
              <Switch checked={!!priv.bioCredId} label="Usar biometria" onChange={toggleBio} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => setFlow('change')} style={{ ...btnBase, flex: 1, minWidth: 140 }}>Alterar PIN</button>
            <button onClick={onLockNow} style={{ ...btnBase, flex: 1, minWidth: 140 }}><Icon name="lock" size={18} />Bloquear agora</button>
          </div>
        </>
      )}

      {msg && <div role="status" style={{ fontSize: 13, color: 'var(--success)' }}>{msg}</div>}
      {err && <div role="alert" style={{ fontSize: 13, color: 'var(--warning)' }}>{err}</div>}
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
        O bloqueio vale só neste aparelho e protege quem pegar seu celular desbloqueado. Esqueceu o PIN? Saia da conta e entre de novo com a senha.
      </div>

      {flow && <PinFlow mode={flow} onClose={() => setFlow(null)} onWipe={() => { setFlow(null); onWipe(); }}
        onDone={() => { setFlow(null); refresh(); }} />}
    </div>
  );
}
