// src/WorkoutProfilesPage.tsx — Ficha de treino, quadro semanal, modelos prontos e modal de troca
import { useState, type ChangeEvent, type CSSProperties } from 'react';
import { Icon, Glyph, TopBar } from './ui';
import { MODELOS, treinosDeForca, type ModeloTreino } from './workoutTemplates';
import { dividirTitulo, lerExercicios, rotuloSemana, diaDaSemana } from './workoutFormat';
import { WORKOUT_TYPES } from './tacoDb';
import { S } from './styles';
import type { MealPlanDay, WorkoutKind, WorkoutProfile } from './types';

export interface WorkoutSelectionOption {
  type: WorkoutKind;
  color: string;
  typeLabel: string;
  exercises: string;
}

// ── MODAL TROCA DE TREINO ─────────────────────────────────────────────────────
export function WorkoutModal({
  day,
  onSelect,
  onClose,
  profiles = [],
}: {
  day: MealPlanDay;
  onSelect: (opt: WorkoutSelectionOption) => void;
  onClose: () => void;
  profiles?: WorkoutProfile[];
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(16,22,18,0.55)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', width: '100%', padding: 20, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Editar Treino — {day.fullName}</div>
          <button style={S.btn('var(--danger)')} onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        {/* Perfis do usuário */}
        {profiles.length > 0 && (
          <>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, marginBottom: 8 }}>MEUS TREINOS</div>
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {profiles.map((p, i) => {
                const color = WORKOUT_TYPES.find(w => w.type === p.type)?.color || 'var(--success)';
                const isActive = day.typeLabel === p.typeLabel;
                return (
                  <div key={i} onClick={() => onSelect({ type: p.type, color, typeLabel: p.typeLabel, exercises: p.exercises || '' })}
                    style={{ padding: '12px 14px', borderRadius: 12, cursor: 'pointer', border: '1px solid',
                      ...(isActive ? { background: `color-mix(in srgb, ${color} 14%, transparent)`, borderColor: color } : { background: 'var(--surface)', borderColor: 'var(--surface)' }) }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: isActive ? color : 'var(--text)' }}>{p.typeLabel}</div>
                      {isActive && <span style={S.badge(color)}>✓ Ativo</span>}
                    </div>
                    {p.exercises && <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-line', marginTop: 4 }}>{p.exercises}</div>}
                  </div>
                );
              })}
              {/* Opção descanso */}
              <div onClick={() => onSelect({ type: 'rest', color: 'var(--muted)', typeLabel: 'Descanso', exercises: 'Nenhum treino – foco em sono e recuperação' })}
                style={{ padding: '12px 14px', borderRadius: 12, cursor: 'pointer', border: '1px solid',
                  ...(day.type === 'rest' ? { background: 'var(--muted)18', borderColor: 'var(--muted)' } : { background: 'var(--surface)', borderColor: 'var(--surface)' }) }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: day.type === 'rest' ? 'var(--muted2)' : 'var(--text)' }}>Descanso</div>
              </div>
            </div>
          </>
        )}
        {profiles.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', flex: 1 }}>
            <div style={{ marginBottom: 10, color: 'var(--muted)', display: 'flex', justifyContent: 'center' }}><Icon name="dumbbell" size={40} stroke={1.5} /></div>
            <div style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 6 }}>Nenhum treino criado</div>
            <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 16 }}>Crie seus treinos na aba Treinos para poder selecioná-los aqui.</div>
            <button style={{ ...S.btn(), padding: '10px 20px' }} onClick={onClose}>Ir para Treinos</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MODELOS DE TREINO ─────────────────────────────────────────────────────────
// Lista de programas prontos; ao tocar em um, mostra a semana inteira antes de aplicar.
export function WorkoutTemplates({ onApply, onClose }: { onApply: (modelo: ModeloTreino) => void; onClose?: () => void }) {
  const [sel, setSel] = useState<string | null>(null);
  const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const modelo = MODELOS.find(m => m.id === sel);
  const cardBase: CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '14px 16px',
    marginBottom: 10,
    textAlign: 'left',
    width: '100%',
    cursor: 'pointer',
    color: 'var(--text)',
    fontFamily: 'inherit',
    display: 'block',
  };

  if (modelo) {
    const n = treinosDeForca(modelo);
    return (
      <div data-testid="template-preview" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 16, marginBottom: 12, textAlign: 'left' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, lineHeight: 1.2, color: 'var(--text)' }}>{modelo.nome}</div>
        <div style={{ fontSize: 14, color: 'var(--muted)', margin: '4px 0 12px', lineHeight: 1.5 }}>{modelo.resumo}</div>
        {modelo.semana.map((d, i) => (
          <details key={i} style={{ borderTop: '1px solid var(--border)', padding: '8px 0' }}>
            <summary style={{ cursor: 'pointer', fontSize: 14, fontWeight: 700, color: d.tipo === 'rest' ? 'var(--muted)' : 'var(--text)', listStyle: 'revert' }}>
              <span style={{ display: 'inline-block', width: 36, verticalAlign: 'top', color: 'var(--muted2)', fontWeight: 800 }}>{DIAS[i]}</span><span style={{ display: 'inline-block', verticalAlign: 'top', maxWidth: 'calc(100% - 48px)' }}>{d.rotulo}</span>
            </summary>
            <div style={{ whiteSpace: 'pre-line', fontSize: 14, lineHeight: 1.7, color: 'var(--muted2)', padding: '6px 0 2px 36px' }}>{d.exercicios}</div>
          </details>
        ))}
        {modelo.notas && (
          <details style={{ borderTop: '1px solid var(--border)', padding: '8px 0' }}>
            <summary style={{ cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Progressão e dicas</summary>
            <ul style={{ margin: '6px 0 0', paddingLeft: 20, fontSize: 14, lineHeight: 1.6, color: 'var(--muted2)' }}>
              {modelo.notas.map((t, i) => <li key={i} style={{ margin: '4px 0' }}>{t}</li>)}
            </ul>
            {modelo.fonte && <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>{modelo.fonte}</div>}
          </details>
        )}
        <div style={{ background: 'var(--accent-soft)', borderRadius: 12, padding: '10px 12px', margin: '12px 0', fontSize: 14, lineHeight: 1.5, color: 'var(--text)' }}>
          Ao usar este modelo, os 7 dias do seu plano de treino são substituídos e a meta semanal vira {n} {n === 1 ? 'treino' : 'treinos'}. Os treinos que você já salvou continuam na lista.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...S.btn(), flex: 1, padding: 11 }} onClick={() => onApply(modelo)}>Usar este modelo</button>
          <button style={{ ...S.btn('var(--muted)'), padding: 11 }} onClick={() => setSel(null)}>Voltar</button>
        </div>
      </div>
    );
  }
  return (
    <div data-testid="template-list" style={{ marginBottom: 12 }}>
      {MODELOS.map(m => (
        <button key={m.id} style={cardBase} onClick={() => setSel(m.id)}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, lineHeight: 1.2 }}>{m.nome}</div>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>{m.resumo}</div>
        </button>
      ))}
      {onClose && <button style={{ ...S.btn('var(--muted)'), padding: '9px 16px', fontSize: 14 }} onClick={onClose}>Fechar modelos</button>}
    </div>
  );
}

// ── FICHA DE TREINO ───────────────────────────────────────────────────────────
// Quadro da semana (7 linhas: dia e treino do dia) no topo; abaixo, uma prescrição por treino.
const rxTitulo: CSSProperties = { fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--text)', margin: 0, lineHeight: 1.15 };
const rxGhost: CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 12,
  color: 'var(--text-2)',
  minHeight: 44,
  minWidth: 44,
  padding: '0 12px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
};

export function QuadroSemana({
  plan,
  profiles,
  hoje,
  onGo,
}: {
  plan: MealPlanDay[];
  profiles: WorkoutProfile[];
  hoje: number;
  onGo: (profileId: string) => void;
}) {
  const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  return (
    <ul aria-label="Quadro da semana" style={{ listStyle: 'none', margin: '0 0 12px', padding: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      {DIAS.map((d, i) => {
        const dia: Partial<MealPlanDay> = plan?.[i] || {};
        const descanso = !dia.type || dia.type === 'rest';
        const { nome, foco } = dividirTitulo(dia.typeLabel);
        const alvo = !descanso ? profiles.find(p => p.typeLabel === dia.typeLabel) : undefined;
        const cor = WORKOUT_TYPES.find(w => w.type === dia.type)?.color || 'var(--success)';
        const eHoje = i === hoje;
        const conteudo = (
          <>
            <span className="lp-num" style={{ width: 38, flexShrink: 0, fontSize: 14, fontWeight: 800, color: eHoje ? 'var(--accent-dark)' : 'var(--text-2)' }}>{d}</span>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 15, fontWeight: descanso ? 400 : 600, color: descanso ? 'var(--muted)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{descanso ? 'Descanso' : nome}</span>
              {!descanso && foco && <span style={{ fontSize: 14, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{foco}</span>}
            </span>
            {eHoje && <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-dark)', background: 'var(--accent-soft)', borderRadius: 8, padding: '2px 8px', marginRight: descanso ? 0 : 8 }}>hoje</span>}
            {!descanso && <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 2, background: cor, flexShrink: 0 }} />}
          </>
        );
        const base: CSSProperties = {
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: '100%',
          minHeight: eHoje || !descanso ? 48 : 40,
          padding: '6px 14px',
          background: eHoje ? 'color-mix(in srgb, var(--accent-soft) 55%, var(--surface))' : 'transparent',
          boxSizing: 'border-box',
          textAlign: 'left',
          font: 'inherit',
          color: 'inherit',
          border: 'none',
          borderTopWidth: i ? 1 : 0,
          borderTopStyle: 'solid',
          borderTopColor: 'var(--border2)',
          borderLeft: eHoje ? '3px solid var(--accent)' : '3px solid transparent',
        };
        return (
          <li key={i} aria-current={eHoje ? 'date' : undefined}>
            {alvo
              ? <button type="button" onClick={() => onGo(alvo.id)} style={{ ...base, cursor: 'pointer' }} aria-label={`${d}: ${dia.typeLabel}. Ver o treino`}>{conteudo}</button>
              : <div style={base}>{conteudo}</div>}
          </li>
        );
      })}
    </ul>
  );
}

export interface WorkoutProfilesPageProps {
  profiles: WorkoutProfile[];
  plan: MealPlanDay[];
  onSave: (profile: WorkoutProfile) => void;
  onDelete: (id: string) => void;
  onApplyToDay: (profileId: string, dayIdx: number, isUsing: boolean) => void;
  onApplyTemplate: (modelo: ModeloTreino) => void;
  onBack?: () => void;
  tab?: string;
  setTab?: (t: 'plan' | 'shop' | 'workout') => void;
  cartCount?: number;
  onOpenProfile?: () => void;
  onLogout?: () => void;
  onHome?: () => void;
  workoutGoal: number;
  setWorkoutGoal: (g: number) => void;
}

export function WorkoutProfilesPage({
  profiles,
  plan,
  onSave,
  onDelete,
  onApplyToDay,
  onApplyTemplate,
  onOpenProfile,
  workoutGoal,
  setWorkoutGoal,
}: WorkoutProfilesPageProps) {
  const [editing, setEditing] = useState<WorkoutProfile | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [applied, setApplied] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const hoje = diaDaSemana();

  function usarModelo(m: ModeloTreino) {
    onApplyTemplate(m); setShowTemplates(false);
    const n = treinosDeForca(m);
    setApplied(`Modelo "${m.nome}" aplicado. Seus 7 dias foram atualizados e a meta virou ${n} ${n === 1 ? 'treino' : 'treinos'} por semana.`);
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* sem scroll */ }
  }

  function irPara(id: string) {
    const el = document.getElementById('rx-' + id);
    if (!el) return;
    const calmo = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: calmo ? 'auto' : 'smooth', block: 'start' });
    try { el.focus({ preventScroll: true }); } catch { /* sem foco */ }
  }

  function EditForm({ initial, onDone }: { initial: WorkoutProfile | null; onDone: () => void }) {
    const [form, setForm] = useState<WorkoutProfile>(
      initial || { id: 'wp' + Date.now(), type: 'strength', typeLabel: '', exercises: '' }
    );
    const set = (k: 'typeLabel' | 'exercises') => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));
    const rotulo: CSSProperties = { fontSize: 14, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6, display: 'block' };
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '4px solid var(--accent)', borderRadius: '6px 14px 14px 6px', padding: 16, marginBottom: 14 }}>
        <h2 style={{ ...rxTitulo, fontSize: 20, marginBottom: 14 }}>{initial ? 'Editar treino' : 'Novo treino'}</h2>
        <div style={{ marginBottom: 12 }}>
          <span style={rotulo} id="rx-tipo">Tipo</span>
          <div role="group" aria-labelledby="rx-tipo" style={{ display: 'flex', gap: 8 }}>
            {WORKOUT_TYPES.map(wt => (
              <button key={wt.type} type="button" aria-pressed={form.type === wt.type} aria-label={wt.label} onClick={() => setForm(f => ({ ...f, type: wt.type }))} style={{ flex: 1, minHeight: 44, padding: '8px 0', borderRadius: 12, border: '1px solid', cursor: 'pointer', fontSize: 18,
                ...(form.type === wt.type ? { background: `color-mix(in srgb, ${wt.color} 14%, transparent)`, borderColor: wt.color } : { background: 'var(--surface)', borderColor: 'var(--border)' }) }}>
                <Glyph name={wt.icon} size={20} />
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={rotulo} htmlFor="rx-nome">Nome do treino</label>
          <input id="rx-nome" style={S.input} value={form.typeLabel} onChange={set('typeLabel')} placeholder="Ex.: Treino A – Peito e tríceps" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={rotulo} htmlFor="rx-ex">Exercícios</label>
          <textarea id="rx-ex" style={{ ...S.input, minHeight: 140, resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit', fontSize: 15 }} value={form.exercises} onChange={set('exercises')}
            placeholder={"Supino reto 4×8 · RIR 1-2 · 2 min\nSupino inclinado 3×10\nCrucifixo 3×12\nTríceps polia 4×10"} />
          <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>Um exercício por linha, com séries×repetições. RIR e intervalo são opcionais.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...S.btn('var(--accent)'), flex: 1, padding: 11 }} onClick={() => { if (!form.typeLabel.trim()) return; onSave({ ...form, color: WORKOUT_TYPES.find(w => w.type === form.type)?.color || 'var(--success)' }); onDone(); }}>Salvar treino</button>
          <button style={rxGhost} onClick={onDone}>Cancelar</button>
        </div>
      </div>
    );
  }

  const DAYS_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const diasDeTreino = (plan || []).filter(d => d && d.type === 'strength').length;

  return (
    <div style={S.wrap}>
      <TopBar title="Ficha de treino" subtitle={rotuloSemana()} onOpenProfile={onOpenProfile}
        actions={<div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {profiles.length > 0 && <button style={{ ...rxGhost, color: 'var(--accent-dark)', borderColor: 'var(--accent)' }} onClick={() => { setShowTemplates(v => !v); setApplied(null); }} aria-expanded={showTemplates}>Modelos</button>}
          <button style={{ ...S.btn('var(--accent)'), padding: '0 14px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setShowNew(true)} aria-label="Novo treino"><Icon name="plus" size={18} stroke={2} />Novo</button>
        </div>} />

      <div style={{ padding: '16px 16px 100px' }}>
        <QuadroSemana plan={plan} profiles={profiles} hoje={hoje} onGo={irPara} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 4px 18px' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Meta semanal</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>Usada nos Insights de Hábitos e Performance.</div>
            {diasDeTreino !== workoutGoal && <div style={{ fontSize: 14, color: 'var(--warning)', marginTop: 2 }}>Seu plano tem {diasDeTreino} {diasDeTreino === 1 ? 'dia' : 'dias'} de musculação.</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button type="button" aria-label="Diminuir meta" style={{ ...rxGhost, fontSize: 20, padding: 0 }} onClick={() => setWorkoutGoal(Math.max(1, (workoutGoal || 1) - 1))}>−</button>
            <input type="number" min="1" max="14" aria-label="Meta de treinos por semana" value={workoutGoal} onChange={e => setWorkoutGoal(Math.max(1, parseInt(e.target.value, 10) || 1))}
              style={{ width: 48, minHeight: 44, textAlign: 'center', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface)', color: 'var(--text)', fontSize: 17, fontWeight: 800, fontFamily: 'inherit' }} />
            <button type="button" aria-label="Aumentar meta" style={{ ...rxGhost, fontSize: 20, padding: 0 }} onClick={() => setWorkoutGoal(Math.min(14, (workoutGoal || 1) + 1))}>+</button>
          </div>
        </div>

        {applied && <div role="status" data-testid="template-applied" style={{ background: 'var(--success-soft)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', marginBottom: 14, fontSize: 14, lineHeight: 1.5, color: 'var(--text)' }}>{applied}</div>}

        {showNew && <EditForm initial={null} onDone={() => setShowNew(false)} />}

        {showTemplates && profiles.length > 0 && !showNew && <WorkoutTemplates onApply={usarModelo} onClose={() => setShowTemplates(false)} />}

        {profiles.length === 0 && !showNew && (
          <div data-testid="treino-vazio" style={{ textAlign: 'center', padding: '12px 0 8px' }}>
            <h2 style={{ ...rxTitulo, fontSize: 22, marginBottom: 8 }}>Nenhum treino criado ainda</h2>
            <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>Comece por um modelo pronto: ele monta a semana inteira e você ajusta o que quiser depois.</div>
            <WorkoutTemplates onApply={usarModelo} />
            <div style={{ color: 'var(--muted)', fontSize: 14, margin: '4px 0 12px' }}>ou</div>
            <button style={{ ...S.btn('var(--accent)'), padding: '12px 28px' }} onClick={() => setShowNew(true)}>+ Criar do zero</button>
          </div>
        )}

        {profiles.length > 0 && <h2 style={{ ...rxTitulo, fontSize: 19, margin: '4px 0 12px' }}>Seus treinos</h2>}

        {profiles.map(p => {
          const color = WORKOUT_TYPES.find(w => w.type === p.type)?.color || 'var(--success)';
          if (editing?.id === p.id) return <EditForm key={p.id} initial={p} onDone={() => setEditing(null)} />;
          const { nome, foco } = dividirTitulo(p.typeLabel);
          const linhas = lerExercicios(p.exercises);
          const confirmando = confirmDel === p.id;
          return (
            <article key={p.id} id={'rx-' + p.id} tabIndex={-1} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `4px solid ${color}`, borderRadius: '6px 14px 14px 6px', marginBottom: 14, scrollMarginTop: 88, outline: 'none' }}>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, padding: '14px 12px 10px 16px' }}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ ...rxTitulo, fontSize: 22 }}>{nome}</h3>
                  <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>{foco || WORKOUT_TYPES.find(w => w.type === p.type)?.label}</div>
                </div>
                <button style={rxGhost} onClick={() => setEditing(p)} aria-label={`Editar ${nome}`}><Icon name="pencil" size={18} /></button>
              </header>

              {linhas.length > 0 && (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {linhas.map((l, i) => (
                    <li key={i} style={{ borderTop: '1px solid var(--border2)', padding: '10px 16px' }}>
                      {l.tipo === 'serie' ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                            <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', lineHeight: 1.35 }}>{l.nome}</span>
                            <span className="lp-num" style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap' }}>{l.dose}</span>
                          </div>
                          {(l.rir || l.intervalo) && (
                            <div className="lp-num" style={{ display: 'flex', gap: 16, fontSize: 14, color: 'var(--muted)', marginTop: 3 }}>
                              {l.rir && <span>RIR {l.rir}</span>}
                              {l.intervalo && <span>Intervalo {l.intervalo}</span>}
                            </div>
                          )}
                        </>
                      ) : <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>{l.texto}</div>}
                    </li>
                  ))}
                </ul>
              )}

              <footer style={{ borderTop: '1px solid var(--border2)', padding: '12px 16px 14px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>Dias no plano</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {DAYS_SHORT.map((d, di) => {
                    const isUsing = plan[di]?.typeLabel === p.typeLabel;
                    return (
                      <button key={di} type="button" aria-pressed={isUsing} aria-label={`${d}: ${isUsing ? 'remover do plano' : 'usar neste dia'}`} onClick={() => onApplyToDay(p.id, di, isUsing)}
                        style={{ flex: 1, minHeight: 44, padding: 0, borderRadius: 8, border: `1px solid ${isUsing ? color : 'var(--border)'}`,
                          background: isUsing ? color : 'var(--surface)', color: isUsing ? 'var(--on-accent)' : 'var(--text-2)',
                          fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {d}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 10, minHeight: 44 }}>
                  {confirmando ? (
                    <>
                      <span style={{ fontSize: 14, color: 'var(--text-2)', marginRight: 'auto' }}>Remover este treino da lista?</span>
                      <button style={rxGhost} onClick={() => setConfirmDel(null)}>Manter</button>
                      <button style={{ ...S.btn('var(--danger)'), padding: '0 14px' }} aria-label={`Confirmar remoção de ${nome}`} onClick={() => { setConfirmDel(null); onDelete(p.id); }}>Remover</button>
                    </>
                  ) : (
                    <button style={{ ...rxGhost, border: 'none', color: 'var(--danger)', fontWeight: 600 }} aria-label={`Remover ${nome}`} onClick={() => setConfirmDel(p.id)}><Icon name="trash" size={16} />Remover treino</button>
                  )}
                </div>
              </footer>
            </article>
          );
        })}
      </div>
    </div>
  );
}
