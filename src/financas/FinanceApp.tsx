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
} from './financeState';
import {
  fetchPersonalFinanceCloud,
  savePersonalFinanceCloud,
  fetchMyFamily,
  createMyFamily,
  joinFamilyByCode,
  fetchFamilyMembersOverview,
  fetchLeaderClosings,
  uploadReceiptFile,
  deleteReceiptFile,
  createReceiptSignedUrl,
} from './familySync';
import {
  FinanceIcon,
  NumericInput,
  ProfileChips,
  ReceiptControl,
  ReceiptModal,
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

export interface FinanceAppProps {
  userId?: string | null;
  onOpenProfile?: () => void;
}

export function FinanceApp({ userId = null, onOpenProfile: _onOpenProfile }: FinanceAppProps) {
  const [tab, setTab] = useState<FinanceTabId>('faturas');
  const [state, setState] = useState<FinanceAppState>(() => loadLocalFinanceState() || getDefaultState());
  const [masked, setMasked] = useState<boolean>(false);
  const [cloudStatus, setCloudStatus] = useState<string>('Carregando...');
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);

  // Modais
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showProfilesModal, setShowProfilesModal] = useState<boolean>(false);
  const [activeReceiptUrl, setActiveReceiptUrl] = useState<string | null>(null);

  // Modo Família
  const [family, setFamily] = useState<FamilyInfo | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberOverview[]>([]);
  const [familyClosings, setFamilyClosings] = useState<FamilyClosingRecord[]>([]);
  const [showFamilyAccounts, setShowFamilyAccounts] = useState<boolean>(false);
  const [familyBusy, setFamilyBusy] = useState<boolean>(false);

  // Perfil selecionado na aba Resumo
  const [resumoProfileIdx, setResumoProfileIdx] = useState<number>(0);

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

  const handleDeleteFatura = (faturaId: string) => {
    const f = state.faturas.find(item => item.id === faturaId);
    if (!f) return;
    if (!confirm(`Tem certeza que deseja excluir o cartão "${f.name}" e todas as suas despesas?`)) return;

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

  // Recibo de Linha de Fatura
  const handleUploadFaturaReceipt = async (faturaId: string, rowId: string, file: File) => {
    if (!userId) {
      alert('Faça login para salvar comprovantes na nuvem.');
      return;
    }
    try {
      setCloudStatus('Enviando comprovante...');
      const path = await uploadReceiptFile(userId, rowId, file);
      handleUpdateFaturaRow(faturaId, rowId, 'receiptPath', path);
      setCloudStatus('Comprovante salvo');
    } catch (e) {
      alert('Erro ao enviar comprovante: ' + (e instanceof Error ? e.message : String(e)));
      setCloudStatus('Erro no comprovante');
    }
  };

  const handleDeleteFaturaReceipt = async (faturaId: string, rowId: string, path: string) => {
    if (!confirm('Excluir este comprovante?')) return;
    try {
      await deleteReceiptFile(path);
      handleUpdateFaturaRow(faturaId, rowId, 'receiptPath', undefined);
      if (activeReceiptUrl) setActiveReceiptUrl(null);
    } catch (err) {
      console.error(err);
    }
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
      alert('Erro ao criar família: ' + (e instanceof Error ? e.message : String(e)));
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
      alert('Erro ao entrar na família: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setFamilyBusy(false);
    }
  };

  // Cálculos de Resumo
  const profileExpenses = useMemo(() => {
    return getAllRowsByProfileDetailed(state, resumoProfileIdx);
  }, [state, resumoProfileIdx]);

  const profileTransactions = useMemo(() => {
    return getAllTransactionsByProfile(state, resumoProfileIdx);
  }, [state, resumoProfileIdx]);

  const profileTotalGasto = useMemo(() => {
    return profileExpenses.reduce((acc, row) => acc + (Number(row.value) || 0), 0);
  }, [profileExpenses]);

  const profileTotalPago = useMemo(() => {
    return state.payments
      .filter(p => p.profileIdx === resumoProfileIdx)
      .reduce((acc, p) => acc + (Number(p.value) || 0), 0);
  }, [state.payments, resumoProfileIdx]);

  const profileSaldoPendente = profileTotalGasto - profileTotalPago;

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

  // Balanço Mensal
  const totalEntradas = useMemo(() => cfComputeEntradasTotal(state), [state]);
  const totalSaidasBalanco = useMemo(() => {
    return state.balancoTables
      .filter(t => t.type !== 'entradas' && t.includeInSaldo)
      .reduce((acc, t) => acc + cfGetTableTotal(state, t), 0);
  }, [state]);

  const saldoMes = totalEntradas - totalSaidasBalanco;

  return (
    <div className={`lp-financas ${masked ? 'cf-mask' : ''}`}>
      <div className="container" style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 12px' }}>
        {/* Topbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
              onClick={() => setMasked(prev => !prev)}
              title={masked ? 'Mostrar valores' : 'Ocultar valores'}
            >
              <FinanceIcon name={masked ? 'eye' : 'eyeOff'} size={16} />
              {masked ? 'Mostrar' : 'Ocultar'}
            </button>
            <button
              type="button"
              className="ghost small"
              onClick={() => setShowSearch(true)}
              title="Pesquisar lançamentos"
            >
              <FinanceIcon name="search" size={16} /> Buscar
            </button>
            <button
              type="button"
              className="ghost small"
              onClick={() => setShowProfilesModal(true)}
              title="Gerenciar perfis"
            >
              <FinanceIcon name="users" size={16} /> Perfis
            </button>
          </div>
        </div>

        {/* Abas Principais */}
        <div className="tabs" style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
          <button
            type="button"
            className={`tab ${tab === 'faturas' ? 'active' : ''}`}
            onClick={() => setTab('faturas')}
          >
            <FinanceIcon name="card" size={18} /> Faturas & Cartões
          </button>
          <button
            type="button"
            className={`tab ${tab === 'resumo' ? 'active' : ''}`}
            onClick={() => setTab('resumo')}
          >
            <FinanceIcon name="user" size={18} /> Resumo por Perfil
          </button>
          <button
            type="button"
            className={`tab ${tab === 'balanco' ? 'active' : ''}`}
            onClick={() => setTab('balanco')}
          >
            <FinanceIcon name="landmark" size={18} /> Balanço Mensal
          </button>
        </div>

        {/* ================= ABA 1: FATURAS & CARTÕES ================= */}
        {tab === 'faturas' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Seus Cartões e Faturas</h2>
              <button type="button" className="small" onClick={handleAddFatura}>
                <FinanceIcon name="plus" size={16} /> Novo Cartão
              </button>
            </div>

            {/* Lista de Faturas */}
            {state.faturas.map(fatura => {
              const totalFatura = fatura.rows.reduce((sum, r) => sum + (Number(r.value) || 0), 0);

              return (
                <div key={fatura.id} className="card" style={{ marginBottom: 20 }}>
                  {/* Cabeçalho do Cartão */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 10,
                      borderBottom: '1px solid var(--border)',
                      paddingBottom: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 600 }}>{fatura.name}</h3>
                        <button
                          type="button"
                          className="ghost small"
                          style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                          onClick={() => handleRenameFatura(fatura.id)}
                        >
                          Renomear
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: 14, fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        <span>
                          Fecha dia:{' '}
                          <input
                            type="text"
                            placeholder="ex: 15"
                            value={fatura.fechamento || ''}
                            onChange={e => handleUpdateFaturaDate(fatura.id, 'fechamento', e.target.value)}
                            style={{ padding: '2px 4px', width: 45, fontSize: '0.8rem', textAlign: 'center' }}
                          />
                        </span>
                        <span>
                          Vence dia:{' '}
                          <input
                            type="text"
                            placeholder="ex: 22"
                            value={fatura.vencimento || ''}
                            onChange={e => handleUpdateFaturaDate(fatura.id, 'vencimento', e.target.value)}
                            style={{ padding: '2px 4px', width: 45, fontSize: '0.8rem', textAlign: 'center' }}
                          />
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total da Fatura</div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent)' }}>
                          {fmtMoney(totalFatura, masked)}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="ghost small danger"
                        onClick={() => handleDeleteFatura(fatura.id)}
                        title="Excluir cartão"
                      >
                        <FinanceIcon name="trash" size={16} />
                      </button>
                    </div>
                  </div>

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
                            <th style={{ padding: '8px 6px', width: 50, textAlign: 'center' }}>Doc</th>
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
                              <td style={{ padding: '6px', textAlign: 'center' }}>
                                <ReceiptControl
                                  receiptPath={row.receiptPath}
                                  onUploadFile={file => handleUploadFaturaReceipt(fatura.id, row.id, file)}
                                  onView={async path => {
                                    try {
                                      const url = await createReceiptSignedUrl(path);
                                      setActiveReceiptUrl(url);
                                    } catch (err) {
                                      alert('Erro ao carregar recibo: ' + (err instanceof Error ? err.message : String(err)));
                                    }
                                  }}
                                  onRemove={() => handleDeleteFaturaReceipt(fatura.id, row.id, row.receiptPath!)}
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
              );
            })}

            {/* Cartão de Pix e Débito */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: 12,
                  marginBottom: 12,
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 600 }}>Gastos em Pix & Dinheiro</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Despesas à vista do mês</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Pix</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent)' }}>
                    {fmtMoney(
                      state.pixRows.reduce((sum, r) => sum + (Number(r.value) || 0), 0),
                      masked
                    )}
                  </div>
                </div>
              </div>

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
            </div>

            {/* Extrato de Pagamentos Realizados */}
            <div className="card">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: 12,
                  marginBottom: 12,
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 600 }}>Extrato de Pagamentos</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Pagamentos parciais ou totais para abater faturas
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Pago</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--success)' }}>
                    {fmtMoney(
                      state.payments.reduce((sum, p) => sum + (Number(p.value) || 0), 0),
                      masked
                    )}
                  </div>
                </div>
              </div>

              {state.payments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Nenhum pagamento registrado neste mês.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px 6px', width: 110 }}>Data</th>
                        <th style={{ padding: '8px 6px' }}>Descrição</th>
                        <th style={{ padding: '8px 6px', width: 115 }}>Valor Pago</th>
                        <th style={{ padding: '8px 6px', width: 180 }}>Perfil que Pagou</th>
                        <th style={{ padding: '8px 6px', width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.payments.map(pay => (
                        <tr key={pay.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '6px' }}>
                            <input
                              type="date"
                              value={pay.date}
                              onChange={e => handleUpdatePayment(pay.id, 'date', e.target.value)}
                              style={{ padding: '4px 6px', fontSize: '0.8rem', width: '100%' }}
                            />
                          </td>
                          <td style={{ padding: '6px' }}>
                            <input
                              type="text"
                              value={pay.desc}
                              onChange={e => handleUpdatePayment(pay.id, 'desc', e.target.value)}
                              style={{ padding: '4px 8px', fontSize: '0.85rem', width: '100%' }}
                            />
                          </td>
                          <td style={{ padding: '6px' }}>
                            <NumericInput
                              value={Number(pay.value) || 0}
                              onValueChange={v => handleUpdatePayment(pay.id, 'value', Number(v) || 0)}
                              placeholder="0,00"
                              style={{ width: '100%', fontSize: '0.85rem' }}
                            />
                          </td>
                          <td style={{ padding: '6px' }}>
                            <ProfileChips
                              profiles={activeProfiles}
                              selectedIdx={pay.profileIdx}
                              onChange={pIdx => handleUpdatePayment(pay.id, 'profileIdx', pIdx)}
                            />
                          </td>
                          <td style={{ padding: '6px', textAlign: 'right' }}>
                            <button
                              type="button"
                              className="ghost small danger"
                              style={{ padding: '4px 6px' }}
                              onClick={() => handleDeletePayment(pay.id)}
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

              <button type="button" className="ghost small" style={{ marginTop: 12 }} onClick={handleAddPayment}>
                + Adicionar Pagamento
              </button>
            </div>
          </div>
        )}

        {/* ================= ABA 2: RESUMO POR PERFIL & FAMÍLIA ================= */}
        {tab === 'resumo' && (
          <div>
            {/* Seletor de Perfil no Topo do Resumo */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500 }}>
                Selecione o perfil para ver o extrato individual:
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {activeProfiles.map(p => (
                  <button
                    key={p.idx}
                    type="button"
                    className={`tab ${resumoProfileIdx === p.idx ? 'active' : ''}`}
                    onClick={() => setResumoProfileIdx(p.idx)}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 20,
                      border: '1px solid var(--border)',
                      fontWeight: 600,
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Cartões de Saldo do Perfil */}
            <div className="grid grid-3" style={{ marginBottom: 20 }}>
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total de Gastos</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--danger)', marginTop: 4 }}>
                  {fmtMoney(profileTotalGasto, masked)}
                </div>
              </div>
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Já Pago</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--success)', marginTop: 4 }}>
                  {fmtMoney(profileTotalPago, masked)}
                </div>
              </div>
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Saldo Pendente</div>
                <div
                  style={{
                    fontSize: '1.6rem',
                    fontWeight: 700,
                    color: profileSaldoPendente > 0 ? 'var(--accent)' : 'var(--text-muted)',
                    marginTop: 4,
                  }}
                >
                  {fmtMoney(profileSaldoPendente, masked)}
                </div>
              </div>
            </div>

            {/* Modo Família Card */}
            {!family ? (
              <FamilyChoiceCard
                busy={familyBusy}
                onCreateFamily={handleCreateFamily}
                onJoinFamily={handleJoinFamily}
              />
            ) : (
              <div style={{ marginBottom: 20 }}>
                <FamilySummaryCard
                  familyId={family.id}
                  isLeader={family.owner_id === userId}
                  familyInviteCode={family.invite_code}
                  familyPaidPeriods={[]}
                  masked={masked}
                  onOpenFamilyAccounts={() => setShowFamilyAccounts(true)}
                />
              </div>
            )}

            {/* Tabela de Lançamentos do Perfil */}
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', margin: '0 0 14px' }}>
                Transações de {state.profiles[resumoProfileIdx]?.name || 'Perfil'}
              </h3>

              {profileTransactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                  Nenhuma transação encontrada para este perfil.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px 10px' }}>Data</th>
                        <th style={{ padding: '8px 10px' }}>Origem</th>
                        <th style={{ padding: '8px 10px' }}>Descrição</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profileTransactions.map(tx => {
                        const isPayment = tx.txKind === 'payment';
                        return (
                          <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '8px 10px', fontWeight: 500 }}>{formatDateBR(tx.txDate)}</td>
                            <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>
                              {tx.txKind === 'expense' ? tx.faturaName || 'Cartão' : tx.txKind === 'pix' ? 'Pix' : 'Pagamento'}
                            </td>
                            <td style={{ padding: '8px 10px' }}>{tx.name}</td>
                            <td
                              style={{
                                padding: '8px 10px',
                                textAlign: 'right',
                                fontWeight: 600,
                                color: isPayment ? 'var(--success)' : 'var(--text)',
                              }}
                            >
                              {isPayment ? '-' : ''}
                              {fmtMoney(Number(tx.value) || 0, masked)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= ABA 3: BALANÇO MENSAL ================= */}
        {tab === 'balanco' && (
          <div>
            {/* Resumo do Mês */}
            <div className="grid grid-3" style={{ marginBottom: 20 }}>
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total de Entradas</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--success)', marginTop: 4 }}>
                  {fmtMoney(totalEntradas, masked)}
                </div>
              </div>
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total de Saídas Planejadas</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--danger)', marginTop: 4 }}>
                  {fmtMoney(totalSaidasBalanco, masked)}
                </div>
              </div>
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Saldo do Mês</div>
                <div
                  style={{
                    fontSize: '1.6rem',
                    fontWeight: 700,
                    color: saldoMes >= 0 ? 'var(--accent)' : 'var(--danger)',
                    marginTop: 4,
                  }}
                >
                  {fmtMoney(saldoMes, masked)}
                </div>
              </div>
            </div>

            {/* Tabelas de Balanço Configuráveis */}
            {state.balancoTables.map(table => {
              const tableTotal = cfGetTableTotal(state, table);

              return (
                <div key={table.id} className="card" style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid var(--border)',
                      paddingBottom: 10,
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FinanceIcon name={catIconName(table.name)} size={20} />
                      <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 600 }}>{table.name}</h3>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{fmtMoney(tableTotal, masked)}</span>
                    </div>
                  </div>

                  {/* Linhas da Tabela */}
                  {table.rows.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Nenhum item nesta tabela.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                        <tbody>
                          {table.rows.map((row: BalancoRowItem, rIdx: number) => (
                            <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '6px' }}>
                                <input
                                  type="text"
                                  placeholder="Descrição..."
                                  value={row.categoria || ''}
                                  onChange={e => {
                                    const nextRows = [...table.rows];
                                    nextRows[rIdx] = { ...row, categoria: e.target.value };
                                    persistState({
                                      ...state,
                                      balancoTables: state.balancoTables.map(t =>
                                        t.id === table.id ? { ...t, rows: nextRows } : t
                                      ),
                                    });
                                  }}
                                  style={{ padding: '4px 8px', fontSize: '0.85rem', width: '100%' }}
                                />
                              </td>
                              <td style={{ padding: '6px', width: 140 }}>
                                <NumericInput
                                  value={Number(row.valor) || 0}
                                  onValueChange={v => {
                                    const nextRows = [...table.rows];
                                    nextRows[rIdx] = { ...row, valor: Number(v) || 0 };
                                    persistState({
                                      ...state,
                                      balancoTables: state.balancoTables.map(t =>
                                        t.id === table.id ? { ...t, rows: nextRows } : t
                                      ),
                                    });
                                  }}
                                  placeholder="0,00"
                                  style={{ width: '100%', fontSize: '0.85rem' }}
                                />
                              </td>
                              <td style={{ padding: '6px', width: 40, textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="ghost small danger"
                                  style={{ padding: '4px 6px' }}
                                  onClick={() => {
                                    const nextRows = table.rows.filter(r => r.id !== row.id);
                                    persistState({
                                      ...state,
                                      balancoTables: state.balancoTables.map(t =>
                                        t.id === table.id ? { ...t, rows: nextRows } : t
                                      ),
                                    });
                                  }}
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
                    style={{ marginTop: 10 }}
                    onClick={() => {
                      const newRow: BalancoRowItem = { id: genId(), categoria: '', valor: 0 };
                      persistState({
                        ...state,
                        balancoTables: state.balancoTables.map(t =>
                          t.id === table.id ? { ...t, rows: [...t.rows, newRow] } : t
                        ),
                      });
                    }}
                  >
                    + Adicionar Linha
                  </button>
                </div>
              );
            })}
          </div>
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

        {/* ================= MODAL: VISUALIZAR RECIBO ================= */}
        {activeReceiptUrl && (
          <ReceiptModal
            signedUrl={activeReceiptUrl}
            onClose={() => setActiveReceiptUrl(null)}
          />
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
