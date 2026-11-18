// src/ThemeToggle.tsx — alternador único de tema claro/escuro (sincroniza com iframes via postMessage)
import { useState, type CSSProperties } from 'react';
import { Icon } from './ui';

export function isDarkMode(): boolean {
  try { return document.documentElement.getAttribute('data-theme') === 'dark'; }
  catch { return false; }
}

export function setDarkMode(dark: boolean): void {
  try {
    if (dark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('lifeplan_theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('lifeplan_theme', 'light');
    }
  } catch { /* ignora */ }
  // Avisa qualquer iframe do LifePlan (Finanças/Estudos/Hábitos) que esteja
  // aberto agora, pra ele mudar de tema instantaneamente também.
  document.querySelectorAll('iframe').forEach(f => {
    try { f.contentWindow?.postMessage({ lifeplanTheme: dark ? 'dark' : 'light' }, window.location.origin); } catch { /* ignora */ }
  });
}

export function ThemeToggleButton({ style }: { style?: CSSProperties }) {
  const [dark, setDark] = useState(isDarkMode);
  return (
    <button
      onClick={() => { const next = !dark; setDarkMode(next); setDark(next); }}
      aria-label={dark ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}
      title={dark ? 'Tema claro' : 'Tema escuro'}
      style={{ width: 44, height: 44, borderRadius: 22, border: 'none', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, ...style }}
    >
      <Icon name={dark ? 'sun' : 'moon'} size={22} />
    </button>
  );
}
