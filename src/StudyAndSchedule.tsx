// src/StudyAndSchedule.tsx — Estudos, Finanças, Hábitos (iframes), Timer de Foco e Grade de Horários
import { useState, useRef, useEffect, type CSSProperties, type RefObject } from 'react';
import { Icon, Glyph, TopBar, EmptyState } from './ui';
import { fetchUserPlanData } from './supabaseClient';
import { registerPlanDataField, requestPlanDataSave } from './planDataQueue';
import { S, HOME_THEME } from './styles';
import type { TimetableData } from './types';

export const WEEK_DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;

export function FullDayName(short: string): string {
  const map: Record<string, string> = {
    Seg: 'SEGUNDA',
    Ter: 'TERÇA',
    Qua: 'QUARTA',
    Qui: 'QUINTA',
    Sex: 'SEXTA',
    Sáb: 'SÁBADO',
    Dom: 'DOMINGO',
  };
  return map[short] || short;
}

// Quadro de horários totalmente personalizável: linhas livres (rótulo editável,
// ex. "08:00 - 09:40") x colunas dos 7 dias, com cada célula editável.
export function useTimetable(userId: string | null) {
  const [data, setData] = useState<TimetableData>(() => {
    try {
      const owner = localStorage.getItem('timetable_v2_uid');
      if (owner && userId && owner !== userId) return { rows: [], cells: {} };
      const raw = JSON.parse(localStorage.getItem('timetable_v2') || 'null') as TimetableData | null;
      if (raw && Array.isArray(raw.rows)) return raw;
    } catch { /* ignora */ }
    return { rows: [], cells: {} };
  });

  useEffect(() => {
    try {
      localStorage.setItem('timetable_v2', JSON.stringify(data));
      if (userId) localStorage.setItem('timetable_v2_uid', userId);
    } catch { /* ignora */ }
  }, [data, userId]);

  const [timetableLoaded, setTimetableLoaded] = useState(false);
  useEffect(() => {
    if (!userId) return;
    fetchUserPlanData(userId).then(pd => {
      const cloud = pd?.timetable;
      if (cloud && Array.isArray(cloud.rows)) setData(cloud);
    }).catch(() => {}).finally(() => setTimetableLoaded(true));
  }, [userId]);

  const dataRef = useRef(data);
  dataRef.current = data;
  useEffect(() => {
    if (!userId) return;
    return registerPlanDataField('timetable', () => dataRef.current);
  }, [userId]);

  useEffect(() => {
    if (!userId || !timetableLoaded) return;
    const t = setTimeout(() => requestPlanDataSave(userId), 400);
    return () => { clearTimeout(t); requestPlanDataSave(userId); };
  }, [data, userId, timetableLoaded]);

  function addRow(label: string) {
    setData(d => ({ ...d, rows: [...d.rows, { id: 'r' + Date.now() + Math.random().toString(36).slice(2, 6), label: label || 'Novo horário' }] }));
  }
  function removeRow(id: string) {
    setData(d => {
      const cells = { ...d.cells };
      Object.keys(cells).forEach(k => { if (k.startsWith(id + '-')) delete cells[k]; });
      return { rows: d.rows.filter(r => r.id !== id), cells };
    });
  }
  function renameRow(id: string, label: string) {
    setData(d => ({ ...d, rows: d.rows.map(r => r.id === id ? { ...r, label } : r) }));
  }
  function moveRow(id: string, dir: number) {
    setData(d => {
      const idx = d.rows.findIndex(r => r.id === id);
      const newIdx = idx + dir;
      if (idx < 0 || newIdx < 0 || newIdx >= d.rows.length) return d;
      const rows = [...d.rows];
      [rows[idx], rows[newIdx]] = [rows[newIdx], rows[idx]];
      return { ...d, rows };
    });
  }
  function setCell(rowId: string, day: string, value: string) {
    setData(d => ({ ...d, cells: { ...d.cells, [`${rowId}-${day}`]: value } }));
  }
  return { data, addRow, removeRow, renameRow, moveRow, setCell };
}

function extractTimeFromLabel(label?: string | null): string | null {
  const m = /(\d{1,2}):(\d{2})/.exec(label || '');
  if (!m) return null;
  return m[1].padStart(2, '0') + ':' + m[2];
}

export interface NextClassInfo {
  day: string;
  time: string;
  subject: string;
  isToday: boolean;
}

export function getNextClass(data?: TimetableData | null): NextClassInfo | null {
  if (!data || !data.rows || !data.rows.length) return null;
  const now = new Date();
  const todayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const hhmm = now.toTimeString().slice(0, 5);
  const entries: Array<{ day: string; time: string; subject: string }> = [];
  data.rows.forEach(r => {
    const t = extractTimeFromLabel(r.label);
    if (!t) return;
    WEEK_DAYS.forEach(d => {
      const subj = data.cells[`${r.id}-${d}`];
      if (subj && subj.trim()) entries.push({ day: d, time: t, subject: subj.trim() });
    });
  });
  for (let off = 0; off < 7; off++) {
    const dIdx = (todayIdx + off) % 7;
    const dayLabel = WEEK_DAYS[dIdx];
    const todays = entries.filter(e => e.day === dayLabel).sort((a, b) => a.time.localeCompare(b.time));
    const valid = off === 0 ? todays.filter(e => e.time > hhmm) : todays;
    if (valid.length) return { ...valid[0], isToday: off === 0 };
  }
  return null;
}

// ── TIMER DE FOCO (aba Estudos) ───────────────────────────────────────────────
interface StudyMethod {
  id: 'pomodoro' | '52-17' | 'flowtime';
  name: string;
  focus: number | null;
  brk: number | null;
  desc: string;
}

const STUDY_METHODS: StudyMethod[] = [
  { id: 'pomodoro', name: 'Pomodoro Clássico', focus: 25 * 60, brk: 5 * 60,
    desc: '25 min de foco + 5 min de pausa. Técnica de Francesco Cirillo, uma das mais estudadas e usadas no mundo para manter concentração.' },
  { id: '52-17', name: '52/17 (DeskTime)', focus: 52 * 60, brk: 17 * 60,
    desc: '52 min de foco + 17 min de pausa. Baseado em estudo da DeskTime com os 10% de usuários mais produtivos, que faziam pausas mais longas e regulares.' },
  { id: 'flowtime', name: 'Flowtime', focus: null, brk: null,
    desc: 'Foco livre até você perceber queda de concentração; a pausa é 1/5 do tempo focado. Respeita o ritmo natural de atenção de cada pessoa, sem forçar um bloco fixo.' },
];

const STUDY_METHOD_ICONS: Record<StudyMethod['id'], string> = { pomodoro: 'timer', '52-17': 'clock', flowtime: 'activity' };

export function FocusTimer() {
  const [method, setMethod] = useState<StudyMethod | null>(null);
  const [phase, setPhase] = useState<'focus' | 'break'>('focus');
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (!running || !method) return;
    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        if (method.id === 'flowtime' && phase === 'focus') return s + 1;
        if (method.id === 'flowtime' && phase === 'break') {
          if (s <= 1) { setRunning(false); return 0; }
          return s - 1;
        }
        if (s <= 1) {
          if (phase === 'focus') { setPhase('break'); setCycles(c => c + 1); return method.brk ?? 0; }
          setPhase('focus'); return method.focus ?? 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, method, phase]);

  function chooseMethod(m: StudyMethod) {
    setMethod(m); setPhase('focus'); setCycles(0);
    setSeconds(m.id === 'flowtime' ? 0 : (m.focus ?? 0)); setRunning(true);
  }
  function endFlowFocus() {
    const focused = seconds;
    setPhase('break');
    setSeconds(Math.max(60, Math.round(focused / 5)));
  }
  function reset() { setRunning(false); clearInterval(intervalRef.current); setMethod(null); }
  function fmt(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
  }

  const cardStyle: CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 18 };

  if (!method) return (
    <div style={cardStyle}>
      <h2 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 22, lineHeight: '28px', color: 'var(--text)' }}><Icon name="timer" size={22} style={{ color: 'var(--accent)' }} />Timer de foco</h2>
      <p style={{ margin: '0 0 14px', fontSize: 14, lineHeight: '20px', color: 'var(--muted)' }}>Escolha um dos 3 métodos de estudo com mais respaldo científico:</p>
      {STUDY_METHODS.map(m => (
        <button key={m.id} onClick={() => chooseMethod(m)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 10, cursor: 'pointer', fontFamily: 'inherit', color: 'inherit' }}>
          <span style={{ display: 'inline-flex', flexShrink: 0, color: 'var(--accent)' }}><Glyph name={STUDY_METHOD_ICONS[m.id]} size={26} /></span>
          <span>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-dark)' }}>{m.name}</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 3, lineHeight: 1.45 }}>{m.desc}</div>
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ ...cardStyle, textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted2)', marginBottom: 10 }}><span style={{ display: 'inline-flex', verticalAlign: '-0.2em', marginRight: 6 }}><Glyph name={STUDY_METHOD_ICONS[method.id]} size={16} /></span>{method.name} — {phase === 'focus' ? 'Foco' : 'Pausa'}{cycles > 0 ? ` · ciclo ${cycles + 1}` : ''}</div>
      <div style={{
        width: 170, height: 170, margin: '0 auto 16px', borderRadius: '50%',
        background: phase === 'focus' ? 'var(--accent-soft)' : 'var(--info-soft)',
        border: `3px solid ${phase === 'focus' ? 'var(--accent)' : 'var(--info)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 38, fontWeight: 900, color: phase === 'focus' ? 'var(--accent-dark)' : 'var(--info)', fontVariantNumeric: 'tabular-nums' }}>{fmt(seconds)}</div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setRunning(r => !r)} style={{ ...S.btn(running ? 'var(--surface2)' : 'var(--accent)'), color: running ? 'var(--text)' : 'var(--on-accent)', border: running ? '1px solid var(--border)' : 'none', padding: '10px 22px' }}>{running ? 'Pausar' : 'Retomar'}</button>
        {method.id === 'flowtime' && phase === 'focus' && <button onClick={endFlowFocus} style={{ ...S.btn('var(--info)'), padding: '10px 22px' }}>Ir para pausa</button>}
        <button onClick={reset} style={{ ...S.btn('transparent'), color: 'var(--danger)', border: '1px solid var(--border)', padding: '10px 22px' }}>Encerrar</button>
      </div>
    </div>
  );
}

// ── ABAS EM IFRAME (Estudos, Finanças, Hábitos) ───────────────────────────────
const iframeSrc = (file: string, extra = ''): string => `/${file}?embed=1${extra}`;
const NAV_SPACE = 'calc(76px + env(safe-area-inset-bottom, 0px))';

function useAutoHeight(ref: RefObject<HTMLIFrameElement | null>) {
  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    let ro: ResizeObserver | null = null;
    const fit = () => {
      try {
        const body = frame.contentDocument?.body;
        if (!body) return;
        const h = Math.ceil(body.getBoundingClientRect().height);
        if (h > 0) frame.style.height = h + 'px';
      } catch { /* ignora */ }
    };
    const onLoad = () => {
      fit();
      try {
        ro?.disconnect();
        const body = frame.contentDocument?.body;
        if (body) { ro = new ResizeObserver(fit); ro.observe(body); }
      } catch { /* ignora */ }
    };
    frame.addEventListener('load', onLoad);
    if (frame.contentDocument?.readyState === 'complete') onLoad();
    return () => { frame.removeEventListener('load', onLoad); ro?.disconnect(); };
  }, [ref]);
}

export function StudyTab({ userId, onOpenTimetable }: { userId: string | null; onOpenTimetable: () => void }) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  useAutoHeight(frameRef);
  return (
    <div style={S.wrap}>
      <iframe ref={frameRef} title="Estudos" src={iframeSrc('estudos.html')} scrolling="no"
        style={{ display: 'block', width: '100%', height: '70vh', border: 'none', background: 'var(--bg)' }} />
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '8px 16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FocusTimer />
        <TimetableCard userId={userId} onEdit={onOpenTimetable} />
      </div>
    </div>
  );
}

export function FinanceTab() {
  return (
    <div style={{ ...S.wrap, paddingBottom: 0 }}>
      <iframe title="Finanças" src={iframeSrc('controle-financeiro.html')}
        style={{ display: 'block', width: '100%', height: `calc(100dvh - ${NAV_SPACE})`, border: 'none', background: 'var(--bg)' }} />
    </div>
  );
}

export function HabitsTab({ onHome, onOpenProfile }: { onHome?: () => void; onLogout?: () => void; onOpenProfile?: () => void }) {
  return (
    <div style={{ ...S.wrap, paddingBottom: 0 }}>
      <TopBar title="Hábitos e performance" onBack={onHome} onOpenProfile={onOpenProfile} />
      <iframe title="Hábitos e Performance" src={iframeSrc('my-fit-era.html', '&hideHeader=1')}
        style={{ display: 'block', width: '100%', height: `calc(100dvh - 69px - ${NAV_SPACE})`, border: 'none', background: 'var(--bg)' }} />
    </div>
  );
}

// Grade de horários (somente leitura) — fica na aba Estudos; "Editar" abre a tela completa.
export function TimetableCard({ userId, onEdit }: { userId: string | null; onEdit: () => void }) {
  const { data } = useTimetable(userId);
  const line = '1px solid var(--border)';
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0 4px' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 22, lineHeight: '28px', color: 'var(--text)' }}>Grade de horários</h2>
        {data.rows.length > 0 && <button onClick={onEdit} style={{ height: 44, padding: '0 14px', borderRadius: 12, border: 'none', background: 'var(--accent-soft)', color: 'var(--accent)', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="pencil" size={16} />Editar</button>}
      </div>
      <div style={{ background: 'var(--surface)', border: line, borderRadius: 20, overflow: 'hidden' }}>
        {data.rows.length === 0 ? (
          <EmptyState icon="calendar" title="Monte sua grade da semana"
            text="Cadastre seus horários de aula. A tela inicial passa a mostrar qual é a próxima."
            actionLabel="Montar grade" onAction={onEdit} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 14, tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '16%', padding: '10px 8px', borderBottom: line, textAlign: 'left', background: 'var(--surface2)' }}></th>
                  {WEEK_DAYS.map(d => (
                    <th key={d} style={{ padding: '10px 4px', borderBottom: line, borderLeft: line, color: 'var(--text)', fontWeight: 700, background: 'var(--surface2)' }}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map(r => (
                  <tr key={r.id}>
                    <td className="lp-num" style={{ padding: '10px 8px', fontWeight: 700, color: 'var(--text)', borderTop: line, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</td>
                    {WEEK_DAYS.map(d => (
                      <td key={d} style={{ padding: '10px 4px', borderTop: line, borderLeft: line, color: 'var(--text)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {data.cells[`${r.id}-${d}`] || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

const rowIconBtn: CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 16,
  minWidth: 32,
  minHeight: 32,
  padding: 0,
  color: 'var(--text)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  verticalAlign: 'middle',
  fontFamily: 'inherit',
};

// ── QUADRO DE HORÁRIOS (faculdade) ──────────────────────────────────────────────
export function TimetableScreen({ onHome, userId }: { onHome: () => void; userId: string | null }) {
  const { data, addRow, removeRow, renameRow, moveRow, setCell } = useTimetable(userId);
  const T = HOME_THEME;

  return (
    <div style={S.wrap}>
      <TopBar title="Grade de horários" subtitle="Toque em uma célula para editar" onBack={onHome} />
      <div style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
        <div style={{ overflowX: 'auto', borderRadius: 20, border: `1px solid ${T.line}`, background: 'var(--surface)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 760, tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 8px', background: T.sage, color: T.ink, textAlign: 'left', minWidth: 140 }}>Horário</th>
                {WEEK_DAYS.map(d => (
                  <th key={d} style={{ padding: '10px 4px', background: T.sage, color: T.ink, borderLeft: '1px solid var(--border)', minWidth: 90 }}>{FullDayName(d)}</th>
                ))}
                <th style={{ background: T.sage, width: 90 }}></th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r, ri) => (
                <tr key={r.id} style={{ background: ri % 2 === 0 ? 'var(--accent-soft)' : 'var(--surface)' }}>
                  <td style={{ padding: 2, borderTop: `1px solid ${T.line}` }}>
                    <input value={r.label} onChange={e => renameRow(r.id, e.target.value)}
                      style={{ width: '100%', border: 'none', background: 'transparent', fontWeight: 800, color: T.ink, fontSize: 14, padding: '8px 6px', outline: 'none', boxSizing: 'border-box' }}
                      placeholder="ex: 08:00 - 09:40" />
                  </td>
                  {WEEK_DAYS.map(d => (
                    <td key={d} style={{ padding: 2, borderTop: `1px solid ${T.line}`, borderLeft: `1px solid ${T.line}` }}>
                      <input value={data.cells[`${r.id}-${d}`] || ''} onChange={e => setCell(r.id, d, e.target.value)}
                        style={{ width: '100%', border: 'none', background: 'transparent', color: T.ink, fontSize: 14, padding: '8px 6px', textAlign: 'center', outline: 'none', boxSizing: 'border-box' }}
                        placeholder="—" />
                    </td>
                  ))}
                  <td style={{ padding: 2, borderTop: `1px solid ${T.line}`, whiteSpace: 'nowrap', textAlign: 'center' }}>
                    <button onClick={() => moveRow(r.id, -1)} style={rowIconBtn} title="Mover para cima" aria-label="Mover para cima">↑</button>
                    <button onClick={() => moveRow(r.id, 1)} style={rowIconBtn} title="Mover para baixo" aria-label="Mover para baixo">↓</button>
                    <button onClick={() => removeRow(r.id)} style={{ ...rowIconBtn, color: 'var(--danger)' }} title="Remover linha" aria-label="Remover linha"><Icon name="x" size={18} /></button>
                  </td>
                </tr>
              ))}
              {!data.rows.length && (
                <tr><td colSpan={9} style={{ padding: '24px 10px', textAlign: 'center', color: T.muted, background: 'var(--surface)' }}>Nenhum horário ainda. Toque em "Adicionar linha de horário" para começar.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <button style={{ ...S.btn(), marginTop: 14, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => addRow('')}>
          <Icon name="plus" size={18} stroke={2} />Adicionar linha de horário
        </button>

        <div style={{ fontSize: 14, color: T.muted, marginTop: 12, lineHeight: 1.6 }}>
          Cada linha e cada célula são livres — escreva o rótulo do horário do jeito que quiser (ex: "08:00 - 09:40", "Manhã", "Bloco 1")
          e o nome da disciplina em cada dia. Use os botões ↑ ↓ para reordenar e ✕ para remover uma linha.<br />
          Dica: se o rótulo começar com um horário no formato <b>HH:MM</b>, o balão de Estudos na tela inicial usa isso para calcular a próxima aula automaticamente.
        </div>
      </div>
    </div>
  );
}
