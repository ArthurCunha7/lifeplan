// src/ProfilePage.tsx — Perfil físico, metas nutricionais, tema, notificações, bloqueio e LGPD
import { useState, useEffect, type ChangeEvent, type CSSProperties } from 'react';
import { Icon, Glyph, TopBar } from './ui';
import { LockSettings } from './LockScreen';
import { NotificationSettings } from './Notifications';
import { ThemeToggleButton } from './ThemeToggle';
import { supabase, loadUserPlan } from './supabaseClient';
import { flushAndSaveUserPlan } from './planDataQueue';
import { ACTIVITY_FACTORS, GOAL_ADJUSTMENTS, calcTDEE, calcTargets, generatePlan } from './tacoDb';
import { S } from './styles';
import type { ActivityLevel, MealPlanDay, NutritionGoal, Sex, UserProfile } from './types';

// ── PRIVACIDADE E DADOS (LGPD): exportar e excluir a conta ───────────────────
const EXPORT_TABLES = [
  { key: 'perfil', table: 'profiles', col: 'id' },
  { key: 'plano_semanal', table: 'user_plans', col: 'user_id' },
  { key: 'treino_e_dieta', table: 'app_data', col: 'user_id' },
  { key: 'medidas_corporais', table: 'body_metrics', col: 'user_id' },
  { key: 'estudos', table: 'study_data', col: 'user_id' },
  { key: 'financas', table: 'finance_data', col: 'user_id' },
] as const;

const PHOTO_BUCKETS = ['progress-photos', 'receipts'] as const;

const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

async function listPhotoFiles(userId: string): Promise<Array<{ bucket: string; path: string }>> {
  const out: Array<{ bucket: string; path: string }> = [];
  for (const bucket of PHOTO_BUCKETS) {
    const { data, error } = await supabase.storage.from(bucket).list(userId, { limit: 1000 });
    if (error) {
      if (/not found/i.test(error.message || '')) continue;
      throw new Error('Fotos (' + bucket + '): ' + error.message);
    }
    (data || [])
      .filter(f => f.name && f.name !== '.emptyFolderPlaceholder')
      .forEach(f => out.push({ bucket, path: userId + '/' + f.name }));
  }
  return out;
}

async function buildExport(userId: string): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {
    exportado_em: new Date().toISOString(),
    aviso: 'Estes são os dados da sua conta no LifePlan. Guarde este arquivo em local seguro: ele contém informações pessoais.',
  };
  try {
    const { data: { user } } = await supabase.auth.getUser();
    result.conta = { id: userId, email: user?.email || null, criada_em: user?.created_at || null };
  } catch {
    result.conta = { id: userId };
  }
  for (const t of EXPORT_TABLES) {
    const { data, error } = await supabase.from(t.table).select('*').eq(t.col, userId);
    if (error) result[t.key] = { erro: error.message };
    else result[t.key] = t.key === 'medidas_corporais' ? (data || []) : ((data && data[0]) || null);
  }
  try {
    const { data: gastos, error: gErr } = await supabase.from('family_charges').select('*').or('member_id.eq.' + userId + ',leader_id.eq.' + userId);
    result.gastos_no_cartao_da_familia = gErr ? { erro: gErr.message } : (gastos || []);
  } catch (e) {
    result.gastos_no_cartao_da_familia = { erro: errText(e) };
  }
  try {
    const { data: ms } = await supabase.from('family_members').select('family_id').eq('user_id', userId);
    const ids = (ms || []).map((m: { family_id: string }) => m.family_id);
    if (ids.length) {
      const { data: fams } = await supabase.from('families').select('id,owner_id').in('id', ids);
      result.modo_familia = (fams || []).map((f: { id: string; owner_id: string }) => ({ familia: f.id, papel: f.owner_id === userId ? 'líder' : 'membro' }));
    } else result.modo_familia = [];
  } catch (e) {
    result.modo_familia = { erro: errText(e) };
  }
  try {
    const files = await listPhotoFiles(userId);
    result.fotos = {
      observacao: 'Os arquivos de imagem não vão dentro deste JSON; aqui estão os nomes. Salve as fotos que quiser antes de excluir a conta.',
      arquivos: files.map(f => f.bucket + '/' + f.path),
    };
  } catch (e) {
    result.fotos = { erro: errText(e) };
  }
  return result;
}

export function PrivacyCard({ userId, onAccountDeleted }: { userId: string; onAccountDeleted: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState<'' | 'export' | 'delete'>('');
  const [err, setErr] = useState('');
  const [leader, setLeader] = useState(false);
  const [exportMsg, setExportMsg] = useState('');
  const confirmed = typed.trim().toUpperCase() === 'EXCLUIR';

  async function doExport() {
    setErr(''); setExportMsg(''); setBusy('export');
    try {
      const obj = await buildExport(userId);
      const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'lifeplan-meus-dados-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setExportMsg('Arquivo gerado. Confira a pasta de downloads.');
    } catch (e) {
      setErr('Não foi possível gerar o arquivo: ' + errText(e));
    } finally {
      setBusy('');
    }
  }

  async function openDelete() {
    setTyped(''); setErr(''); setExportMsg(''); setOpen(true);
    try {
      const { data } = await supabase.from('families').select('id').eq('owner_id', userId);
      setLeader(!!(data && data.length));
    } catch {
      setLeader(false);
    }
  }

  async function doDelete() {
    if (!confirmed || busy) return;
    setErr(''); setBusy('delete');
    try {
      // 1) fotos (o banco não consegue apagar arquivos do Storage por SQL)
      const files = await listPhotoFiles(userId);
      for (const bucket of PHOTO_BUCKETS) {
        const paths = files.filter(f => f.bucket === bucket).map(f => f.path);
        for (let i = 0; i < paths.length; i += 100) {
          const { error } = await supabase.storage.from(bucket).remove(paths.slice(i, i + 100));
          if (error) throw new Error('Não foi possível apagar as fotos: ' + error.message);
        }
      }
      // 2) dados e login
      const { error } = await supabase.rpc('delete_my_account', { confirmacao: 'EXCLUIR' });
      if (error) {
        if (/could not find the function|does not exist/i.test(error.message || '')) {
          throw new Error('A exclusão ainda não foi ativada no banco de dados. Avise o administrador do app.');
        }
        throw new Error(error.message);
      }
      alert('Sua conta e todos os seus dados foram excluídos.');
      await onAccountDeleted();
    } catch (e) {
      setErr(errText(e));
      setBusy('');
    }
  }

  const btnGhost: CSSProperties = {
    ...S.btn('var(--surface2)'),
    color: 'var(--text)',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
  };

  return (
    <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.8 }}>PRIVACIDADE E DADOS</div>
      <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>Seus dados são seus. Você pode baixar uma cópia de tudo o que está guardado na sua conta ou excluí-la a qualquer momento.</div>
      <button onClick={doExport} disabled={!!busy} style={{ ...btnGhost, opacity: busy ? 0.6 : 1 }}><Icon name="download" size={18} />{busy === 'export' ? 'Gerando arquivo…' : 'Baixar meus dados'}</button>
      {exportMsg && <div role="status" style={{ fontSize: 14, color: 'var(--success)' }}>{exportMsg}</div>}
      {!open && err && <div role="alert" style={{ fontSize: 14, color: 'var(--warning)' }}>{err}</div>}
      <button onClick={openDelete} disabled={!!busy} style={{ ...btnGhost, color: 'var(--danger)' }}><Icon name="trash" size={18} />Excluir minha conta</button>
      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(16,22,18,0.55)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => !busy && setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Excluir minha conta" onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, padding: 20, maxHeight: '92vh', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ color: 'var(--danger)', display: 'flex' }}><Icon name="trash" size={22} /></span>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, color: 'var(--text)' }}>Excluir minha conta</div>
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.55, marginBottom: 12 }}>
              Isto apaga <strong>para sempre</strong> seu login e tudo o que você registrou: perfil, plano e treinos, medidas e fotos de progresso, estudos, finanças e fotos de recibos. Não dá para desfazer.
            </div>
            {leader && <div style={{ background: 'var(--warning-soft)', color: 'var(--warning)', border: '1px solid var(--warning)', borderRadius: 12, padding: '10px 12px', fontSize: 14, marginBottom: 12, lineHeight: 1.5 }}>Você é o líder de um modo família. Ao excluir a conta, o modo família é desfeito. Os outros membros continuam com os próprios dados e podem criar ou entrar em outro modo família.</div>}
            <button onClick={doExport} disabled={!!busy} style={{ ...btnGhost, marginBottom: 6, opacity: busy ? 0.6 : 1 }}><Icon name="download" size={18} />{busy === 'export' ? 'Gerando arquivo…' : 'Baixar meus dados antes'}</button>
            {exportMsg && <div role="status" style={{ fontSize: 14, color: 'var(--success)', marginBottom: 6 }}>{exportMsg}</div>}
            <label htmlFor="del-confirm" style={{ ...S.label, marginTop: 12 }}>PARA CONFIRMAR, DIGITE EXCLUIR</label>
            <input id="del-confirm" style={S.input} value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" placeholder="EXCLUIR" disabled={!!busy} />
            {err && <div role="alert" style={{ fontSize: 14, color: 'var(--warning)', marginTop: 10, lineHeight: 1.5 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setOpen(false)} disabled={busy === 'delete'} style={{ ...btnGhost, flex: 1 }}>Cancelar</button>
              <button onClick={doDelete} disabled={!confirmed || !!busy} style={{ ...S.btn('var(--danger)'), flex: 1, minHeight: 48, opacity: (!confirmed || busy) ? 0.45 : 1, cursor: (!confirmed || busy) ? 'not-allowed' : 'pointer' }}>{busy === 'delete' ? 'Excluindo…' : 'Excluir tudo'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export interface ProfilePageProps {
  userId: string | null;
  initialProfile: UserProfile | null;
  onSave: (plan: MealPlanDay[], profile: UserProfile) => void;
  onBack?: () => void;
  onLogout?: () => void;
  onAccountDeleted?: () => Promise<void> | void;
  onLockNow?: () => void;
  onLockWipe: () => void;
}

export function ProfilePage({
  userId,
  initialProfile,
  onSave,
  onBack,
  onLogout,
  onAccountDeleted,
  onLockNow,
  onLockWipe,
}: ProfilePageProps) {
  const [form, setForm] = useState<UserProfile>(
    initialProfile || { weight: '', height: '', age: '', sex: 'M', activity: 'moderado', goal: 'manter' }
  );
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Se já existe um perfil salvo no Supabase (usuário voltando numa nova
  // sessão) e ainda não temos os dados carregados nesta sessão, busca e
  // preenche o formulário.
  useEffect(() => {
    if (initialProfile || !userId) return;
    supabase.from('profiles').select('weight,height,age,sex,activity,goal').eq('id', userId).maybeSingle()
      .then(({ data }) => {
        if (data && data.weight) setForm(f => ({ ...f, ...(data as Partial<UserProfile>) }));
      });
  }, [userId, initialProfile]);

  const setNum = (k: 'weight' | 'height' | 'age') => (e: ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const tdee = form.weight && form.height && form.age
    ? calcTDEE({ weight: +form.weight, height: +form.height, age: +form.age, sex: form.sex, activity: form.activity })
    : null;
  const targets = tdee ? calcTargets({ weight: +form.weight, tdee, goal: form.goal }) : null;

  async function handle() {
    if (!userId) return;
    if (!form.weight || !form.height || !form.age) { alert('Preencha peso, altura e idade'); return; }
    setLoading(true);
    try {
      const { error: profErr } = await supabase.from('profiles').upsert({
        id: userId,
        weight: +form.weight,
        height: +form.height,
        age: +form.age,
        sex: form.sex,
        activity: form.activity,
        goal: form.goal,
      });
      if (profErr) throw profErr;
      const newPlan = generatePlan({
        weight: +form.weight,
        height: +form.height,
        age: +form.age,
        sex: form.sex,
        activity: form.activity,
        goal: form.goal,
      });
      // Preserva os treinos que o usuário já tinha aplicado a cada dia.
      let mergedPlan = newPlan;
      try {
        const existingPlan = await loadUserPlan(userId);
        if (existingPlan && existingPlan.length) {
          mergedPlan = newPlan.map((day, i) => {
            const old = existingPlan[i];
            if (old && old.typeLabel) return { ...day, type: old.type, typeLabel: old.typeLabel, exercises: old.exercises };
            return day;
          });
        }
      } catch { /* ignora */ }
      await flushAndSaveUserPlan(userId, mergedPlan);
      setDone(true); setTimeout(() => onSave(mergedPlan, form), 1200);
    } catch (e) {
      alert('Erro: ' + errText(e));
    } finally {
      setLoading(false);
    }
  }

  const numFields: ReadonlyArray<readonly ['weight' | 'height' | 'age', string, string]> = [
    ['weight', 'PESO (kg)', 'ex: 80'],
    ['height', 'ALTURA (cm)', 'ex: 175'],
    ['age', 'IDADE', 'ex: 25'],
  ];

  const targetMetrics: ReadonlyArray<readonly [string, string, string]> = targets ? [
    ['flame', 'TDEE', tdee + ' kcal'],
    ['utensils', 'Meta', targets.kcal + ' kcal'],
    ['dumbbell', 'Proteína', targets.prot + 'g'],
    ['leaf', 'Gordura', targets.fat + 'g'],
    ['activity', 'Carbs', targets.carbs + 'g'],
    ['scale', 'IMC', (+form.weight / (((+form.height) / 100) ** 2)).toFixed(1)],
  ] : [];

  return (
    <div style={S.wrap}>
      <TopBar title="Meu perfil" onBack={onBack} />
      <div style={{ padding: '16px 16px 0' }}><div style={{ background: 'var(--accent-soft)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 4, fontSize: 14, color: 'var(--text-2)' }}>Preencha seus dados para gerar um plano alimentar personalizado com alimentos da Tabela TACO.</div></div>
      <div style={S.card}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted2)', marginBottom: 14, letterSpacing: 0.8 }}>DADOS FÍSICOS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {numFields.map(([k, lb, ph]) => (
            <div key={k}><label style={S.label}>{lb}</label><input style={S.input} type="number" placeholder={ph} value={form[k]} onChange={setNum(k)} /></div>
          ))}
          <div><label style={S.label}>SEXO</label><select style={S.select} value={form.sex} onChange={e => setForm(f => ({ ...f, sex: e.target.value as Sex }))}><option value="M">Masculino</option><option value="F">Feminino</option></select></div>
        </div>
        <div style={{ marginBottom: 12 }}><label style={S.label}>NÍVEL DE ATIVIDADE</label><select style={S.select} value={form.activity} onChange={e => setForm(f => ({ ...f, activity: e.target.value as ActivityLevel }))}>{Object.entries(ACTIVITY_FACTORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
        <div><label style={S.label}>OBJETIVO</label><select style={S.select} value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value as NutritionGoal }))}>{Object.entries(GOAL_ADJUSTMENTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
      </div>
      {targets && (
        <div style={{ ...S.card, background: 'var(--success-soft)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', marginBottom: 12, letterSpacing: 0.8 }}>SEU PLANO CALCULADO</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
            {targetMetrics.map(([ic, lb, vl]) => (
              <div key={lb} style={{ background: 'var(--surface)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ marginBottom: 4, color: 'var(--accent)', display: 'flex', justifyContent: 'center' }}><Glyph name={ic} size={20} /></div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{vl}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{lb}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>Fórmula Mifflin-St Jeor · 30% proteína · 25% gordura · 45% carboidrato</div>
        </div>
      )}
      {done
        ? <div style={{ ...S.card, textAlign: 'center', background: 'var(--success-soft)' }}><div style={{ color: 'var(--success)', fontWeight: 700, fontSize: 16 }}>Plano gerado com sucesso!</div></div>
        : <div style={{ padding: '0 16px 16px' }}><button style={{ ...S.btn('var(--accent)'), width: '100%', padding: 14, fontSize: 15, opacity: loading ? 0.6 : 1 }} onClick={handle} disabled={loading}>{loading ? 'Gerando plano…' : 'Salvar e gerar plano semanal'}</button></div>
      }
      <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.8 }}>APARÊNCIA E CONTA</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, color: 'var(--text)' }}>Tema claro ou escuro</span>
          <ThemeToggleButton />
        </div>
        {onLogout && (
          <button onClick={onLogout} style={{ ...S.btn('var(--surface2)'), color: 'var(--text)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48 }}>
            <Icon name="logout" size={18} />Sair da conta
          </button>
        )}
      </div>
      {userId && <NotificationSettings userId={userId} />}
      {userId && onLockNow && <LockSettings userId={userId} onLockNow={onLockNow} onWipe={onLockWipe} />}
      {userId && onAccountDeleted && <PrivacyCard userId={userId} onAccountDeleted={onAccountDeleted} />}
    </div>
  );
}
