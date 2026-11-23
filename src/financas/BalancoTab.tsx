// src/financas/BalancoTab.tsx — Aba "Balanço" (paridade com o controle-financeiro.html antigo)
import { useState } from 'react';
import type {
  ActiveProfileInfo,
  BalancoColumnItem,
  BalancoRowItem,
  BalancoTableItem,
  FinanceAppState,
} from './financeTypes';
import { genId, getProfileCategories } from './financeState';
import {
  FinanceIcon,
  NumericInput,
  ProfileChips,
  catIconName,
  fmtMoney,
  getProfileColor,
  tableIconName,
} from './FinanceIcons';
import { cfComputeGastoCategoria, cfGetAllRowsByProfile, cfGetTableTotal } from '../financeFormulas';
import { confirmDialog } from '../dialog';

const num = (v: unknown): number => parseFloat(String(v ?? 0)) || 0;

export interface BalancoTabProps {
  state: FinanceAppState;
  persist: (next: FinanceAppState) => void;
  masked: boolean;
  profiles: ActiveProfileInfo[];
}

/** Saldo do perfil usado em "Entradas": (pago − gasto) × −1, sem gastos lançados pelo líder (family). */
function profileEntradaSaldo(state: FinanceAppState, idx: number): number {
  const tg = cfGetAllRowsByProfile(state, idx)
    .filter(r => !r.family)
    .reduce((s, r) => s + num(r.value), 0);
  const tp = state.payments.filter(p => p.profileIdx === idx).reduce((s, p) => s + num(p.value), 0);
  return (tp - tg) * -1;
}

const isHiddenCard = (t: BalancoTableItem) => t.id === 'banco' || t.id === 'faturas' || t.type === 'entradas';
const isInSaldo = (t: BalancoTableItem) => t.includeInSaldo && t.sign !== 0;

export function BalancoTab({ state, persist, masked, profiles }: BalancoTabProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [planEdit, setPlanEdit] = useState<Record<string, boolean>>({});

  const money = (v: number) => fmtMoney(v, masked);
  const tables = state.balancoTables;

  const setTables = (next: BalancoTableItem[]) => persist({ ...state, balancoTables: next });
  const patchTable = (id: string, patch: Partial<BalancoTableItem>) =>
    setTables(tables.map(t => (t.id === id ? { ...t, ...patch } : t)));
  const patchRows = (id: string, fn: (rows: BalancoRowItem[]) => BalancoRowItem[]) =>
    setTables(tables.map(t => (t.id === id ? { ...t, rows: fn(t.rows) } : t)));
  const patchRow = (tid: string, rid: string, patch: Partial<BalancoRowItem>) =>
    patchRows(tid, rows => rows.map(r => (r.id === rid ? { ...r, ...patch } : r)));
  const patchValue = (tid: string, rid: string, colId: string, v: string | number) =>
    patchRows(tid, rows => rows.map(r => (r.id === rid ? { ...r, values: { ...(r.values || {}), [colId]: v } } : r)));

  /** Troca a tabela de lugar com a vizinha mais próxima dentre as tabelas `pool` (as que aparecem nessa lista). */
  const moveTable = (id: string, dir: -1 | 1, pool: (t: BalancoTableItem) => boolean) => {
    const idx = tables.findIndex(t => t.id === id);
    let target = idx + dir;
    while (target >= 0 && target < tables.length && !pool(tables[target])) target += dir;
    if (target < 0 || target >= tables.length) return;
    const next = [...tables];
    [next[idx], next[target]] = [next[target], next[idx]];
    setTables(next);
  };

  const addCustomTable = () =>
    setTables([
      ...tables,
      {
        id: genId(),
        name: 'Nova tabela',
        icon: '',
        type: 'custom',
        columns: [
          { id: genId(), name: 'Nome', type: 'text' },
          { id: genId(), name: 'Valor (R$)', type: 'number' },
        ],
        rows: [],
        sign: -1,
        includeInSaldo: true,
      },
    ]);

  const addPlanTable = () =>
    setTables([
      ...tables,
      { id: genId(), name: 'Planejamento mensal', icon: '', type: 'planejamento', rows: [], sign: -1, includeInSaldo: true },
    ]);

  const removeTable = async (t: BalancoTableItem) => {
    const special = ['entradas', 'lancamentos', 'banco'].includes(t.id);
    const msg = special
      ? `"${t.name}" tem um comportamento especial nessa aba (cálculo próprio). Excluir remove essa funcionalidade também, não só os dados.`
      : `Isso remove "${t.name}" e os dados dela do Balanço mensal.`;
    if (!(await confirmDialog(msg, { title: 'Excluir tabela?', confirmLabel: 'Excluir', danger: true }))) return;
    setTables(tables.filter(x => x.id !== t.id));
  };

  const cycleSign = (t: BalancoTableItem) => {
    const sign: -1 | 0 | 1 = t.sign === 1 ? -1 : t.sign === -1 ? 0 : 1;
    patchTable(t.id, { sign, includeInSaldo: sign !== 0 });
  };

  // ── Visão do mês ──
  const included = tables.filter(isInSaldo);
  const saldoFinal = included.reduce((s, t) => s + cfGetTableTotal(state, t) * t.sign, 0);
  const neg = saldoFinal < 0;
  const visibleCards = tables.filter(t => !isHiddenCard(t));
  const totalTables = tables.length;
  const saldoPos = Math.min(state.saldoSectionIndex ?? 999, totalTables);

  const moveSaldo = (dir: -1 | 1) =>
    persist({ ...state, saldoSectionIndex: Math.max(0, Math.min(totalTables, saldoPos + dir)) });

  const renderEditableAccounts = (t: BalancoTableItem) => (
    <>
      {t.rows.map(row => (
        <div className="saldo-sub-row" key={row.id}>
          <input
            type="text"
            aria-label="Nome da conta"
            placeholder="Nome da conta"
            value={String(row.values?.nome ?? '')}
            onChange={e => patchValue(t.id, row.id, 'nome', e.target.value)}
            className="bal-grow"
          />
          <NumericInput
            ariaLabel="Valor da conta"
            value={num(row.values?.val)}
            onValueChange={v => patchValue(t.id, row.id, 'val', v)}
            minPx={100}
            maxPx={200}
            style={{ fontWeight: 700 }}
          />
          <button type="button" className="btn btn-danger btn-sm" aria-label="Remover conta" onClick={() => patchRows(t.id, rs => rs.filter(r => r.id !== row.id))}>
            <FinanceIcon name="trash" size={16} />
          </button>
        </div>
      ))}
      <div className="saldo-sub-add">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => patchRows(t.id, rs => [...rs, { id: genId(), values: { nome: '', val: 0 } }])}
        >
          <FinanceIcon name="plus" size={16} /> Nova conta
        </button>
      </div>
    </>
  );

  const renderEntradasToggles = () =>
    profiles.map(({ name, idx }) => {
      const on = state.entradasProfiles[idx] !== false;
      const saldo = profileEntradaSaldo(state, idx);
      return (
        <button
          type="button"
          key={idx}
          className={`saldo-sub-row saldo-toggle${on ? '' : ' off'}`}
          aria-pressed={on}
          title={on ? 'Toque para excluir das Entradas' : 'Toque para incluir nas Entradas'}
          onClick={() => persist({ ...state, entradasProfiles: { ...state.entradasProfiles, [idx]: !on } })}
        >
          <span className="dot" style={{ background: getProfileColor(idx) }} />
          <span className="bal-grow">{name}</span>
          <span className={`val-cell ${saldo >= 0 ? 'positive' : 'negative'}`}>
            {saldo >= 0 ? '+' : ''}
            {money(saldo)}
          </span>
          <span className="saldo-check" aria-hidden="true">{on ? '✓' : '○'}</span>
        </button>
      );
    });

  const renderFaturasMirror = () => {
    const pixSum = state.pixRows.reduce((s, p) => s + num(p.value), 0);
    return (
      <>
        {state.faturas.length === 0 && <div className="saldo-sub-note">Nenhuma fatura cadastrada ainda na aba Faturas.</div>}
        {state.faturas.map(f => (
          <div className="saldo-sub-row" key={f.id}>
            <span className="bal-grow">{f.name}</span>
            <span className="val-cell negative">{money(f.rows.reduce((s, r) => s + num(r.value), 0))}</span>
          </div>
        ))}
        {pixSum > 0 && (
          <div className="saldo-sub-row balanco-pix-info">
            <span className="bal-grow">Pix (fora deste total — já saiu da conta)</span>
            <span className="val-cell">{money(pixSum)}</span>
          </div>
        )}
        <div className="saldo-sub-note">Edite valores, fechamento e vencimento direto na aba Faturas.</div>
      </>
    );
  };

  const renderCustomInline = (t: BalancoTableItem) => {
    const cols = t.columns || [];
    const numCol = cols.find(c => c.type === 'number');
    const textCols = cols.filter(c => c.type === 'text');
    return (
      <>
        {t.rows.length === 0 && <div className="saldo-sub-note">Sem itens. Adicione abaixo.</div>}
        {t.rows.map(row => (
          <div className="saldo-sub-row" key={row.id}>
            {textCols.map(c => (
              <input
                key={c.id}
                type="text"
                aria-label={c.name}
                placeholder={c.name}
                value={String(row.values?.[c.id] ?? '')}
                onChange={e => patchValue(t.id, row.id, c.id, e.target.value)}
                className="bal-grow"
              />
            ))}
            {numCol && (
              <NumericInput
                ariaLabel={numCol.name}
                value={num(row.values?.[numCol.id])}
                onValueChange={v => patchValue(t.id, row.id, numCol.id, v)}
                minPx={100}
                maxPx={200}
              />
            )}
            <button type="button" className="btn btn-danger btn-sm" aria-label="Remover linha" onClick={() => patchRows(t.id, rs => rs.filter(r => r.id !== row.id))}>
              <FinanceIcon name="trash" size={16} />
            </button>
          </div>
        ))}
        <div className="saldo-sub-add">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => addRow(t)}>
            <FinanceIcon name="plus" size={16} /> Adicionar linha
          </button>
        </div>
      </>
    );
  };

  const addRow = (t: BalancoTableItem) => {
    const values: Record<string, string | number> = {};
    (t.columns || []).forEach(c => {
      values[c.id] = c.type === 'number' ? 0 : '';
    });
    patchRows(t.id, rs => [...rs, { id: genId(), values }]);
  };

  const saldoSection = (
    <section className="balanco-section" key="__saldo">
      <div className="balanco-title-row">
        <button type="button" className="btn btn-ghost btn-sm" disabled={saldoPos === 0} onClick={() => moveSaldo(-1)} aria-label="Mover Visão do mês para cima" title="Mover para cima">↑</button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={saldoPos >= totalTables} onClick={() => moveSaldo(1)} aria-label="Mover Visão do mês para baixo" title="Mover para baixo">↓</button>
        <h2 className="balanco-section-title">Visão do mês</h2>
      </div>
      <div className="card card--flush" style={{ overflow: 'hidden' }}>
        {included.map((t, i) => {
          const open = !!expanded[t.id];
          const total = cfGetTableTotal(state, t);
          return (
            <div key={t.id}>
              <div className="saldo-line">
                <button
                  type="button"
                  className="saldo-line-main"
                  aria-expanded={open}
                  onClick={() => setExpanded(e => ({ ...e, [t.id]: !open }))}
                >
                  <span className="row-ic"><FinanceIcon name={tableIconName(t)} size={20} /></span>
                  <span className="row-name">{t.name}</span>
                  <span className="row-chev" aria-hidden="true"><FinanceIcon name="chevron" size={16} /></span>
                  <span className={`val-cell ${t.sign === 1 ? 'positive' : 'negative'} saldo-line-val`}>
                    {t.sign === 1 ? '+' : '− '}
                    {money(total)}
                  </span>
                </button>
                {open && (
                  <span className="row-moves">
                    <button type="button" className="btn btn-ghost btn-sm" disabled={i === 0} aria-label="Mover para cima" onClick={() => moveTable(t.id, -1, isInSaldo)}>↑</button>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={i === included.length - 1} aria-label="Mover para baixo" onClick={() => moveTable(t.id, 1, isInSaldo)}>↓</button>
                  </span>
                )}
              </div>
              {open && (
                <div className="saldo-body">
                  {t.id === 'banco' && renderEditableAccounts(t)}
                  {t.id !== 'banco' && t.type === 'entradas' && (
                    <>
                      {renderEntradasToggles()}
                      <div className="saldo-sub-note">Toque no perfil para incluir ou excluir do total de Entradas.</div>
                    </>
                  )}
                  {t.id !== 'banco' && t.type === 'faturas_auto' && renderFaturasMirror()}
                  {t.id !== 'banco' && t.type === 'custom' && renderCustomInline(t)}
                  {(t.type === 'planejamento' || t.type === 'lancamentos') && (
                    <div className="saldo-sub-note">Veja e edite os detalhes no cartão “{t.name}” logo abaixo.</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {included.length === 0 && <div className="empty">Nenhuma tabela entra no saldo. Use o botão “Saldo” de cada tabela.</div>}
      </div>
    </section>
  );

  // ── Cartões por tipo ──
  const renderPlanejamento = (t: BalancoTableItem) => {
    const validRows = t.rows.filter(r => r.categoria && r.profileIdx != null);
    const estimado = validRows.reduce((s, r) => s + num(r.valor), 0);
    const gastoOf = (r: BalancoRowItem) => cfComputeGastoCategoria(state, r.profileIdx as number, r.categoria as string);
    const restante = validRows.reduce((s, r) => s + Math.max(0, num(r.valor) - gastoOf(r)), 0);
    const estourado = validRows.reduce((s, r) => s + Math.max(0, gastoOf(r) - num(r.valor)), 0);
    const overCount = validRows.filter(r => gastoOf(r) > num(r.valor)).length;
    const okCount = validRows.length - overCount;

    return (
      <>
        {t.rows.length === 0 && <div className="empty">Nenhuma categoria ainda — adicione abaixo.</div>}
        {t.rows.map(row => {
          const valor = num(row.valor);
          const ready = row.profileIdx != null && !!row.categoria;
          const gasto = ready ? gastoOf(row) : 0;
          const rest = valor - gasto;
          const over = ready && rest < 0;
          const pct = valor > 0 ? Math.min(100, (gasto / valor) * 100) : gasto > 0 ? 100 : 0;
          const editing = planEdit[row.id] !== undefined ? planEdit[row.id] : !ready;
          const pName = row.profileIdx != null ? state.profiles[row.profileIdx]?.name || '' : '';
          const cats = row.profileIdx != null ? getProfileCategories(state, row.profileIdx) : null;
          return (
            <div className="plan-row" key={row.id}>
              <div className="plan-head">
                <span className={`plan-ic${over ? ' over' : ''}`}><FinanceIcon name={catIconName(row.categoria)} size={20} /></span>
                <div className="plan-mid"><div className="plan-name">{row.categoria || 'Nova categoria'}</div></div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  aria-expanded={editing}
                  onClick={() => setPlanEdit(p => ({ ...p, [row.id]: !editing }))}
                >
                  {editing ? 'Fechar' : 'Editar'}
                </button>
              </div>
              <div className="plan-meta">
                <div className="plan-sub">
                  {ready ? `${money(gasto)} de ${money(valor)}${pName ? ' · ' + pName : ''}` : 'Escolha perfil e categoria'}
                </div>
                <div className={`plan-rest${over ? ' over' : ''}`}>
                  {ready ? (over ? `estourou ${money(Math.abs(rest))}` : `restam ${money(rest)}`) : ''}
                </div>
              </div>
              {(ready || valor > 0) && (
                <div className="plan-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
                  <div className={`plan-fill${over ? ' over' : ''}`} style={{ width: `${pct}%` }} />
                </div>
              )}
              {editing && (
                <div className="plan-edit">
                  <ProfileChips
                    profiles={profiles}
                    selectedIdx={row.profileIdx ?? null}
                    onChange={next => patchRow(t.id, row.id, { profileIdx: next, categoria: next === row.profileIdx ? row.categoria : '' })}
                  />
                  {!cats ? (
                    <span className="plan-hint">{row.profileIdx == null ? 'Escolha o perfil acima' : 'Este perfil ainda não tem categorias (cadastre em Resumo → Perfis)'}</span>
                  ) : (
                    <select
                      aria-label="Categoria"
                      value={row.categoria || ''}
                      onChange={e => patchRow(t.id, row.id, { categoria: e.target.value })}
                      style={{ flex: 1, minWidth: 160 }}
                    >
                      <option value="">— selecione a categoria —</option>
                      {cats.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                  <label className="plan-prev">
                    Previsto
                    <NumericInput
                      ariaLabel="Valor previsto"
                      value={valor}
                      onValueChange={v => patchRow(t.id, row.id, { valor: v })}
                      minPx={100}
                      maxPx={170}
                      style={{ fontWeight: 700 }}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    aria-label="Remover categoria"
                    onClick={async () => {
                      if (await confirmDialog('Esta categoria sai do planejamento.', { title: 'Remover categoria?', confirmLabel: 'Remover', danger: true }))
                        patchRows(t.id, rs => rs.filter(r => r.id !== row.id));
                    }}
                  >
                    <FinanceIcon name="trash" size={16} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {validRows.length > 0 && (
          <div className="plan-closing">
            <div>
              {okCount} {okCount === 1 ? 'categoria fechada' : 'categorias fechadas'} no previsto.{' '}
              {overCount === 0 ? 'Nenhuma estourou.' : `${overCount} ${overCount === 1 ? 'estourou' : 'estouraram'}.`}
            </div>
            <div className="plan-sub" style={{ marginTop: 4 }}>
              Previsto {money(estimado)} · ainda falta gastar <strong className="positive">{money(restante)}</strong>
              {estourado > 0 && <> · passou do previsto <strong className="negative">{money(estourado)}</strong></>}
            </div>
          </div>
        )}
        <div className="add-row-bar">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => patchRows(t.id, rs => [...rs, { id: genId(), categoria: '', valor: 0, profileIdx: null }])}
          >
            <FinanceIcon name="plus" size={16} /> Adicionar categoria
          </button>
        </div>
      </>
    );
  };

  const renderFaturasAuto = (t: BalancoTableItem) => {
    const pixSum = state.pixRows.reduce((s, p) => s + num(p.value), 0);
    const total = state.faturas.reduce((s, f) => s + f.rows.reduce((s2, r) => s2 + num(r.value), 0), 0);
    return (
      <>
        <div className="card-header">
          <div className="card-title"><FinanceIcon name="card" size={18} /> {t.name}</div>
        </div>
        <div className="saldo-sub-note">Atualizado automaticamente a partir da aba Faturas — edite os valores lá.</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Fatura</th><th>Fechamento</th><th>Vencimento</th><th>Valor</th></tr>
            </thead>
            <tbody>
              {state.faturas.length === 0 && (
                <tr><td colSpan={4}><div className="empty">Nenhuma fatura cadastrada ainda na aba Faturas.</div></td></tr>
              )}
              {state.faturas.map(f => (
                <tr key={f.id}>
                  <td>{f.name}</td>
                  <td>{f.fechamento || '—'}</td>
                  <td>{f.vencimento || '—'}</td>
                  <td className="val-cell negative">{money(f.rows.reduce((s, r) => s + num(r.value), 0))}</td>
                </tr>
              ))}
              {pixSum > 0 && (
                <tr className="balanco-pix-info">
                  <td colSpan={3} style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Pix — fora do total (já saiu da conta)</td>
                  <td className="val-cell" style={{ color: 'var(--muted)', fontStyle: 'italic' }}>{money(pixSum)}</td>
                </tr>
              )}
            </tbody>
            {state.faturas.length > 0 && (
              <tfoot>
                <tr><td colSpan={3}>Total</td><td className="val-cell negative">{money(total)}</td></tr>
              </tfoot>
            )}
          </table>
        </div>
      </>
    );
  };

  const renderLancamentos = (t: BalancoTableItem) => {
    const ref = tables.find(tb => tb.id === (t.refTableId || 'referencia'));
    const valCol = ref?.columns?.find(c => c.type === 'number');
    const nameCol = ref?.columns?.find(c => c.type === 'text');
    const last = state.profiles.length - 1;
    const spentBy: Record<string, number> = {};
    cfGetAllRowsByProfile(state, last).forEach(r => {
      const cat = r.category || 'Outros';
      spentBy[cat] = (spentBy[cat] || 0) + num(r.value);
    });
    let totRef = 0, totSpent = 0, totRest = 0;
    const body = (ref?.rows || []).map(row => {
      const cat = nameCol ? String(row.values?.[nameCol.id] ?? '') : '';
      const refVal = valCol ? num(row.values?.[valCol.id]) : 0;
      const spent = spentBy[cat] || 0;
      const rest = refVal - spent;
      totRef += refVal; totSpent += spent; totRest += rest;
      const cls = rest > 0 ? 'lancamento-diff-positive' : rest < 0 ? 'lancamento-diff-negative' : 'lancamento-diff-neutral';
      return (
        <tr key={row.id}>
          <td>{cat}</td>
          <td className="val-cell">{money(refVal)}</td>
          <td className="val-cell negative">{spent > 0 ? '− ' + money(spent) : '—'}</td>
          <td className={`val-cell ${cls}`}>{rest > 0 ? '+' : ''}{money(rest)}</td>
        </tr>
      );
    });
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Categoria</th><th>Referência</th><th>Gasto (último perfil)</th><th>Restante</th></tr>
          </thead>
          <tbody>{body}</tbody>
          <tfoot>
            <tr>
              <td>Totais</td>
              <td className="val-cell">{money(totRef)}</td>
              <td className="val-cell negative">− {money(totSpent)}</td>
              <td className={`val-cell ${totRest > 0 ? 'positive' : totRest < 0 ? 'negative' : ''}`}>{totRest > 0 ? '+' : ''}{money(totRest)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  const renderCustom = (t: BalancoTableItem) => {
    const cols = t.columns || [];
    const numCol = cols.find(c => c.type === 'number');
    const total = numCol ? t.rows.reduce((s, r) => s + num(r.values?.[numCol.id]), 0) : 0;
    const patchCols = (fn: (c: BalancoColumnItem[]) => BalancoColumnItem[]) => patchTable(t.id, { columns: fn(cols) });
    return (
      <>
        <div className="col-editor">
          {cols.map(c => (
            <div className="col-editor-item" key={c.id}>
              <input
                type="text"
                aria-label="Nome da coluna"
                value={c.name}
                onChange={e => patchCols(cs => cs.map(x => (x.id === c.id ? { ...x, name: e.target.value } : x)))}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                title="Alternar tipo (texto/número)"
                aria-label={`Tipo da coluna ${c.name}: ${c.type === 'number' ? 'número' : 'texto'}. Alternar`}
                onClick={() => patchCols(cs => cs.map(x => (x.id === c.id ? { ...x, type: x.type === 'number' ? 'text' : 'number' } : x)))}
              >
                {c.type === 'number' ? '#' : 'A'}
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                aria-label={`Remover coluna ${c.name}`}
                onClick={() =>
                  setTables(
                    tables.map(x =>
                      x.id === t.id
                        ? {
                            ...x,
                            columns: cols.filter(k => k.id !== c.id),
                            rows: x.rows.map(r => {
                              const values = { ...(r.values || {}) };
                              delete values[c.id];
                              return { ...r, values };
                            }),
                          }
                        : x
                    )
                  )
                }
              >
                <FinanceIcon name="x" size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              const col: BalancoColumnItem = { id: genId(), name: 'Coluna', type: 'text' };
              setTables(
                tables.map(x =>
                  x.id === t.id
                    ? { ...x, columns: [...cols, col], rows: x.rows.map(r => ({ ...r, values: { ...(r.values || {}), [col.id]: '' } })) }
                    : x
                )
              );
            }}
          >
            <FinanceIcon name="plus" size={14} /> Coluna
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {cols.map(c => (<th key={c.id}>{c.name}</th>))}
                <th />
              </tr>
            </thead>
            <tbody>
              {t.rows.length === 0 && (
                <tr><td colSpan={cols.length + 1}><div className="empty">Sem linhas. Adicione abaixo.</div></td></tr>
              )}
              {t.rows.map(row => (
                <tr key={row.id} className="balanco-editable-row">
                  {cols.map(c => (
                    <td key={c.id}>
                      {c.type === 'number' ? (
                        <NumericInput ariaLabel={c.name} value={num(row.values?.[c.id])} onValueChange={v => patchValue(t.id, row.id, c.id, v)} style={{ width: '100%' }} />
                      ) : (
                        <input
                          type="text"
                          aria-label={c.name}
                          placeholder={c.name}
                          value={String(row.values?.[c.id] ?? '')}
                          onChange={e => patchValue(t.id, row.id, c.id, e.target.value)}
                          style={{ width: '100%' }}
                        />
                      )}
                    </td>
                  ))}
                  <td>
                    <button type="button" className="btn btn-danger btn-sm" aria-label="Remover linha" onClick={() => patchRows(t.id, rs => rs.filter(r => r.id !== row.id))}>
                      <FinanceIcon name="trash" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {numCol && (
              <tfoot>
                <tr>
                  <td colSpan={Math.max(1, cols.indexOf(numCol))} style={{ color: 'var(--muted)', fontSize: 12 }}>Total</td>
                  <td className="val-cell positive">{money(total)}</td>
                  {cols.length - cols.indexOf(numCol) > 0 && <td colSpan={cols.length - cols.indexOf(numCol)} />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="add-row-bar">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => addRow(t)}>
            <FinanceIcon name="plus" size={16} /> Adicionar linha
          </button>
        </div>
      </>
    );
  };

  const signLabel = (s: number) => (s === 1 ? '＋ Saldo' : s === -1 ? '− Saldo' : 'Fora do saldo');
  const signClass = (s: number) => (s === 1 ? 'sign-pos' : s === -1 ? 'sign-neg' : 'sign-off');

  const tableCard = (t: BalancoTableItem, vIdx: number) => (
    <section className="balanco-section" key={t.id}>
      <div className="balanco-title-row">
        <input
          type="text"
          className="balanco-icon-input"
          aria-label="Ícone (emoji)"
          maxLength={4}
          value={t.icon || ''}
          placeholder="•"
          onChange={e => patchTable(t.id, { icon: e.target.value })}
        />
        <input
          type="text"
          className="balanco-name-input"
          aria-label="Nome da tabela"
          value={t.name}
          onChange={e => patchTable(t.id, { name: e.target.value })}
        />
        <button type="button" className="btn btn-ghost btn-sm" disabled={vIdx === 0} aria-label="Mover para cima" title="Mover para cima" onClick={() => moveTable(t.id, -1, x => !isHiddenCard(x))}>↑</button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={vIdx === visibleCards.length - 1} aria-label="Mover para baixo" title="Mover para baixo" onClick={() => moveTable(t.id, 1, x => !isHiddenCard(x))}>↓</button>
        <button type="button" className={`btn btn-ghost btn-sm sign-btn ${signClass(t.sign)}`} title="Altera como esta tabela entra no Saldo" onClick={() => cycleSign(t)}>
          {signLabel(t.sign)}
        </button>
        <button type="button" className="btn btn-danger btn-sm" aria-label={`Excluir ${t.name}`} onClick={() => void removeTable(t)}>
          <FinanceIcon name="trash" size={16} />
        </button>
      </div>
      <div className="card card--flush" style={{ overflow: 'hidden' }}>
        {t.type === 'lancamentos'
          ? renderLancamentos(t)
          : t.type === 'planejamento'
            ? renderPlanejamento(t)
            : t.type === 'faturas_auto'
              ? renderFaturasAuto(t)
              : renderCustom(t)}
      </div>
    </section>
  );

  // Resumo no topo (estrutura da referência A)
  const planTables = tables.filter(t => t.type === 'planejamento');
  const faltaPlanejado = planTables.reduce(
    (sum, t) =>
      sum +
      t.rows
        .filter(r => r.categoria && r.profileIdx != null)
        .reduce((s2, r) => s2 + Math.max(0, num(r.valor) - cfComputeGastoCategoria(state, r.profileIdx as number, r.categoria as string)), 0),
    0
  );
  const totEntradas = included.filter(t => t.sign === 1).reduce((s, t) => s + cfGetTableTotal(state, t), 0);
  const totFaturas = included.filter(t => t.type === 'faturas_auto').reduce((s, t) => s + cfGetTableTotal(state, t), 0);
  const totSaidas = included.filter(t => t.sign === -1 && t.type !== 'faturas_auto').reduce((s, t) => s + cfGetTableTotal(state, t), 0);

  const nodes: React.ReactNode[] = [];
  let vIdx = 0;
  tables.forEach((t, i) => {
    if (i === saldoPos) nodes.push(saldoSection);
    if (!isHiddenCard(t)) nodes.push(tableCard(t, vIdx++));
  });
  if (saldoPos >= tables.length) nodes.push(saldoSection);

  return (
    <div className="balanco-tab">
      <div className="card bal-hero">
        <div className="bal-hero-top">
          <span>Saldo do mês</span>
          <span className={`bal-badge${neg ? ' warn' : ''}`}>{neg ? 'Atenção' : 'No azul'}</span>
        </div>
        <div className={`bal-hero-val${neg ? ' neg' : ''}`}>
          {neg ? '−' : ''}
          {money(Math.abs(saldoFinal))}
        </div>
        <div className="bal-hero-sub">
          {planTables.length > 0 && faltaPlanejado > 0
            ? `Faltam ${money(faltaPlanejado)} do planejado para gastar este mês.`
            : neg
              ? 'As saídas e faturas passam das entradas neste mês.'
              : 'Depois de entradas, saídas e faturas.'}
        </div>
      </div>
      <div className="bal-chips">
        <div className="bal-chip"><div className="bal-chip-label">Entradas</div><div className="bal-chip-val positive">{money(totEntradas)}</div></div>
        <div className="bal-chip"><div className="bal-chip-label">Saídas</div><div className="bal-chip-val">{money(totSaidas)}</div></div>
        <div className="bal-chip"><div className="bal-chip-label">Faturas</div><div className="bal-chip-val">{money(totFaturas)}</div></div>
      </div>
      {nodes}
      <div className="balanco-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={addCustomTable}>
          <FinanceIcon name="plus" size={16} /> Nova tabela
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={addPlanTable}>
          <FinanceIcon name="plus" size={16} /> Novo planejamento
        </button>
      </div>
    </div>
  );
}
