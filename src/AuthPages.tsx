// src/AuthPages.tsx — Login, Cadastro e Recuperação de Senha
import { useState, type ChangeEvent, type ReactNode } from 'react';
import { signUp, signIn, signInWithGoogle, resetPassword, updatePassword } from './supabaseClient';
import { S } from './styles';

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error && e.message ? e.message : fallback;

export function AuthWrap({ children }: { children: ReactNode }) {
  return (
    <div className="narrow-tab" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 14 }}>
      <div style={{ width: '100%', maxWidth: 400, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 32 }}>{children}</div>
      <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--muted)' }}>
        <a href="/privacy.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted)', textDecoration: 'underline' }}>Política de Privacidade</a>
        <span>·</span>
        <a href="/terms.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted)', textDecoration: 'underline' }}>Termos de Serviço</a>
      </div>
    </div>
  );
}

export function LoginPage({ onSwitch, onLogin }: { onSwitch: () => void; onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  async function handle() {
    if (!email || !password) { setErr('Preencha todos os campos'); return; }
    setLoading(true);
    try { await signIn({ email, password }); onLogin(); }
    catch (e) { setErr(errMsg(e, 'Email ou senha incorretos')); }
    finally { setLoading(false); }
  }
  async function handleGoogle() {
    setLoading(true);
    try { await signInWithGoogle(); }
    catch (e) { setErr(errMsg(e, 'Erro ao entrar com Google')); }
    finally { setLoading(false); }
  }
  async function handleForgot() {
    if (!forgotEmail) { setErr('Digite seu e-mail'); return; }
    setLoading(true); setErr('');
    try { await resetPassword(forgotEmail); setForgotSent(true); }
    catch (e) { setErr(errMsg(e, 'Erro ao enviar o link')); }
    finally { setLoading(false); }
  }

  if (forgotMode) return (
    <AuthWrap>
      <div style={{ textAlign: 'center', marginBottom: 28 }}><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>Recuperar senha</div></div>
      {forgotSent ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--muted2)', lineHeight: 1.6, marginBottom: 22 }}>Se <b>{forgotEmail}</b> tiver uma conta, enviamos um link para você criar uma senha nova. Confira sua caixa de entrada (e o spam).</div>
          <button style={{ ...S.btn(), width: '100%', padding: 13 }} onClick={() => { setForgotMode(false); setForgotSent(false); }}>Voltar para o login</button>
        </div>
      ) : (
        <>
          <label style={S.label}>SEU E-MAIL</label>
          <input style={{ ...S.input, marginBottom: 16 }} type="email" placeholder="seu@email.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleForgot()} />
          {err && <div style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 12, textAlign: 'center' }}>{err}</div>}
          <button style={{ ...S.btn(), width: '100%', padding: 13, marginBottom: 12, opacity: loading ? 0.6 : 1 }} onClick={handleForgot} disabled={loading}>{loading ? 'Enviando…' : 'Enviar link de recuperação'}</button>
          <div style={{ textAlign: 'center' }}><button style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14 }} onClick={() => { setForgotMode(false); setErr(''); }}>← Voltar para o login</button></div>
        </>
      )}
    </AuthWrap>
  );

  return (
    <AuthWrap>
      <div style={{ textAlign: 'center', marginBottom: 28 }}><div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 600, color: 'var(--accent)' }}>LifePlan</div><div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Tabela TACO · NEPA/UNICAMP</div></div>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', textAlign: 'center', marginBottom: 24 }}>Bem-vindo de volta</div>
      <button style={{ width: '100%', padding: 13, marginBottom: 16, borderRadius: 12, border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }} onClick={handleGoogle} disabled={loading}>
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" style={{ width: 20, height: 20 }} />
        Entrar com Google
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>OU</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      <label style={S.label}>E-MAIL</label>
      <input style={{ ...S.input, marginBottom: 12 }} type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
      <label style={S.label}>SENHA</label>
      <input style={{ ...S.input, marginBottom: 8 }} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} />
      <div style={{ textAlign: 'right', marginBottom: 16 }}><button style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14 }} onClick={() => { setForgotMode(true); setErr(''); }}>Esqueci minha senha</button></div>
      {err && <div style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 12, textAlign: 'center' }}>{err}</div>}
      <button style={{ ...S.btn(), width: '100%', padding: 13, marginBottom: 16, opacity: loading ? 0.6 : 1 }} onClick={handle} disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
      <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted)' }}>Não tem conta?{' '}<button style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline', padding: '12px 4px' }} onClick={onSwitch}>Cadastrar →</button></div>
    </AuthWrap>
  );
}

export function ResetPasswordPage({ onDone }: { onDone: () => void }) {
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handle() {
    if (pass.length < 6) { setErr('Senha mínima: 6 caracteres'); return; }
    if (pass !== confirm) { setErr('Senhas não conferem'); return; }
    setLoading(true); setErr('');
    try { await updatePassword(pass); setDone(true); setTimeout(onDone, 1800); }
    catch (e) { setErr(errMsg(e, 'Erro ao definir a nova senha')); }
    finally { setLoading(false); }
  }

  return (
    <AuthWrap>
      <div style={{ textAlign: 'center', marginBottom: 28 }}><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>Defina sua nova senha</div></div>
      {done ? (
        <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--accent-dark)', fontWeight: 700 }}>Senha alterada! Levando você para o app...</div>
      ) : (
        <>
          <label style={S.label}>NOVA SENHA</label>
          <input style={{ ...S.input, marginBottom: 12 }} type="password" placeholder="mínimo 6 caracteres" value={pass} onChange={e => setPass(e.target.value)} />
          <label style={S.label}>CONFIRME A NOVA SENHA</label>
          <input style={{ ...S.input, marginBottom: 16 }} type="password" placeholder="repita a senha" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} />
          {err && <div style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 12, textAlign: 'center' }}>{err}</div>}
          <button style={{ ...S.btn(), width: '100%', padding: 13, opacity: loading ? 0.6 : 1 }} onClick={handle} disabled={loading}>{loading ? 'Salvando…' : 'Salvar nova senha'}</button>
        </>
      )}
    </AuthWrap>
  );
}

type RegisterFieldKey = 'name' | 'email' | 'password' | 'confirm';

export function RegisterPage({ onSwitch, onLogin }: { onSwitch: () => void; onLogin: () => void }) {
  const [form, setForm] = useState<Record<RegisterFieldKey, string>>({ name: '', email: '', password: '', confirm: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  const set = (k: RegisterFieldKey) => (e: ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handle() {
    if (!form.name || !form.email || !form.password) { setErr('Preencha todos os campos'); return; }
    if (form.password.length < 6) { setErr('Senha mínima: 6 caracteres'); return; }
    if (form.password !== form.confirm) { setErr('Senhas não conferem'); return; }
    setLoading(true);
    try {
      const data = await signUp({ email: form.email, password: form.password, name: form.name });
      if (data?.session) { onLogin(); }
      else { setNeedsConfirm(true); } // projeto exige confirmação de e-mail — ainda não há sessão
    } catch (e) { setErr(errMsg(e, 'Erro ao criar conta')); }
    finally { setLoading(false); }
  }
  async function handleGoogle() {
    setLoading(true);
    try { await signInWithGoogle(); }
    catch (e) { setErr(errMsg(e, 'Erro ao entrar com Google')); }
    finally { setLoading(false); }
  }

  if (needsConfirm) return (
    <AuthWrap>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>Confirme seu e-mail</div>
        <div style={{ fontSize: 14, color: 'var(--muted2)', lineHeight: 1.6, marginBottom: 20 }}>Enviamos um link de confirmação para <b>{form.email}</b>. Toque nele para ativar sua conta e depois volte para entrar.</div>
        <button style={{ ...S.btn(), width: '100%', padding: 13 }} onClick={onSwitch}>Ir para o login</button>
      </div>
    </AuthWrap>
  );

  const fields: ReadonlyArray<readonly [RegisterFieldKey, string, string, string]> = [
    ['name', '', 'NOME', 'Seu nome'],
    ['email', '', 'E-MAIL', 'seu@email.com'],
    ['password', '', 'SENHA', 'Mín. 6 caracteres'],
    ['confirm', '', 'CONFIRMAR', 'Repita a senha'],
  ];

  return (
    <AuthWrap>
      <div style={{ textAlign: 'center', marginBottom: 24 }}><div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 600, color: 'var(--accent)' }}>LifePlan</div></div>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', textAlign: 'center', marginBottom: 24 }}>Criar conta</div>
      <button style={{ width: '100%', padding: 13, marginBottom: 16, borderRadius: 12, border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }} onClick={handleGoogle} disabled={loading}>
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" style={{ width: 20, height: 20 }} />
        Cadastrar com Google
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>OU</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      {fields.map(([k, ic, lb, ph]) => (
        <div key={k} style={{ marginBottom: 12 }}><label style={S.label}>{ic} {lb}</label><input style={S.input} type={k === 'password' || k === 'confirm' ? 'password' : 'text'} placeholder={ph} value={form[k]} onChange={set(k)} /></div>
      ))}
      {err && <div style={{ color: 'var(--danger)', fontSize: 14, margin: '8px 0', textAlign: 'center' }}>{err}</div>}
      <button style={{ ...S.btn(), width: '100%', padding: 13, marginTop: 8, marginBottom: 16, opacity: loading ? 0.6 : 1 }} onClick={handle} disabled={loading}>{loading ? 'Criando…' : 'Criar conta'}</button>
      <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted)' }}>Já tem conta?{' '}<button style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline', padding: '12px 4px' }} onClick={onSwitch}>Entrar →</button></div>
    </AuthWrap>
  );
}
