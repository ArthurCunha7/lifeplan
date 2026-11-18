// src/MealPlanApp.tsx — Nutrição, Lista de Compras, Comparador de Alimentos e integração com Treinos
import { useState, useMemo, useRef, useEffect, type Dispatch, type SetStateAction } from 'react';
import { Icon, Glyph, TopBar, EmptyState, Skeleton } from './ui';
import { montarModelo, type ModeloTreino } from './workoutTemplates';
import { fetchUserPlanData, extractPlanDays } from './supabaseClient';
import { registerPlanDataField, requestPlanDataSave } from './planDataQueue';
import { TACO_MAP, searchTACO, computeFoodMetrics, type FoodMetrics } from './tacoDb';
import { WorkoutModal, WorkoutProfilesPage, type WorkoutSelectionOption } from './WorkoutProfilesPage';
import { S } from './styles';
import type { MealFoodItem, MealPlanDay, ShoppingItem, TacoFood, WorkoutProfile } from './types';

// ── FOOD SEARCH MODAL ─────────────────────────────────────────────────────────
export function FoodModal({ onSelect, onClose }: { onSelect: (food: TacoFood) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const results = useMemo(() => searchTACO(q), [q]);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(16,22,18,0.55)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', width: '100%', padding: 20, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <input autoFocus style={S.input} placeholder="Buscar alimento TACO..." value={q} onChange={e => setQ(e.target.value)} />
          <button style={S.btn('var(--danger)')} onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {q.length < 2 && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 20, fontSize: 14 }}>Digite 2+ letras para buscar</div>}
          {results.map(t => (
            <div key={t.id} style={{ padding: '10px 12px', borderRadius: 12, cursor: 'pointer', marginBottom: 6, background: 'var(--surface)', border: '1px solid var(--surface)' }} onClick={() => onSelect(t)}>
              <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}>{t.n}</div>
              <div style={{ display: 'flex', gap: 6, fontSize: 12 }}>
                <span style={S.badge('var(--warning)')}>{t.e} kcal</span>
                <span style={S.badge('var(--info)')}>P {t.p}g</span>
                <span style={S.badge('var(--warning)')}>G {t.l}g</span>
                <span style={S.badge('var(--accent)')}>C {t.cb}g</span>
                <span style={{ color: 'var(--muted)' }}>por 100g</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── LISTA DE COMPRAS ──────────────────────────────────────────────────────────
export function ShoppingList({
  items,
  onToggle,
  onRemove,
  onClear,
  onOpenProfile,
  onGoToPlan,
}: {
  items: ShoppingItem[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onOpenProfile?: () => void;
  onGoToPlan?: () => void;
}) {
  const pending = items.filter(i => !i.checked);
  const done = items.filter(i => i.checked);
  return (
    <div style={S.wrap}>
      <TopBar title="Lista de compras" onOpenProfile={onOpenProfile}
        actions={done.length > 0 && <button style={{ ...S.btn('var(--surface2)'), color: 'var(--text)', border: '1px solid var(--border)', padding: '0 14px' }} onClick={onClear}>Limpar comprados</button>} />

      {items.length === 0 ? (
        <EmptyState icon="cart" title="Sua lista está vazia"
          text="No plano alimentar, toque no carrinho ao lado de um alimento para trazê-lo para cá."
          actionLabel={onGoToPlan ? 'Abrir plano alimentar' : undefined} onAction={onGoToPlan} />
      ) : (
        <>
          {pending.length > 0 && (
            <div style={{ ...S.card, marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted2)', marginBottom: 12, letterSpacing: 0.8 }}>A COMPRAR ({pending.length})</div>
              {pending.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--surface)' }}>
                  <button onClick={() => onToggle(item.id)} style={{ width: 22, height: 22, borderRadius: 8, border: '2px solid var(--success)', background: 'transparent', cursor: 'pointer', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 2 }}>{item.qty}g · {item.kcal} kcal</div>
                  </div>
                  <button onClick={() => onRemove(item.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}><Icon name="x" size={18} /></button>
                </div>
              ))}
            </div>
          )}
          {done.length > 0 && (
            <div style={{ ...S.card, opacity: 0.6 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted2)', marginBottom: 12, letterSpacing: 0.8 }}>COMPRADO ({done.length})</div>
              {done.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--surface)' }}>
                  <button onClick={() => onToggle(item.id)} style={{ width: 22, height: 22, borderRadius: 8, border: '2px solid var(--success)', background: 'var(--success-soft)', cursor: 'pointer', flexShrink: 0, fontSize: 14 }}>✓</button>
                  <div style={{ flex: 1, textDecoration: 'line-through', color: 'var(--muted)', fontSize: 14 }}>{item.name}</div>
                  <button onClick={() => onRemove(item.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}><Icon name="x" size={18} /></button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <div style={{ height: 80 }} />
    </div>
  );
}

// ── COMPARADOR DE ALIMENTOS ──────────────────────────────────────────────────
interface ComparatorSlotState {
  food: TacoFood | null;
  qty: number;
  price: string;
}

export function FoodSlot({
  label,
  slot,
  setSlot,
  accent,
}: {
  label: string;
  slot: ComparatorSlotState;
  setSlot: Dispatch<SetStateAction<ComparatorSlotState>>;
  accent: string;
}) {
  const [query, setQuery] = useState(slot.food ? slot.food.n : '');
  const [open, setOpen] = useState(false);
  const results = useMemo(() => searchTACO(query, 8), [query]);

  function pick(food: TacoFood) {
    setSlot(s => ({ ...s, food }));
    setQuery(food.n);
    setOpen(false);
  }

  return (
    <div style={{ flex: '1 1 220px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: accent, marginBottom: 8, letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) setSlot(s => ({ ...s, food: null })); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar alimento..."
          style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: '0 12px', height: 44, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'var(--surface2)', color: 'var(--text)' }}
        />
        {open && results.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 2, zIndex: 20, maxHeight: 180, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            {results.map(r => (
              <div key={r.id} onClick={() => pick(r)} style={{ padding: '12px 12px', fontSize: 14, cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                {r.n}
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>Quantidade (g)</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <input type="number" value={slot.qty} onChange={e => setSlot(s => ({ ...s, qty: parseFloat(e.target.value) || 0 }))}
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: '0 10px', height: 44, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'var(--surface2)', color: 'var(--text)' }} />
            <button onClick={() => setSlot(s => ({ ...s, qty: 1000 }))} style={{ fontSize: 14, fontWeight: 700, color: accent, background: 'none', border: '1px solid var(--border)', borderRadius: 12, padding: '0 10px', minWidth: 44, cursor: 'pointer', whiteSpace: 'nowrap' }}>1kg</button>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>Preço (R$)</div>
          <input type="number" step="0.01" value={slot.price} onChange={e => setSlot(s => ({ ...s, price: e.target.value }))}
            placeholder="0,00" style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: '0 10px', height: 44, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'var(--surface2)', color: 'var(--text)' }} />
        </div>
      </div>
    </div>
  );
}

type ComparatorPriorityId = 'protein' | 'price' | 'kcal';

const COMPARATOR_PRIORITIES: ReadonlyArray<{
  id: ComparatorPriorityId;
  label: string;
  key: 'proteinPerReal' | 'pricePerKg' | 'kcalPerReal';
  fmt: (v: number) => string;
  lowerIsBetter?: boolean;
}> = [
  { id: 'protein', label: 'Mais proteína por R$', key: 'proteinPerReal', fmt: v => `${v.toFixed(1)}g/R$` },
  { id: 'price', label: 'Mais barato por kg', key: 'pricePerKg', fmt: v => `R$${v.toFixed(2)}/kg`, lowerIsBetter: true },
  { id: 'kcal', label: 'Mais calorias por R$', key: 'kcalPerReal', fmt: v => `${v.toFixed(0)}kcal/R$` },
];

export function FoodComparator() {
  const [priority, setPriority] = useState<ComparatorPriorityId>('protein');
  const [slotA, setSlotA] = useState<ComparatorSlotState>({ food: null, qty: 1000, price: '' });
  const [slotB, setSlotB] = useState<ComparatorSlotState>({ food: null, qty: 1000, price: '' });

  const mA = useMemo(() => computeFoodMetrics(slotA), [slotA]);
  const mB = useMemo(() => computeFoodMetrics(slotB), [slotB]);
  const p = COMPARATOR_PRIORITIES.find(x => x.id === priority) || COMPARATOR_PRIORITIES[0];

  let winner: 'A' | 'B' | null = null;
  if (mA && mB) {
    const vA = mA[p.key];
    const vB = mB[p.key];
    if (vA !== vB) winner = p.lowerIsBetter ? (vA < vB ? 'A' : 'B') : (vA > vB ? 'A' : 'B');
  }

  const comparedSlots: ReadonlyArray<readonly ['A' | 'B', ComparatorSlotState, FoodMetrics | null, string]> = [
    ['A', slotA, mA, 'var(--info)'],
    ['B', slotB, mB, 'var(--warning)'],
  ];

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 16, marginBottom: 16, boxShadow: 'none' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 22, lineHeight: '26px', color: 'var(--text)', marginBottom: 2 }}>Comparador de alimentos</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 12 }}>Qual alimento vale mais a pena levar pra casa?</div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {COMPARATOR_PRIORITIES.map(pr => (
          <button key={pr.id} onClick={() => setPriority(pr.id)}
            style={{ fontSize: 14, fontWeight: 700, padding: '10px 14px', minHeight: 44, borderRadius: 22, cursor: 'pointer', fontFamily: 'inherit',
              background: priority === pr.id ? 'var(--accent)' : 'var(--surface)', color: priority === pr.id ? 'var(--on-accent)' : 'var(--muted)',
              border: `1px solid ${priority === pr.id ? 'var(--accent)' : 'var(--border)'}` }}>
            {pr.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <FoodSlot label="Alimento A" slot={slotA} setSlot={setSlotA} accent="var(--info)" />
        <FoodSlot label="Alimento B" slot={slotB} setSlot={setSlotB} accent="var(--warning)" />
      </div>

      {mA && mB && (
        <div style={{ marginTop: 14, background: winner ? 'var(--accent-soft)' : 'var(--surface)', border: `1px solid ${winner ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 12, padding: '12px 14px' }}>
          {winner ? (
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-dark)', marginBottom: 8 }}>
              {winner === 'A' ? slotA.food?.n : slotB.food?.n} vale mais a pena ({p.label})
            </div>
          ) : (
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--muted2)', marginBottom: 8 }}>Empate nesse critério</div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            {comparedSlots.map(([key, slot, m, accent]) => m && (
              <div key={key} style={{ flex: 1, fontSize: 14, color: 'var(--text)', lineHeight: 1.7,
                border: winner === key ? `2px solid ${accent}` : '1px solid transparent', borderRadius: 12, padding: '6px 8px' }}>
                <div style={{ fontWeight: 800, color: accent, marginBottom: 2 }}>{slot.food?.n}</div>
                <div>Proteína: {m.proteinPerReal.toFixed(1)}g / R$</div>
                <div>Calorias: {m.kcalPerReal.toFixed(0)}kcal / R$</div>
                <div>Preço/kg: R${m.pricePerKg.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export type MealPlanTab = 'plan' | 'shop' | 'workout';

export interface MealPlanAppProps {
  onLogout?: () => void;
  userId: string | null;
  onOpenProfile?: () => void;
  onHome?: () => void;
  initialTab?: MealPlanTab;
}

// ── MEAL PLAN APP ─────────────────────────────────────────────────────────────
export function MealPlanApp({ onLogout, userId, onOpenProfile, onHome, initialTab }: MealPlanAppProps) {
  const [plan, setPlan] = useState<MealPlanDay[] | null>(null);
  const [tab, setTab] = useState<MealPlanTab>(initialTab || 'plan');
  // A barra inferior troca Nutrição/Compras/Treino reaproveitando esta mesma tela
  // (sem remontar), então a aba precisa acompanhar o que foi pedido.
  useEffect(() => { if (initialTab) setTab(initialTab); }, [initialTab]);
  const [dayIdx, setDayIdx] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  const [editFood, setEditFood] = useState<string | null>(null);
  const [editMeal, setEditMeal] = useState<{ mi: number; field: 'name' | 'time' } | null>(null);
  const [showSearch, setShowSearch] = useState<number | null>(null);
  const [showWorkout, setShowWorkout] = useState(false);
  const [showMealCount, setShowMealCount] = useState(false);
  const [shopping, setShopping] = useState<ShoppingItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [workoutProfiles, setWorkoutProfiles] = useState<WorkoutProfile[]>([]);
  const [workoutGoal, setWorkoutGoal] = useState(3);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const timerProfiles = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const planRef = useRef(plan);
  const shoppingRef = useRef(shopping);
  const workoutProfilesRef = useRef(workoutProfiles);
  const workoutGoalRef = useRef(workoutGoal);
  planRef.current = plan;
  shoppingRef.current = shopping;
  workoutProfilesRef.current = workoutProfiles;
  workoutGoalRef.current = workoutGoal;

  // Rede de segurança extra: cobre o caso de recarregar a página (F5) ou fechar a aba de repente.
  useEffect(() => {
    if (!userId) return;
    const flushNow = () => requestPlanDataSave(userId);
    const onVis = () => { if (document.visibilityState === 'hidden') flushNow(); };
    window.addEventListener('pagehide', flushNow);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pagehide', flushNow);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [userId]);

  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!userId || !dataLoaded) return;
    const unregs = [
      registerPlanDataField('plan', () => planRef.current),
      registerPlanDataField('shopping', () => shoppingRef.current),
      registerPlanDataField('workoutProfiles', () => workoutProfilesRef.current),
      registerPlanDataField('workoutGoalPerWeek', () => workoutGoalRef.current),
    ];
    return () => unregs.forEach(u => u());
  }, [userId, dataLoaded]);

  useEffect(() => {
    setDataLoaded(false);
    fetchUserPlanData(userId)
      .then(pd => {
        const saved = extractPlanDays(pd);
        setPlan(saved && saved.length ? saved : []);
        if (pd?.shopping) setShopping(pd.shopping);
        if (pd?.workoutProfiles) setWorkoutProfiles(pd.workoutProfiles);
        if (pd?.workoutGoalPerWeek) setWorkoutGoal(pd.workoutGoalPerWeek);
      })
      .catch(() => setPlan([]))
      .finally(() => setDataLoaded(true));
  }, [userId]);

  useEffect(() => {
    if (!plan || !plan.length || !userId || !dataLoaded) return;
    clearTimeout(timer.current);
    setSaving(true);
    timer.current = setTimeout(() => {
      requestPlanDataSave(userId);
      setSaveMsg('Salvo'); setSaving(false); setTimeout(() => setSaveMsg(''), 2000);
    }, 1200);
    return () => { clearTimeout(timer.current); requestPlanDataSave(userId); };
  }, [plan, userId, dataLoaded]);

  useEffect(() => {
    if (!userId || !dataLoaded) return;
    const t = setTimeout(() => requestPlanDataSave(userId), 400);
    return () => { clearTimeout(t); requestPlanDataSave(userId); };
  }, [shopping, userId, dataLoaded]);

  useEffect(() => {
    if (!userId || !dataLoaded) return;
    clearTimeout(timerProfiles.current);
    timerProfiles.current = setTimeout(() => requestPlanDataSave(userId), 400);
    return () => { clearTimeout(timerProfiles.current); requestPlanDataSave(userId); };
  }, [workoutProfiles, workoutGoal, userId, dataLoaded]);

  // ── helpers de plano
  function updateQty(mi: number, fid: string, qty: number) {
    setPlan(prev => prev ? prev.map((d, di) => {
      if (di !== dayIdx) return d;
      return {
        ...d,
        meals: d.meals.map((m, mii) => {
          if (mii !== mi) return m;
          return {
            ...m,
            foods: m.foods.map(f => {
              if (f.id !== fid) return f;
              const u = { ...f, qty };
              if (f.tacoId && TACO_MAP[f.tacoId]) {
                const t = TACO_MAP[f.tacoId];
                const fc = qty / 100;
                u.kcal = Math.round(t.e * fc);
                u.p = +((t.p * fc).toFixed(1));
                u.l = +((t.l * fc).toFixed(1));
                u.cb = +((t.cb * fc).toFixed(1));
              }
              return u;
            }),
          };
        }),
      };
    }) : prev);
  }

  function removeFood(mi: number, fid: string) {
    setPlan(prev => prev ? prev.map((d, di) => di !== dayIdx ? d : { ...d, meals: d.meals.map((m, mii) => mii !== mi ? m : { ...m, foods: m.foods.filter(f => f.id !== fid) }) }) : prev);
  }

  function addFood(mi: number, t: TacoFood) {
    const nf: MealFoodItem = { id: 'a' + Math.random().toString(36).slice(2), name: t.n, qty: 100, tacoId: t.id, kcal: Math.round(t.e), p: t.p, l: t.l, cb: t.cb };
    setPlan(prev => prev ? prev.map((d, di) => di !== dayIdx ? d : { ...d, meals: d.meals.map((m, mii) => mii !== mi ? m : { ...m, foods: [...m.foods, nf] }) }) : prev);
    setShowSearch(null);
  }

  function updateMeal(mi: number, field: 'name' | 'time', value: string) {
    setPlan(prev => prev ? prev.map((d, di) => di !== dayIdx ? d : { ...d, meals: d.meals.map((m, mii) => mii !== mi ? m : { ...m, [field]: value }) }) : prev);
  }

  // ── helpers carrinho
  function addToCart(food: MealFoodItem) {
    if (shopping.find(i => i.name === food.name)) return;
    setShopping(prev => [...prev, { id: food.id + 'c' + Date.now(), name: food.name, qty: food.qty, kcal: food.kcal, checked: false }]);
  }
  function toggleCart(id: string) { setShopping(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i)); }
  function removeCart(id: string) { setShopping(prev => prev.filter(i => i.id !== id)); }
  function clearDone() { setShopping(prev => prev.filter(i => !i.checked)); }

  // ── troca treino — propaga para todos os dias com mesmo typeLabel
  function applyWorkout(opt: WorkoutSelectionOption) {
    if (!plan) return;
    const prevLabel = plan[dayIdx]?.typeLabel;
    setPlan(prev => prev ? prev.map((d, di) => {
      if (d.typeLabel === prevLabel || di === dayIdx) {
        return { ...d, type: opt.type, typeLabel: opt.typeLabel, exercises: opt.exercises || '' };
      }
      return d;
    }) : prev);
    setWorkoutProfiles(prev => {
      const idx = prev.findIndex(p => p.typeLabel === opt.typeLabel);
      if (idx >= 0) { const next = [...prev]; next[idx] = { ...prev[idx], ...opt }; return next; }
      return [...prev, { ...opt, id: 'wp' + Date.now() }];
    });
    setShowWorkout(false);
  }

  // ── criar/editar perfil de treino
  function saveProfile(profile: WorkoutProfile) {
    setWorkoutProfiles(prev => {
      const idx = prev.findIndex(p => p.id === profile.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = profile; return next; }
      return [...prev, profile];
    });
    if (profile.typeLabel) {
      setPlan(prev => prev ? prev.map(d => d.typeLabel === profile.typeLabel ? { ...d, type: profile.type, exercises: profile.exercises || '' } : d) : prev);
    }
  }

  function deleteProfile(id: string) {
    setWorkoutProfiles(prev => prev.filter(p => p.id !== id));
  }

  // ── usar um modelo de treino pronto: monta a semana, salva os treinos e ajusta a meta
  function applyTemplate(modelo: ModeloTreino) {
    const r = montarModelo(modelo, plan, workoutProfiles);
    setPlan(r.plan);
    setWorkoutProfiles(r.profiles);
    setWorkoutGoal(r.meta);
  }

  // ── redistribuir refeições
  function redistributeMeals(count: number) {
    const TEMPLATES: Record<number, Array<{ time: string; name: string; icon: string }>> = {
      2: [
        { time: '12:00', name: 'Almoço', icon: 'utensils' },
        { time: '19:00', name: 'Jantar', icon: 'moon' },
      ],
      3: [
        { time: '07:00', name: 'Café da Manhã', icon: 'sun' },
        { time: '13:00', name: 'Almoço', icon: 'utensils' },
        { time: '19:00', name: 'Jantar', icon: 'moon' },
      ],
      4: [
        { time: '07:00', name: 'Café da Manhã', icon: 'sun' },
        { time: '12:00', name: 'Almoço', icon: 'utensils' },
        { time: '16:00', name: 'Lanche', icon: 'droplet' },
        { time: '20:00', name: 'Jantar', icon: 'moon' },
      ],
      5: [
        { time: '07:00', name: 'Café da Manhã', icon: 'sun' },
        { time: '10:00', name: 'Lanche 1', icon: 'droplet' },
        { time: '13:00', name: 'Almoço', icon: 'utensils' },
        { time: '16:30', name: 'Pré-Treino', icon: 'zap' },
        { time: '20:00', name: 'Pós-Treino / Jantar', icon: 'dumbbell' },
      ],
      6: [
        { time: '07:00', name: 'Café da Manhã', icon: 'sun' },
        { time: '10:00', name: 'Lanche 1', icon: 'droplet' },
        { time: '13:00', name: 'Almoço', icon: 'utensils' },
        { time: '16:30', name: 'Pré-Treino', icon: 'zap' },
        { time: '20:00', name: 'Pós-Treino / Jantar', icon: 'dumbbell' },
        { time: '22:00', name: 'Ceia', icon: 'moon' },
      ],
    };
    setPlan(prev => prev ? prev.map((d, di) => {
      if (di !== dayIdx) return d;
      const allFoods = d.meals.flatMap(m => m.foods);
      const tmpl = TEMPLATES[count] || TEMPLATES[5];
      const newMeals = tmpl.map((t, ti) => ({
        ...t,
        foods: allFoods.filter((_, fi) => fi % tmpl.length === ti),
      }));
      return { ...d, meals: newMeals };
    }) : prev);
    setShowMealCount(false);
  }

  const dayTotals = useMemo(() => {
    const day = plan?.[dayIdx];
    if (!day) return { kcal: 0, p: 0, l: 0, cb: 0 };
    const t = { kcal: 0, p: 0, l: 0, cb: 0 };
    day.meals.forEach(m => m.foods.forEach(f => { t.kcal += f.kcal; t.p += f.p; t.l += f.l; t.cb += f.cb; }));
    return { kcal: t.kcal, p: +t.p.toFixed(1), l: +t.l.toFixed(1), cb: +t.cb.toFixed(1) };
  }, [plan, dayIdx]);

  const cartCount = shopping.filter(i => !i.checked).length;

  const tabTitle = ({ plan: 'Nutrição', shop: 'Lista de compras', workout: 'Ficha de treino' } as const)[tab] || 'Nutrição';
  if (!plan) return (
    <div style={S.wrap}>
      <TopBar title={tabTitle} onOpenProfile={onOpenProfile} />
      <Skeleton rows={3} />
    </div>
  );
  if (!plan.length) {
    const vazio = ({
      workout: { icon: 'dumbbell', title: 'Monte seu plano de treino', text: 'Conte um pouco sobre você (peso, rotina e objetivo) e o LifePlan sugere os treinos da semana.' },
      shop: { icon: 'cart', title: 'Sua lista começa pelo plano', text: 'Configure seu perfil para gerar o plano alimentar. Depois é só tocar no carrinho ao lado dos alimentos.' },
      plan: { icon: 'leaf', title: 'Monte seu plano alimentar', text: 'Informe peso, altura, rotina e objetivo para gerar um cardápio personalizado com a Tabela TACO.' },
    } as const)[tab];
    return (
      <div style={S.wrap}>
        <TopBar title={tabTitle} onOpenProfile={onOpenProfile} />
        <EmptyState icon={vazio.icon} title={vazio.title} text={vazio.text} actionLabel="Configurar meu perfil" onAction={onOpenProfile} />
        {tab === 'plan' && <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px' }}><FoodComparator /></div>}
      </div>
    );
  }

  const day = plan[dayIdx];
  const tc = ({ strength: 'var(--success)', cardio: 'var(--info)', rest: 'var(--muted)' } as const)[day?.type] || 'var(--muted)';

  // ── render aba treinos
  if (tab === 'workout') return (
    <WorkoutProfilesPage
      profiles={workoutProfiles}
      plan={plan}
      onSave={saveProfile}
      onDelete={deleteProfile}
      onApplyTemplate={applyTemplate}
      onApplyToDay={(profileId, dayI, isUsing) => {
        if (isUsing) {
          setPlan(prev => prev ? prev.map((d, di) => di === dayI ? { ...d, type: 'rest', typeLabel: 'Descanso', exercises: 'Nenhum treino – foco em sono e recuperação' } : d) : prev);
          return;
        }
        const p = workoutProfiles.find(wp => wp.id === profileId);
        if (!p) return;
        setPlan(prev => prev ? prev.map((d, di) => di === dayI ? { ...d, type: p.type, typeLabel: p.typeLabel, exercises: p.exercises || '' } : d) : prev);
      }}
      onBack={() => setTab('plan')}
      workoutGoal={workoutGoal} setWorkoutGoal={setWorkoutGoal}
      tab={tab} setTab={setTab} cartCount={cartCount} onOpenProfile={onOpenProfile} onLogout={onLogout} onHome={onHome}
    />
  );

  // ── render lista de compras
  if (tab === 'shop') return (
    <ShoppingList items={shopping} onToggle={toggleCart} onRemove={removeCart} onClear={clearDone} onOpenProfile={onOpenProfile} onGoToPlan={() => setTab('plan')} />
  );

  const macroCards: ReadonlyArray<readonly [string, string, string, string]> = [
    ['dumbbell', dayTotals.p + 'g', 'proteína', 'var(--info)'],
    ['leaf', dayTotals.l + 'g', 'gordura', 'var(--warning)'],
    ['activity', dayTotals.cb + 'g', 'carbs', 'var(--accent)'],
    ['flame', day.burned + 'kcal', 'queimado', 'var(--text-2)'],
  ];

  // ── render plano
  return (
    <div style={S.wrap}>
      <TopBar title="Nutrição" onOpenProfile={onOpenProfile}
        status={saving ? 'Salvando…' : (saveMsg || null)} />

      {/* Day tabs */}
      <div style={{ display: 'flex', overflowX: 'auto', gap: 8, padding: '16px 20px', scrollbarWidth: 'none' }}>
        {plan.map((d, i) => (
          <button key={d.id} onClick={() => setDayIdx(i)} style={{ flexShrink: 0, minHeight: 44, padding: '8px 16px', borderRadius: 12, border: '1px solid', cursor: 'pointer', fontSize: 14, fontWeight: 700,
            ...(i === dayIdx ? { background: d.type === 'rest' ? 'var(--surface3)' : d.type === 'cardio' ? 'var(--info-soft)' : 'var(--accent-soft)', borderColor: d.type === 'rest' ? 'var(--muted)' : d.type === 'cardio' ? 'var(--info)' : 'var(--accent)', color: d.type === 'rest' ? 'var(--text-2)' : d.type === 'cardio' ? 'var(--info)' : 'var(--accent-dark)' } : { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--muted)' })
          }}>
            <div>{d.short}</div>
            {(d.type === 'rest' || workoutProfiles.some(p => p.typeLabel === d.typeLabel)) && <div style={{ fontSize: 12, marginTop: 2 }}>{d.typeLabel.split('–')[0].trim()}</div>}
          </button>
        ))}
      </div>

      {/* Day header */}
      <div style={{ ...S.card, background: `linear-gradient(135deg,${tc}18,${tc}08)`, border: `1px solid ${tc}33` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{day.fullName}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              {(day.type === 'rest' || workoutProfiles.some(p => p.typeLabel === day.typeLabel)) && <div style={{ fontSize: 14, color: tc, fontWeight: 700 }}>{day.typeLabel}</div>}
              <button onClick={() => setShowWorkout(true)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--muted2)', padding: '8px 12px', minHeight: 40, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Treino</button>
              <button onClick={() => setShowMealCount(true)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--muted2)', padding: '8px 12px', minHeight: 40, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Refeições</button>
            </div>
            {day.exercises && (day.type === 'rest' || workoutProfiles.some(p => p.typeLabel === day.typeLabel)) && <div style={{ fontSize: 14, color: 'var(--muted2)', marginTop: 6, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{day.exercises.replace(/·/g, '\n')}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: tc }}>{dayTotals.kcal}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>kcal totais</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {macroCards.map(([ic, v, l, c]) => (
            <div key={l} style={{ background: `color-mix(in srgb, ${c} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${c} 25%, transparent)`, borderRadius: 12, padding: '8px 12px', flex: 1, minWidth: 60, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', color: c }}><Glyph name={ic} size={16} /></div>
              <div style={{ fontSize: 14, fontWeight: 800, color: c }}>{v}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Meals */}
      {day.meals.map((meal, mi) => {
        const mt = meal.foods.reduce((t, f) => ({ kcal: t.kcal + f.kcal, p: t.p + f.p, l: t.l + f.l, cb: t.cb + f.cb }), { kcal: 0, p: 0, l: 0, cb: 0 });
        return (
          <div key={mi} style={S.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ display: 'inline-flex', color: 'var(--accent)' }}><Glyph name={meal.icon} size={22} /></span>
              <div style={{ flex: 1 }}>
                {editMeal?.mi === mi && editMeal?.field === 'name'
                  ? <input autoFocus style={{ ...S.input, padding: '4px 8px', fontSize: 14, fontWeight: 700, marginBottom: 2 }} value={meal.name}
                      onChange={e => updateMeal(mi, 'name', e.target.value)} onBlur={() => setEditMeal(null)} onKeyDown={e => e.key === 'Enter' && setEditMeal(null)} />
                  : <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', cursor: 'pointer' }} onClick={() => setEditMeal({ mi, field: 'name' })} title="Toque para editar">{meal.name} <span style={{ fontSize: 12, color: 'var(--muted)' }}></span></div>
                }
                {editMeal?.mi === mi && editMeal?.field === 'time'
                  ? <input autoFocus style={{ ...S.input, padding: '2px 6px', fontSize: 12, width: 80, marginTop: 2 }} type="time" value={meal.time}
                      onChange={e => updateMeal(mi, 'time', e.target.value)} onBlur={() => setEditMeal(null)} />
                  : <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, cursor: 'pointer', marginTop: 2 }} onClick={() => setEditMeal({ mi, field: 'time' })} title="Toque para editar">{meal.time} <span style={{ fontSize: 12 }}></span></div>
                }
              </div>
              <span style={S.badge('var(--warning)')}>{mt.kcal} kcal</span>
            </div>
            {meal.foods.map(food => {
              const inCart = shopping.some(i => i.name === food.name && !i.checked);
              return (
                <div key={food.id} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--border2)' }}>
                  {editFood === food.id
                    ? <input style={{ ...S.input, width: 70, padding: '4px 8px', fontSize: 12 }} type="number" value={food.qty} onChange={e => updateQty(mi, food.id, +e.target.value)} onBlur={() => setEditFood(null)} autoFocus />
                    : <span style={{ fontSize: 12, color: 'var(--info)', fontWeight: 700, cursor: 'pointer', minWidth: 40 }} onClick={() => setEditFood(food.id)}>{food.qty}g</span>
                  }
                  <span style={{ flex: '1 1 140px', fontSize: 14, color: 'var(--text)' }}>{food.name}</span>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 3, fontSize: 12 }}>
                      <span style={S.badge('var(--warning)')}>{food.kcal}</span>
                      <span style={S.badge('var(--info)')}>P{food.p}</span>
                      <span style={S.badge('var(--warning)')}>G{food.l}</span>
                      <span style={S.badge('var(--accent)')}>C{food.cb}</span>
                    </div>
                    <button onClick={() => addToCart(food)} title="Adicionar à lista de compras"
                      style={{ background: inCart ? 'var(--success-soft)' : 'var(--surface)', border: `1px solid ${inCart ? 'var(--success)' : 'var(--border)'}`, borderRadius: 8, color: inCart ? 'var(--success)' : 'var(--muted)', cursor: 'pointer', fontSize: 14, padding: '3px 6px', lineHeight: 1 }}>
                      <Icon name="cart" size={16} />
                    </button>
                    <button style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14, padding: '0 2px' }} onClick={() => removeFood(mi, food.id)}><Icon name="x" size={18} /></button>
                  </div>
                </div>
              );
            })}
            <button style={{ ...S.btn('var(--accent-fill)'), border: '1px dashed var(--border)', width: '100%', marginTop: 10, fontSize: 12 }} onClick={() => setShowSearch(mi)}>
              + Adicionar alimento TACO
            </button>
          </div>
        );
      })}

      <div style={{ padding: '8px 16px 0' }}><FoodComparator /></div>
      <div style={{ height: 80 }} />

      {showSearch !== null && <FoodModal onSelect={t => addFood(showSearch, t)} onClose={() => setShowSearch(null)} />}
      {showMealCount && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(16,22,18,0.55)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowMealCount(false)}>
          <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', width: '100%', padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Dividir Refeições — {day.fullName}</div>
              <button aria-label="Fechar" style={{ ...S.btn('transparent'), color: 'var(--muted)', padding: 0, width: 44 }} onClick={() => setShowMealCount(false)}><Icon name="x" size={20} /></button>
            </div>
            <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>Escolha em quantas refeições distribuir os macros do dia. Os alimentos serão redistribuídos automaticamente.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
              {[2, 3, 4, 5, 6].map(n => {
                const active = day.meals.length === n;
                return (
                  <button key={n} onClick={() => redistributeMeals(n)}
                    style={{ padding: '16px 0', borderRadius: 12, border: '1px solid', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      ...(active ? { background: 'var(--success-soft)', borderColor: 'var(--success)', color: 'var(--success)' } : { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--muted2)' }) }}>
                    <span style={{ fontSize: 24, fontWeight: 900 }}>{n}</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{active ? '✓ Atual' : 'refeições'}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 16, fontSize: 14, color: 'var(--muted)', textAlign: 'center' }}>* Apenas o dia atual será alterado</div>
          </div>
        </div>
      )}
      {showWorkout && <WorkoutModal day={day} onSelect={applyWorkout} onClose={() => setShowWorkout(false)} profiles={workoutProfiles} />}
    </div>
  );
}
