// src/financas/FinanceApp.tsx — Aplicação nativa React + TypeScript de Gestão Financeira Pessoal & Familiar
import { useState, useEffect, useCallback, useMemo } from 'react';
import './financas.css';
import {
  type FinanceAppState,
  type FinanceTabId,
  type FaturaItem,
  type FaturaRowItem,
  type PixRowItem,
  type PaymentItem,
  type FamilyInfo,
  type FamilyMemberOverview,
  type FamilyClosingRecord,
  type BalancoRowItem,
} from './financeTypes';
import {
  getDefaultState,
  loadLocalFinanceState,
  saveLocalFinanceState,
  getActiveProfiles,
  getProfileCategories,
  genId,
  getAllRowsByProfileDetailed,
  getAllTransactionsByProfile,
  sortFaturasByVencimento,
} from './financeState';
import {
  fetchPersonalFinanceCloud,
  savePersonalFinanceCloud,
  fetchMyFamily,
  createMyFamily,
  joinFamilyByCode,
  fetchFamilyMembersOverview,
  fetchLeaderClosings,
} from './familySync';
import {
  FinanceIcon,
  NumericInput,
  ProfileChips,
  fmtMoney,
  formatDateBR,
  todayLocalISO,
  catIconName,
} from './FinanceIcons';
import {
  FamilyChoiceCard,
  FamilySummaryCard,
  FamilyAccountsModal,
} from './FamilyModals';
import {
  cfComputeEntradasTotal,
  cfGetTableTotal,
} from '../financeFormulas';
import { alertDialog, confirmDialog } from '../dialog';
import { printFinanceReport } from './financeReport';
import { ResumoTab } from './ResumoTab';
import { BalancoTab } from './BalancoTab';

export interface FinanceAppProps {
  userId?: string | null;
  onOpenProfile?: () => void;
}

export function FinanceApp({ userId = null, onOpenProfile: _onOpenProfile }: FinanceAppProps) {
  const [tab, setTab] = useState<FinanceTabId>('faturas');
  const [state, setState] = useState<FinanceAppState>(() => loadLocalFinanceState() || getDefaultState());
  const [masked, setMasked] = useState<boolean>(false);
  const [cloudStatus, setCloudStatus] = useState<string>('Carregando...');
  const [openFaturas, setOpenFaturas] = useState<Record<string, boolean>>({});
  const [pixOpen, setPixOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);

  // Modais
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showProfilesModal, setShowProfilesModal] = useState<boolean>(false);

  // Modo Família
  const [family, setFamily] = useState<FamilyInfo | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberOverview[]>([]);
  const [familyClosings, setFamilyClosings] = useState<FamilyClosingRecord[]>([]);
  const [showFamilyAccounts, setShowFamilyAccounts] = useState<boolean>(false);
  const [familyBusy, setFamilyBusy] = useState<boolean>(false);

  // Carregar dados na nuvem (finance_data e family)
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      if (!userId) {
        setCloudStatus('Modo offline (local)');
        return;
      }

      setCloudStatus('Sincronizando...');
      setIsCloudSyncing(true);

      try {
        const { data: cloudState, error: cloudErr } = await fetchPersonalFinanceCloud(userId);
        if (cancelled) return;

        if (cloudErr) {
          console.error(cloudErr);
          setCloudStatus('Erro ao carregar');
        } else if (cloudState) {
          setState(cloudState);
          saveLocalFinanceState(cloudState, userId);
        }

        // Carregar família
        const { family: myFam } = await fetchMyFamily(userId);
        if (cancelled) return;

        if (myFam) {
          setFamily(myFam);
          const [mems, closings] = await Promise.all([
            fetchFamilyMembersOverview(),
            fetchLeaderClosings(userId),
          ]);
          if (!cancelled) {
            setFamilyMembers(mems.members);
            setFamilyClosings(closings.closings);
          }
        }

        setCloudStatus('Sincronizado');
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setCloudStatus('Modo offline');
      } finally {
        if (!cancelled) setIsCloudSyncing(false);
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Salvar alterações
  const persistState = useCallback(
    async (next: FinanceAppState) => {
      setState(next);
      saveLocalFinanceState(next, userId);

      if (!userId) return;

      setIsCloudSyncing(true);
      try {
        await savePersonalFinanceCloud(userId, next);
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

  // Perfis ativos
  const activeProfiles = useMemo(() => getActiveProfiles(state), [state]);

  // Ações de Faturas
  const handleAddFatura = () => {
    const name = prompt('Nome do novo cartão ou fatura (ex: Nubank, XP, Inter):');
    if (!name?.trim()) return;

    const newFatura: FaturaItem = {
      id: genId(),
      name: name.trim(),
      fechamento: '',
      vencimento: '',
      rows: [],
    };

    persistState({
      ...state,
      faturas: [...state.faturas, newFatura],
    });
  };

  const handleDeleteFatura = async (faturaId: string) => {
    const f = state.faturas.find(item => item.id === faturaId);
    if (!f) return;
    if (!(await confirmDialog(`O cartão "${f.name}" e todas as suas despesas serão excluídos.`, { title: 'Excluir cartão?', confirmLabel: 'Excluir', danger: true }))) return;

    persistState({
      ...state,
      faturas: state.faturas.filter(item => item.id !== faturaId),
    });
  };

  const handleRenameFatura = (faturaId: string) => {
    const f = state.faturas.find(item => item.id === faturaId);
    if (!f) return;
    const nextName = prompt('Novo nome para o cartão:', f.name);
    if (!nextName?.trim() || nextName === f.name) return;

    persistState({
      ...state,
      faturas: state.faturas.map(item => (item.id === faturaId ? { ...item, name: nextName.trim() } : item)),
    });
  };

  const handleExportPdf = () => printFinanceReport(state);

  const handleRenameFaturaInline = (faturaId: string, name: string) => {
    persistState({ ...state, faturas: state.faturas.map(item => (item.id === faturaId ? { ...item, name } : item)) });
  };

  const handleUpdateFaturaDate = (faturaId: string, field: 'fechamento' | 'vencimento', val: string) => {
    persistState({
      ...state,
      faturas: state.faturas.map(item => (item.id === faturaId ? { ...item, [field]: val } : item)),
    });
  };

  // Linhas de Despesa da Fatura
  const handleAddFaturaRow = (faturaId: string) => {
    const newRow: FaturaRowItem = {
      id: genId(),
      date: todayLocalISO(),
      name: '',
      parcelas: '1/1',
      value: 0,
      profileIdx: activeProfiles[0]?.idx ?? 0,
      category: null,
    };

    persistState({
      ...state,
      faturas: state.faturas.map(f => (f.id === faturaId ? { ...f, rows: [...f.rows, newRow] } : f)),
    });
  };

  const handleUpdateFaturaRow = (
    faturaId: string,
    rowId: string,
    field: keyof FaturaRowItem,
    val: unknown
  ) => {
    persistState({
      ...state,
      faturas: state.faturas.map(f => {
        if (f.id !== faturaId) return f;
        return {
          ...f,
          rows: f.rows.map(r => (r.id === rowId ? { ...r, [field]: val } : r)),
        };
      }),
    });
  };

  const handleDeleteFaturaRow = (faturaId: string, rowId: string) => {
    persistState({
      ...state,
      faturas: state.faturas.map(f => {
        if (f.id !== faturaId) return f;
        return {
          ...f,
          rows: f.rows.filter(r => r.id !== rowId),
        };
      }),
    });
  };

  // Ações de Pix
  const handleAddPixRow = () => {
    const newRow: PixRowItem = {
      id: genId(),
      date: todayLocalISO(),
      desc: '',
      value: 0,
      profileIdx: activeProfiles[0]?.idx ?? 0,
      category: null,
    };
    persistState({
      ...state,
      pixRows: [...state.pixRows, newRow],
    });
  };

  const handleUpdatePixRow = (rowId: string, field: keyof PixRowItem, val: unknown) => {
    persistState({
      ...state,
      pixRows: state.pixRows.map(r => (r.id === rowId ? { ...r, [field]: val } : r)),
    });
  };

  const handleDeletePixRow = (rowId: string) => {
    persistState({
      ...state,
      pixRows: state.pixRows.filter(r => r.id !== rowId),
    });
  };

  // Ações de Pagamentos (Extrato de Abatimento)
  const handleAddPayment = () => {
    const newPayment: PaymentItem = {
      id: genId(),
      date: todayLocalISO(),
      desc: 'Pagamento de fatura',
      value: 0,
      profileIdx: activeProfiles[0]?.idx ?? 0,
    };
    persistState({
      ...state,
      payments: [...state.payments, newPayment],
    });
  };

  const handleUpdatePayment = (payId: string, field: keyof PaymentItem, val: unknown) => {
    persistState({
      ...state,
      payments: state.payments.map(p => (p.id === payId ? { ...p, [field]: val } : p)),
    });
  };

  const handleDeletePayment = (payId: string) => {
    persistState({
      ...state,
      payments: state.payments.filter(p => p.id !== payId),
    });
  };

  // Modo Família Ações
  const handleCreateFamily = async () => {
    if (!userId) return;
    const name = prompt('Nome da sua família (ex: Família Silva):');
    if (!name?.trim()) return;

    setFamilyBusy(true);
    try {
      const { family: fam, error } = await createMyFamily(name.trim());
      if (error) throw error;
      if (fam) {
        setFamily(fam);
        const mems = await fetchFamilyMembersOverview();
        setFamilyMembers(mems.members);
      }
    } catch (e) {
      void alertDialog('Erro ao criar família: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setFamilyBusy(false);
    }
  };

  const handleJoinFamily = async (code: string) => {
    if (!userId) return;
    setFamilyBusy(true);
    try {
      const { error } = await joinFamilyByCode(code.trim());
      if (error) throw error;
      const { family: fam } = await fetchMyFamily(userId);
      setFamily(fam);
      if (fam) {
        const mems = await fetchFamilyMembersOverview();
        setFamilyMembers(mems.members);
      }
    } catch (e) {
      void alertDialog('Erro ao entrar na família: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setFamilyBusy(false);
    }
  };

  // Busca rápida em todas as transações
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const results: Array<{ source: string; name: string; date: string; value: number; profileName: string }> = [];

    // Faturas
    state.faturas.forEach(f => {
      f.rows.forEach(r => {
        if (
          r.name.toLowerCase().includes(q) ||
          (r.category && r.category.toLowerCase().includes(q)) ||
          r.parcelas.includes(q)
        ) {
          const pName = state.profiles[r.profileIdx ?? 0]?.name || 'Geral';
          results.push({
            source: f.name,
            name: r.name,
            date: r.date,
            value: Number(r.value) || 0,
            profileName: pName,
          });
        }
      });
    });

    // Pix
    state.pixRows.forEach(p => {
      if (p.desc.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q))) {
        const pName = state.profiles[p.profileIdx ?? 0]?.name || 'Geral';
        results.push({
          source: 'Pix',
          name: p.desc,
          date: p.date,
          value: Number(p.value) || 0,
          profileName: pName,
        });
      }
    });

    return results;
  }, [state, searchQuery]);

  return (
    <div className={`lp-financas ${masked ? 'cf-mask' : ''}`}>
      <div className="container" style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 12px' }}>
        {/* Cabeçalho fixo: título, ações e abas (como no Finanças antigo) */}
        <header>
          <div className="head-top">
            <h1 className="page-title">Finanças</h1>
            <span
              role="status"
              aria-label={cloudStatus}
              title={cloudStatus}
              style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: isCloudSyncing ? 'var(--warning)' : 'var(--success)', display: 'inline-block' }}
            />
            <div className="header-actions">
              <button type="button" className="icon-btn" onClick={() => setMasked(prev => !prev)} aria-pressed={masked} aria-label={masked ? 'Mostrar valores' : 'Ocultar valores'} title={masked ? 'Mostrar valores' : 'Ocultar valores'}>
                <FinanceIcon name={masked ? 'eye' : 'eyeOff'} size={20} />
              </button>
              <button type="button" className="icon-btn" onClick={() => setShowSearch(true)} aria-label="Buscar" title="Buscar em faturas, pagamentos e balanço">
                <FinanceIcon name="search" size={20} />
              </button>
              <button type="button" className="icon-btn" onClick={handleExportPdf} aria-label="Exportar PDF" title="Baixar o extrato em PDF, com faturas, pagamentos e balanço">
                <FinanceIcon name="fileText" size={20} />
              </button>
              <button type="button" className="icon-btn" onClick={() => setShowProfilesModal(true)} aria-label="Perfis" title="Gerenciar perfis">
                <FinanceIcon name="users" size={20} />
              </button>
            </div>
          </div>
          <nav id="nav" aria-label="Seções de Finanças">
            <button type="button" className={tab === 'faturas' ? 'active' : ''} aria-current={tab === 'faturas' ? 'page' : undefined} onClick={() => setTab('faturas')}>Faturas</button>
            <button type="button" className={tab === 'resumo' ? 'active' : ''} aria-current={tab === 'resumo' ? 'page' : undefined} onClick={() => setTab('resumo')}>Resumo</button>
            <button type="button" className={tab === 'balanco' ? 'active' : ''} aria-current={tab === 'balanco' ? 'page' : undefined} onClick={() => setTab('balanco')}>Balanço</button>
          </nav>
        </header>
        <div style={{ height: 16 }} />

        {/* ================= ABA 1: FATURAS & CARTÕES ================= */}
        {tab === 'faturas' && (
          <div>
            {/* Lista de Faturas */}
            {sortFaturasByVencimento(state.faturas).map(fatura => {
              const totalFatura = fatura.rows.reduce((sum, r) => sum + (Number(r.value) || 0), 0);
              const isOpen = openFaturas[fatura.id] === true; // vem recolhida, como antes

              return (
                <div key={fatura.id} className="card card--flush" style={{ marginBottom: 20 }}>
                  <div className="card-header">
                    <input
                      type="text"
                      className="profile-name-input card-title"
                      aria-label="Nome da fatura"
                      style={{ fontSize: 14, fontWeight: 600 }}
                      value={fatura.name}
                      onChange={e => handleRenameFaturaInline(fatura.id, e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div className="card-total">{fmtMoney(totalFatura, masked)}</div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        aria-expanded={isOpen}
                        aria-label={(isOpen ? 'Recolher fatura ' : 'Abrir fatura ') + fatura.name}
                        title={isOpen ? 'Recolher' : 'Abrir'}
                        onClick={() => setOpenFaturas(prev => ({ ...prev, [fatura.id]: !isOpen }))}
                      >
                        <FinanceIcon name="chevron" size={18} />
                      </button>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDeleteFatura(fatura.id)}>Remover</button>
                    </div>
                  </div>

                  {/* Fechamento e vencimento ficam na própria fatura: o Balanço Mensal puxa daqui */}
                  <div style={{ display: 'flex', gap: 16, padding: '8px 14px', fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                    Fechamento:
                    <input type="text" placeholder="Fechamento (ex: dia 5)" aria-label="Fechamento da fatura" value={fatura.fechamento || ''}
                      onChange={e => handleUpdateFaturaDate(fatura.id, 'fechamento', e.target.value)}
                      style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 7px', fontSize: 12, color: 'var(--text)', width: 150 }} />
                    Vencimento:
                    <input type="text" placeholder="Vencimento (ex: dia 12)" aria-label="Vencimento da fatura" value={fatura.vencimento || ''}
                      onChange={e => handleUpdateFaturaDate(fatura.id, 'vencimento', e.target.value)}
                      style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 7px', fontSize: 12, color: 'var(--text)', width: 150 }} />
                  </div>

                  {isOpen && (
                  <div style={{ padding: 16 }}>
                  {/* Tabela de Compras */}
                  {fatura.rows.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      Nenhuma compra adicionada nesta fatura.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                            <th style={{ padding: '8px 6px', width: 110 }}>Data</th>
                            <th style={{ padding: '8px 6px' }}>Descrição</th>
                            <th style={{ padding: '8px 6px', width: 75 }}>Parcela</th>
                            <th style={{ padding: '8px 6px', width: 115 }}>Valor</th>
                            <th style={{ padding: '8px 6px', width: 140 }}>Categoria</th>
                            <th style={{ padding: '8px 6px', width: 180 }}>Perfil</th>
                            <th style={{ padding: '8px 6px', width: 40 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {fatura.rows.map(row => (
                            <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '6px' }}>
                                <input
                                  type="date"
                                  value={row.date}
                                  onChange={e => handleUpdateFaturaRow(fatura.id, row.id, 'date', e.target.value)}
                                  style={{ padding: '4px 6px', fontSize: '0.8rem', width: '100%' }}
                                />
                              </td>
                              <td style={{ padding: '6px' }}>
                                <input
                                  type="text"
                                  placeholder="Descrição da despesa..."
                                  value={row.name}
                                  onChange={e => handleUpdateFaturaRow(fatura.id, row.id, 'name', e.target.value)}
                                  style={{ padding: '4px 8px', fontSize: '0.85rem', width: '100%' }}
                                />
                              </td>
                              <td style={{ padding: '6px' }}>
                                <input
                                  type="text"
                                  placeholder="1/1"
                                  value={row.parcelas}
                                  onChange={e => handleUpdateFaturaRow(fatura.id, row.id, 'parcelas', e.target.value)}
                                  style={{ padding: '4px 6px', fontSize: '0.8rem', width: '100%', textAlign: 'center' }}
                                />
                              </td>
                              <td style={{ padding: '6px' }}>
                                <NumericInput
                                  value={Number(row.value) || 0}
                                  onValueChange={v => handleUpdateFaturaRow(fatura.id, row.id, 'value', Number(v) || 0)}
                                  placeholder="0,00"
                                  style={{ width: '100%', fontSize: '0.85rem' }}
                                />
                              </td>
                              <td style={{ padding: '6px' }}>
                                <select
                                  value={row.category || ''}
                                  onChange={e => handleUpdateFaturaRow(fatura.id, row.id, 'category', e.target.value || null)}
                                  style={{ padding: '4px 8px', fontSize: '0.8rem', width: '100%' }}
                                >
                                  <option value="">Sem categoria</option>
                                  {(getProfileCategories(state, row.profileIdx) || []).map(cat => (
                                    <option key={cat} value={cat}>
                                      {cat}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td style={{ padding: '6px' }}>
                                <ProfileChips
                                  profiles={activeProfiles}
                                  selectedIdx={row.profileIdx}
                                  onChange={pIdx => handleUpdateFaturaRow(fatura.id, row.id, 'profileIdx', pIdx)}
                                />
                              </td>
                              <td style={{ padding: '6px', textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="ghost small danger"
                                  style={{ padding: '4px 6px' }}
                                  onClick={() => handleDeleteFaturaRow(fatura.id, row.id)}
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <button
                    type="button"
                    className="ghost small"
                    style={{ marginTop: 12 }}
                    onClick={() => handleAddFaturaRow(fatura.id)}
                  >
                    + Adicionar Despesa
                  </button>
                  </div>
                  )}
                </div>
              );
            })}

            <div style={{ padding: '0 0 24px' }}>
              <button type="button" className="btn btn-ghost" onClick={handleAddFatura}>
                <FinanceIcon name="plus" size={18} /> Nova fatura
              </button>
            </div>

            {/* Cartão de Pix e Débito */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: pixOpen ? '1px solid var(--border)' : 'none',
                  paddingBottom: pixOpen ? 12 : 0,
                  marginBottom: pixOpen ? 12 : 0,
                  cursor: 'pointer',
                  gap: 12,
                }}
                onClick={() => setPixOpen(o => !o)}
              >
                <div>
                  <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 600 }}>Gastos em Pix & Dinheiro</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Despesas à vista do mês</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Pix</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent)' }}>
                    {fmtMoney(
                      state.pixRows.reduce((sum, r) => sum + (Number(r.value) || 0), 0),
                      masked
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  aria-expanded={pixOpen}
                  aria-label={pixOpen ? 'Recolher gastos em Pix' : 'Abrir gastos em Pix'}
                  title={pixOpen ? 'Recolher' : 'Abrir'}
                  onClick={e => { e.stopPropagation(); setPixOpen(o => !o); }}
                >
                  <FinanceIcon name="chevron" size={18} />
                </button>
                </div>
              </div>

              {pixOpen && (<>
              {state.pixRows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Nenhum gasto em Pix registrado.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px 6px', width: 110 }}>Data</th>
                        <th style={{ padding: '8px 6px' }}>Descrição</th>
                        <th style={{ padding: '8px 6px', width: 115 }}>Valor</th>
                        <th style={{ padding: '8px 6px', width: 140 }}>Categoria</th>
                        <th style={{ padding: '8px 6px', width: 180 }}>Perfil</th>
                        <th style={{ padding: '8px 6px', width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.pixRows.map(row => (
                        <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '6px' }}>
                            <input
                              type="date"
                              value={row.date}
                              onChange={e => handleUpdatePixRow(row.id, 'date', e.target.value)}
                              style={{ padding: '4px 6px', fontSize: '0.8rem', width: '100%' }}
                            />
                          </td>
                          <td style={{ padding: '6px' }}>
                            <input
                              type="text"
                              placeholder="Descrição do Pix..."
                              value={row.desc}
                              onChange={e => handleUpdatePixRow(row.id, 'desc', e.target.value)}
                              style={{ padding: '4px 8px', fontSize: '0.85rem', width: '100%' }}
                            />
                          </td>
                          <td style={{ padding: '6px' }}>
                            <NumericInput
                              value={Number(row.value) || 0}
                              onValueChange={v => handleUpdatePixRow(row.id, 'value', Number(v) || 0)}
                              placeholder="0,00"
                              style={{ width: '100%', fontSize: '0.85rem' }}
                            />
                          </td>
                          <td style={{ padding: '6px' }}>
                            <select
                              value={row.category || ''}
                              onChange={e => handleUpdatePixRow(row.id, 'category', e.target.value || null)}
                              style={{ padding: '4px 8px', fontSize: '0.8rem', width: '100%' }}
                            >
                              <option value="">Sem categoria</option>
                              {(getProfileCategories(state, row.profileIdx) || []).map(cat => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '6px' }}>
                            <ProfileChips
                              profiles={activeProfiles}
                              selectedIdx={row.profileIdx}
                              onChange={pIdx => handleUpdatePixRow(row.id, 'profileIdx', pIdx)}
                            />
                          </td>
                          <td style={{ padding: '6px', textAlign: 'right' }}>
                            <button
                              type="button"
                              className="ghost small danger"
                              style={{ padding: '4px 6px' }}
                              onClick={() => handleDeletePixRow(row.id)}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button type="button" className="ghost small" style={{ marginTop: 12 }} onClick={handleAddPixRow}>
                + Adicionar Pix
              </button>
              </>)}
            </div>

            {/* Extrato de Pagamentos Realizados */}
            <div className="card card--flush pay-card">
              <button
                type="button"
                className="pay-head"
                aria-expanded={payOpen}
                aria-controls="pay-body"
                onClick={() => setPayOpen(o => !o)}
              >
                <span className="pay-head-text">
                  <span className="pay-title">Pagamentos</span>
                  <span className="pay-sub">
                    {state.payments.length === 0
                      ? 'Nenhum pagamento registrado'
                      : `${state.payments.length} ${state.payments.length === 1 ? 'pagamento' : 'pagamentos'} para abater faturas`}
                  </span>
                </span>
                <span className="pay-head-total">
                  <span className="pay-sub">Total pago</span>
                  <span className="card-total">
                    {fmtMoney(state.payments.reduce((sum, p) => sum + (Number(p.value) || 0), 0), masked)}
                  </span>
                </span>
                <span className="pay-chev" aria-hidden="true"><FinanceIcon name="chevron" size={18} /></span>
              </button>

              {payOpen && (
                <div id="pay-body">
                  {state.payments.length === 0 && <div className="empty">Nenhum pagamento registrado neste mês.</div>}
                  {[...state.payments]
                    .sort((x, y) => String(y.date).localeCompare(String(x.date)))
                    .map(pay => (
                      <div className="pay-item" key={pay.id}>
                        <div className="pay-line">
                          <input
                            type="text"
                            className="pay-desc"
                            aria-label="Descrição do pagamento"
                            placeholder="Descrição"
                            value={pay.desc}
                            onChange={e => handleUpdatePayment(pay.id, 'desc', e.target.value)}
                          />
                          <NumericInput
                            ariaLabel="Valor pago"
                            value={Number(pay.value) || 0}
                            onValueChange={v => handleUpdatePayment(pay.id, 'value', Number(v) || 0)}
                            placeholder="0,00"
                            minPx={100}
                            maxPx={170}
                            style={{ fontWeight: 700 }}
                          />
                        </div>
                        <div className="pay-line">
                          <input
                            type="date"
                            aria-label="Data do pagamento"
                            value={pay.date}
                            onChange={e => handleUpdatePayment(pay.id, 'date', e.target.value)}
                          />
                          <select
                            aria-label="Perfil que pagou"
                            className="pay-profile"
                            value={pay.profileIdx ?? ''}
                            onChange={e => handleUpdatePayment(pay.id, 'profileIdx', e.target.value === '' ? null : Number(e.target.value))}
                          >
                            <option value="">Sem perfil</option>
                            {activeProfiles.map(pr => (
                              <option key={pr.idx} value={pr.idx}>{pr.name}</option>
                            ))}
                          </select>
                          <button type="button" className="btn btn-danger btn-sm" aria-label="Remover pagamento" onClick={() => handleDeletePayment(pay.id)}>
                            <FinanceIcon name="trash" size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  <div className="bt-total">
                    <span>Total pago</span>
                    <strong className="pos">{fmtMoney(state.payments.reduce((sum, p) => sum + (Number(p.value) || 0), 0), masked)}</strong>
                  </div>
                  <div className="add-row-bar" style={{ padding: 12 }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={handleAddPayment}>
                      <FinanceIcon name="plus" size={16} /> Adicionar pagamento
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'resumo' && (
          <ResumoTab
            state={state}
            persist={persistState}
            masked={masked}
            profiles={activeProfiles}
            userId={userId}
            family={family}
            familyMembers={familyMembers}
            familyBusy={familyBusy}
            onCreateFamily={handleCreateFamily}
            onJoinFamily={handleJoinFamily}
            onOpenFamilyAccounts={() => setShowFamilyAccounts(true)}
          />
        )}

        {tab === 'balanco' && (
          <BalancoTab state={state} persist={persistState} masked={masked} profiles={activeProfiles} />
        )}

        {/* ================= MODAL: BUSCA ================= */}
        {showSearch && (
          <div className="modal-backdrop" onClick={() => setShowSearch(false)}>
            <div className="modal-panel" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Pesquisar Transações</h2>
                <button type="button" className="ghost small" onClick={() => setShowSearch(false)}>
                  ✕ Fechar
                </button>
              </div>

              <input
                type="text"
                placeholder="Buscar por descrição, valor, categoria..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
                style={{ width: '100%', marginBottom: 14 }}
              />

              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {searchResults.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                    {searchQuery ? 'Nenhum lançamento encontrado.' : 'Digite para pesquisar.'}
                  </div>
                ) : (
                  searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {formatDateBR(item.date)} • {item.source} • {item.profileName}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, color: 'var(--accent)' }}>
                        {fmtMoney(item.value, masked)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: GERENCIAR PERFIS ================= */}
        {showProfilesModal && (
          <div className="modal-backdrop" onClick={() => setShowProfilesModal(false)}>
            <div className="modal-panel" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Gerenciar Perfis</h2>
                <button type="button" className="ghost small" onClick={() => setShowProfilesModal(false)}>
                  ✕ Fechar
                </button>
              </div>

              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                Os perfis permitem separar os gastos em cartões e Pix entre diferentes pessoas da família ou projetos.
              </p>

              <div style={{ marginBottom: 20 }}>
                {state.profiles.slice(0, state.activeProfiles).map((p, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: `var(--p${idx % 10})`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={p.name}
                      onChange={e => {
                        const nextProfiles = [...state.profiles];
                        nextProfiles[idx] = { ...p, name: e.target.value };
                        persistState({ ...state, profiles: nextProfiles });
                      }}
                      style={{ flex: 1, padding: '6px 10px' }}
                    />
                  </div>
                ))}
              </div>

              {state.activeProfiles < state.profiles.length && (
                <button
                  type="button"
                  className="ghost small"
                  onClick={() => persistState({ ...state, activeProfiles: state.activeProfiles + 1 })}
                >
                  + Ativar Mais um Perfil
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================= MODAL: MODO FAMÍLIA CONTAS ================= */}
        {family && (
          <FamilyAccountsModal
            open={showFamilyAccounts}
            onClose={() => setShowFamilyAccounts(false)}
            state={state}
            familyId={family.id}
            leaderId={family.owner_id}
            leaderLabel={state.profiles[0]?.name || 'Eu'}
            familyMembers={familyMembers}
            familyClosings={familyClosings}
            familyClosingsOk={true}
            masked={masked}
            onToggleMask={() => setMasked(prev => !prev)}
            onLinkProfileToMember={(memberUserId, pIdx) => {
              const nextProfiles = state.profiles.map((p, idx) => {
                if (pIdx !== null && idx === pIdx) return { ...p, linkedUserId: memberUserId };
                if (p.linkedUserId === memberUserId) return { ...p, linkedUserId: null };
                return p;
              });
              persistState({ ...state, profiles: nextProfiles });
            }}
            onClosingsChange={next => setFamilyClosings(next)}
          />
        )}
      </div>
    </div>
  );
}
