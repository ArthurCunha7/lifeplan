// src/App.tsx — Roteamento central, sessão Supabase, bloqueio de tela e ErrorBoundary
import { useState, useRef, useEffect, Component, type ErrorInfo, type ReactNode } from 'react';
import { BottomNav, NAV_SCREENS } from './ui';
import { DialogHost, alertDialog } from './dialog';
import { LockScreen, PrivacyCover } from './LockScreen';
import { getPrivacy, clearLock } from './privacySettings';
import { disablePush } from './notificationsApi';
import { supabase } from './supabaseClient';
import { clearUserLocalData, ensureUserLocalScope } from './planDataQueue';
import { LoginPage, ResetPasswordPage, RegisterPage } from './AuthPages';
import { ProfilePage } from './ProfilePage';
import { MealPlanApp } from './MealPlanApp';
import { StudyTab, FinanceTab, HabitsTab, TimetableScreen } from './StudyAndSchedule';
import { HomeDashboard } from './HomeDashboard';
import type { ScreenId, UserProfile } from './types';

// Reexporta helpers usados pelos testes unitários e consumidores externos
export { searchTACO, computeFoodMetrics } from './tacoDb';

// Tema compartilhado (cores + fontes)
if (typeof document !== 'undefined' && !document.getElementById('lifeplan-theme')) {
  const l = document.createElement('link');
  l.id = 'lifeplan-theme'; l.rel = 'stylesheet'; l.href = '/lifeplan-theme.css';
  document.head.appendChild(l);
}

// Telas que fazem sentido "retomar" depois de um F5 — nunca restauramos para
// estados transitórios como loading/login/register/profile.
const RESUMABLE_SCREENS: readonly ScreenId[] = [
  'home', 'nutrition', 'shopping', 'treinos', 'estudos', 'financas', 'habitos', 'timetable',
];

function isResumableScreen(s: string | null): s is ScreenId {
  return !!s && (RESUMABLE_SCREENS as readonly string[]).includes(s);
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
function AppInner() {
  const [screen, setScreen] = useState<ScreenId>('loading');
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const userIdRef = useRef<string | null>(null);
  const screenRef = useRef<ScreenId>(screen);
  screenRef.current = screen;

  // ── Bloqueio do app (PIN / biometria) ───────────────────────────────────────
  const [locked, setLocked] = useState(() => getPrivacy().lockEnabled);
  const [covered, setCovered] = useState(false);
  const hiddenAtRef = useRef(0);

  const lockNow = () => {
    setLocked(true);
    window.dispatchEvent(new Event('lifeplan:lock'));
    document.querySelectorAll('iframe').forEach(f => {
      try { f.contentWindow?.postMessage({ lifeplanLock: true }, window.location.origin); } catch { /* ignora */ }
    });
  };
  const lockNowRef = useRef(lockNow);
  lockNowRef.current = lockNow;

  const wipeLock = async () => {
    clearLock(); setLocked(false); setCovered(false); setProfile(null);
    try { await disablePush(); } catch { /* ignora */ }
    supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    clearUserLocalData();
    setScreen('login');
  };

  useEffect(() => {
    const onVis = () => {
      const pv = getPrivacy();
      if (!pv.lockEnabled || !userIdRef.current) return;
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        setCovered(true);
        if (pv.lockAfter === 0) lockNowRef.current();
      } else {
        const away = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
        if (hiddenAtRef.current && away >= pv.lockAfter * 1000) lockNowRef.current();
        hiddenAtRef.current = 0;
        setCovered(false);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (RESUMABLE_SCREENS.includes(screen)) sessionStorage.setItem('lifeplan_screen', screen);
  }, [screen]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        ensureUserLocalScope(session.user.id);
        userIdRef.current = session.user.id; setUserId(session.user.id);
        const saved = sessionStorage.getItem('lifeplan_screen');
        setScreen(isResumableScreen(saved) ? saved : 'home');
      } else {
        setLocked(false); setScreen('login');
      }
    }).catch(() => {
      setScreen('login');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setScreen('reset-password');
        return;
      }
      if (session?.user) {
        const isNewLogin = userIdRef.current !== session.user.id;
        ensureUserLocalScope(session.user.id);
        if (isNewLogin) setProfile(null);
        userIdRef.current = session.user.id;
        setUserId(session.user.id);
        if (isNewLogin && screenRef.current !== 'reset-password') setScreen('home');
      } else {
        if (event === 'SIGNED_OUT' || userIdRef.current) clearUserLocalData();
        userIdRef.current = null;
        setUserId(null);
        setProfile(null);
        setLocked(false);
        setScreen('login');
        sessionStorage.removeItem('lifeplan_screen');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const profileBackRef = useRef<ScreenId>('home');
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data && e.data.lifeplanNav === 'profile' && userIdRef.current) {
        profileBackRef.current = screenRef.current;
        setScreen('profile');
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  let screenContent: ReactNode;
  if (screen === 'loading') {
    screenContent = (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div role="status" style={{ textAlign: 'center' }}><div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: 'var(--accent)', marginBottom: 12 }}>LifePlan</div><div style={{ color: 'var(--muted)', animation: 'lp-pulse 1.4s ease-in-out infinite' }}>Preparando o seu dia…</div></div>
      </div>
    );
  } else {
    const onLogout = async () => {
      await disablePush();
      try { await supabase.auth.signOut({ scope: 'local' }); } catch (e) { console.error(e); }
      clearLock(); setLocked(false); setProfile(null);
      clearUserLocalData();
      setScreen('login');
    };
    const onAccountDeleted = async () => {
      await disablePush();
      try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* ignora */ }
      clearUserLocalData();
      try {
        const th = localStorage.getItem('lifeplan_theme');
        localStorage.clear(); sessionStorage.clear();
        if (th) localStorage.setItem('lifeplan_theme', th);
      } catch { /* ignora */ }
      setProfile(null);
      setLocked(false);
      setScreen('login');
    };
    const onOpenProfile = () => {
      profileBackRef.current = RESUMABLE_SCREENS.includes(screen) ? screen : 'home';
      setScreen('profile');
    };

    if (screen === 'profile') screenContent = (
      <ProfilePage userId={userId} initialProfile={profile}
        onSave={(_newPlan, newProfile) => { setProfile(newProfile); setScreen(profileBackRef.current); }}
        onBack={() => setScreen(profileBackRef.current)} onLogout={onLogout} onAccountDeleted={onAccountDeleted} onLockNow={lockNow} onLockWipe={wipeLock} />
    );
    else if (screen === 'home') screenContent = (
      <HomeDashboard userId={userId} onNavigate={setScreen} onOpenProfile={onOpenProfile} onLogout={onLogout} onOpenTimetable={() => setScreen('timetable')} />
    );
    else if (screen === 'timetable') screenContent = <TimetableScreen onHome={() => setScreen('estudos')} userId={userId} />;
    else if (screen === 'nutrition') screenContent = (
      <MealPlanApp userId={userId} initialTab="plan" onHome={() => setScreen('home')} onLogout={onLogout} onOpenProfile={onOpenProfile} />
    );
    else if (screen === 'shopping') screenContent = (
      <MealPlanApp userId={userId} initialTab="shop" onHome={() => setScreen('home')} onLogout={onLogout} onOpenProfile={onOpenProfile} />
    );
    else if (screen === 'treinos') screenContent = (
      <MealPlanApp userId={userId} initialTab="workout" onHome={() => setScreen('home')} onLogout={onLogout} onOpenProfile={onOpenProfile} />
    );
    else if (screen === 'estudos') screenContent = <StudyTab userId={userId} onOpenTimetable={() => setScreen('timetable')} />;
    else if (screen === 'financas') screenContent = <FinanceTab userId={userId} onOpenProfile={onOpenProfile} />;
    else if (screen === 'habitos') screenContent = <HabitsTab userId={userId} onHome={() => setScreen('home')} onLogout={onLogout} onOpenProfile={onOpenProfile} />;
    else if (screen === 'reset-password') screenContent = <ResetPasswordPage onDone={() => setScreen('home')} />;
    else if (screen === 'register') screenContent = <RegisterPage onSwitch={() => setScreen('login')} onLogin={() => setScreen('home')} />;
    else screenContent = <LoginPage onSwitch={() => setScreen('register')} onLogin={() => setScreen('home')} />;
  }

  const showLock = !!userId && (locked || covered);

  return (
    <>
      <div style={{ display: 'contents' }} inert={showLock ? '' : undefined}>
        {screenContent}
        {userId && NAV_SCREENS.includes(screen) && <BottomNav screen={screen} onNavigate={setScreen} />}
      </div>
      {showLock && (locked
        ? <LockScreen onUnlock={() => { setLocked(false); setCovered(false); }} onForgot={wipeLock} onWipe={() => { wipeLock(); setTimeout(() => { void alertDialog('Por segurança, você foi desconectado deste aparelho. Entre de novo com a sua senha.', { title: 'Muitos erros de PIN' }); }, 50); }} />
        : <PrivacyCover />)}
      <DialogHost />
    </>
  );
}

// ── ERROR BOUNDARY ────────────────────────────────────────────────────────────
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro capturado pelo LifePlan:', error, info);
  }
  handleReload = () => { window.location.reload(); };
  handleGoHome = () => {
    try { sessionStorage.removeItem('lifeplan_screen'); } catch { /* ignora */ }
    window.location.reload();
  };
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui,sans-serif' }}>
          <div style={{ maxWidth: 380, textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '32px 24px', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Algo deu errado</div>
            <div style={{ fontSize: 14, color: 'var(--muted2)', lineHeight: 1.6, marginBottom: 22 }}>Essa tela travou de forma inesperada. Seus dados já salvos na nuvem não foram afetados — geralmente um recarregamento resolve.</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={this.handleReload} style={{ background: 'var(--accent)', color: 'var(--on-accent)', border: 'none', borderRadius: 12, padding: '12px 20px', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Recarregar</button>
              <button onClick={this.handleGoHome} style={{ background: 'var(--surface2)', color: 'var(--accent-dark)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 20px', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Voltar para o Início</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (<ErrorBoundary><AppInner /></ErrorBoundary>);
}
