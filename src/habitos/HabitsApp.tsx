// src/habitos/HabitsApp.tsx — Aplicação nativa React + TypeScript de Hábitos, Dieta e Performance
import { useState, useEffect, useCallback, useMemo } from 'react';
import './habitos.css';
import { supabase } from '../supabaseClient';
import type { MealPlanDay } from '../types';
import {
  type HabitsDatabase,
  type BodyMetric,
  type PanelId,
  type Habit,
  type HabitStatus,
  type MealComplianceStatus,
  type DietMealEntryRecord,
} from './habitsTypes';
import {
  loadInitialDb,
  persistLocalDb,
  todayISO,
  fmtDate,
  fmtFullDate,
  addDaysISO,
  weekdayIdxFromDate,
  isScheduled,
  describeFreq,
  getHabitRecord,
  iterHabitRecords,
  getEffectiveDietPlanForDate,
  getMealRecordOption,
  getMealActiveFoods,
  WEEKDAYS,
  uid,
} from './habitsStorage';
import {
  dayScore,
  dietDayScore,
  dietDayCounts,
  computeHabitStreak,
  computeDietStreak,
  habitSuccessRate,
  mealComplianceRate,
  detectAlerts,
  predictHabit,
  computeTagImpacts,
  computeWorkoutWeekSummary,
  performGlobalSearch,
} from './habitsAnalytics';
import {
  BodyEvolutionChart,
  DailyScoreChart,
  DietDailyChart,
  MealsComplianceChart,
  HabitsComplianceChart,
  WeekdayAvgChart,
  ReasonDoughnutChart,
} from './habitsCharts';
import { HabitsIcon, RichText } from './habitsIcons';

export interface HabitsAppProps {
  userId?: string | null;
  onOpenProfile?: () => void;
  onHome?: () => void;
  initialPanel?: PanelId;
}

export function HabitsApp({ userId = null, onOpenProfile: _onOpenProfile, onHome: _onHome, initialPanel = 'today' }: HabitsAppProps) {
  const [panel, setPanel] = useState<PanelId>(initialPanel);
  const [db, setDb] = useState<HabitsDatabase>(() => loadInitialDb(userId));
  const [selectedDate, setSelectedDate] = useState<string>(() => todayISO());
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetric[]>([]);
  const [nutritionDays, setNutritionDays] = useState<MealPlanDay[]>([]);
  const [workoutLog, setWorkoutLog] = useState<{ log: Record<string, boolean>; goal: number }>({
    log: {},
    goal: 3,
  });
  const [cloudStatus, setCloudStatus] = useState<string>('Carregando...');
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  // Formulário Corpo
  const [bodyForm, setBodyForm] = useState<{
    date: string;
    weight: string;
    muscle: string;
    fat: string;
    notes: string;
    photoFile: File | null;
  }>({
    date: todayISO(),
    weight: '',
    muscle: '',
    fat: '',
    notes: '',
    photoFile: null,
  });

  // Insights / Predição dia selecionado
  const [predDayOffset, setPredDayOffset] = useState<number>(0);

  // Carregamento de dados Supabase
  useEffect(() => {
    let cancelled = false;

    async function loadAllData() {
      if (!userId) {
        setCloudStatus('Modo offline');
        return;
      }

      setCloudStatus('Sincronizando...');
      setIsCloudSyncing(true);

      try {
        const [appRes, metRes, planRes] = await Promise.all([
          supabase.from('app_data').select('data').eq('user_id', userId).maybeSingle(),
          supabase.from('body_metrics').select('*').eq('user_id', userId).order('recorded_at', { ascending: true }),
          supabase.from('user_plans').select('plan_data').eq('user_id', userId).maybeSingle(),
        ]);

        if (cancelled) return;

        if (appRes.data?.data) {
          const loadedDb = appRes.data.data as HabitsDatabase;
          setDb(loadedDb);
          persistLocalDb(loadedDb, userId);
        }

        if (metRes.data) {
          setBodyMetrics(metRes.data as BodyMetric[]);
        }

        if (planRes.data?.plan_data) {
          const pd = planRes.data.plan_data as Record<string, unknown>;
          const days = Object.keys(pd)
            .filter(k => /^\d+$/.test(k))
            .sort((a, b) => Number(a) - Number(b))
            .map(k => pd[k] as MealPlanDay);
          setNutritionDays(days);

          if (pd.workoutLog) {
            setWorkoutLog({
              log: (pd.workoutLog as Record<string, boolean>) || {},
              goal: Number(pd.workoutGoalPerWeek) || 3,
            });
          }
        }

        setCloudStatus('Sincronizado');
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setCloudStatus('Erro na sincronização');
      } finally {
        if (!cancelled) setIsCloudSyncing(false);
      }
    }

    loadAllData();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Salvar estado na nuvem e local
  const persistDb = useCallback(
    async (nextDb: HabitsDatabase) => {
      setDb(nextDb);
      persistLocalDb(nextDb, userId);

      if (!userId) return;

      setIsCloudSyncing(true);
      try {
        await supabase.from('app_data').upsert({
          user_id: userId,
          data: nextDb,
          updated_at: new Date().toISOString(),
        });
        setCloudStatus('Sincronizado');
      } catch (e) {
        console.error(e);
        setCloudStatus('Erro ao salvar');
      } finally {
        setIsCloudSyncing(false);
      }
    },
    [userId]
  );

  // Registro do dia selecionado
  const currentDayRecord = useMemo(() => {
    return db.records[selectedDate] || {};
  }, [db.records, selectedDate]);

  // Atualizar entrada de hábito
  const handleHabitToggle = useCallback(
    (habitId: string, status: HabitStatus | null, reason?: string, meal?: string, note?: string) => {
      const prevEntry = getHabitRecord(currentDayRecord, habitId) || {};
      const newStatus = prevEntry.status === status ? null : status;

      const nextDayRec = {
        ...currentDayRecord,
        [habitId]: {
          ...prevEntry,
          status: newStatus,
          reason: newStatus === 'fail' ? reason ?? prevEntry.reason : undefined,
          meal: newStatus === 'fail' ? meal ?? prevEntry.meal : undefined,
          note: note !== undefined ? note : prevEntry.note,
        },
      };

      const nextDb = {
        ...db,
        records: {
          ...db.records,
          [selectedDate]: nextDayRec,
        },
      };
      persistDb(nextDb);
    },
    [currentDayRecord, db, persistDb, selectedDate]
  );

  // Atualizar refeição da dieta
  const handleMealStatus = useCallback(
    (mealId: string, status: MealComplianceStatus | null, optionId?: string, note?: string) => {
      const prevDiet = currentDayRecord.diet || { meals: {} };
      const prevMeal = prevDiet.meals[mealId] || {};
      const newStatus = prevMeal.followed === status ? null : status;

      const nextDiet = {
        ...prevDiet,
        meals: {
          ...prevDiet.meals,
          [mealId]: {
            ...prevMeal,
            followed: newStatus,
            optionId: optionId ?? prevMeal.optionId,
            note: note !== undefined ? note : prevMeal.note,
          },
        },
      };

      const nextDb = {
        ...db,
        records: {
          ...db.records,
          [selectedDate]: {
            ...currentDayRecord,
            diet: nextDiet,
          },
        },
      };
      persistDb(nextDb);
    },
    [currentDayRecord, db, persistDb, selectedDate]
  );

  // Alternar checkbox de alimento
  const handleFoodToggle = useCallback(
    (mealId: string, foodIdx: number) => {
      const prevDiet = currentDayRecord.diet || { meals: {} };
      const prevMeal = prevDiet.meals[mealId] || {};
      const prevFoods = prevMeal.foods || {};
      const nextFoods = { ...prevFoods, [foodIdx]: !prevFoods[foodIdx] };

      const nextDiet = {
        ...prevDiet,
        meals: {
          ...prevDiet.meals,
          [mealId]: {
            ...prevMeal,
            foods: nextFoods,
          },
        },
      };

      const nextDb = {
        ...db,
        records: {
          ...db.records,
          [selectedDate]: {
            ...currentDayRecord,
            diet: nextDiet,
          },
        },
      };
      persistDb(nextDb);
    },
    [currentDayRecord, db, persistDb, selectedDate]
  );

  // Tags do dia selecionado
  const handleTagToggle = useCallback(
    (tag: string) => {
      const currentTags = currentDayRecord.tags || [];
      const has = currentTags.includes(tag);
      const nextTags = has ? currentTags.filter(t => t !== tag) : [...currentTags, tag];

      const nextDb = {
        ...db,
        records: {
          ...db.records,
          [selectedDate]: {
            ...currentDayRecord,
            tags: nextTags,
          },
        },
      };
      persistDb(nextDb);
    },
    [currentDayRecord, db, persistDb, selectedDate]
  );

  // Salvar nota geral da dieta do dia
  const handleOverallDietNote = useCallback(
    (note: string) => {
      const prevDiet = currentDayRecord.diet || { meals: {} };
      const nextDiet = { ...prevDiet, overallNote: note };

      const nextDb = {
        ...db,
        records: {
          ...db.records,
          [selectedDate]: {
            ...currentDayRecord,
            diet: nextDiet,
          },
        },
      };
      persistDb(nextDb);
    },
    [currentDayRecord, db, persistDb, selectedDate]
  );

  // Submissão de Medição Corporal
  const handleSaveBodyMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      alert('Faça login para salvar medições na nuvem.');
      return;
    }

    const w = parseFloat(bodyForm.weight);
    const m = parseFloat(bodyForm.muscle);
    const f = parseFloat(bodyForm.fat);

    if (isNaN(w) && isNaN(m) && isNaN(f)) {
      alert('Informe ao menos peso, massa muscular ou gordura.');
      return;
    }

    setCloudStatus('Salvando medição...');
    let photo_path: string | undefined = undefined;

    if (bodyForm.photoFile) {
      try {
        const ext = (bodyForm.photoFile.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${userId}/${bodyForm.date}-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('progress-photos')
          .upload(path, bodyForm.photoFile, { upsert: true });

        if (uploadErr) {
          alert('Erro ao enviar foto: ' + uploadErr.message);
        } else {
          photo_path = path;
        }
      } catch (err) {
        console.error(err);
      }
    }

    const row = {
      user_id: userId,
      recorded_at: bodyForm.date,
      weight_kg: isNaN(w) ? null : w,
      muscle_pct: isNaN(m) ? null : m,
      fat_pct: isNaN(f) ? null : f,
      notes: bodyForm.notes.trim() || null,
      ...(photo_path ? { photo_path } : {}),
    };

    const { error } = await supabase.from('body_metrics').upsert(row, { onConflict: 'user_id,recorded_at' });

    if (error) {
      alert('Erro ao salvar medição: ' + error.message);
      setCloudStatus('Erro ao salvar');
      return;
    }

    const { data: updated } = await supabase
      .from('body_metrics')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: true });

    if (updated) {
      setBodyMetrics(updated as BodyMetric[]);
    }

    setBodyForm({
      date: todayISO(),
      weight: '',
      muscle: '',
      fat: '',
      notes: '',
      photoFile: null,
    });
    setCloudStatus('Medição salva');
  };

  // Excluir medição corporal
  const handleDeleteBodyMetric = async (id: string, photoPath?: string | null) => {
    if (!confirm('Tem certeza que deseja excluir esta medição?')) return;
    if (!userId) return;

    const { error } = await supabase.from('body_metrics').delete().eq('id', id);
    if (error) {
      alert('Erro ao excluir: ' + error.message);
      return;
    }

    if (photoPath) {
      try {
        await supabase.storage.from('progress-photos').remove([photoPath]);
      } catch (err) {
        console.error(err);
      }
    }

    setBodyMetrics(prev => prev.filter(item => item.id !== id));
  };

  // Visualizar foto de progresso assinada
  const handleOpenPhoto = async (photoPath: string) => {
    try {
      const { data, error } = await supabase.storage.from('progress-photos').createSignedUrl(photoPath, 300);
      if (error) throw error;
      if (data?.signedUrl) {
        setPhotoPreviewUrl(data.signedUrl);
      }
    } catch (e) {
      alert('Não foi possível carregar a foto: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  // Cálculos reativos
  const todayHabitScore = useMemo(() => dayScore(db, selectedDate), [db, selectedDate]);
  const habitStreak = useMemo(() => computeHabitStreak(db), [db]);
  const dietScore = useMemo(() => dietDayScore(db, selectedDate, nutritionDays), [db, selectedDate, nutritionDays]);

  const effectiveMeals = useMemo(() => {
    return getEffectiveDietPlanForDate(selectedDate, db.dietPlan, nutritionDays);
  }, [selectedDate, db.dietPlan, nutritionDays]);

  const dietCounts = useMemo(() => dietDayCounts(db, selectedDate, effectiveMeals), [db, selectedDate, effectiveMeals]);
  const dietStreak = useMemo(() => computeDietStreak(db, nutritionDays), [db, nutritionDays]);

  const alerts = useMemo(() => detectAlerts(db, nutritionDays), [db, nutritionDays]);
  const activeAlerts = useMemo(() => {
    const now = Date.now();
    return alerts.filter(a => {
      const dismissedTime = db.dismissedAlerts?.[a.id];
      if (!dismissedTime) return true;
      return now - dismissedTime > 7 * 86400000;
    });
  }, [alerts, db.dismissedAlerts]);

  const dismissAlert = (alertId: string) => {
    const nextDb = {
      ...db,
      dismissedAlerts: {
        ...(db.dismissedAlerts || {}),
        [alertId]: Date.now(),
      },
    };
    persistDb(nextDb);
  };

  // Busca global
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return performGlobalSearch(searchQuery, db, bodyMetrics, nutritionDays);
  }, [db, searchQuery, bodyMetrics, nutritionDays]);

  // Dados para gráficos do dashboard
  const last30Dates = useMemo(() => {
    const res: string[] = [];
    for (let i = 29; i >= 0; i--) {
      res.push(addDaysISO(todayISO(), -i));
    }
    return res;
  }, []);

  const last30HabitScores = useMemo(() => last30Dates.map(d => dayScore(db, d)), [db, last30Dates]);
  const last30DietScores = useMemo(() => last30Dates.map(d => dietDayScore(db, d, nutritionDays)), [db, last30Dates, nutritionDays]);

  const habitsComplianceItems = useMemo(() => {
    return db.habits.map(h => ({
      name: h.name,
      pct: Math.round((habitSuccessRate(db, h.id, last30Dates)?.rate ?? 0) * 100),
    }));
  }, [db, last30Dates]);

  const mealsComplianceItems = useMemo(() => {
    return effectiveMeals.map(m => ({
      name: m.name,
      pct: Math.round((mealComplianceRate(db, m, nutritionDays)?.rate ?? 0) * 100),
    }));
  }, [effectiveMeals, db, nutritionDays]);

  const weekdayAverages = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const [dateStr] of Object.entries(db.records)) {
      const score = dayScore(db, dateStr);
      if (score !== null) {
        const idx = weekdayIdxFromDate(dateStr);
        totals[idx] += score;
        counts[idx]++;
      }
    }
    return totals.map((sum, i) => (counts[i] ? Math.round(sum / counts[i]) : 0));
  }, [db]);

  const reasonCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const dayRec of Object.values(db.records)) {
      for (const [, entry] of iterHabitRecords(dayRec)) {
        if (entry.status === 'fail' && entry.reason) {
          counts[entry.reason] = (counts[entry.reason] || 0) + 1;
        }
      }
    }
    return Object.entries(counts).map(([label, count]) => ({ label, count }));
  }, [db.records]);

  return (
    <div className="lp-habitos">
      <div className="container">
        {/* Topbar com navegação e status de sincronização */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: isCloudSyncing ? 'var(--warning)' : 'var(--success)',
                  display: 'inline-block',
                }}
              />
              {cloudStatus}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="ghost small"
              onClick={() => setShowSearch(true)}
              title="Pesquisar histórico"
            >
              <HabitsIcon name="search" /> Buscar
            </button>
            <button
              type="button"
              className="ghost small"
              onClick={() => setShowSettings(true)}
              title="Configurações e Hábitos"
            >
              <HabitsIcon name="settings" /> Ajustes
            </button>
          </div>
        </div>

        {/* Abas Superiores */}
        <div className="tabs">
          <button
            type="button"
            className={`tab ${panel === 'today' ? 'active' : ''}`}
            onClick={() => setPanel('today')}
          >
            <HabitsIcon name="today" /> Hoje
          </button>
          <button
            type="button"
            className={`tab ${panel === 'diet' ? 'active' : ''}`}
            onClick={() => setPanel('diet')}
          >
            <HabitsIcon name="diet" /> Dieta
          </button>
          <button
            type="button"
            className={`tab ${panel === 'body' ? 'active' : ''}`}
            onClick={() => setPanel('body')}
          >
            <HabitsIcon name="body" /> Corpo
          </button>
          <button
            type="button"
            className={`tab ${panel === 'dashboard' ? 'active' : ''}`}
            onClick={() => setPanel('dashboard')}
          >
            <HabitsIcon name="dashboard" /> Dashboard
          </button>
          <button
            type="button"
            className={`tab ${panel === 'insights' ? 'active' : ''}`}
            onClick={() => setPanel('insights')}
          >
            <HabitsIcon name="insights" /> Insights
            {activeAlerts.length > 0 && <span className="alert-badge">{activeAlerts.length}</span>}
          </button>
          <button
            type="button"
            className={`tab ${panel === 'history' ? 'active' : ''}`}
            onClick={() => setPanel('history')}
          >
            <HabitsIcon name="history" /> Histórico
          </button>
        </div>

        {/* ================= PAINEL: HOJE ================= */}
        {panel === 'today' && (
          <div>
            {/* Navegador de Data */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
                background: 'var(--surface)',
                padding: '10px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}
            >
              <button
                type="button"
                className="ghost small"
                onClick={() => setSelectedDate(prev => addDaysISO(prev, -1))}
              >
                ◀ Anterior
              </button>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text)' }}>
                  {fmtFullDate(selectedDate)}
                </span>
                {selectedDate === todayISO() && (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: '0.75rem',
                      background: 'var(--accent-soft)',
                      color: 'var(--accent)',
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontWeight: 600,
                    }}
                  >
                    Hoje
                  </span>
                )}
              </div>
              <button
                type="button"
                className="ghost small"
                onClick={() => setSelectedDate(prev => addDaysISO(prev, 1))}
              >
                Próximo ▶
              </button>
            </div>

            {/* Estatísticas do Dia */}
            <div className="grid grid-3" style={{ marginBottom: 16 }}>
              <div className="stat accent">
                <div className="v">{todayHabitScore !== null ? `${todayHabitScore}%` : '—'}</div>
                <div className="l">Aderência aos Hábitos</div>
              </div>
              <div className="stat stat-success">
                <div className="v">{habitStreak} dias</div>
                <div className="l">Sequência Atual</div>
              </div>
              <div className="stat">
                <div className="v">{dietScore !== null ? `${dietScore}%` : '—'}</div>
                <div className="l">Dieta do Dia</div>
              </div>
            </div>

            {/* Contexto / Tags do Dia */}
            <div className="card">
              <h2>Como foi seu dia? (Contexto)</h2>
              <div className="chips-line">
                {db.contextTags.map(tag => {
                  const active = (currentDayRecord.tags || []).includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={`chip ${active ? 'active' : ''}`}
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lista de Hábitos Programados */}
            <div className="card">
              <h2>Hábitos para {WEEKDAYS[weekdayIdxFromDate(selectedDate)]}</h2>
              {db.habits.filter(h => isScheduled(h, selectedDate)).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                  Nenhum hábito programado para este dia da semana.
                </div>
              ) : (
                db.habits
                  .filter(h => isScheduled(h, selectedDate))
                  .map(habit => {
                    const entry = getHabitRecord(currentDayRecord, habit.id) || {};
                    const isDone = entry.status === 'done';
                    const isFail = entry.status === 'fail';
                    const isSkip = entry.status === 'skip';

                    return (
                      <div
                        key={habit.id}
                        className={`habit-entry ${isDone ? 'done' : ''} ${isFail ? 'failed' : ''}`}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <div>
                            <span className="habit-name">{habit.name}</span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                              ({describeFreq(habit)})
                            </span>
                          </div>
                        </div>

                        {/* Botões de Status */}
                        <div className="toggle-group">
                          <button
                            type="button"
                            className={`toggle-btn ${isDone ? 'active-done' : ''}`}
                            onClick={() => handleHabitToggle(habit.id, 'done')}
                          >
                            <HabitsIcon name="check" /> Feito
                          </button>
                          <button
                            type="button"
                            className={`toggle-btn ${isFail ? 'active-fail' : ''}`}
                            onClick={() => handleHabitToggle(habit.id, 'fail')}
                          >
                            <HabitsIcon name="x" /> Não feito
                          </button>
                          <button
                            type="button"
                            className={`toggle-btn ${isSkip ? 'active-skip' : ''}`}
                            onClick={() => handleHabitToggle(habit.id, 'skip')}
                          >
                            <HabitsIcon name="minus" /> Pular
                          </button>
                        </div>

                        {/* Detalhes de Falha (se não feito) */}
                        {isFail && (
                          <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <select
                              value={entry.reason || ''}
                              onChange={e => handleHabitToggle(habit.id, 'fail', e.target.value)}
                              style={{ flex: 1 }}
                            >
                              <option value="">Selecione o motivo da falha...</option>
                              {db.reasons.map(r => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>

                            <input
                              type="text"
                              placeholder="Observação rápida (opcional)..."
                              value={entry.note || ''}
                              onChange={e => handleHabitToggle(habit.id, 'fail', entry.reason, entry.meal, e.target.value)}
                              style={{ flex: 1 }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}

        {/* ================= PAINEL: DIETA ================= */}
        {panel === 'diet' && (
          <div>
            <div className="diet-summary">
              <div className="big-num">{dietScore !== null ? `${dietScore}%` : '—'}</div>
              <div className="desc">Cumprimento da Dieta em {fmtDate(selectedDate)}</div>
              <div className="breakdown">
                <div>Total: {effectiveMeals.length}</div>
                <div>100% Seguidas: {dietCounts.full}</div>
                <div>Parciais: {dietCounts.partial}</div>
                <div>Não Seguidas: {dietCounts.no}</div>
                <div>Puladas: {dietCounts.skip}</div>
              </div>
            </div>

            {effectiveMeals.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 32 }}>
                <p style={{ color: 'var(--text-muted)' }}>
                  Nenhuma refeição cadastrada para este dia.
                </p>
                <button
                  type="button"
                  className="ghost"
                  style={{ marginTop: 12 }}
                  onClick={() => setShowSettings(true)}
                >
                  Configurar Refeições
                </button>
              </div>
            ) : (
              effectiveMeals.map(meal => {
                const dietRec = currentDayRecord.diet || { meals: {} };
                const mealRec: DietMealEntryRecord = dietRec.meals[meal.id] || {};
                const activeOption = getMealRecordOption(meal, mealRec);
                const activeFoods = getMealActiveFoods(meal, mealRec);
                const isFull = mealRec.followed === 'full';
                const isPartial = mealRec.followed === 'partial';
                const isNo = mealRec.followed === 'no';
                const isSkip = mealRec.followed === 'skip';

                return (
                  <div
                    key={meal.id}
                    className={`meal-card ${isFull ? 'full' : ''} ${isPartial ? 'partial' : ''} ${
                      isNo ? 'no' : ''
                    } ${isSkip ? 'skip' : ''}`}
                  >
                    <div className="meal-header">
                      <div className="meal-title">
                        <span className="meal-emoji">{meal.emoji || '🍽️'}</span>
                        <div className="meal-name-time">
                          <span className="meal-name">{meal.name}</span>
                          {meal.time && <div className="meal-time">{meal.time}</div>}
                        </div>
                      </div>

                      {/* Opções de Refeição se houver */}
                      {meal.options.length > 1 && (
                        <select
                          value={activeOption?.id || meal.options[0].id}
                          onChange={e => handleMealStatus(meal.id, mealRec.followed ?? null, e.target.value)}
                          style={{ padding: '4px 10px', fontSize: '0.85rem' }}
                        >
                          {meal.options.map(opt => (
                            <option key={opt.id} value={opt.id}>
                              {opt.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Lista de Alimentos com Checkbox */}
                    {activeFoods.length > 0 && (
                      <div className="food-list">
                        {activeFoods.map((f, idx) => {
                          const checked = mealRec.foods?.[idx] ?? false;
                          return (
                            <div key={idx} className="food-item">
                              <div
                                className={`food-checkbox ${checked ? 'checked' : ''}`}
                                onClick={() => handleFoodToggle(meal.id, idx)}
                              >
                                {checked ? '✓' : ''}
                              </div>
                              <span className="food-name">{f.name}</span>
                              <span className="food-amount">{f.amount}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Botões de Aderência */}
                    <div className="meal-toggles">
                      <button
                        type="button"
                        className={`toggle-btn ${isFull ? 'active-done' : ''}`}
                        onClick={() => handleMealStatus(meal.id, 'full')}
                      >
                        ✓ Segui 100%
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${isPartial ? 'active-partial' : ''}`}
                        onClick={() => handleMealStatus(meal.id, 'partial')}
                      >
                        ⚠️ Parcial
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${isNo ? 'active-fail' : ''}`}
                        onClick={() => handleMealStatus(meal.id, 'no')}
                      >
                        ✕ Não segui
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${isSkip ? 'active-skip' : ''}`}
                        onClick={() => handleMealStatus(meal.id, 'skip')}
                      >
                        Pular
                      </button>
                    </div>

                    {/* Nota da Refeição */}
                    <input
                      type="text"
                      placeholder="Observação desta refeição (ex: comi na rua)..."
                      value={mealRec.note || ''}
                      onChange={e => handleMealStatus(meal.id, mealRec.followed ?? null, mealRec.optionId, e.target.value)}
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    />
                  </div>
                );
              })
            )}

            {/* Nota Geral da Dieta */}
            <div className="card" style={{ marginTop: 16 }}>
              <h2>Anotações do Dia sobre Alimentação</h2>
              <textarea
                placeholder="Ex: Tive bastante fome à tarde, bebi 3L de água..."
                value={currentDayRecord.diet?.overallNote || ''}
                onChange={e => handleOverallDietNote(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        )}

        {/* ================= PAINEL: CORPO ================= */}
        {panel === 'body' && (
          <div>
            {/* Gráfico de Evolução Corporal */}
            <div className="card">
              <h2>Evolução da Composição Corporal</h2>
              <BodyEvolutionChart rows={bodyMetrics} />
            </div>

            {/* Formulário de Registro de Medição */}
            <div className="card">
              <h2>Registrar Nova Medição</h2>
              <form onSubmit={handleSaveBodyMetric}>
                <div className="form-row">
                  <div>
                    <label>Data</label>
                    <input
                      type="date"
                      value={bodyForm.date}
                      onChange={e => setBodyForm(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label>Peso (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 75.4"
                      value={bodyForm.weight}
                      onChange={e => setBodyForm(prev => ({ ...prev, weight: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>Massa Muscular (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 42.1"
                      value={bodyForm.muscle}
                      onChange={e => setBodyForm(prev => ({ ...prev, muscle: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>Gordura Corporal (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 16.5"
                      value={bodyForm.fat}
                      onChange={e => setBodyForm(prev => ({ ...prev, fat: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div style={{ flex: 2 }}>
                    <label>Observações</label>
                    <input
                      type="text"
                      placeholder="Ex: Pesagem em jejum após acordar"
                      value={bodyForm.notes}
                      onChange={e => setBodyForm(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Foto de Progresso</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e =>
                        setBodyForm(prev => ({
                          ...prev,
                          photoFile: e.target.files?.[0] || null,
                        }))
                      }
                    />
                  </div>
                </div>

                <button type="submit" style={{ marginTop: 8 }}>
                  <HabitsIcon name="scale" /> Salvar Medição
                </button>
              </form>
            </div>

            {/* Histórico de Medições */}
            <div className="card">
              <h2>Histórico de Medições</h2>
              {bodyMetrics.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                  Nenhuma medição registrada ainda.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px 10px' }}>Data</th>
                        <th style={{ padding: '8px 10px' }}>Peso</th>
                        <th style={{ padding: '8px 10px' }}>Músculo</th>
                        <th style={{ padding: '8px 10px' }}>Gordura</th>
                        <th style={{ padding: '8px 10px' }}>Foto</th>
                        <th style={{ padding: '8px 10px' }}>Notas</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...bodyMetrics].reverse().map(m => (
                        <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>{fmtDate(m.recorded_at)}</td>
                          <td style={{ padding: '8px 10px' }}>{m.weight_kg ? `${m.weight_kg} kg` : '—'}</td>
                          <td style={{ padding: '8px 10px' }}>{m.muscle_pct ? `${m.muscle_pct}%` : '—'}</td>
                          <td style={{ padding: '8px 10px' }}>{m.fat_pct ? `${m.fat_pct}%` : '—'}</td>
                          <td style={{ padding: '8px 10px' }}>
                            {m.photo_path ? (
                              <button
                                type="button"
                                className="ghost small"
                                onClick={() => handleOpenPhoto(m.photo_path!)}
                              >
                                Ver foto 📷
                              </button>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{m.notes || '—'}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                            <button
                              type="button"
                              className="ghost small danger"
                              onClick={() => handleDeleteBodyMetric(m.id, m.photo_path)}
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= PAINEL: DASHBOARD ================= */}
        {panel === 'dashboard' && (
          <div>
            {/* Métricas Principais */}
            <div className="grid grid-4" style={{ marginBottom: 16 }}>
              <div className="stat accent">
                <div className="v">{habitStreak} d</div>
                <div className="l">Sequência de Hábitos</div>
              </div>
              <div className="stat stat-success">
                <div className="v">{dietStreak} d</div>
                <div className="l">Sequência de Dieta</div>
              </div>
              <div className="stat">
                <div className="v">
                  {workoutLog.goal > 0
                    ? `${computeWorkoutWeekSummary(workoutLog.log, workoutLog.goal).done}/${workoutLog.goal}`
                    : '—'}
                </div>
                <div className="l">Treinos na Semana</div>
              </div>
              <div className="stat neutral">
                <div className="v">{Object.keys(db.records).length}</div>
                <div className="l">Dias Registrados</div>
              </div>
            </div>

            {/* Grid com Gráficos Completos */}
            <div className="grid grid-2">
              <div className="card">
                <h2>Aderência aos Hábitos (Últimos 30 Dias)</h2>
                <DailyScoreChart dates={last30Dates} scores={last30HabitScores} />
              </div>
              <div className="card">
                <h2>Cumprimento da Dieta (Últimos 30 Dias)</h2>
                <DietDailyChart dates={last30Dates} scores={last30DietScores} />
              </div>
              <div className="card">
                <h2>Conformidade por Hábito (%)</h2>
                <HabitsComplianceChart items={habitsComplianceItems} />
              </div>
              <div className="card">
                <h2>Aderência por Refeição (%)</h2>
                <MealsComplianceChart items={mealsComplianceItems} />
              </div>
              <div className="card">
                <h2>Desempenho por Dia da Semana</h2>
                <WeekdayAvgChart values={weekdayAverages} />
              </div>
              <div className="card">
                <h2>Motivos Mais Comuns de Falha</h2>
                <ReasonDoughnutChart items={reasonCounts} />
              </div>
            </div>
          </div>
        )}

        {/* ================= PAINEL: INSIGHTS ================= */}
        {panel === 'insights' && (
          <div>
            {/* Alertas Ativos */}
            {activeAlerts.length > 0 && (
              <div className="card">
                <h2>Alertas e Atenção Prioritária</h2>
                {activeAlerts.map(alert => (
                  <div key={alert.id} className={`alert-card ${alert.severity}`}>
                    <div style={{ flex: 1 }}>
                      <span className="alert-pill">{alert.severity}</span>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{alert.title}</div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        <RichText parts={alert.descParts} />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="ghost small"
                      onClick={() => dismissAlert(alert.id)}
                    >
                      Dispensar
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Predição de Sucesso para Hoje/Amanhã */}
            <div className="card">
              <h2>Predição de Aderência por Hábito</h2>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <button
                  type="button"
                  className={`ghost small ${predDayOffset === 0 ? 'active' : ''}`}
                  onClick={() => setPredDayOffset(0)}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  className={`ghost small ${predDayOffset === 1 ? 'active' : ''}`}
                  onClick={() => setPredDayOffset(1)}
                >
                  Amanhã
                </button>
              </div>

              {db.habits.map(h => {
                const targetDate = addDaysISO(todayISO(), predDayOffset);
                const pred = predictHabit(db, h.id, targetDate);
                if (!pred) return null;
                const pct = Math.round(pred.probability * 100);
                const colorClass = pct >= 70 ? 'high' : pct >= 40 ? 'medium' : 'low';

                return (
                  <div key={h.id} className="pred-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{h.name}</span>
                      <span style={{ fontWeight: 700 }}>{pct}% chance de sucesso</span>
                    </div>
                    <div className="pred-bar-wrap">
                      <div className={`pred-bar ${colorClass}`} style={{ width: `${pct}%` }}>
                        {pct}%
                      </div>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      {pred.factors.map(f => f.name).join(' • ') || pred.confidence}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Impacto de Tags de Contexto */}
            <div className="card">
              <h2>Impacto do Contexto nos seus Hábitos</h2>
              <p className="muted">Como suas rotinas e humores alteram as taxas de conclusão:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {computeTagImpacts(db, nutritionDays).map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: 'var(--bg)',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600 }}>{item.tag}</span>
                      <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>➔</span>
                      <span>{item.habit}</span>
                    </div>
                    <div style={{ fontWeight: 700, color: item.diff >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {item.diff >= 0 ? `+${item.diff}%` : `${item.diff}%`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= PAINEL: HISTÓRICO ================= */}
        {panel === 'history' && (
          <div className="card">
            <h2>Histórico de Registros</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px 10px' }}>Data</th>
                    <th style={{ padding: '8px 10px' }}>Hábitos (%)</th>
                    <th style={{ padding: '8px 10px' }}>Dieta (%)</th>
                    <th style={{ padding: '8px 10px' }}>Contexto (Tags)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(db.records)
                    .sort((a, b) => b.localeCompare(a))
                    .map(dateKey => {
                      const hScore = dayScore(db, dateKey);
                      const dScore = dietDayScore(db, dateKey, nutritionDays);
                      const tags = db.records[dateKey]?.tags || [];

                      return (
                        <tr key={dateKey} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>{fmtFullDate(dateKey)}</td>
                          <td style={{ padding: '8px 10px' }}>{hScore !== null ? `${hScore}%` : '—'}</td>
                          <td style={{ padding: '8px 10px' }}>{dScore !== null ? `${dScore}%` : '—'}</td>
                          <td style={{ padding: '8px 10px' }}>{tags.join(', ') || '—'}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                            <button
                              type="button"
                              className="ghost small"
                              onClick={() => {
                                setSelectedDate(dateKey);
                                setPanel('today');
                              }}
                            >
                              Ver / Editar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= MODAL: CONFIGURAÇÕES ================= */}
        {showSettings && (
          <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
            <div className="modal-panel" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Gerenciar Hábitos e Rotinas</h2>
                <button type="button" className="ghost small" onClick={() => setShowSettings(false)}>
                  ✕ Fechar
                </button>
              </div>

              {/* Lista de Hábitos Existentes */}
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: '1rem', marginBottom: 10 }}>Seus Hábitos Ativos</h3>
                {db.habits.map(h => (
                  <div
                    key={h.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{h.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{describeFreq(h)}</div>
                    </div>
                    <button
                      type="button"
                      className="ghost small danger"
                      onClick={() => {
                        if (confirm(`Excluir o hábito "${h.name}"?`)) {
                          persistDb({ ...db, habits: db.habits.filter(item => item.id !== h.id) });
                        }
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                ))}
              </div>

              {/* Adicionar Novo Hábito */}
              <div style={{ padding: 14, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '0.95rem', marginBottom: 10 }}>Adicionar Novo Hábito</h3>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const name = (form.elements.namedItem('hName') as HTMLInputElement).value.trim();
                    const freq = (form.elements.namedItem('hFreq') as HTMLSelectElement).value as any;
                    if (!name) return;

                    const newHabit: Habit = {
                      id: uid(),
                      name,
                      perMeal: false,
                      freq,
                      days: [0, 1, 2, 3, 4, 5, 6],
                      times: 1,
                    };
                    persistDb({ ...db, habits: [...db.habits, newHabit] });
                    form.reset();
                  }}
                >
                  <div className="form-row">
                    <input name="hName" placeholder="Nome do hábito (ex: Beber 2L água)" required />
                    <select name="hFreq" defaultValue="daily">
                      <option value="daily">Diário (todos os dias)</option>
                      <option value="weekdays">Segunda a Sexta</option>
                      <option value="weekly">Semanal</option>
                    </select>
                  </div>
                  <button type="submit" className="small" style={{ marginTop: 8 }}>
                    + Adicionar Hábito
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: BUSCA RÁPIDA ================= */}
        {showSearch && (
          <div className="modal-backdrop" onClick={() => setShowSearch(false)}>
            <div className="modal-panel" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Pesquisa Global</h2>
                <button type="button" className="ghost small" onClick={() => setShowSearch(false)}>
                  ✕ Fechar
                </button>
              </div>

              <input
                type="text"
                placeholder="Buscar por hábito, tag, refeição, nota..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
                style={{ width: '100%', marginBottom: 14 }}
              />

              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {searchResults.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                    {searchQuery ? 'Nenhum resultado encontrado.' : 'Digite um termo para pesquisar.'}
                  </div>
                ) : (
                  searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        if (item.targetDate) {
                          setSelectedDate(item.targetDate);
                        }
                        setPanel(item.targetPanel);
                        setShowSearch(false);
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600 }}>{item.title}</span>
                        <span style={{ fontSize: '0.75rem', background: 'var(--accent-soft)', padding: '2px 6px', borderRadius: 6 }}>
                          {item.kind}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        {item.subtitle} • {item.value}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: FOTO DE PROGRESSO ================= */}
        {photoPreviewUrl && (
          <div className="modal-backdrop" onClick={() => setPhotoPreviewUrl(null)}>
            <div
              className="modal-panel"
              style={{ maxWidth: 500, textAlign: 'center' }}
              onClick={e => e.stopPropagation()}
            >
              <img
                src={photoPreviewUrl}
                alt="Foto de Progresso"
                style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8 }}
              />
              <button
                type="button"
                className="ghost small"
                style={{ marginTop: 14 }}
                onClick={() => setPhotoPreviewUrl(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
