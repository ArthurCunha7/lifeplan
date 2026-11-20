// src/financas/familySync.ts — Sincronização nuvem, Modo Família e Storage de recibos
import { supabase } from '../supabaseClient';
import { migrateFinanceState, stateForCloud } from './financeState';
import type {
  FamilyChargeRecord,
  FamilyClosingRecord,
  FamilyInfo,
  FamilyMemberOverview,
  FamilyPaidPeriod,
  FamilyPeriodGroup,
  FaturaItem,
  FaturaRowItem,
  FinanceAppState,
} from './financeTypes';

export async function fetchPersonalFinanceCloud(
  userId: string,
): Promise<{ data: FinanceAppState | null; isNewAccount: boolean; error: Error | null }> {
  const { data: row, error } = await supabase
    .from('finance_data')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return { data: null, isNewAccount: false, error: new Error(error.message) };
  }
  if (!row || !row.data) {
    return { data: null, isNewAccount: true, error: null };
  }
  return { data: migrateFinanceState(row.data), isNewAccount: false, error: null };
}

export async function savePersonalFinanceCloud(userId: string, state: FinanceAppState): Promise<void> {
  const payload = stateForCloud(state);
  const nowIso = new Date().toISOString();
  const { data: upd, error: updErr } = await supabase
    .from('finance_data')
    .update({ data: payload, updated_at: nowIso })
    .eq('user_id', userId)
    .select('user_id');

  if (updErr) throw updErr;
  if (!upd || upd.length === 0) {
    const { error: insErr } = await supabase
      .from('finance_data')
      .insert({ user_id: userId, data: payload, updated_at: nowIso });
    if (insErr) throw insErr;
  }
}

export async function fetchMyFamily(
  userId: string,
): Promise<{ family: FamilyInfo | null; error: Error | null }> {
  const { data: ms, error } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', userId);

  if (error) return { family: null, error: new Error(error.message) };

  const ids = (ms || []).map(m => String((m as { family_id: string }).family_id));
  if (ids.length === 0) return { family: null, error: null };

  const { data: fams, error: e2 } = await supabase
    .from('families')
    .select('id, owner_id, invite_code')
    .in('id', ids);

  if (e2) return { family: null, error: new Error(e2.message) };

  const list = (fams || []) as FamilyInfo[];
  const found = list.find(f => f.owner_id === userId) || list[0] || null;
  return { family: found, error: null };
}

export async function createMyFamily(
  newName = 'Minha Família',
): Promise<{ family: FamilyInfo | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('create_family', { new_name: newName });
  if (error) return { family: null, error: new Error(error.message) };
  const row = (Array.isArray(data) ? data[0] : data) as FamilyInfo | null;
  return { family: row || null, error: null };
}

export async function joinFamilyByCode(code: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.rpc('join_family_by_code', {
    code: code.trim().toUpperCase(),
  });
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

export async function fetchFamilyMembersOverview(): Promise<{
  members: FamilyMemberOverview[];
  loaded: boolean;
}> {
  const { data, error } = await supabase.rpc('family_members_overview');
  if (error) {
    console.error('Erro ao listar membros:', error);
    return { members: [], loaded: false };
  }
  const rows = (data || []) as Array<{ user_id: string; email: string; is_leader: boolean }>;
  const members: FamilyMemberOverview[] = rows
    .filter(m => !m.is_leader)
    .map(m => ({ user_id: m.user_id, email: m.email || '' }));
  return { members, loaded: true };
}

export async function fetchLeaderClosings(leaderId: string): Promise<{
  closings: FamilyClosingRecord[];
  ok: boolean;
}> {
  const { data, error } = await supabase
    .from('family_closings')
    .select('*')
    .eq('leader_id', leaderId)
    .order('cutoff', { ascending: true });

  if (error) {
    console.error('Fechamentos indisponíveis:', error);
    return { closings: [], ok: false };
  }
  return { closings: (data || []) as FamilyClosingRecord[], ok: true };
}

export async function createFamilyClosing(params: {
  familyId: string;
  leaderId: string;
  memberId: string;
  cutoff: string;
  label: string;
}): Promise<{ closing: FamilyClosingRecord | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('family_closings')
    .insert({
      family_id: params.familyId,
      leader_id: params.leaderId,
      member_id: params.memberId,
      cutoff: params.cutoff,
      label: params.label,
    })
    .select();

  if (error) return { closing: null, error: new Error(error.message) };
  const row = (Array.isArray(data) ? data[0] : data) as FamilyClosingRecord | null;
  return {
    closing:
      row || {
        id: `tmp-${Date.now()}`,
        family_id: params.familyId,
        leader_id: params.leaderId,
        member_id: params.memberId,
        cutoff: params.cutoff,
        label: params.label,
        paid_at: null,
      },
    error: null,
  };
}

export async function updateClosingPaid(
  closingId: string,
  paid: boolean,
): Promise<{ paidAt: string | null; error: Error | null }> {
  const when = paid ? new Date().toISOString() : null;
  const { error } = await supabase
    .from('family_closings')
    .update({ paid_at: when })
    .eq('id', closingId);

  if (error) return { paidAt: null, error: new Error(error.message) };
  return { paidAt: when, error: null };
}

export async function deleteFamilyClosing(closingId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('family_closings').delete().eq('id', closingId);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

export function closingsOf(
  list: FamilyClosingRecord[],
  leaderId: string | null,
  memberId: string,
): FamilyClosingRecord[] {
  return list
    .filter(c => c.member_id === memberId && (leaderId === null || c.leader_id === leaderId))
    .slice()
    .sort((a, b) => String(a.cutoff).localeCompare(String(b.cutoff)));
}

export function isPixCharge(c: Pick<FamilyChargeRecord, 'source_id'>): boolean {
  return String(c.source_id || '').startsWith('pix:');
}

export function groupByPeriod(
  charges: FamilyChargeRecord[],
  sortedClosings: FamilyClosingRecord[],
): FamilyPeriodGroup[] {
  const open: FamilyPeriodGroup = { closing: null, rows: [] };
  const by = new Map<string, FamilyPeriodGroup>(
    sortedClosings.map(c => [c.id, { closing: c, rows: [] }]),
  );
  charges.forEach(ch => {
    const d = ch.date || '';
    const matched = d ? sortedClosings.find(x => d <= String(x.cutoff)) : undefined;
    const bucket = matched ? by.get(matched.id) : undefined;
    (bucket || open).rows.push(ch);
  });
  return [
    open,
    ...sortedClosings
      .slice()
      .reverse()
      .map(c => by.get(c.id) || { closing: c, rows: [] }),
  ];
}

export function desiredCharges(
  state: FinanceAppState,
  familyId: string | null,
  leaderId: string | null,
  leaderLabel: string,
  familyMembers: FamilyMemberOverview[],
): Map<string, FamilyChargeRecord> {
  const out = new Map<string, FamilyChargeRecord>();
  if (!familyId || !leaderId) return out;

  const memberIds = new Set(familyMembers.map(m => m.user_id));
  const iso = (d?: string | null): string | null =>
    d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;

  state.faturas.forEach(f => {
    if (f.family) return;
    (f.rows || []).forEach(r => {
      if (r.profileIdx === null || r.profileIdx === undefined || !r.id) return;
      const uid = state.profiles[r.profileIdx]?.linkedUserId;
      if (!uid || uid === leaderId || !memberIds.has(uid)) return;
      const v = Math.round((parseFloat(String(r.value)) || 0) * 100) / 100;
      if (!(v > 0)) return;
      out.set(String(r.id), {
        family_id: familyId,
        leader_id: leaderId,
        member_id: uid,
        source_id: String(r.id),
        leader_label: leaderLabel,
        fatura_name: f.name || '',
        description: r.name || '',
        category: r.category || null,
        parcelas: r.parcelas ? String(r.parcelas) : '',
        value: v,
        date: iso(r.date),
      });
    });
  });

  (state.pixRows || []).forEach(p => {
    if (p.profileIdx === null || p.profileIdx === undefined || !p.id) return;
    const uid = state.profiles[p.profileIdx]?.linkedUserId;
    if (!uid || uid === leaderId || !memberIds.has(uid)) return;
    const v = Math.round((parseFloat(String(p.value)) || 0) * 100) / 100;
    if (!(v > 0)) return;
    out.set(`pix:${p.id}`, {
      family_id: familyId,
      leader_id: leaderId,
      member_id: uid,
      source_id: `pix:${p.id}`,
      leader_label: leaderLabel,
      fatura_name: 'Pix',
      description: p.desc || '',
      category: p.category || null,
      parcelas: '',
      value: v,
      date: iso(p.date),
    });
  });

  return out;
}

export async function syncFamilyChargesToCloud(params: {
  state: FinanceAppState;
  familyId: string;
  leaderId: string;
  leaderLabel: string;
  familyMembers: FamilyMemberOverview[];
}): Promise<void> {
  const want = desiredCharges(
    params.state,
    params.familyId,
    params.leaderId,
    params.leaderLabel,
    params.familyMembers,
  );

  const { data: have, error } = await supabase
    .from('family_charges')
    .select('source_id,member_id,value,description,category,date,fatura_name,parcelas,leader_label')
    .eq('leader_id', params.leaderId);

  if (error) throw error;

  const haveRows = (have || []) as FamilyChargeRecord[];
  const haveMap = new Map<string, FamilyChargeRecord>(haveRows.map(h => [h.source_id, h]));

  const up: FamilyChargeRecord[] = [];
  const del: string[] = [];

  want.forEach((w, k) => {
    const h = haveMap.get(k);
    if (
      !h ||
      h.member_id !== w.member_id ||
      Number(h.value) !== w.value ||
      (h.description || '') !== w.description ||
      (h.category || null) !== w.category ||
      (h.date || null) !== w.date ||
      (h.fatura_name || '') !== w.fatura_name ||
      (h.parcelas || '') !== w.parcelas ||
      (h.leader_label || '') !== w.leader_label
    ) {
      up.push(w);
    }
  });

  haveMap.forEach((_h, k) => {
    if (!want.has(k)) del.push(k);
  });

  if (up.length > 0) {
    const { error: e1 } = await supabase
      .from('family_charges')
      .upsert(up, { onConflict: 'leader_id,source_id' });
    if (e1) throw e1;
  }
  if (del.length > 0) {
    const { error: e2 } = await supabase
      .from('family_charges')
      .delete()
      .eq('leader_id', params.leaderId)
      .in('source_id', del);
    if (e2) throw e2;
  }
}

export async function fetchMemberChargesAndClosings(memberId: string): Promise<{
  charges: FamilyChargeRecord[];
  closings: FamilyClosingRecord[];
}> {
  const { data, error } = await supabase
    .from('family_charges')
    .select('*')
    .eq('member_id', memberId)
    .order('date', { ascending: true });

  if (error) {
    console.error('Erro ao carregar gastos da família:', error);
    return { charges: [], closings: [] };
  }

  const cl = await supabase.from('family_closings').select('*').eq('member_id', memberId);
  if (cl.error) {
    console.error('Fechamentos indisponíveis:', cl.error);
  }

  return {
    charges: (data || []) as FamilyChargeRecord[],
    closings: cl.error ? [] : ((cl.data || []) as FamilyClosingRecord[]),
  };
}

export function injectFamilyChargesIntoState(
  baseState: FinanceAppState,
  memberId: string,
  charges: FamilyChargeRecord[],
  memberClosings: FamilyClosingRecord[],
): { nextState: FinanceAppState; paidPeriods: FamilyPaidPeriod[] } {
  const cleanFaturas = (baseState.faturas || []).filter(f => !f.family);
  let target = baseState.profiles.findIndex(p => p.linkedUserId === memberId);
  if (target < 0) target = 0;

  const paidPeriods: FamilyPaidPeriod[] = [];
  const familyFaturas: FaturaItem[] = [];

  const byLeader: Record<string, FamilyChargeRecord[]> = {};
  charges.forEach(c => {
    (byLeader[c.leader_id] = byLeader[c.leader_id] || []).push(c);
  });

  Object.keys(byLeader)
    .sort()
    .forEach(lid => {
      const cs = byLeader[lid];
      const who = cs[0]?.leader_label || 'família';
      groupByPeriod(cs, closingsOf(memberClosings, lid, memberId)).forEach(per => {
        if (per.rows.length === 0) return;
        const rows: FaturaRowItem[] = per.rows.map(c => ({
          id: `fc-${c.source_id}`,
          date: c.date || '',
          name: c.description || (isPixCharge(c) ? 'Pix' : ''),
          parcelas: c.parcelas || '',
          value: Number(c.value) || 0,
          profileIdx: target,
          category: c.category || null,
          family: true,
          faturaOrigem: isPixCharge(c) ? 'Pix' : c.fatura_name || 'Cartão',
        }));

        const cl = per.closing;
        if (cl && cl.paid_at) {
          paidPeriods.push({ who, closing: cl, rows });
          return;
        }
        familyFaturas.push({
          id: `family-${lid}-${cl ? cl.id : 'aberto'}`,
          family: true,
          kind: 'periodo',
          who,
          closing: cl ? { id: cl.id, cutoff: cl.cutoff, label: cl.label } : null,
          name: `${cl ? cl.label || 'Fechamento' : 'Em aberto'} · ${who}`,
          fechamento: '',
          vencimento: '',
          rows,
        });
      });
    });

  return {
    nextState: {
      ...baseState,
      faturas: [...cleanFaturas, ...familyFaturas],
    },
    paidPeriods,
  };
}

export async function uploadReceiptFile(
  userId: string,
  rowId: string,
  file: File,
): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/${rowId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('receipts').upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

export async function createReceiptSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('receipts').createSignedUrl(path, 300);
  if (error || !data?.signedUrl) {
    throw error || new Error('URL assinada indisponível');
  }
  return data.signedUrl;
}

export async function deleteReceiptFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from('receipts').remove([path]);
  if (error) console.error('Erro ao remover recibo:', error);
}
