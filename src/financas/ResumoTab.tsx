// src/financas/ResumoTab.tsx — Aba "Resumo" (paridade com o controle-financeiro.html antigo):
// saldo final por perfil com extrato editável + gerenciamento de perfis, categorias e modo família.
import { useState } from 'react';
import type {
  ActiveProfileInfo,
  FamilyInfo,
  FamilyMemberOverview,
  FinanceAppState,
  ProfileTransactionItem,
} from './financeTypes';
import { getAllRowsByProfileDetailed, getAllTransactionsByProfile, shiftIndexedObjectInsert, shiftIndexedObjectRemove } from './financeState';
import { FinanceIcon, NumericInput, fmtMoney, getProfileColor } from './FinanceIcons';
import { FamilyChoiceCard, FamilySummaryCard } from './FamilyModals';
import { confirmDialog } from '../dialog';

const num = (v: unknown): number => parseFloat(String(v ?? 0)) || 0;

export interface ResumoTabProps {
  state: FinanceAppState;
  persist: (next: FinanceAppState) => void;
  masked: boolean;
  profiles: ActiveProfileInfo[];
  userId: string | null;
  family: FamilyInfo | null;
  familyMembers: FamilyMemberOverview[];
  familyBusy: boolean;
  onCreateFamily: () => void;
  onJoinFamily: (code: string) => void;
  onOpenFamilyAccounts: () => void;
}

export function ResumoTab({
  state,
  persist,
  masked,
  profiles,
  userId,
  family,
  familyMembers,
  familyBusy,
  onCreateFamily,
  onJoinFamily,
  onOpenFamilyAccounts,
}: ResumoTabProps) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [hidden, setHidden] = useState<Record<number, boolean>>({});
  const isLeader = !!family && family.owner_id === userId;

  // ── Edição do extrato (pagamento / pix / gasto de fatura) ──
  const patchTx = (tx: ProfileTransactionItem, field: 'date' | 'name' | 'value', v: string | number) => {
    if (tx.txKind === 'payment') {
      const key = field === 'name' ? 'desc' : field;
      persist({ ...state, payments: state.payments.map(p => (p.id === tx.id ? { ...p, [key]: v } : p)) });
    } else if (tx.txKind === 'pix') {
      const key = field === 'name' ? 'desc' : field;
      persist({ ...state, pixRows: state.pixRows.map(p => (p.id === tx.id ? { ...p, [key]: v } : p)) });
    } else {
      persist({
        ...state,
        faturas: state.faturas.map(f =>
          f.id === tx.faturaId ? { ...f, rows: f.rows.map(r => (r.id === tx.id ? { ...r, [field]: v } : r)) } : f
        ),
      });
    }
  };

  const removeTx = async (tx: ProfileTransactionItem) => {
    if (!(await confirmDialog('Este lançamento sai do extrato.', { title: 'Excluir lançamento?', confirmLabel: 'Excluir', danger: true }))) return;
    if (tx.txKind === 'payment') persist({ ...state, payments: state.payments.filter(p => p.id !== tx.id) });
    else if (tx.txKind === 'pix') persist({ ...state, pixRows: state.pixRows.filter(p => p.id !== tx.id) });
    else
      persist({
        ...state,
        faturas: state.faturas.map(f => (f.id === tx.faturaId ? { ...f, rows: f.rows.filter(r => r.id !== tx.id) } : f)),
      });
  };

  // ── Perfis ──
  const shiftIdx = (v: number | null | undefined, from: number, delta: 1 | -1): number | null | undefined =>
    v == null ? v : delta === 1 ? (v >= from ? v + 1 : v) : v === from ? null : v > from ? v - 1 : v;

  const reindexState = (base: FinanceAppState, from: number, delta: 1 | -1): FinanceAppState => ({
    ...base,
    faturas: base.faturas.map(f => ({ ...f, rows: f.rows.map(r => ({ ...r, profileIdx: shiftIdx(r.profileIdx, from, delta) ?? null })) })),
    payments: base.payments.map(p => ({ ...p, profileIdx: shiftIdx(p.profileIdx, from, delta) ?? null })),
    pixRows: base.pixRows.map(p => ({ ...p, profileIdx: shiftIdx(p.profileIdx, from, delta) ?? null })),
    balancoTables: base.balancoTables.map(t =>
      t.type === 'planejamento'
        ? { ...t, rows: t.rows.map(r => ({ ...r, profileIdx: shiftIdx(r.profileIdx, from, delta) ?? null })) }
        : t
    ),
  });

  const addProfile = () => {
    // Entra antes do último: o último perfil continua sendo o "personalizável".
    const at = state.profiles.length - 1;
    const base = reindexState(state, at, 1);
    const nextProfiles = [...base.profiles];
    nextProfiles.splice(at, 0, { name: `Perfil ${state.profiles.length}`, linkedUserId: null });
    persist({
      ...base,
      profiles: nextProfiles,
      activeProfiles: nextProfiles.length,
      profileCategories: shiftIndexedObjectInsert(base.profileCategories, at, []),
      entradasProfiles: shiftIndexedObjectInsert(base.entradasProfiles, at, true),
    });
  };

  const removeProfile = async (idx: number) => {
    if (state.profiles.length <= 1 || idx === state.profiles.length - 1) return;
    const name = state.profiles[idx]?.name || 'este perfil';
    if (!(await confirmDialog(`Os lançamentos de "${name}" ficam sem perfil (não são apagados).`, { title: 'Remover perfil?', confirmLabel: 'Remover', danger: true }))) return;
    const base = reindexState(state, idx, -1);
    const nextProfiles = base.profiles.filter((_, i) => i !== idx);
    persist({
      ...base,
      profiles: nextProfiles,
      activeProfiles: nextProfiles.length,
      profileCategories: shiftIndexedObjectRemove(base.profileCategories, idx),
      entradasProfiles: shiftIndexedObjectRemove(base.entradasProfiles, idx),
    });
  };

  const patchProfile = (idx: number, patch: Partial<FinanceAppState['profiles'][number]>) =>
    persist({ ...state, profiles: state.profiles.map((p, i) => (i === idx ? { ...p, ...patch } : p)) });

  const linkMyAccount = (idx: number) => {
    if (!userId) return;
    persist({
      ...state,
      profiles: state.profiles.map((p, i) => ({
        ...p,
        linkedUserId: i === idx ? userId : p.linkedUserId === userId ? null : p.linkedUserId,
      })),
    });
  };

  const setCats = (idx: number, cats: string[]) => persist({ ...state, profileCategories: { ...state.profileCategories, [idx]: cats } });

  const lastIdx = state.profiles.length - 1;

  return (
    <div className="resumo-tab">
      <div className="section-head"><h2 className="section-title">Saldo final por perfil</h2></div>

      <div className="profile-grid">
        {profiles.map(({ name, idx }) => {
          const rows = getAllRowsByProfileDetailed(state, idx);
          const totalGastos = rows.reduce((s, r) => s + num(r.value), 0);
          const pays = state.payments.filter(p => p.profileIdx === idx);
          const totalPago = pays.reduce((s, p) => s + num(p.value), 0);
          const saldo = totalPago - totalGastos;
          const hide = masked || !!hidden[idx];
          const money = (v: number) => fmtMoney(v, hide);
          const isOpen = !!open[idx];
          const nLanc = rows.length + pays.length;
          const toggle = () => setOpen(o => ({ ...o, [idx]: !isOpen }));
          const txs = isOpen ? getAllTransactionsByProfile(state, idx) : [];
          return (
            <div key={idx} className={`profile-card${isOpen ? ' open' : ''}`} data-p={idx} style={isOpen ? { gridColumn: '1 / -1' } : undefined}>
              <div className="profile-card-head">
                <button
                  type="button"
                  className="profile-card-toggle"
                  aria-expanded={isOpen}
                  aria-controls={`perfil-extrato-${idx}`}
                  aria-label={`${name}: ${isOpen ? 'recolher' : 'ver'} lançamentos`}
                  onClick={toggle}
                >
                  <span className="profile-card-name" style={{ margin: 0 }}>{name}</span>
                  <span className="row-chev" aria-hidden="true"><FinanceIcon name="chevron" size={16} /></span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  aria-label={hide ? 'Mostrar valores' : 'Ocultar valores'}
                  title="Mostrar/ocultar o saldo deste perfil"
                  onClick={() => setHidden(h => ({ ...h, [idx]: !hide }))}
                >
                  <FinanceIcon name={hide ? 'eyeOff' : 'eye'} size={18} />
                </button>
              </div>
              <div className="profile-card-summary" onClick={toggle}>
                <div className="profile-card-row">
                  <span className="label">Total de gastos</span>
                  <span className="val-cell negative">{hide ? '' : '−'}{money(totalGastos)}</span>
                </div>
                <div className="profile-card-row">
                  <span className="label">Total pago</span>
                  <span className="val-cell positive">{hide ? '' : '+'}{money(totalPago)}</span>
                </div>
                <div className="profile-card-row">
                  <span className="label" style={{ fontWeight: 600 }}>Saldo</span>
                  <span className={`profile-card-final ${saldo >= 0 ? 'positive' : 'negative'}`}>
                    {!hide && saldo >= 0 ? '+' : ''}{money(saldo)}
                  </span>
                </div>
                <div className="profile-card-hint">
                  {isOpen ? 'Recolher lançamentos' : nLanc ? `Ver lançamentos (${nLanc})` : 'Ver lançamentos'}
                </div>
              </div>

              {isOpen && (
                <div id={`perfil-extrato-${idx}`} className="profile-card-extrato">
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Valor</th><th /></tr>
                      </thead>
                      <tbody>
                        {txs.length === 0 && (
                          <tr><td colSpan={5}><div className="empty">Nenhum lançamento no extrato deste perfil ainda.</div></td></tr>
                        )}
                        {txs.map(tx => {
                          const isPay = tx.txKind === 'payment';
                          return (
                            <tr key={`${tx.txKind}-${tx.id}`}>
                              <td>
                                <input type="date" aria-label="Data" value={tx.txDate || ''} onChange={e => patchTx(tx, 'date', e.target.value)} />
                              </td>
                              <td>
                                <span className={`val-cell ${isPay ? 'positive' : 'negative'}`} style={{ fontSize: 12, fontWeight: 700 }}>
                                  {isPay ? 'Pagamento' : tx.faturaName || 'Gasto'}
                                </span>
                              </td>
                              <td>
                                <input type="text" aria-label="Descrição" placeholder="Descrição" value={tx.name || ''} onChange={e => patchTx(tx, 'name', e.target.value)} style={{ width: '100%' }} />
                              </td>
                              <td>
                                <NumericInput
                                  ariaLabel="Valor"
                                  value={num(tx.value)}
                                  disabled={hide}
                                  placeholder={hide ? '••••' : '0,00'}
                                  className={`val-cell ${isPay ? 'positive' : 'negative'}`}
                                  minPx={80}
                                  maxPx={180}
                                  onValueChange={v => patchTx(tx, 'value', v)}
                                />
                              </td>
                              <td>
                                <button type="button" className="btn btn-danger btn-sm" aria-label="Remover lançamento" onClick={() => void removeTx(tx)}>
                                  <FinanceIcon name="trash" size={16} />
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
            </div>
          );
        })}
      </div>

      <div className="section-head" style={{ marginTop: 20 }}><h2 className="section-title">Gerenciar perfis</h2></div>

      {!family ? (
        <div className="card" style={{ marginBottom: 12 }}>
          <FamilyChoiceCard busy={familyBusy} onCreateFamily={onCreateFamily} onJoinFamily={onJoinFamily} />
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <FamilySummaryCard
            familyId={family.id}
            isLeader={isLeader}
            familyInviteCode={family.invite_code}
            familyPaidPeriods={[]}
            masked={masked}
            onOpenFamilyAccounts={onOpenFamilyAccounts}
          />
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="card-title">Perfis ativos</div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={addProfile}>
            <FinanceIcon name="plus" size={16} /> Adicionar perfil
          </button>
        </div>
        <div style={{ padding: '4px 16px 16px' }}>
          {profiles.map(({ idx }) => {
            const p = state.profiles[idx];
            const cats = state.profileCategories[idx] || [];
            const linked = p.linkedUserId;
            const member = linked ? familyMembers.find(m => m.user_id === linked) : null;
            let n = 0;
            let sum = 0;
            if (isLeader && member) {
              state.faturas.forEach(f => {
                if (f.family) return;
                f.rows.forEach(r => {
                  if (r.profileIdx === idx && num(r.value) > 0) { n++; sum += num(r.value); }
                });
              });
              state.pixRows.forEach(px => {
                if (px.profileIdx === idx && num(px.value) > 0) { n++; sum += num(px.value); }
              });
            }
            return (
              <div className="profile-manager-card" key={idx}>
                <div className="profile-manager-row">
                  <span className="profile-color-dot" style={{ background: getProfileColor(idx) }} />
                  <input
                    type="text"
                    className="profile-manager-name"
                    aria-label="Nome do perfil"
                    placeholder="Nome do perfil"
                    value={p.name}
                    onChange={e => patchProfile(idx, { name: e.target.value })}
                  />
                  {idx === lastIdx && <span className="pm-note">(perfil personalizável)</span>}
                  <label className="pm-check">
                    <input
                      type="checkbox"
                      checked={state.entradasProfiles[idx] !== false}
                      onChange={e => persist({ ...state, entradasProfiles: { ...state.entradasProfiles, [idx]: e.target.checked } })}
                    />
                    Aparece em Entradas
                  </label>
                  {idx !== lastIdx && (
                    <button type="button" className="btn btn-danger btn-sm" aria-label={`Remover perfil ${p.name}`} title="Remover perfil" onClick={() => void removeProfile(idx)}>
                      <FinanceIcon name="trash" size={16} />
                    </button>
                  )}
                </div>

                {family && (
                  <div className="pm-link">
                    {isLeader ? (
                      member ? (
                        <span className="pm-ok">
                          <FinanceIcon name="check" size={14} /> Os gastos deste perfil vão para {member.email || 'o membro'} · {n} {n === 1 ? 'gasto' : 'gastos'} ({fmtMoney(sum, masked)})
                        </span>
                      ) : (
                        <span className="pm-note">Atrele este perfil a um membro em “Contas da família”.</span>
                      )
                    ) : linked && linked === userId ? (
                      <span className="pm-ok"><FinanceIcon name="check" size={14} /> Os gastos que o líder lançar para você entram neste perfil</span>
                    ) : linked ? (
                      <>
                        <span className="pm-note">Atrelado a outra conta</span>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => patchProfile(idx, { linkedUserId: null })}>Desvincular</button>
                      </>
                    ) : (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => linkMyAccount(idx)}>
                        Receber os gastos da família neste perfil
                      </button>
                    )}
                  </div>
                )}

                <div className="pm-cats">
                  <div className="pm-cats-label">Categorias deste perfil</div>
                  <div className="pm-cat-list">
                    {cats.length === 0 && <span className="pm-note">Nenhuma categoria — adicione abaixo.</span>}
                    {cats.map((cat, ci) => (
                      <span className="pm-cat" key={ci}>
                        <input
                          type="text"
                          aria-label="Nome da categoria"
                          value={cat}
                          style={{ width: `${Math.max(8, cat.length + 2)}ch` }}
                          onChange={e => setCats(idx, cats.map((c, i) => (i === ci ? e.target.value : c)))}
                        />
                        <button type="button" aria-label={`Remover categoria ${cat}`} title="Remover categoria" onClick={() => setCats(idx, cats.filter((_, i) => i !== ci))}>
                          <FinanceIcon name="x" size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCats(idx, [...cats, 'Nova categoria'])}>
                    <FinanceIcon name="plus" size={14} /> Categoria
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
