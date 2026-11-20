// src/estudos/EstudosApp.tsx — Módulo nativo de Estudos em React + TypeScript estrito
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Icon } from '../ui';
import { supabase } from '../supabaseClient';
import './estudos.css';

export type StudyEventType = 'prova' | 'trabalho' | 'outro';
export type EstudosSubTab = 'dashboard' | 'materias' | 'estudos' | 'notas' | 'calendario';

export interface EstudosSubject {
  id: string;
  name: string;
  pass: number;
  max: number;
  stages?: number | null;
}

export interface EstudosSession {
  id: string;
  subjectId: string;
  date: string;
  hours: number;
  topic: string;
}

export interface EstudosGrade {
  id: string;
  subjectId: string;
  name: string;
  value: number;
  weight: number;
}

export interface EstudosEvent {
  id: string;
  title: string;
  type: StudyEventType;
  subjectId: string;
  date: string;
  desc: string;
}

export interface EstudosState {
  subjects: EstudosSubject[];
  studies: EstudosSession[];
  grades: EstudosGrade[];
  events: EstudosEvent[];
}

interface SubjectStatus {
  text: string;
  cssClass: '' | 'aprovado' | 'reprovado';
  avg: number;
  needed: number;
}

interface GoogleEventRow {
  id: string;
  dateLabel: string;
  title: string;
}

const EMPTY_STATE: EstudosState = {
  subjects: [],
  studies: [],
  grades: [],
  events: [],
};

const EV_TYPES: readonly StudyEventType[] = ['prova', 'trabalho', 'outro'];
const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function safeType(t?: string | null): StudyEventType {
  return (EV_TYPES as readonly string[]).includes(t || '') ? (t as StudyEventType) : 'outro';
}

function uid(): string {
  return Date.now() + Math.random().toString(36).slice(2, 7);
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(s?: string | null): string {
  const [y, m, d] = String(s || '').split('-');
  if (!y || !m || !d) return String(s || '');
  return `${d}/${m}/${y}`;
}

function normalizeState(raw: unknown): EstudosState {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_STATE };
  const obj = raw as Partial<EstudosState>;
  return {
    subjects: Array.isArray(obj.subjects) ? obj.subjects.map(s => ({ ...s, id: String(s.id), pass: Number(s.pass) || 0, max: Number(s.max) || 10 })) : [],
    studies: Array.isArray(obj.studies) ? obj.studies.map(s => ({ ...s, id: String(s.id), subjectId: String(s.subjectId), hours: Number(s.hours) || 0, topic: s.topic || '' })) : [],
    grades: Array.isArray(obj.grades) ? obj.grades.map(g => ({ ...g, id: String(g.id), subjectId: String(g.subjectId), value: Number(g.value) || 0, weight: Number(g.weight) || 1 })) : [],
    events: Array.isArray(obj.events) ? obj.events.map(e => ({ ...e, id: String(e.id), subjectId: String(e.subjectId || ''), type: safeType(e.type), desc: e.desc || '' })) : [],
  };
}

function readInitialLocalState(userId: string | null): EstudosState {
  try {
    const owner = localStorage.getItem('studyApp_uid');
    if (owner && userId && owner !== userId) return { ...EMPTY_STATE };
    const raw = localStorage.getItem('studyApp');
    if (raw) return normalizeState(JSON.parse(raw));
  } catch { /* ignora */ }
  return { ...EMPTY_STATE };
}

export function computeSubjectStatus(data: EstudosState, subjectId: string): SubjectStatus {
  const subj = data.subjects.find(s => s.id === subjectId);
  if (!subj) return { text: '', cssClass: '', avg: 0, needed: 0 };
  const grades = data.grades.filter(g => g.subjectId === subjectId);
  const stages = subj.stages || null;
  if (!grades.length) {
    const stageInfo = stages ? ` (0/${stages} avaliações lançadas)` : '';
    return { text: `Sem notas. Precisa de ${subj.pass} para passar.${stageInfo}`, cssClass: '', avg: 0, needed: subj.pass };
  }
  const totalWeight = grades.reduce((a, g) => a + (Number(g.weight) || 1), 0);
  const sum = grades.reduce((a, g) => a + (Number(g.value) || 0) * (Number(g.weight) || 1), 0);
  const avg = totalWeight > 0 ? sum / totalWeight : 0;

  if (stages && grades.length < stages) {
    return {
      text: `Média parcial: ${avg.toFixed(2)} (${grades.length}/${stages} avaliações lançadas — o veredito final só aparece depois de todas)`,
      cssClass: '',
      avg,
      needed: 0,
    };
  }
  if (avg >= subj.pass) {
    return { text: `Aprovado! Média final: ${avg.toFixed(2)}`, cssClass: 'aprovado', avg, needed: 0 };
  }
  return { text: `Reprovado. Média final: ${avg.toFixed(2)}`, cssClass: 'reprovado', avg, needed: 0 };
}

function StatusBadge({ status, lightWeight }: { status: SubjectStatus; lightWeight?: boolean }) {
  if (!status.text) return null;
  return (
    <span className="status" style={lightWeight ? { fontWeight: 500 } : undefined}>
      {status.cssClass === 'aprovado' && <Icon name="check" size={18} stroke={2} />}
      {status.cssClass === 'reprovado' && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
        </svg>
      )}
      {status.text}
    </span>
  );
}

async function syncEventToGoogleCalendar(ev: EstudosEvent): Promise<void> {
  try {
    const token = localStorage.getItem('gcal_token');
    if (!token) return;
    const body = {
      summary: `${ev.type === 'prova' ? 'Prova: ' : ''}${ev.title}`,
      description: ev.desc || '',
      start: { date: ev.date },
      end: { date: ev.date },
    };
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.warn('Não foi possível sincronizar este evento com a Google Agenda.');
  } catch (e) {
    console.warn('Falha ao sincronizar com a Google Agenda:', e);
  }
}

export function EstudosApp({ userId, onOpenProfile }: { userId: string | null; onOpenProfile?: () => void }) {
  const [data, setData] = useState<EstudosState>(() => readInitialLocalState(userId));
  const [activeTab, setActiveTab] = useState<EstudosSubTab>('dashboard');
  const [cloudStatus, setCloudStatus] = useState('');
  const [cloudLoaded, setCloudLoaded] = useState(false);

  // Forms state
  const [subjName, setSubjName] = useState('');
  const [subjPass, setSubjPass] = useState('');
  const [subjMax, setSubjMax] = useState('');
  const [subjStages, setSubjStages] = useState('');

  const [studySubject, setStudySubject] = useState('');
  const [studyDate, setStudyDate] = useState(todayStr);
  const [studyHours, setStudyHours] = useState('');
  const [studyTopic, setStudyTopic] = useState('');

  const [gradeSubject, setGradeSubject] = useState('');
  const [gradeName, setGradeName] = useState('');
  const [gradeValue, setGradeValue] = useState('');
  const [gradeWeight, setGradeWeight] = useState('');

  const [evTitle, setEvTitle] = useState('');
  const [evType, setEvType] = useState<StudyEventType>('prova');
  const [evSubject, setEvSubject] = useState('');
  const [evDate, setEvDate] = useState(todayStr);
  const [evDesc, setEvDesc] = useState('');

  // Calendar month navigation
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Search modal
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Google Calendar events
  const [gcalState, setGcalState] = useState<{ status: 'no-token' | 'loading' | 'error' | 'ready'; items: GoogleEventRow[] }>({
    status: 'no-token',
    items: [],
  });

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dataRef = useRef(data);
  dataRef.current = data;

  // Load from Supabase study_data
  useEffect(() => {
    if (!userId) {
      setCloudStatus('Modo offline (só neste navegador)');
      setCloudLoaded(true);
      return;
    }
    let cancelled = false;
    setCloudLoaded(false);

    const lastUid = localStorage.getItem('studyApp_uid');
    if (lastUid && lastUid !== userId) {
      const fresh = { ...EMPTY_STATE };
      setData(fresh);
      try { localStorage.setItem('studyApp', JSON.stringify(fresh)); } catch { /* ignora */ }
    }
    try { localStorage.setItem('studyApp_uid', userId); } catch { /* ignora */ }

    setCloudStatus('Carregando...');
    (async () => {
      try {
        const { data: row, error } = await supabase
          .from('study_data')
          .select('data')
          .eq('user_id', userId)
          .maybeSingle();

        if (cancelled) return;
        if (error) {
          console.error(error);
          setCloudStatus('Modo offline (só neste navegador)');
          setCloudLoaded(true);
          return;
        }
        if (row?.data) {
          const loaded = normalizeState(row.data);
          setData(loaded);
          try { localStorage.setItem('studyApp', JSON.stringify(loaded)); } catch { /* ignora */ }
        }
        setCloudStatus('Sincronizado');
        setCloudLoaded(true);
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        setCloudStatus('Modo offline (só neste navegador)');
        setCloudLoaded(true);
      }
    })();

    return () => { cancelled = true; };
  }, [userId]);

  const persistData = useCallback((next: EstudosState) => {
    setData(next);
    try {
      localStorage.setItem('studyApp', JSON.stringify(next));
      if (userId) localStorage.setItem('studyApp_uid', userId);
    } catch { /* ignora */ }
    if (!userId || !cloudLoaded) return;
    setCloudStatus('Salvando...');
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const { error } = await supabase.from('study_data').upsert({
          user_id: userId,
          data: next,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
        setCloudStatus('Salvo na nuvem');
      } catch (e) {
        console.error(e);
        setCloudStatus('Erro ao salvar na nuvem');
      }
    }, 600);
  }, [userId, cloudLoaded]);

  useEffect(() => () => clearTimeout(saveTimerRef.current), []);

  // Load Google Calendar events when opening calendar tab
  useEffect(() => {
    const token = localStorage.getItem('gcal_token');
    if (!token) {
      setGcalState({ status: 'no-token', items: [] });
      return;
    }
    let cancelled = false;
    setGcalState(prev => ({ ...prev, status: 'loading' }));
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 60).toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start}&timeMax=${end}&singleEvents=true&orderBy=startTime&maxResults=20`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(async res => {
        if (cancelled) return;
        if (!res.ok) { setGcalState({ status: 'error', items: [] }); return; }
        const json = await res.json() as { items?: Array<{ id: string; summary?: string; start?: { dateTime?: string; date?: string } }> };
        const items: GoogleEventRow[] = (json.items || []).map(e => {
          const startStr = e.start?.dateTime || e.start?.date;
          const d = startStr ? new Date(startStr) : null;
          const dateLabel = d
            ? d.toLocaleDateString('pt-BR') + (e.start?.dateTime ? ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '')
            : '-';
          return { id: e.id, dateLabel, title: e.summary || '(sem título)' };
        });
        setGcalState({ status: 'ready', items });
      })
      .catch(() => {
        if (!cancelled) setGcalState({ status: 'error', items: [] });
      });
    return () => { cancelled = true; };
  }, [activeTab]);

  // Escape key closes search
  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSearchOpen(false); };
    document.addEventListener('keydown', onKey);
    setTimeout(() => searchInputRef.current?.focus(), 40);
    return () => document.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  // CRUD actions
  function addSubject() {
    const name = subjName.trim();
    const pass = parseFloat(subjPass);
    const max = parseFloat(subjMax) || 10;
    const stages = parseInt(subjStages, 10);
    if (!name || isNaN(pass)) { alert('Preencha nome e nota mínima!'); return; }
    if (!stages || stages < 1) { alert('Diga quantas avaliações/etapas essa matéria terá!'); return; }
    persistData({
      ...data,
      subjects: [...data.subjects, { id: uid(), name, pass, max, stages }],
    });
    setSubjName(''); setSubjPass(''); setSubjMax(''); setSubjStages('');
  }

  function deleteSubject(id: string) {
    if (!window.confirm('Excluir matéria e todos os dados relacionados?')) return;
    persistData({
      subjects: data.subjects.filter(s => s.id !== id),
      studies: data.studies.filter(s => s.subjectId !== id),
      grades: data.grades.filter(g => g.subjectId !== id),
      events: data.events.filter(e => e.subjectId !== id),
    });
  }

  function addStudy() {
    const hours = parseFloat(studyHours);
    const topic = studyTopic.trim();
    if (!studySubject || !studyDate || isNaN(hours)) { alert('Preencha matéria, data e horas!'); return; }
    persistData({
      ...data,
      studies: [...data.studies, { id: uid(), subjectId: studySubject, date: studyDate, hours, topic }],
    });
    setStudyHours(''); setStudyTopic('');
  }

  function deleteStudy(id: string) {
    persistData({ ...data, studies: data.studies.filter(s => s.id !== id) });
  }

  function addGrade() {
    const name = gradeName.trim();
    const value = parseFloat(gradeValue);
    const weight = parseFloat(gradeWeight) || 1;
    if (!gradeSubject || !name || isNaN(value)) { alert('Preencha todos os campos!'); return; }
    persistData({
      ...data,
      grades: [...data.grades, { id: uid(), subjectId: gradeSubject, name, value, weight }],
    });
    setGradeName(''); setGradeValue('');
  }

  function deleteGrade(id: string) {
    persistData({ ...data, grades: data.grades.filter(g => g.id !== id) });
  }

  function addEvent() {
    const title = evTitle.trim();
    const desc = evDesc.trim();
    if (!title || !evDate) { alert('Preencha título e data!'); return; }
    const newEvent: EstudosEvent = { id: uid(), title, type: evType, subjectId: evSubject, date: evDate, desc };
    persistData({ ...data, events: [...data.events, newEvent] });
    syncEventToGoogleCalendar(newEvent);
    setEvTitle(''); setEvDesc('');
  }

  function deleteEvent(id: string) {
    persistData({ ...data, events: data.events.filter(e => e.id !== id) });
  }

  function changeMonth(delta: number) {
    setCalMonth(prev => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function exportStudyReportPDF() {
    document.body.classList.add('lp-printing-estudos');
    setTimeout(() => {
      window.print();
      setTimeout(() => document.body.classList.remove('lp-printing-estudos'), 300);
    }, 40);
  }

  // Computed dashboard metrics
  const today = todayStr();
  const dashboardStats = useMemo(() => {
    const totalHours = data.studies.reduce((a, s) => a + (Number(s.hours) || 0), 0);
    const nowMs = Date.now();
    const weekHours = data.studies
      .filter(s => {
        const diff = (nowMs - new Date(s.date).getTime()) / 86400000;
        return diff >= 0 && diff <= 7;
      })
      .reduce((a, s) => a + (Number(s.hours) || 0), 0);
    const approved = data.subjects.filter(s => computeSubjectStatus(data, s.id).cssClass === 'aprovado').length;
    const futureEvents = data.events.filter(e => e.date >= today).length;
    const maxSubjectHours = Math.max(
      ...data.subjects.map(s => data.studies.filter(st => st.subjectId === s.id).reduce((a, b) => a + (Number(b.hours) || 0), 0)),
      1
    );
    return { totalHours, weekHours, approved, futureEvents, maxSubjectHours };
  }, [data, today]);

  // Search results
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results: Array<{ id: string; title: string; subtitle: string; value: string; tab: EstudosSubTab }> = [];

    data.subjects.forEach(s => {
      if (s.name.toLowerCase().includes(q)) {
        results.push({ id: 'subj-' + s.id, title: s.name, subtitle: 'Matéria', value: '', tab: 'materias' });
      }
    });
    data.grades.forEach(g => {
      const subj = data.subjects.find(s => s.id === g.subjectId);
      const haystack = `${g.name || ''} ${subj ? subj.name : ''}`.toLowerCase();
      if (haystack.includes(q)) {
        results.push({ id: 'grade-' + g.id, title: g.name, subtitle: `Nota · ${subj ? subj.name : '—'}`, value: String(g.value), tab: 'notas' });
      }
    });
    data.studies.forEach(e => {
      const subj = data.subjects.find(s => s.id === e.subjectId);
      const haystack = `${e.topic || ''} ${subj ? subj.name : ''}`.toLowerCase();
      if (haystack.includes(q)) {
        results.push({ id: 'study-' + e.id, title: e.topic || '(sem tópico)', subtitle: `Estudo · ${subj ? subj.name : '—'} · ${formatDate(e.date)}`, value: `${e.hours}h`, tab: 'estudos' });
      }
    });
    data.events.forEach(e => {
      const subj = data.subjects.find(s => s.id === e.subjectId);
      const haystack = `${e.title || ''} ${e.type || ''} ${subj ? subj.name : ''}`.toLowerCase();
      if (haystack.includes(q)) {
        results.push({ id: 'ev-' + e.id, title: e.title, subtitle: `Evento (${e.type || '—'}) · ${subj ? subj.name : '—'}`, value: formatDate(e.date), tab: 'calendario' });
      }
    });
    return results.slice(0, 50);
  }, [data, searchQuery]);

  // Calendar cells
  const calendarDays = useMemo(() => {
    const { year, month } = calMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const nowD = new Date();
    const cells: Array<{ key: string; dayNum: number | null; isToday: boolean; events: EstudosEvent[] }> = [];
    for (let i = 0; i < firstDay; i++) cells.push({ key: `pad-${i}`, dayNum: null, isToday: false, events: [] });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const evs = data.events.filter(e => e.date === dateStr);
      const isToday = nowD.getFullYear() === year && nowD.getMonth() === month && nowD.getDate() === d;
      cells.push({ key: dateStr, dayNum: d, isToday, events: evs });
    }
    return cells;
  }, [calMonth, data.events]);

  const sortedStudies = useMemo(() => [...data.studies].sort((a, b) => b.date.localeCompare(a.date)), [data.studies]);
  const sortedEvents = useMemo(() => [...data.events].sort((a, b) => a.date.localeCompare(b.date)), [data.events]);
  const upcomingEvents = useMemo(() => sortedEvents.filter(e => e.date >= today), [sortedEvents, today]);

  const tabs: ReadonlyArray<readonly [EstudosSubTab, string]> = [
    ['dashboard', 'Painel'],
    ['materias', 'Matérias'],
    ['estudos', 'Sessões'],
    ['notas', 'Notas'],
    ['calendario', 'Calendário'],
  ];

  return (
    <div className="lp-estudos">
      {/* Relatório para impressão / Salvar como PDF */}
      <div id="estudos-pdf-report">
        <h1>Relatório de Estudos</h1>
        <div className="pdf-subtitle">Gerado em {new Date().toLocaleDateString('pt-BR')} — LifePlan</div>

        <h2>Matérias</h2>
        {!data.subjects.length ? (
          <div className="pdf-empty">Nenhuma matéria cadastrada.</div>
        ) : (
          <table>
            <thead><tr><th>Matéria</th><th>Nota mínima</th><th>Nota máxima</th><th>Etapas</th><th>Situação</th></tr></thead>
            <tbody>
              {data.subjects.map(s => {
                const st = computeSubjectStatus(data, s.id);
                const cls = st.cssClass === 'aprovado' ? 'pdf-ok' : (st.cssClass === 'reprovado' ? 'pdf-bad' : '');
                return (
                  <tr key={s.id}>
                    <td>{s.name}</td><td>{s.pass}</td><td>{s.max}</td><td>{s.stages || '—'}</td><td className={cls}>{st.text}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <h2>Notas</h2>
        {!data.grades.length ? (
          <div className="pdf-empty">Nenhuma nota lançada.</div>
        ) : (
          data.subjects.map(s => {
            const grades = data.grades.filter(g => g.subjectId === s.id);
            if (!grades.length) return null;
            return (
              <div key={s.id}>
                <h3>{s.name}</h3>
                <table>
                  <thead><tr><th>Avaliação</th><th>Nota</th><th>Peso</th></tr></thead>
                  <tbody>
                    {grades.map(g => (
                      <tr key={g.id}><td>{g.name}</td><td>{g.value}</td><td>{g.weight}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })
        )}

        <h2>Histórico de estudos</h2>
        {!data.studies.length ? (
          <div className="pdf-empty">Nenhuma sessão de estudo registrada.</div>
        ) : (
          <table>
            <thead><tr><th>Data</th><th>Matéria</th><th>Horas</th><th>Tópico</th></tr></thead>
            <tbody>
              {sortedStudies.map(e => {
                const subj = data.subjects.find(s => s.id === e.subjectId);
                return (
                  <tr key={e.id}>
                    <td>{formatDate(e.date)}</td><td>{subj ? subj.name : '—'}</td><td>{e.hours}h</td><td>{e.topic || '—'}</td>
                  </tr>
                );
              })}
              <tr><td colSpan={2}><b>Total</b></td><td colSpan={2}><b>{dashboardStats.totalHours}h</b></td></tr>
            </tbody>
          </table>
        )}

        <h2>Próximos eventos</h2>
        {!upcomingEvents.length ? (
          <div className="pdf-empty">Nenhum evento futuro cadastrado.</div>
        ) : (
          <table>
            <thead><tr><th>Data</th><th>Tipo</th><th>Título</th><th>Matéria</th></tr></thead>
            <tbody>
              {upcomingEvents.map(e => {
                const subj = data.subjects.find(s => s.id === e.subjectId);
                return (
                  <tr key={e.id}>
                    <td>{formatDate(e.date)}</td><td>{e.type || '—'}</td><td>{e.title}</td><td>{subj ? subj.name : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Cabeçalho */}
      <header className="est-header">
        <div className="head-row">
          <h1>Estudos</h1>
          {cloudStatus && <span className="cloud-status" role="status">{cloudStatus}</span>}
          <button type="button" className="icon-btn" onClick={() => { setSearchQuery(''); setSearchOpen(true); }} title="Buscar em matérias, notas, estudos e eventos" aria-label="Buscar">
            <Icon name="search" size={22} />
          </button>
          <button type="button" className="icon-btn" onClick={exportStudyReportPDF} title="Baixar um PDF com matérias, notas, estudos e eventos" aria-label="Exportar PDF">
            <Icon name="download" size={22} />
          </button>
          {onOpenProfile && (
            <button type="button" className="icon-btn" onClick={onOpenProfile} title="Perfil e configurações" aria-label="Perfil e configurações" style={{ background: 'var(--accent-soft)', borderRadius: 22 }}>
              <Icon name="user" size={22} />
            </button>
          )}
        </div>
        <nav className="est-nav" role="tablist" aria-label="Seções de estudos">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={activeTab === id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* Painel de busca */}
      {searchOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 60 }}
          onClick={e => { if (e.target === e.currentTarget) setSearchOpen(false); }}
        >
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', width: '92%', maxWidth: 640, maxHeight: '78vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px 8px 16px', borderBottom: '1px solid var(--border)' }}>
              <Icon name="search" size={20} style={{ color: 'var(--muted)' }} />
              <input
                ref={searchInputRef}
                type="text"
                aria-label="Buscar"
                placeholder="Buscar por matéria, avaliação, tópico ou evento..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', boxShadow: 'none', fontSize: 15, color: 'var(--text)' }}
              />
              <button type="button" className="icon-btn" onClick={() => setSearchOpen(false)} aria-label="Fechar busca">
                <Icon name="x" size={22} />
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: '8px 0' }}>
              {!searchQuery.trim() ? (
                <div className="empty">Digite algo para buscar.</div>
              ) : !searchResults.length ? (
                <div className="empty">Nenhum resultado encontrado.</div>
              ) : (
                searchResults.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { setSearchOpen(false); setActiveTab(r.tab); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', minHeight: 52, width: '100%', textAlign: 'left', cursor: 'pointer', background: 'transparent', border: 0, borderBottom: '1px solid var(--border)', borderRadius: 0, color: 'var(--text)', font: 'inherit' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.subtitle}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{r.value}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo principal */}
      <main className="est-main">
        {activeTab === 'dashboard' && (
          <section className="est-panel">
            <div className="grid">
              <div className="stat"><h4>Matérias</h4><p>{data.subjects.length}</p></div>
              <div className="stat"><h4>Total de horas</h4><p>{dashboardStats.totalHours.toFixed(1)}h</p></div>
              <div className="stat"><h4>Horas esta semana</h4><p>{dashboardStats.weekHours.toFixed(1)}h</p></div>
              <div className="stat"><h4>Já aprovado em</h4><p>{dashboardStats.approved}/{data.subjects.length}</p></div>
              <div className="stat"><h4>Avaliações</h4><p>{data.grades.length}</p></div>
              <div className="stat"><h4>Eventos futuros</h4><p>{dashboardStats.futureEvents}</p></div>
            </div>

            <h3>Horas estudadas por matéria</h3>
            {!data.subjects.length ? (
              <div className="empty">
                Cadastre suas matérias e registre as sessões de estudo para ver as horas aqui.<br />
                <button type="button" className="btn" onClick={() => setActiveTab('materias')}>+ Cadastrar primeira matéria</button>
              </div>
            ) : (
              data.subjects.map(s => {
                const h = data.studies.filter(st => st.subjectId === s.id).reduce((a, b) => a + (Number(b.hours) || 0), 0);
                return (
                  <div key={s.id} style={{ margin: '0.6rem 0' }}>
                    <strong>{s.name}</strong> <small>{h.toFixed(1)}h</small>
                    <div className="progress"><div className="progress-bar" style={{ width: `${(h / dashboardStats.maxSubjectHours) * 100}%` }}>{h.toFixed(1)}h</div></div>
                  </div>
                );
              })
            )}

            <h3>Situação nas matérias</h3>
            {!data.subjects.length ? (
              <p className="empty">Aqui aparece, para cada matéria, quanto falta para ser aprovado.</p>
            ) : (
              data.subjects.map(s => {
                const st = computeSubjectStatus(data, s.id);
                return (
                  <div key={s.id} className={`card ${st.cssClass}`}>
                    <strong>{s.name}</strong><br />
                    <StatusBadge status={st} lightWeight />
                  </div>
                );
              })
            )}

            <h3>Próximos eventos</h3>
            {!upcomingEvents.length ? (
              <p className="empty">Nenhum evento futuro.</p>
            ) : (
              upcomingEvents.slice(0, 5).map(e => {
                const subj = data.subjects.find(x => x.id === e.subjectId);
                return (
                  <div key={e.id} className="card">
                    <span className={`badge ${safeType(e.type)}`}>{safeType(e.type)}</span>{' '}
                    <strong>{e.title}</strong> — {formatDate(e.date)} {subj ? `(${subj.name})` : ''}
                  </div>
                );
              })
            )}
          </section>
        )}

        {activeTab === 'materias' && (
          <section className="est-panel">
            <h2>Minhas matérias</h2>
            <div className="form-row">
              <input type="text" aria-label="Nome da matéria" placeholder="Nome da matéria (ex: Matemática)" value={subjName} onChange={e => setSubjName(e.target.value)} />
              <input type="number" aria-label="Nota mínima" placeholder="Nota mínima p/ passar (ex: 7)" step="0.1" min="0" value={subjPass} onChange={e => setSubjPass(e.target.value)} />
              <input type="number" aria-label="Nota máxima" placeholder="Nota máxima (ex: 10)" step="0.1" min="0" value={subjMax} onChange={e => setSubjMax(e.target.value)} />
              <input type="number" aria-label="Quantidade de avaliações" placeholder="Quantas avaliações/etapas?" step="1" min="1" value={subjStages} onChange={e => setSubjStages(e.target.value)} />
              <button type="button" className="btn" onClick={addSubject}>+ Adicionar matéria</button>
            </div>
            {!data.subjects.length ? (
              <p className="empty">Nenhuma matéria cadastrada.</p>
            ) : (
              data.subjects.map(s => {
                const status = computeSubjectStatus(data, s.id);
                return (
                  <div key={s.id} className={`card ${status.cssClass}`}>
                    <div className="card-header">
                      <div>
                        <strong>{s.name}</strong><br />
                        <small>Nota mínima: {s.pass} | Máxima: {s.max}</small><br />
                        <StatusBadge status={status} />
                      </div>
                      <button type="button" className="btn btn-danger" onClick={() => deleteSubject(s.id)}>Excluir</button>
                    </div>
                  </div>
                );
              })
            )}
          </section>
        )}

        {activeTab === 'estudos' && (
          <section className="est-panel">
            <h2>Sessões de estudo</h2>
            <div className="form-row">
              <select aria-label="Matéria" value={studySubject} onChange={e => setStudySubject(e.target.value)}>
                <option value="">-- Selecione --</option>
                {data.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input type="date" aria-label="Data" value={studyDate} onChange={e => setStudyDate(e.target.value)} />
              <input type="number" aria-label="Horas estudadas" placeholder="Horas estudadas" step="0.25" min="0" value={studyHours} onChange={e => setStudyHours(e.target.value)} />
              <input type="text" aria-label="O que estudou" placeholder="O que estudou?" value={studyTopic} onChange={e => setStudyTopic(e.target.value)} />
              <button type="button" className="btn" onClick={addStudy}>+ Registrar</button>
            </div>
            {!sortedStudies.length ? (
              <p className="empty">Nenhuma sessão registrada. Preencha a matéria, a data e as horas acima.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Data</th><th>Matéria</th><th>Horas</th><th>Tópico</th><th></th></tr></thead>
                  <tbody>
                    {sortedStudies.map(s => {
                      const subj = data.subjects.find(x => x.id === s.subjectId);
                      return (
                        <tr key={s.id}>
                          <td>{formatDate(s.date)}</td>
                          <td>{subj ? subj.name : '?'}</td>
                          <td>{s.hours}h</td>
                          <td>{s.topic || '-'}</td>
                          <td><button type="button" className="btn btn-danger btn-sm" aria-label="Excluir registro" onClick={() => deleteStudy(s.id)}>Excluir</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === 'notas' && (
          <section className="est-panel">
            <h2>Notas e aprovação</h2>
            <div className="form-row">
              <select aria-label="Matéria" value={gradeSubject} onChange={e => setGradeSubject(e.target.value)}>
                <option value="">-- Selecione --</option>
                {data.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input type="text" aria-label="Nome da avaliação" placeholder="Nome da avaliação (ex: Prova 1)" value={gradeName} onChange={e => setGradeName(e.target.value)} />
              <input type="number" aria-label="Nota obtida" placeholder="Nota obtida" step="0.1" min="0" value={gradeValue} onChange={e => setGradeValue(e.target.value)} />
              <input type="number" aria-label="Peso" placeholder="Peso" step="0.1" min="0" value={gradeWeight} onChange={e => setGradeWeight(e.target.value)} />
              <button type="button" className="btn" onClick={addGrade}>+ Adicionar nota</button>
            </div>
            {!data.subjects.length ? (
              <p className="empty">Cadastre uma matéria primeiro.</p>
            ) : (
              data.subjects.map(subj => {
                const grades = data.grades.filter(g => g.subjectId === subj.id);
                const status = computeSubjectStatus(data, subj.id);
                const progress = subj.pass > 0 ? Math.min(100, (status.avg / subj.pass) * 100) : 0;
                return (
                  <div key={subj.id} className={`card ${status.cssClass}`}>
                    <h3 style={{ marginTop: 0 }}>{subj.name}</h3>
                    <p><StatusBadge status={status} /></p>
                    <div className="progress"><div className="progress-bar" style={{ width: `${progress}%` }}>{status.avg ? status.avg.toFixed(2) : '0'}</div></div>
                    {grades.length ? (
                      <div className="table-wrap">
                        <table>
                          <thead><tr><th>Avaliação</th><th>Nota</th><th>Peso</th><th></th></tr></thead>
                          <tbody>
                            {grades.map(g => (
                              <tr key={g.id}>
                                <td>{g.name}</td>
                                <td>{g.value}</td>
                                <td>{g.weight}</td>
                                <td><button type="button" className="btn btn-danger btn-sm" aria-label="Excluir nota" onClick={() => deleteGrade(g.id)}>Excluir</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <small>Nenhuma nota lançada.</small>}
                  </div>
                );
              })
            )}
          </section>
        )}

        {activeTab === 'calendario' && (
          <section className="est-panel">
            <h2>Calendário de provas e trabalhos</h2>
            <div className="form-row">
              <input type="text" aria-label="Título do evento" placeholder="Título do evento" value={evTitle} onChange={e => setEvTitle(e.target.value)} />
              <select aria-label="Tipo" value={evType} onChange={e => setEvType(e.target.value as StudyEventType)}>
                <option value="prova">Prova</option>
                <option value="trabalho">Trabalho</option>
                <option value="outro">Outro</option>
              </select>
              <select aria-label="Matéria" value={evSubject} onChange={e => setEvSubject(e.target.value)}>
                <option value="">-- Sem matéria --</option>
                {data.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input type="date" aria-label="Data" value={evDate} onChange={e => setEvDate(e.target.value)} />
              <input type="text" aria-label="Descrição" placeholder="Descrição (opcional)" value={evDesc} onChange={e => setEvDesc(e.target.value)} />
              <button type="button" className="btn" onClick={addEvent}>+ Adicionar evento</button>
            </div>

            <div className="calendar-header">
              <button type="button" className="btn btn-ghost" onClick={() => changeMonth(-1)} aria-label="Mês anterior">&larr; <span className="btn-label">Anterior</span></button>
              <h3>{MONTHS_PT[calMonth.month]} {calMonth.year}</h3>
              <button type="button" className="btn btn-ghost" onClick={() => changeMonth(1)} aria-label="Próximo mês"><span className="btn-label">Próximo</span> &rarr;</button>
            </div>

            <div className="calendar">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <div key={d} className="day-name">{d}</div>)}
              {calendarDays.map(cell => cell.dayNum === null ? (
                <div key={cell.key} />
              ) : (
                <div
                  key={cell.key}
                  className={`day${cell.events.length ? ' has-event' : ''}${cell.isToday ? ' today' : ''}`}
                  title={cell.events.map(e => e.title).join(', ')}
                >
                  <span className="num">{cell.dayNum}</span>
                  {cell.events.map(e => (
                    <div key={e.id}><span className={`badge ${safeType(e.type)}`}>{String(e.title).slice(0, 15)}</span></div>
                  ))}
                </div>
              ))}
            </div>

            <h3>Lista de eventos</h3>
            {!sortedEvents.length ? (
              <p className="empty">Nenhuma prova ou trabalho marcado. Adicione o primeiro acima.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Data</th><th>Tipo</th><th>Título</th><th>Matéria</th><th>Descrição</th><th></th></tr></thead>
                  <tbody>
                    {sortedEvents.map(e => {
                      const subj = data.subjects.find(x => x.id === e.subjectId);
                      return (
                        <tr key={e.id}>
                          <td>{formatDate(e.date)}</td>
                          <td><span className={`badge ${safeType(e.type)}`}>{safeType(e.type)}</span></td>
                          <td>{e.title}</td>
                          <td>{subj ? subj.name : '-'}</td>
                          <td>{e.desc || '-'}</td>
                          <td><button type="button" className="btn btn-danger btn-sm" aria-label="Excluir evento" onClick={() => deleteEvent(e.id)}>Excluir</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <h3>Eventos da Google Agenda</h3>
            {gcalState.status === 'no-token' ? (
              <p className="empty">Conecte a Google Agenda na tela Início do LifePlan para ver seus eventos aqui.</p>
            ) : gcalState.status === 'loading' ? (
              <p className="empty">Carregando eventos da Google Agenda...</p>
            ) : gcalState.status === 'error' ? (
              <p className="empty">Não foi possível carregar os eventos do Google agora.</p>
            ) : !gcalState.items.length ? (
              <p className="empty">Nenhum evento futuro na sua Google Agenda.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Data</th><th>Título</th></tr></thead>
                  <tbody>
                    {gcalState.items.map(item => (
                      <tr key={item.id}><td>{item.dateLabel}</td><td>{item.title}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
