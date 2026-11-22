// src/AuthPages.tsx — Login, Cadastro e Recuperação de Senha
import { useState, type FormEvent, type ReactNode } from 'react';
import { signUp, signIn, signInWithGoogle, resetPassword, updatePassword } from './supabaseClient';
import { Button, Field, Notice } from './uiKit';

// O Supabase devolve mensagens em inglês; aqui viram instruções em português.
export function friendlyAuthError(e: unknown, fallback: string): string {
  const m = (e instanceof Error ? e.message : '').toLowerCase();
  if (!m) return fallback;
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos. Confira e tente de novo.';
  if (m.includes('email not confirmed')) return 'Confirme o seu e-mail pelo link que enviamos antes de entrar.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Este e-mail já tem conta. Use “Entrar”.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Sem conexão com a internet. Verifique e tente de novo.';
  if (m.includes('password should be') || m.includes('weak password')) return 'Escolha uma senha mais forte, com pelo menos 6 caracteres.';
  if (m.includes('same password')) return 'A nova senha precisa ser diferente da atual.';
  return fallback;
}

export function AuthWrap({ children }: { children: ReactNode }) {
  return (
    <main className="lp-auth narrow-tab">
      <div className="lp-auth__panel">{children}</div>
      <div className="lp-auth__links">
        <a href="/privacy.html" target="_blank" rel="noopener noreferrer">Política de Privacidade</a>
        <a href="/terms.html" target="_blank" rel="noopener noreferrer">Termos de Serviço</a>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
      <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

function AuthHeader({ title, lead }: { title: string; lead?: string }) {
  return (
    <>
      <p className="lp-auth__brand">LifePlan</p>
      <h1 className="lp-auth__title">{title}</h1>
      {lead && <p className="lp-auth__lead">{lead}</p>}
    </>
  );
}

function GoogleButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  return (
    <Button variant="outline" block large onClick={onClick} disabled={disabled} style={{ color: 'var(--text)', borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <GoogleMark />{label}
    </Button>
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

  async function handle(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) { setErr('Preencha o e-mail e a senha.'); return; }
    setLoading(true); setErr('');
    try { await signIn({ email: email.trim(), password }); onLogin(); }
    catch (ex) { setErr(friendlyAuthError(ex, 'Não foi possível entrar agora. Tente de novo.')); }
    finally { setLoading(false); }
  }
  async function handleGoogle() {
    setLoading(true); setErr('');
    try { await signInWithGoogle(); }
    catch (ex) { setErr(friendlyAuthError(ex, 'Não foi possível entrar com o Google. Tente de novo.')); }
    finally { setLoading(false); }
  }
  async function handleForgot(e: FormEvent) {
    e.preventDefault();
    if (!forgotEmail) { setErr('Digite o seu e-mail.'); return; }
    setLoading(true); setErr('');
    try { await resetPassword(forgotEmail.trim()); setForgotSent(true); }
    catch (ex) { setErr(friendlyAuthError(ex, 'Não foi possível enviar o link. Tente de novo.')); }
    finally { setLoading(false); }
  }

  if (forgotMode) return (
    <AuthWrap>
      <AuthHeader title="Recuperar senha" lead="Enviamos um link para você criar uma senha nova." />
      {forgotSent ? (
        <>
          <p className="lp-auth__lead">Se <b>{forgotEmail}</b> tiver uma conta, o link já está a caminho. Confira a caixa de entrada e o spam.</p>
          <Button block large onClick={() => { setForgotMode(false); setForgotSent(false); }}>Voltar para o login</Button>
        </>
      ) : (
        <form onSubmit={handleForgot} noValidate>
          <Field label="Seu e-mail" type="email" autoComplete="email" inputMode="email" placeholder="seu@email.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
          {err && <Notice tone="error">{err}</Notice>}
          <Button type="submit" block large loading={loading} style={{ marginTop: 'var(--sp-3)' }}>{loading ? 'Enviando…' : 'Enviar link de recuperação'}</Button>
          <div className="lp-auth__switch"><button type="button" className="lp-link" onClick={() => { setForgotMode(false); setErr(''); }}>Voltar para o login</button></div>
        </form>
      )}
    </AuthWrap>
  );

  return (
    <AuthWrap>
      <AuthHeader title="Que bom ver você de novo" lead="Seu plano de saúde, hábitos e dinheiro, num só lugar." />
      <GoogleButton label="Entrar com o Google" onClick={handleGoogle} disabled={loading} />
      <div className="lp-auth__divider">ou use o e-mail</div>
      <form onSubmit={handle} noValidate>
        <Field label="E-mail" type="email" autoComplete="email" inputMode="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
        <Field label="Senha" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
        <div style={{ textAlign: 'right', marginBottom: 'var(--sp-3)' }}>
          <button type="button" className="lp-link" style={{ fontWeight: 600 }} onClick={() => { setForgotMode(true); setErr(''); }}>Esqueci minha senha</button>
        </div>
        {err && <Notice tone="error">{err}</Notice>}
        <Button type="submit" block large loading={loading} style={{ marginTop: 'var(--sp-3)' }}>{loading ? 'Entrando…' : 'Entrar'}</Button>
      </form>
      <div className="lp-auth__switch">Ainda não tem conta? <button type="button" className="lp-link" onClick={onSwitch}>Criar conta</button></div>
    </AuthWrap>
  );
}

export function ResetPasswordPage({ onDone }: { onDone: () => void }) {
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handle(e: FormEvent) {
    e.preventDefault();
    if (pass.length < 6) { setErr('A senha precisa ter pelo menos 6 caracteres.'); return; }
    if (pass !== confirm) { setErr('As duas senhas não são iguais.'); return; }
    setLoading(true); setErr('');
    try { await updatePassword(pass); setDone(true); setTimeout(onDone, 1800); }
    catch (ex) { setErr(friendlyAuthError(ex, 'Não foi possível salvar a nova senha. Tente de novo.')); }
    finally { setLoading(false); }
  }

  return (
    <AuthWrap>
      <AuthHeader title="Crie a sua nova senha" />
      {done ? (
        <Notice tone="info">Senha alterada. Levando você para o app…</Notice>
      ) : (
        <form onSubmit={handle} noValidate>
          <Field label="Nova senha" type="password" autoComplete="new-password" hint="Mínimo de 6 caracteres" value={pass} onChange={e => setPass(e.target.value)} />
          <Field label="Repita a nova senha" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} />
          {err && <Notice tone="error">{err}</Notice>}
          <Button type="submit" block large loading={loading} style={{ marginTop: 'var(--sp-3)' }}>{loading ? 'Salvando…' : 'Salvar nova senha'}</Button>
        </form>
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

  const set = (k: RegisterFieldKey) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handle(e: FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setErr('Preencha nome, e-mail e senha.'); return; }
    if (form.password.length < 6) { setErr('A senha precisa ter pelo menos 6 caracteres.'); return; }
    if (form.password !== form.confirm) { setErr('As duas senhas não são iguais.'); return; }
    setLoading(true); setErr('');
    try {
      const data = await signUp({ email: form.email.trim(), password: form.password, name: form.name.trim() });
      if (data?.session) { onLogin(); }
      else { setNeedsConfirm(true); } // projeto exige confirmação de e-mail — ainda não há sessão
    } catch (ex) { setErr(friendlyAuthError(ex, 'Não foi possível criar a conta agora. Tente de novo.')); }
    finally { setLoading(false); }
  }
  async function handleGoogle() {
    setLoading(true); setErr('');
    try { await signInWithGoogle(); }
    catch (ex) { setErr(friendlyAuthError(ex, 'Não foi possível entrar com o Google. Tente de novo.')); }
    finally { setLoading(false); }
  }

  if (needsConfirm) return (
    <AuthWrap>
      <AuthHeader title="Confirme o seu e-mail" lead={`Enviamos um link para ${form.email}. Toque nele para ativar a conta e depois volte para entrar.`} />
      <Button block large onClick={onSwitch}>Ir para o login</Button>
    </AuthWrap>
  );

  return (
    <AuthWrap>
      <AuthHeader title="Vamos começar" lead="Crie a sua conta em menos de um minuto." />
      <GoogleButton label="Continuar com o Google" onClick={handleGoogle} disabled={loading} />
      <div className="lp-auth__divider">ou use o e-mail</div>
      <form onSubmit={handle} noValidate>
        <Field label="Nome" autoComplete="given-name" value={form.name} onChange={set('name')} />
        <Field label="E-mail" type="email" autoComplete="email" inputMode="email" placeholder="seu@email.com" value={form.email} onChange={set('email')} />
        <Field label="Senha" type="password" autoComplete="new-password" hint="Mínimo de 6 caracteres" value={form.password} onChange={set('password')} />
        <Field label="Repita a senha" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
        {err && <Notice tone="error">{err}</Notice>}
        <Button type="submit" block large loading={loading} style={{ marginTop: 'var(--sp-3)' }}>{loading ? 'Criando…' : 'Criar conta'}</Button>
      </form>
      <div className="lp-auth__switch">Já tem conta? <button type="button" className="lp-link" onClick={onSwitch}>Entrar</button></div>
    </AuthWrap>
  );
}
