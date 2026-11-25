// src/HomeDashboard.tsx — Tela inicial (Clima, Consulta do Dia, Resumo Semanal, Água, Finanças, Agenda)
import { useState, useMemo, useRef, useEffect, type CSSProperties, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { Icon } from './ui';
import { getPrivacy } from './privacySettings';
import { NotificationBell } from './Notifications';
import { ThemeToggleButton } from './ThemeToggle';
import { resumoSemanal } from './weeklySummary';
import { cruzarSaudeDinheiro, type CruzamentoSaudeDinheiro } from './crossInsights';
import { supabase, fetchUserPlanData, extractPlanDays } from './supabaseClient';
import { readScopedLocal, registerPlanDataField, requestPlanDataSave } from './planDataQueue';
import { cfComputeGastoCategoria, cfGetDebitosTotal, cfGetTableTotal } from './financeFormulas';
import { useTimetable, getNextClass } from './StudyAndSchedule';
import { HOME_THEME } from './styles';
import { Button } from './uiKit';
import { isScheduled, getHabitRecord, toLocalISODate } from './habitos/habitsStorage';
import type { HabitsDatabase } from './habitos/habitsTypes';
import type {
  FinanceState,
  HabitsDb,
  ManualAgendaItem,
  MealPlanDay,
  ScreenId,
  StudyData,
  WaterData,
  WorkoutLog,
} from './types';

// ── CONFIGURAÇÃO GOOGLE (login + agenda) ──────────────────────────────────────
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/calendar.events';

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const existing = document.getElementById('gsi-script');
    if (existing) { existing.addEventListener('load', () => resolve()); return; }
    const s = document.createElement('script');
    s.id = 'gsi-script'; s.src = 'https://accounts.google.com/gsi/client';
    s.async = true; s.defer = true;
    s.onload = () => resolve(); s.onerror = reject;
    document.head.appendChild(s);
  });
}

interface GoogleTokenClient {
  requestAccessToken(overrideConfig?: { prompt?: string }): void;
}

export function useGoogleCalendar() {
  const [events, setEvents] = useState<ManualAgendaItem[]>([]);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<'idle' | 'no-key' | 'connected'>(GOOGLE_CLIENT_ID ? 'idle' : 'no-key');
  const tokenClient = useRef<GoogleTokenClient | null>(null);
  const isSilentAttempt = useRef(false);

  function saveToken(accessToken: string, expiresInSec?: number) {
    localStorage.setItem('gcal_token', accessToken);
    localStorage.setItem('gcal_token_expiry', String(Date.now() + ((expiresInSec || 3500) * 1000)));
  }
  function clearToken() {
    localStorage.removeItem('gcal_token');
    localStorage.removeItem('gcal_token_expiry');
    setConnected(false); setStatus('idle');
  }

  async function ensureTokenClient(): Promise<GoogleTokenClient | null> {
    await loadGoogleScript();
    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) return null;
    if (!tokenClient.current) {
      tokenClient.current = oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_SCOPES,
        callback: (resp) => {
          if (resp?.access_token) {
            setConnected(true); setStatus('connected');
            saveToken(resp.access_token, resp.expires_in);
            fetchUpcomingEvents(resp.access_token);
          } else if (!isSilentAttempt.current) {
            clearToken();
          }
        },
        error_callback: () => {
          if (!isSilentAttempt.current) clearToken();
        },
      });
    }
    return tokenClient.current;
  }

  async function trySilentRefresh() {
    if (!GOOGLE_CLIENT_ID) return;
    const client = await ensureTokenClient();
    if (!client) return;
    isSilentAttempt.current = true;
    client.requestAccessToken({ prompt: '' });
    setTimeout(() => { isSilentAttempt.current = false; }, 4000);
  }

  async function fetchUpcomingEvents(accessToken: string) {
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString();
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start}&timeMax=${end}&singleEvents=true&orderBy=startTime&maxResults=15`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.status === 401 || res.status === 403) {
        trySilentRefresh();
        return;
      }
      if (!res.ok) return;
      const data = await res.json() as {
        items?: Array<{ id: string; summary?: string; start?: { dateTime?: string; date?: string } }>;
      };
      const todayStr = now.toDateString();
      setEvents((data.items || []).map(e => {
        const startStr = e.start?.dateTime || e.start?.date;
        const d = startStr ? new Date(startStr) : null;
        const isToday = d && d.toDateString() === todayStr;
        const time = (!e.start?.dateTime || !d)
          ? 'Dia todo'
          : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const label = isToday ? time : d ? `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} · ${time}` : time;
        return { id: e.id, title: e.summary || '(sem título)', time: label };
      }));
    } catch {
      // falha de rede/temporária — mantém conectado, só não atualiza agora
    }
  }

  async function connect() {
    if (!GOOGLE_CLIENT_ID) { setStatus('no-key'); return; }
    isSilentAttempt.current = false;
    const client = await ensureTokenClient();
    client?.requestAccessToken();
  }

  useEffect(() => {
    const t = localStorage.getItem('gcal_token');
    const expiry = parseInt(localStorage.getItem('gcal_token_expiry') || '0', 10);
    if (t && GOOGLE_CLIENT_ID) {
      setConnected(true); setStatus('connected');
      if (Date.now() < expiry - 60000) fetchUpcomingEvents(t);
      else trySilentRefresh();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { events, connected, status, connect };
}

// Meta de água personalizável (reseta o consumo do dia automaticamente à meia-noite).
export function useWaterTracker(userId: string | null) {
  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const [data, setData] = useState<WaterData>(() => {
    try {
      const owner = localStorage.getItem('water_v1_uid');
      if (owner && userId && owner !== userId) return { date: todayKey(), goal: 2000, current: 0 };
      const raw = JSON.parse(localStorage.getItem('water_v1') || 'null') as WaterData | null;
      if (raw && raw.date === todayKey()) return raw;
    } catch { /* ignora */ }
    return { date: todayKey(), goal: 2000, current: 0 };
  });

  useEffect(() => {
    try {
      localStorage.setItem('water_v1', JSON.stringify(data));
      if (userId) localStorage.setItem('water_v1_uid', userId);
    } catch { /* ignora */ }
  }, [data, userId]);

  const [waterLoaded, setWaterLoaded] = useState(false);
  useEffect(() => {
    if (!userId) return;
    fetchUserPlanData(userId).then(pd => {
      const cloud = pd?.water;
      if (cloud && cloud.date === todayKey()) setData(cloud);
      else if (cloud) setData(d => ({ ...d, goal: cloud.goal || d.goal }));
    }).catch(() => {}).finally(() => setWaterLoaded(true));
  }, [userId]);

  const dataRef = useRef(data);
  dataRef.current = data;
  useEffect(() => {
    if (!userId) return;
    return registerPlanDataField('water', () => dataRef.current);
  }, [userId]);

  useEffect(() => {
    if (!userId || !waterLoaded) return;
    const t = setTimeout(() => requestPlanDataSave(userId), 400);
    return () => { clearTimeout(t); requestPlanDataSave(userId); };
  }, [data, userId, waterLoaded]);

  useEffect(() => {
    const t = setInterval(() => {
      const key = todayKey();
      setData(d => d.date === key ? d : { date: key, goal: d.goal, current: 0 });
    }, 60000);
    return () => clearInterval(t);
  }, []);

  function add(ml: number) { setData(d => ({ ...d, current: Math.max(0, d.current + ml) })); }
  function setGoal(g: number) { setData(d => ({ ...d, goal: g })); }
  return { data, add, setGoal };
}

export function useManualAgenda(userId: string | null) {
  const [items, setItems] = useState<ManualAgendaItem[]>(() => {
    try {
      const owner = localStorage.getItem('agenda_manual_uid');
      if (owner && userId && owner !== userId) return [];
      return (JSON.parse(localStorage.getItem('agenda_manual') || 'null') as ManualAgendaItem[] | null) || [];
    } catch { return []; }
  });

  useEffect(() => {
    try {
      localStorage.setItem('agenda_manual', JSON.stringify(items));
      if (userId) localStorage.setItem('agenda_manual_uid', userId);
    } catch { /* ignora */ }
  }, [items, userId]);

  const [agendaLoaded, setAgendaLoaded] = useState(false);
  useEffect(() => {
    if (!userId) return;
    fetchUserPlanData(userId).then(pd => {
      if (Array.isArray(pd?.agendaManual)) setItems(pd.agendaManual);
    }).catch(() => {}).finally(() => setAgendaLoaded(true));
  }, [userId]);

  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => {
    if (!userId) return;
    return registerPlanDataField('agendaManual', () => itemsRef.current);
  }, [userId]);

  useEffect(() => {
    if (!userId || !agendaLoaded) return;
    const t = setTimeout(() => requestPlanDataSave(userId), 400);
    return () => { clearTimeout(t); requestPlanDataSave(userId); };
  }, [items, userId, agendaLoaded]);

  function add(title: string, time: string) {
    setItems(p => [...p, { id: 'm' + Date.now(), title, time }].sort((a, b) => String(a.time).localeCompare(String(b.time))));
  }
  function remove(id: string) { setItems(p => p.filter(i => i.id !== id)); }
  return { items, add, remove };
}

export function useClock(): Date {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000 * 20); return () => clearInterval(t); }, []);
  return now;
}

// ── CONFIGURAÇÃO GOOGLE WEATHER API ───────────────────────────────────────────
const GOOGLE_WEATHER_API_KEY = import.meta.env.VITE_GOOGLE_WEATHER_API_KEY || '';

interface WeatherState {
  loading: boolean;
  temp: number | null;
  city: string | null;
  error: string | null;
  code: string | number | null;
  iconUri: string | null;
  isDay: number;
  uvMax: number | null;
  rain: { active: boolean; starts: string | null; stops: string | null } | null;
  sunrise: string | null;
  sunset: string | null;
  tempTrend: { delta: number; rising: boolean } | null;
}

export function useWeatherLocation() {
  const [state, setState] = useState<WeatherState>({
    loading: true, temp: null, city: null, error: null, code: null, iconUri: null,
    isDay: 1, uvMax: null, rain: null, sunrise: null, sunset: null, tempTrend: null,
  });
  const [attempt, setAttempt] = useState(0);
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem('lifeplan_hide_weather') === '1'; } catch { return false; }
  });

  useEffect(() => {
    if (hidden) return;
    setState(s => ({ ...s, loading: true, error: null }));
    if (!navigator.geolocation) {
      setState(s => ({ ...s, loading: false, error: 'Seu navegador não informa a localização, então o clima fica de fora.' }));
      return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        if (GOOGLE_WEATHER_API_KEY) await fetchFromGoogleWeather(latitude, longitude, setState);
        else await fetchFromOpenMeteo(latitude, longitude, setState);
      } catch { setState(s => ({ ...s, loading: false, error: 'Falha ao buscar o clima' })); }
    }, (err) => {
      setState(s => ({
        ...s,
        loading: false,
        error: err?.code === 1
          ? 'Permita a localização para ver o clima e o aviso de chuva de hoje.'
          : 'Não consegui achar sua localização agora.',
      }));
    }, { timeout: 8000 });
  }, [attempt, hidden]);

  const retry = () => setAttempt(a => a + 1);
  const hide = () => { try { localStorage.setItem('lifeplan_hide_weather', '1'); } catch { /* ignora */ } setHidden(true); };
  return { ...state, hidden, retry, hide };
}

async function fetchFromGoogleWeather(latitude: number, longitude: number, setState: Dispatch<SetStateAction<WeatherState>>) {
  const key = GOOGLE_WEATHER_API_KEY;
  const base = 'https://weather.googleapis.com/v1';
  const loc = `location.latitude=${latitude}&location.longitude=${longitude}`;
  const [curRes, daysRes, hoursRes, geoRes] = await Promise.all([
    fetch(`${base}/currentConditions:lookup?key=${key}&${loc}&languageCode=pt-BR`),
    fetch(`${base}/forecast/days:lookup?key=${key}&${loc}&days=1&languageCode=pt-BR`),
    fetch(`${base}/forecast/hours:lookup?key=${key}&${loc}&hours=18&languageCode=pt-BR`),
    fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`),
  ]);
  if (!curRes.ok) {
    await fetchFromOpenMeteo(latitude, longitude, setState);
    return;
  }
  const cur = await curRes.json();
  const daysData = daysRes.ok ? await daysRes.json() : null;
  const hoursData = hoursRes.ok ? await hoursRes.json() : null;
  const geo = await geoRes.json();

  const today = daysData?.forecastDays?.[0];
  const fmtHM = (iso?: string | null) => iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;
  const sunrise = fmtHM(today?.sunEvents?.sunriseTime);
  const sunset = fmtHM(today?.sunEvents?.sunsetTime);
  const uvMax: number | null = today?.daytimeForecast?.uvIndex ?? cur.uvIndex ?? null;

  let rain: WeatherState['rain'] = null;
  const hours: Array<{ precipitation?: { probability?: { percent?: number } }; interval?: { startTime?: string }; temperature?: { degrees?: number } }> = hoursData?.forecastHours || [];
  const THRESH = 50;
  let startIdx = -1;
  for (let i = 0; i < hours.length; i++) {
    if ((hours[i]?.precipitation?.probability?.percent || 0) >= THRESH) { startIdx = i; break; }
  }
  if (startIdx >= 0) {
    let endIdx = startIdx;
    for (let i = startIdx; i < hours.length; i++) {
      if ((hours[i]?.precipitation?.probability?.percent || 0) >= THRESH) endIdx = i; else break;
    }
    const fmtHour = (h?: typeof hours[number]) => h?.interval?.startTime ? fmtHM(h.interval.startTime) : '';
    rain = { active: startIdx === 0, starts: fmtHour(hours[startIdx]), stops: fmtHour(hours[Math.min(endIdx + 1, hours.length - 1)]) };
  }

  let tempTrend: WeatherState['tempTrend'] = null;
  if (hours.length > 2 && cur.temperature?.degrees != null && hours[2]?.temperature?.degrees != null) {
    const delta = hours[2].temperature.degrees - cur.temperature.degrees;
    if (Math.abs(delta) >= 3) tempTrend = { delta: Math.round(delta), rising: delta > 0 };
  }

  setState({
    loading: false, error: null,
    temp: Math.round(cur.temperature?.degrees),
    city: geo?.city || geo?.locality || geo?.principalSubdivision || 'Local desconhecido',
    code: cur.weatherCondition?.type || null,
    iconUri: cur.weatherCondition?.iconBaseUri || null,
    isDay: cur.isDaytime ? 1 : 0,
    uvMax, sunrise, sunset, tempTrend, rain,
  });
}

async function fetchFromOpenMeteo(latitude: number, longitude: number, setState: Dispatch<SetStateAction<WeatherState>>) {
  const [wRes, gRes] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=precipitation_probability,temperature_2m&daily=uv_index_max,sunrise,sunset&timezone=auto`),
    fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`),
  ]);
  const wData = await wRes.json();
  const gData = await gRes.json();

  let rain: WeatherState['rain'] = null;
  const times: string[] = wData?.hourly?.time || [];
  const probs: number[] = wData?.hourly?.precipitation_probability || [];
  const temps: number[] = wData?.hourly?.temperature_2m || [];
  const nowMs = Date.now();
  const nowIdx = times.findIndex(t => new Date(t).getTime() >= nowMs);
  if (nowIdx >= 0) {
    const THRESH = 50;
    let startIdx = -1;
    for (let i = nowIdx; i < Math.min(times.length, nowIdx + 18); i++) {
      if (probs[i] >= THRESH) { startIdx = i; break; }
    }
    if (startIdx >= 0) {
      let endIdx = startIdx;
      for (let i = startIdx; i < Math.min(times.length, startIdx + 18); i++) {
        if (probs[i] >= THRESH) endIdx = i; else break;
      }
      const fmt = (t: string) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      rain = { active: startIdx === nowIdx, starts: fmt(times[startIdx]), stops: fmt(times[Math.min(endIdx + 1, times.length - 1)]) };
    }
  }

  let tempTrend: WeatherState['tempTrend'] = null;
  if (nowIdx >= 0 && temps.length > nowIdx + 2) {
    const nowTemp = wData?.current_weather?.temperature;
    const futureTemp = temps[nowIdx + 2];
    const delta = futureTemp - nowTemp;
    if (Math.abs(delta) >= 3) tempTrend = { delta: Math.round(delta), rising: delta > 0 };
  }

  const fmtHM = (iso?: string | null) => iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;

  setState({
    loading: false, error: null,
    temp: Math.round(wData?.current_weather?.temperature),
    city: gData?.city || gData?.locality || gData?.principalSubdivision || 'Local desconhecido',
    code: wData?.current_weather?.weathercode ?? 0,
    iconUri: null,
    isDay: wData?.current_weather?.is_day ?? 1,
    uvMax: wData?.daily?.uv_index_max?.[0] ?? null,
    sunrise: fmtHM(wData?.daily?.sunrise?.[0]),
    sunset: fmtHM(wData?.daily?.sunset?.[0]),
    tempTrend, rain,
  });
}

function uvInfo(uv: number | null): { label: string; color: string } | null {
  if (uv == null) return null;
  if (uv >= 11) return { label: 'Extremo', color: 'var(--danger)' };
  if (uv >= 8) return { label: 'Muito alto', color: 'var(--danger)' };
  if (uv >= 6) return { label: 'Alto', color: 'var(--warning)' };
  if (uv >= 3) return { label: 'Moderado', color: 'var(--warning)' };
  return { label: 'Baixo', color: 'var(--success)' };
}

export function localDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface NextMealInfo {
  name: string;
  time: string;
  when: 'hoje' | 'amanhã';
}

export function getNextMeal(day?: MealPlanDay | null): NextMealInfo | null {
  if (!day || !day.meals || !day.meals.length) return null;
  const now = new Date();
  const hhmm = now.toTimeString().slice(0, 5);
  const sorted = [...day.meals].sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
  const upcoming = sorted.find(m => String(m.time || '') > hhmm);
  if (upcoming) return { name: upcoming.name, time: upcoming.time, when: 'hoje' };
  return { name: sorted[0].name, time: sorted[0].time, when: 'amanhã' };
}

export function getNextExam(userId: string | null): { title?: string; subject?: string; date: string } | null {
  try {
    const data = readScopedLocal<StudyData>('studyApp', userId);
    if (!data?.events) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const provas = data.events
      .filter((e): e is NonNullable<typeof e> & { date: string } => e.type === 'prova' && !!e.date)
      .map(e => ({ ...e, d: new Date(e.date + 'T00:00:00') }))
      .filter(e => e.d >= today)
      .sort((a, b) => a.d.getTime() - b.d.getTime());
    if (!provas.length) return null;
    const subj = (data.subjects || []).find(s => s.id === provas[0].subjectId);
    return { title: provas[0].title, subject: subj?.name || provas[0].title, date: provas[0].d.toLocaleDateString('pt-BR') };
  } catch { return null; }
}

export function getSaldoPreview(userId: string | null): number | null {
  try {
    const state = readScopedLocal<FinanceState>('cf_state', userId);
    if (!state?.balancoTables) return null;
    let saldoFinal = 0;
    state.balancoTables.forEach(t => {
      if (!t.includeInSaldo || !t.sign) return;
      saldoFinal += cfGetTableTotal(state, t) * t.sign;
    });
    return saldoFinal - cfGetDebitosTotal(state);
  } catch { return null; }
}

export interface PlanejamentoPreviewRow {
  categoria: string;
  profileName: string;
  valor: number;
  gasto: number;
}

export function getPlanejamentoPreview(userId: string | null): PlanejamentoPreviewRow[] | null {
  try {
    const state = readScopedLocal<FinanceState>('cf_state', userId);
    if (!state?.balancoTables) return null;
    const planTable = state.balancoTables.find(t => t.type === 'planejamento');
    if (!planTable) return null;
    const rows = (planTable.rows || [])
      .filter((r): r is typeof r & { categoria: string; profileIdx: number } => !!r.categoria && r.profileIdx != null)
      .map(r => {
        const pEntry = state.profiles?.[r.profileIdx];
        const profileName = (typeof pEntry === 'object' ? pEntry?.name : pEntry) || '—';
        return {
          categoria: r.categoria,
          profileName,
          valor: parseFloat(String(r.valor ?? 0)) || 0,
          gasto: cfComputeGastoCategoria(state, r.profileIdx, r.categoria),
        };
      });
    return rows.length ? rows : null;
  } catch { return null; }
}

export function BudgetChartPreview({ userId }: { userId: string | null }) {
  const rows = getPlanejamentoPreview(userId);
  if (!rows) return null;
  const T = HOME_THEME;
  const maxVal = Math.max(1, ...rows.map(r => Math.max(r.valor, r.gasto)));
  const chartH = 110;
  return (
    <div style={{ border: `1px solid ${T.line}`, borderRadius: 20, overflow: 'hidden', background: T.card }}>
      <div style={{ padding: '16px 16px 0' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 20, lineHeight: '26px', color: T.ink }}>Orçamento do mês</h2>
      </div>
      <div style={{ padding: '16px 12px', background: T.card, overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end', minWidth: 'min-content' }}>
          {rows.map((r, i) => {
            const expH = Math.round(r.valor / maxVal * chartH);
            const gasH = Math.round(r.gasto / maxVal * chartH);
            const over = r.gasto > r.valor;
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 64 }}>
                <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end', height: chartH }}>
                  <div title={`Expectativa: R$ ${r.valor.toFixed(2)}`} style={{ width: 18, height: Math.max(2, expH), background: T.sageDark, opacity: 0.5, borderRadius: '4px 4px 0 0' }} />
                  <div title={`Gasto: R$ ${r.gasto.toFixed(2)}`} style={{ width: 18, height: Math.max(2, gasH), background: over ? 'var(--warning)' : T.sageDark, borderRadius: '4px 4px 0 0' }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.ink, textAlign: 'center', marginTop: 6, maxWidth: 70, overflowWrap: 'break-word' }}>{r.categoria}</div>
                <div style={{ fontSize: 12, color: T.muted, textAlign: 'center' }}>{r.profileName}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 12, color: T.muted, marginTop: 14, flexWrap: 'wrap' }}>
          <span><span style={{ display: 'inline-block', width: 9, height: 9, background: T.sageDark, opacity: 0.5, borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }} />Expectativa</span>
          <span><span style={{ display: 'inline-block', width: 9, height: 9, background: T.sageDark, borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }} />Gasto</span>
          <span><span style={{ display: 'inline-block', width: 9, height: 9, background: 'var(--warning)', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }} />Estourou</span>
        </div>
      </div>
    </div>
  );
}

export interface HomeDashboardProps {
  userId: string | null;
  onNavigate: (screen: ScreenId) => void;
  onOpenProfile: () => void;
  onLogout?: () => void;
  onOpenTimetable?: () => void;
}

export function HomeDashboard({ userId, onNavigate, onOpenProfile }: HomeDashboardProps) {
  const now = useClock();
  const weather = useWeatherLocation();
  const gcal = useGoogleCalendar();
  const manual = useManualAgenda(userId);
  const { data: timetableData } = useTimetable(userId);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [planPreview, setPlanPreview] = useState<{ typeLabel: string; nextMeal: NextMealInfo | null } | null>(null);
  const [shoppingCount, setShoppingCount] = useState<number | null>(null);
  const [saldoVisible, setSaldoVisible] = useState(() => !getPrivacy().hideValues);

  useEffect(() => {
    const h = () => setSaldoVisible(false);
    window.addEventListener('lifeplan:lock', h);
    return () => window.removeEventListener('lifeplan:lock', h);
  }, []);

  const [workoutLog, setWorkoutLog] = useState<WorkoutLog>({});
  const [workoutLogLoaded, setWorkoutLogLoaded] = useState(false);
  const [weeklyGoal, setWeeklyGoal] = useState<number | null>(null);
  const workoutDoneToday = !!workoutLog[localDateKey()];

  useEffect(() => {
    fetchUserPlanData(userId).then(pd => {
      const plan = extractPlanDays(pd);
      if (plan && plan.length) {
        const dIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
        const day = plan[dIdx];
        setPlanPreview({ typeLabel: day?.typeLabel || 'Descanso', nextMeal: getNextMeal(day) });
      }
      const shopping = pd?.shopping;
      setShoppingCount(Array.isArray(shopping) ? shopping.filter(i => !i.checked).length : null);
      setWorkoutLog(pd?.workoutLog || {});
      setWeeklyGoal(pd?.workoutGoalPerWeek || null);
    }).catch(() => {}).finally(() => setWorkoutLogLoaded(true));
  }, [userId]);

  const workoutLogRef = useRef(workoutLog);
  workoutLogRef.current = workoutLog;
  useEffect(() => {
    if (!userId || !workoutLogLoaded) return;
    return registerPlanDataField('workoutLog', () => workoutLogRef.current);
  }, [userId, workoutLogLoaded]);

  function toggleWorkoutDone() {
    const key = localDateKey();
    setWorkoutLog(prev => {
      const next = { ...prev };
      if (next[key]) delete next[key]; else next[key] = true;
      return next;
    });
    setTimeout(() => requestPlanDataSave(userId), 50);
  }

  const nextExam = getNextExam(userId);
  const nextClass = getNextClass(timetableData);
  const saldo = getSaldoPreview(userId);
  const dayKeyNow = localDateKey(now);

  const weekly = useMemo(() => {
    if (!workoutLogLoaded) return null;
    return resumoSemanal({
      hoje: new Date(),
      workoutLog,
      workoutGoal: weeklyGoal,
      habitsDb: readScopedLocal<HabitsDb>('habitsAppV4', userId),
      studyData: readScopedLocal<StudyData>('studyApp', userId),
      faturas: readScopedLocal<FinanceState>('cf_state', userId)?.faturas || [],
    });
  }, [workoutLogLoaded, workoutLog, weeklyGoal, dayKeyNow, userId]);

  const cross = useMemo<CruzamentoSaudeDinheiro>(() => {
    try {
      return cruzarSaudeDinheiro({
        hoje: new Date(),
        habitsDb: readScopedLocal<HabitsDb>('habitsAppV4', userId),
        state: readScopedLocal<FinanceState>('cf_state', userId),
      });
    } catch {
      return { status: 'sem-dados' };
    }
  }, [dayKeyNow, userId]);

  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const agendaItems = gcal.connected ? gcal.events : manual.items;
  const water = useWaterTracker(userId);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [firstName, setFirstName] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const m = (data?.user?.user_metadata || {}) as Record<string, unknown>;
      const full = m.name || m.full_name || m.display_name || '';
      setFirstName(String(full).trim().split(/\s+/)[0] || '');
    }).catch(() => {});
  }, [userId]);

  const hour = now.getHours();
  const greet = hour < 5 ? 'Boa madrugada' : hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const dateLabel = (() => {
    const s = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();
  const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const nextMeal = planPreview?.nextMeal;
  const restDay = !planPreview || /descanso/i.test(planPreview.typeLabel || '');
  const pending = (!workoutDoneToday && !restDay ? 1 : 0) + (water.data.current < water.data.goal ? 1 : 0) + (nextMeal && nextMeal.when === 'hoje' ? 1 : 0);
  const pendingWords = ['Nenhum', 'Um', 'Dois', 'Três'];
  const pendingText = pending === 0 ? 'Tudo em dia por hoje.' : `${pendingWords[pending]} ${pending === 1 ? 'cuidado espera' : 'cuidados esperam'} por você hoje.`;
  const waterPct = Math.min(100, Math.round((water.data.current / Math.max(1, water.data.goal)) * 100));

  // Hábitos programados para hoje (leitura do que já está salvo neste aparelho)
  const habitsToday = useMemo(() => {
    try {
      const db = readScopedLocal<HabitsDatabase>('habitsAppV4', userId);
      if (!db?.habits?.length) return null;
      const key = toLocalISODate();
      const sched = db.habits.filter(h => isScheduled(h, key));
      if (!sched.length) return null;
      const rec = db.records?.[key];
      return { done: sched.filter(h => getHabitRecord(rec, h.id)?.status === 'done').length, total: sched.length };
    } catch { return null; }
  }, [dayKeyNow, userId]);

  // Uma única ação principal: o que mais vale fazer agora
  const waterLeft = Math.max(0, water.data.goal - water.data.current);
  const primary: { title: string; sub: string; cta: string; onClick: () => void } =
    planPreview && !restDay && !workoutDoneToday
      ? { title: `Hoje é dia de ${planPreview.typeLabel.toLowerCase()}`, sub: 'Quando terminar, marque como feito para manter a sua semana em dia.', cta: 'Marcar treino como feito', onClick: toggleWorkoutDone }
      : waterLeft > 0
        ? { title: `Faltam ${waterLeft} ml de água`, sub: `Você já bebeu ${water.data.current} ml da meta de ${water.data.goal} ml.`, cta: 'Beber 200 ml', onClick: () => water.add(200) }
        : habitsToday && habitsToday.done < habitsToday.total
          ? { title: habitsToday.total - habitsToday.done === 1 ? 'Falta 1 hábito hoje' : `Faltam ${habitsToday.total - habitsToday.done} hábitos hoje`, sub: 'Um toque para registrar como foi o seu dia.', cta: 'Ver hábitos de hoje', onClick: () => onNavigate('habitos') }
          : { title: 'Tudo em dia por hoje', sub: 'Que tal registrar um gasto antes de encerrar o dia?', cta: 'Lançar um gasto', onClick: () => onNavigate('financas') };

  const wxOk = !weather.loading && !weather.error;
  const wxLines: string[] = [];
  if (wxOk) {
    if (weather.rain) wxLines.push(weather.rain.active ? `Chovendo agora, leve o guarda-chuva. Deve parar às ${weather.rain.stops}.` : `Chuva às ${weather.rain.starts}, leve o guarda-chuva.`);
    const uv = uvInfo(weather.uvMax);
    if (uv && weather.uvMax != null && weather.uvMax >= 6) wxLines.push(`UV ${uv.label.toLowerCase()} hoje, use protetor solar.`);
    if (weather.tempTrend) wxLines.push(`A temperatura deve ${weather.tempTrend.rising ? 'subir' : 'cair'} ${Math.abs(weather.tempTrend.delta)}° nas próximas 2h.`);
  }
  const wxIcon = weather.rain?.active ? 'cloudRain' : (!weather.isDay ? 'moon' : 'sun');

  const card: CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20 };
  const bubble: CSSProperties = { width: 44, height: 44, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
  const rowBtn: CSSProperties = { display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0, minHeight: 68, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'inherit' };
  const rowTitle: CSSProperties = { fontSize: 16, lineHeight: '20px', fontWeight: 600, color: 'var(--text)' };
  const rowMeta: CSSProperties = { fontSize: 14, lineHeight: '18px', color: 'var(--muted)' };
  const eyebrow: CSSProperties = { margin: '0 0 8px 4px', fontSize: 12, lineHeight: '16px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent)' };
  const smallBtn: CSSProperties = { height: 44, padding: '0 14px', borderRadius: 12, border: 'none', background: 'var(--accent-soft)', color: 'var(--accent)', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 };

  const careRow = (
    key: string,
    { icon, title, metas, onClick, action, last }: { icon: string; title: string; metas: string[]; onClick: () => void; action?: ReactNode; last?: boolean }
  ) => (
    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: last ? 'none' : '1px solid var(--border2)' }}>
      <button onClick={onClick} style={rowBtn}>
        <span style={bubble}><Icon name={icon} /></span>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={rowTitle}>{title}</span>
          {metas.map((m, i) => <span key={i} style={rowMeta}>{m}</span>)}
        </span>
        {!action && <Icon name="chevron" size={20} style={{ color: 'var(--muted)' }} />}
      </button>
      {action}
    </div>
  );

  const weeklyBlocks: ReadonlyArray<readonly [string, string[], string, boolean]> = weekly ? [
    ['Você cumpriu', weekly.cumpriu, 'Nada registrado ainda. Use “Marcar feito” no treino de hoje para começar.', true],
    ['Ficou pendente', weekly.pendente, 'Nada pendente.', false],
  ] : [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', paddingBottom: 110 }}>
      <div className="lp-home">

        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20, minHeight: 44 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--accent)', paddingLeft: 4 }}>LifePlan</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <NotificationBell userId={userId} onNavigate={onNavigate} />
            <ThemeToggleButton />
            <button onClick={onOpenProfile} aria-label="Perfil e configurações" style={{ width: 44, height: 44, borderRadius: 22, border: 'none', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
              <Icon name="user" />
            </button>
          </div>
        </header>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 4px' }}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: '20px', color: 'var(--muted)' }}>{dateLabel}</p>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 'clamp(28px, 7.5vw, 36px)', lineHeight: 1.15, letterSpacing: '-0.015em' }}>{greet}{firstName ? `, ${firstName}` : ''}.</h1>
          <p style={{ margin: '2px 0 0', fontSize: 16, lineHeight: '22px', color: 'var(--text-2)' }}>{pendingText}</p>
        </section>

        {!weather.hidden && (weather.loading || weather.error || wxOk) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignSelf: 'flex-start', maxWidth: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 20, color: 'var(--text-2)', fontSize: 14, lineHeight: '20px' }}>
            {weather.loading ? <span>Buscando o clima…</span> : weather.error ? (
              <>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="cloud" size={18} style={{ color: 'var(--accent)' }} />{weather.error}</span>
                <span style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={weather.retry} style={{ minHeight: 44, padding: '0 14px', borderRadius: 12, border: 'none', background: 'var(--accent-soft)', color: 'var(--accent)', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Tentar de novo</button>
                  <button onClick={weather.hide} style={{ minHeight: 44, padding: '0 14px', borderRadius: 12, border: 'none', background: 'transparent', color: 'var(--muted)', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Ocultar</button>
                </span>
              </>
            ) : (
              <>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--text)' }}>
                  <Icon name={wxIcon} size={18} />{weather.city}, <span className="lp-num">{weather.temp}°</span>
                </span>
                {wxLines.map((l, i) => <span key={i}>{l}</span>)}
              </>
            )}
          </div>
        )}

        <section>
          <h2 style={eyebrow}>Sua consulta de hoje</h2>
          <div style={{ ...card, padding: '4px 12px' }}>
            {careRow('treino', {
              icon: 'dumbbell', title: 'Treino', metas: [planPreview ? `${planPreview.typeLabel}, hoje` : 'Sem treino definido'],
              onClick: () => onNavigate('treinos'),
              action: (
                <button onClick={toggleWorkoutDone} aria-pressed={workoutDoneToday}
                  style={{ height: 44, padding: '0 14px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                    background: workoutDoneToday ? 'var(--accent)' : 'transparent', color: workoutDoneToday ? 'var(--on-accent)' : 'var(--accent)', border: '1.5px solid var(--accent)' }}>
                  {workoutDoneToday && <Icon name="check" size={16} stroke={2.25} />}{workoutDoneToday ? 'Feito' : 'Marcar feito'}
                </button>
              ),
            })}
            {careRow('refeicao', {
              icon: 'leaf', title: 'Próxima refeição',
              metas: [nextMeal ? `${nextMeal.name}, ${nextMeal.time}${nextMeal.when === 'amanhã' ? ' (amanhã)' : ''}` : 'Sem plano alimentar'],
              onClick: () => onNavigate('nutrition'),
            })}
            {careRow('estudos', {
              icon: 'book', title: 'Estudos',
              metas: [nextClass ? `${nextClass.subject}, ${nextClass.isToday ? 'hoje' : nextClass.day} às ${nextClass.time}` : 'Sem aula cadastrada', nextExam ? `Prova: ${nextExam.date}` : 'Sem prova próxima'],
              onClick: () => onNavigate('estudos'),
            })}
            {careRow('habitos', {
              icon: 'activity', title: 'Hábitos', metas: [habitsToday ? `${habitsToday.done} de ${habitsToday.total} hábitos feitos hoje` : 'Hábitos, corpo e dieta'],
              onClick: () => onNavigate('habitos'), last: true,
            })}
          </div>
        </section>

        <section style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)' }}>
              <Icon name="droplet" size={20} />
              <span style={{ fontSize: 16, lineHeight: '20px', fontWeight: 600, color: 'var(--text)' }}>Água</span>
            </div>
            {editingGoal ? (
              <input type="number" aria-label="Meta de água em ml" value={goalInput} autoFocus
                onChange={e => setGoalInput(e.target.value)}
                onBlur={() => { const g = parseInt(goalInput, 10); water.setGoal(g > 0 ? g : water.data.goal); setEditingGoal(false); }}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                style={{ width: 96, height: 40, fontSize: 14, border: '1px solid var(--border)', borderRadius: 12, padding: '0 10px', outline: 'none', background: 'var(--surface2)', color: 'var(--text)' }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <span className="lp-num" style={{ fontSize: 14, lineHeight: '18px', color: 'var(--muted)' }}>{water.data.current} de {water.data.goal} ml</span>
                <button onClick={() => { setGoalInput(String(water.data.goal)); setEditingGoal(true); }} aria-label="Editar meta de água"
                  style={{ width: 44, height: 44, margin: '-10px -10px -10px 0', background: 'none', border: 'none', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                  <Icon name="pencil" size={18} />
                </button>
              </div>
            )}
          </div>
          <div role="progressbar" aria-label="Progresso da água" aria-valuemin={0} aria-valuemax={100} aria-valuenow={waterPct} style={{ height: 8, borderRadius: 4, background: 'var(--track)' }}>
            <div style={{ width: `${waterPct}%`, height: 8, borderRadius: 4, background: 'var(--accent-fill)', transition: 'width .4s' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8 }}>
            {[100, 200, 500, 1000].map(v => (
              <button key={v} onClick={() => water.add(v)} aria-label={`Adicionar ${v} ml de água`}
                style={{ height: 44, border: 'none', borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent-dark)', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {v === 1000 ? '+1 L' : `+${v}`}
              </button>
            ))}
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
          <div style={{ ...card, position: 'relative' }}>
            <button onClick={() => onNavigate('financas')} style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', minHeight: 96, boxSizing: 'border-box', padding: '14px 14px 12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)' }}>
                <Icon name="wallet" size={18} /><span style={{ fontSize: 14, lineHeight: '18px', fontWeight: 600, color: 'var(--text)' }}>Finanças</span>
              </span>
              <span className="lp-num" style={{ fontSize: 22, lineHeight: '28px', fontWeight: 600, marginTop: 4, color: saldoVisible && saldo !== null && saldo < 0 ? 'var(--warning)' : 'var(--text)', letterSpacing: saldoVisible ? 0 : '.04em' }}>
                {saldo !== null ? (saldoVisible ? brl(saldo) : 'R$ ••••') : 'Começar'}
              </span>
              <span style={{ fontSize: 14, lineHeight: '18px', color: 'var(--muted)' }}>{saldo !== null ? 'Saldo do mês' : 'Cadastre sua primeira fatura'}</span>
            </button>
            {saldo !== null && (
              <button onClick={() => setSaldoVisible(v => !v)} aria-label={saldoVisible ? 'Ocultar valores' : 'Mostrar valores'} aria-pressed={saldoVisible}
                style={{ position: 'absolute', top: 2, right: 2, width: 44, height: 44, background: 'none', border: 'none', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                <Icon name={saldoVisible ? 'eyeOff' : 'eye'} size={20} />
              </button>
            )}
          </div>
          <button onClick={() => onNavigate('shopping')} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 6, width: '100%', minHeight: 96, boxSizing: 'border-box', padding: '14px 14px 12px', textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)' }}>
              <Icon name="cart" size={18} /><span style={{ fontSize: 14, lineHeight: '18px', fontWeight: 600, color: 'var(--text)' }}>Lista de compras</span>
            </span>
            <span className="lp-num" style={{ fontSize: 22, lineHeight: '28px', fontWeight: 600, marginTop: 4 }}>{shoppingCount ? shoppingCount : 'Vazia'}</span>
            <span style={{ fontSize: 14, lineHeight: '18px', color: 'var(--muted)' }}>{!shoppingCount ? 'Adicione itens pelo plano' : shoppingCount === 1 ? 'item pendente' : 'itens pendentes'}</span>
          </button>
        </section>

        <section style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)' }}>
              <Icon name="calendar" size={20} />
              <span style={{ fontSize: 16, lineHeight: '20px', fontWeight: 600, color: 'var(--text)' }}>Agenda</span>
            </div>
            {!gcal.connected && (
              <button onClick={gcal.connect} style={smallBtn}>{gcal.status === 'no-key' ? 'Configurar Google' : 'Conectar Google'}</button>
            )}
          </div>
          {agendaItems.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 16, lineHeight: '22px', fontWeight: 500 }}>Dias livres</span>
              <span style={{ fontSize: 14, lineHeight: '18px', color: 'var(--muted)' }}>Nada marcado nos próximos 7 dias. Anote um compromisso abaixo.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {agendaItems.slice(0, 5).map(it => (
                <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 15, lineHeight: '20px', padding: '8px 0', borderTop: '1px solid var(--border2)' }}>
                  <span>{it.title}</span><span className="lp-num" style={{ color: 'var(--muted)' }}>{it.time}</span>
                </div>
              ))}
            </div>
          )}
          {!gcal.connected && (
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              <input aria-label="Novo compromisso" placeholder="Novo compromisso" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                style={{ flex: 1, minWidth: 0, height: 44, border: '1px solid var(--border)', borderRadius: 12, fontSize: 14, padding: '0 12px', outline: 'none', background: 'var(--surface2)', color: 'var(--text)' }} />
              <input aria-label="Horário" type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                style={{ width: 96, height: 44, border: '1px solid var(--border)', borderRadius: 12, fontSize: 14, padding: '0 8px', outline: 'none', background: 'var(--surface2)', color: 'var(--text)' }} />
              <button aria-label="Adicionar compromisso" onClick={() => { if (!newTitle.trim()) return; manual.add(newTitle.trim(), newTime || '--:--'); setNewTitle(''); setNewTime(''); }}
                style={{ width: 44, height: 44, borderRadius: 12, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                <Icon name="plus" size={20} stroke={2} />
              </button>
            </div>
          )}
        </section>

        {weekly && (
          <section aria-label="Resumo da semana" data-testid="weekly-summary">
            <h2 style={eyebrow}>Resumo da semana · <span className="lp-num">{weekly.periodo}</span></h2>
            <div style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {weeklyBlocks.map(([title, items, empty, done]) => (
                <div key={title}>
                  <h3 style={{ margin: '0 0 6px', fontSize: 14, lineHeight: '18px', fontWeight: 700, color: 'var(--muted)' }}>{title}</h3>
                  {items.length ? (
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {items.map((t, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 15, lineHeight: '21px', color: 'var(--text)' }}>
                          <span aria-hidden="true" style={{ flexShrink: 0, marginTop: 2, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: done ? 'var(--accent)' : 'var(--muted)' }}>
                            {done ? <Icon name="check" size={16} stroke={2.25} /> : <span style={{ width: 6, height: 6, borderRadius: 3, background: 'currentColor' }} />}
                          </span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p style={{ margin: 0, fontSize: 14, lineHeight: '20px', color: 'var(--muted)' }}>{empty}</p>}
                </div>
              ))}
              <div style={{ background: 'var(--accent-soft)', borderRadius: 12, padding: '12px 14px' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 14, lineHeight: '18px', fontWeight: 700, color: 'var(--accent)' }}>Recomendação</h3>
                <p style={{ margin: 0, fontSize: 15, lineHeight: '21px', color: 'var(--text)' }}>{weekly.recomendacao}</p>
              </div>
            </div>
          </section>
        )}

        {cross && cross.status !== 'sem-dados' && (
          <section aria-label="Saúde e dinheiro" data-testid="cross-insight">
            <h2 style={eyebrow}>Saúde e dinheiro</h2>
            <div style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cross.status === 'achado' && (
                <>
                  <p style={{ margin: 0, fontSize: 16, lineHeight: '23px', fontWeight: 600, color: 'var(--text)' }}>{cross.frase}</p>
                  {([
                    ['Semanas de gasto alto', cross.dietaAlta, 'var(--warning)'],
                    ['Semanas de gasto baixo', cross.dietaBaixa, 'var(--accent)'],
                  ] as const).map(([label, pct, color]) => (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, lineHeight: '18px', color: 'var(--muted)', marginBottom: 4 }}>
                        <span>{label} em {cross.categoria}</span><span className="lp-num" style={{ color: 'var(--text)', fontWeight: 600 }}>Dieta {pct}%</span>
                      </div>
                      <div role="img" aria-label={`${label}: dieta em ${pct}%`} style={{ height: 8, borderRadius: 4, background: 'var(--accent-soft)', overflow: 'hidden' }}>
                        <div style={{ width: pct + '%', height: '100%', borderRadius: 4, background: color }} />
                      </div>
                    </div>
                  ))}
                  <p style={{ margin: 0, fontSize: 14, lineHeight: '18px', color: 'var(--muted)' }}>Baseado em {cross.semanas} semanas. Isso mostra que os dois andam juntos, não que um causou o outro.</p>
                </>
              )}
              {cross.status === 'sem-relacao' && (
                <p style={{ margin: 0, fontSize: 15, lineHeight: '21px', color: 'var(--text)' }}>Nas últimas {cross.semanas} semanas, nenhuma categoria de gasto apareceu junto com queda na dieta.</p>
              )}
              {cross.status === 'faltam-dados' && (
                <p style={{ margin: 0, fontSize: 15, lineHeight: '21px', color: 'var(--text)' }}>Para cruzar saúde e dinheiro, o app precisa de pelo menos {cross.minimo} semanas completas com a dieta registrada. Você tem {cross.semanasComDieta}. Registre também a categoria dos gastos em Finanças.</p>
              )}
            </div>
          </section>
        )}

        <BudgetChartPreview userId={userId} />

      </div>
    </div>
  );
}
