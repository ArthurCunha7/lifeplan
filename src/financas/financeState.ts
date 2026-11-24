// src/financas/financeState.ts — Estado padrão, migrações, cache localStorage e seletores
import type {
  ActiveProfileInfo,
  BalancoColumnItem,
  BalancoRowItem,
  BalancoTableItem,
  BalancoTableType,
  FaturaItem,
  FaturaRowItem,
  FinanceAppState,
  PaymentItem,
  PixRowItem,
  ProfileExpenseItem,
  ProfileItem,
  ProfileTransactionItem,
} from './financeTypes';

const DEFAULT_PROFILE_CATEGORIES: Readonly<Record<number, readonly string[]>> = {
  3: ['Pedágio', 'Combustível', 'Manutenção', 'Seguro'],
  4: ['Academia', 'Restaurantes', 'Salão', 'Uber', 'Dieta', 'Lista de desejos', 'Parcelado', 'Outros'],
  5: ['Academia', 'Restaurantes', 'Salão', 'Uber', 'Dieta', 'Lista de desejos', 'Parcelado', 'Outros'],
};

export const LEGACY_CATEGORIES: readonly string[] = [
  'Academia',
  'Restaurantes',
  'Salão',
  'Uber',
  'Dieta',
  'Lista de desejos',
  'Parcelado',
  'Outros',
];

export function genId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function getDefaultState(): FinanceAppState {
  return {
    _isFreshDefault: true,
    _migratedBancoV1: true,
    _migratedProspectivoV1: true,
    profiles: [{ name: 'Perfil 1', linkedUserId: null }],
    activeProfiles: 1,
    profileCategories: {
      0: ['Academia', 'Restaurantes', 'Uber', 'Lista de desejos'],
    },
    entradasProfiles: { 0: true },
    faturas: [{ id: genId(), name: 'Fatura 1', rows: [] }],
    payments: [],
    pixRows: [],
    saldoSectionIndex: 1,
    balancoTables: [
      {
        id: 'banco',
        name: 'Saldo em Conta',
        icon: '',
        type: 'custom',
        columns: [
          { id: 'nome', name: 'Banco / Conta', type: 'text' },
          { id: 'val', name: 'Valor (R$)', type: 'number' },
        ],
        rows: [],
        sign: 1,
        includeInSaldo: true,
      },
      {
        id: 'faturas',
        name: 'Faturas',
        icon: '',
        type: 'faturas_auto',
        rows: [],
        sign: -1,
        includeInSaldo: true,
      },
      {
        id: 'entradas',
        name: 'Entradas',
        icon: '',
        type: 'entradas',
        columns: [],
        rows: [],
        sign: 1,
        includeInSaldo: true,
      },
      {
        id: genId(),
        name: 'Planejamento Mensal',
        icon: '',
        type: 'planejamento',
        rows: [
          { id: genId(), categoria: 'Academia', profileIdx: 0, valor: 0 },
          { id: genId(), categoria: 'Restaurantes', profileIdx: 0, valor: 0 },
          { id: genId(), categoria: 'Uber', profileIdx: 0, valor: 0 },
          { id: genId(), categoria: 'Lista de desejos', profileIdx: 0, valor: 0 },
        ],
        sign: -1,
        includeInSaldo: true,
      },
      {
        id: 'prospectivo',
        name: 'Orçamento prospectivo',
        icon: '',
        type: 'prospectivo',
        rows: [],
        sign: 0,
        includeInSaldo: false,
      },
    ],
  };
}

interface RawLegacyState {
  _isFreshDefault?: boolean;
  _migratedBancoV1?: boolean;
  _migratedProspectivoV1?: boolean;
  profiles?: Array<string | { name?: string; linkedUserId?: string | null }>;
  activeProfiles?: number;
  profileCategories?: Record<string, string[]>;
  entradasProfiles?: Record<string, boolean>;
  faturas?: Array<{
    id?: string;
    name?: string;
    fechamento?: string;
    vencimento?: string;
    family?: boolean;
    kind?: string;
    who?: string;
    closing?: { id: string; cutoff: string; label: string | null } | null;
    rows?: Array<{
      id?: string;
      date?: string;
      name?: string;
      parcelas?: string;
      value?: number | string;
      profileIdx?: number | null;
      category?: string | null;
      family?: boolean;
      receiptPath?: string;
      faturaOrigem?: string;
    }>;
  }>;
  payments?: Array<{
    id?: string;
    profileIdx?: number | null;
    desc?: string;
    value?: number | string;
    date?: string;
  }>;
  pixRows?: Array<{
    id?: string;
    date?: string;
    desc?: string;
    value?: number | string;
    profileIdx?: number | null;
    category?: string | null;
    receiptPath?: string;
  }>;
  saidas?: unknown[];
  saldoSectionIndex?: number;
  balanco?: {
    referencia?: Array<{ id?: string; name?: string; value?: number | string }>;
  };
  balancoTables?: Array<{
    id?: string;
    name?: string;
    icon?: string;
    type?: string;
    sign?: number;
    includeInSaldo?: boolean;
    refTableId?: string;
    columns?: Array<{ id?: string; name?: string; type?: string }>;
    rows?: Array<{
      id?: string;
      values?: Record<string, string | number>;
      categoria?: string;
      profileIdx?: number | null;
      valor?: number | string;
    }>;
  }>;
}

function normalizeSign(s: number | undefined, fallback: -1 | 0 | 1): -1 | 0 | 1 {
  if (s === 1 || s === -1 || s === 0) return s;
  return fallback;
}

function normalizeTableType(t?: string): BalancoTableType {
  if (t === 'entradas' || t === 'lancamentos' || t === 'faturas_auto' || t === 'planejamento' || t === 'custom' || t === 'prospectivo') {
    return t;
  }
  return 'custom';
}

export function migrateFinanceState(input: unknown): FinanceAppState {
  if (!input || typeof input !== 'object') {
    const fresh = getDefaultState();
    delete fresh._isFreshDefault;
    return fresh;
  }

  const raw = JSON.parse(JSON.stringify(input)) as RawLegacyState;

  // 1. Perfis brutos (podem ser strings em estados antigos)
  const rawProfiles: Array<string | { name?: string; linkedUserId?: string | null }> = Array.isArray(raw.profiles) && raw.profiles.length > 0
    ? [...raw.profiles]
    : [{ name: 'Perfil 1', linkedUserId: null }];

  // Migração legada: 5 perfis -> insere 'Perfil 4' no índice 3
  const shiftedFiveProfiles = rawProfiles.length === 5;
  if (shiftedFiveProfiles) {
    rawProfiles.splice(3, 0, 'Perfil 4');
  }

  const faturas: FaturaItem[] = Array.isArray(raw.faturas)
    ? raw.faturas.map(f => ({
        id: f.id || genId(),
        name: f.name ?? 'Fatura',
        fechamento: f.fechamento,
        vencimento: f.vencimento,
        family: f.family,
        kind: f.kind,
        who: f.who,
        closing: f.closing ?? undefined,
        rows: Array.isArray(f.rows)
          ? f.rows.map(r => {
              let pIdx = r.profileIdx === undefined ? null : r.profileIdx;
              if (shiftedFiveProfiles && pIdx !== null) {
                if (pIdx === 4) pIdx = 5;
                else if (pIdx === 3) pIdx = 4;
              }
              return {
                id: r.id || genId(),
                date: r.date ?? '',
                name: r.name ?? '',
                parcelas: r.parcelas ?? '',
                value: r.value ?? '',
                profileIdx: pIdx,
                category: r.category ?? null,
                family: r.family,
                receiptPath: r.receiptPath,
                faturaOrigem: r.faturaOrigem,
              };
            })
          : [],
      }))
    : [{ id: genId(), name: 'Fatura 1', rows: [] }];

  const payments: PaymentItem[] = Array.isArray(raw.payments)
    ? raw.payments.map(p => {
        let pIdx = p.profileIdx === undefined ? null : p.profileIdx;
        if (shiftedFiveProfiles && pIdx !== null) {
          if (pIdx === 4) pIdx = 5;
          else if (pIdx === 3) pIdx = 4;
        }
        return {
          id: p.id || genId(),
          profileIdx: pIdx,
          desc: p.desc ?? 'Pagamento',
          value: parseFloat(String(p.value ?? 0)) || 0,
          date: p.date ?? '',
        };
      })
    : [];

  const pixRows: PixRowItem[] = Array.isArray(raw.pixRows)
    ? raw.pixRows.map(p => ({
        id: p.id || genId(),
        date: p.date ?? '',
        desc: p.desc ?? '',
        value: parseFloat(String(p.value ?? 0)) || 0,
        profileIdx: p.profileIdx === undefined ? null : p.profileIdx,
        category: p.category ?? null,
        receiptPath: p.receiptPath,
      }))
    : [];

  const profiles: ProfileItem[] = rawProfiles.map((p, idx) =>
    typeof p === 'string'
      ? { name: p, linkedUserId: null }
      : { name: p?.name ?? `Perfil ${idx + 1}`, linkedUserId: p?.linkedUserId ?? null },
  );

  // Categorias por perfil
  const profileCategories: Record<number, string[]> = {};
  const rawCats = raw.profileCategories || {};
  profiles.forEach((_prof, idx) => {
    const existing = rawCats[String(idx)];
    if (Array.isArray(existing)) {
      profileCategories[idx] = [...existing];
    } else if (DEFAULT_PROFILE_CATEGORIES[idx]) {
      profileCategories[idx] = [...DEFAULT_PROFILE_CATEGORIES[idx]];
    } else {
      profileCategories[idx] = [];
    }
  });

  // Entradas por perfil
  const entradasProfiles: Record<number, boolean> = {};
  const rawEntradas = raw.entradasProfiles || {};
  profiles.forEach((_prof, idx) => {
    const val = rawEntradas[String(idx)];
    entradasProfiles[idx] = val === undefined ? true : Boolean(val);
  });

  // Tabelas do Balanço Mensal
  let balancoTables: BalancoTableItem[];
  if (!Array.isArray(raw.balancoTables)) {
    const oldRef = raw.balanco?.referencia || [];
    const refRows: BalancoRowItem[] =
      oldRef.length > 0
        ? oldRef.map(r => ({
            id: r.id || genId(),
            values: { cat: r.name || '', val: parseFloat(String(r.value ?? 0)) || 0 },
          }))
        : LEGACY_CATEGORIES.map(cat => ({
            id: genId(),
            values: { cat, val: 0 },
          }));

    if (!refRows.find(r => r.values?.cat === 'Parcelado')) {
      const outrosIdx = refRows.findIndex(r => r.values?.cat === 'Outros');
      const parceladoRow: BalancoRowItem = { id: genId(), values: { cat: 'Parcelado', val: 0 } };
      if (outrosIdx >= 0) refRows.splice(outrosIdx, 0, parceladoRow);
      else refRows.push(parceladoRow);
    }

    balancoTables = [
      {
        id: 'referencia',
        name: 'Referência',
        icon: '',
        type: 'custom',
        columns: [
          { id: 'cat', name: 'Categoria', type: 'text' },
          { id: 'val', name: 'Valor de Referência (R$)', type: 'number' },
        ],
        rows: refRows,
        sign: -1,
        includeInSaldo: true,
      },
      {
        id: 'faturas',
        name: 'Faturas',
        icon: '',
        type: 'faturas_auto',
        rows: [],
        sign: -1,
        includeInSaldo: true,
      },
      {
        id: 'entradas',
        name: 'Entradas',
        icon: '',
        type: 'entradas',
        columns: [],
        rows: [],
        sign: 1,
        includeInSaldo: true,
      },
      {
        id: 'lancamentos',
        name: 'Lançamentos',
        icon: '',
        type: 'lancamentos',
        columns: [],
        rows: [],
        refTableId: 'referencia',
        sign: 0,
        includeInSaldo: false,
      },
    ];
  } else {
    balancoTables = raw.balancoTables
      .filter(t => t.id !== 'saidas' && t.id !== 'pix_balanco')
      .map(t => {
        const isFaturas = t.id === 'faturas';
        const type: BalancoTableType = isFaturas ? 'faturas_auto' : normalizeTableType(t.type);
        const sign = type === 'prospectivo' ? 0 : normalizeSign(t.sign, type === 'entradas' ? 1 : type === 'lancamentos' ? 0 : -1);
        const columns: BalancoColumnItem[] | undefined =
          isFaturas
            ? undefined
            : Array.isArray(t.columns)
              ? t.columns.map(c => ({
                  id: c.id || genId(),
                  name: c.name ?? 'Coluna',
                  type: c.type === 'number' ? 'number' : 'text',
                }))
              : type === 'custom'
                ? []
                : undefined;

        const rows: BalancoRowItem[] =
          isFaturas
            ? []
            : Array.isArray(t.rows)
              ? t.rows.map(r => ({
                  id: r.id || genId(),
                  values: r.values ? { ...r.values } : undefined,
                  categoria: r.categoria,
                  profileIdx: r.profileIdx === undefined ? null : r.profileIdx,
                  valor: r.valor !== undefined ? parseFloat(String(r.valor)) || 0 : undefined,
                }))
              : [];

        return {
          id: t.id || genId(),
          name: t.name ?? 'Tabela',
          icon: t.icon ?? '',
          type,
          sign,
          includeInSaldo: type === 'prospectivo' ? false : t.includeInSaldo !== undefined ? Boolean(t.includeInSaldo) : sign !== 0,
          refTableId: t.refTableId,
          columns,
          rows,
        };
      });
  }

  let migratedBancoV1 = Boolean(raw._migratedBancoV1);
  if (!migratedBancoV1) {
    migratedBancoV1 = true;
    if (!balancoTables.find(t => t.id === 'banco')) {
      balancoTables.unshift({
        id: 'banco',
        name: 'Saldo em Conta',
        icon: '',
        type: 'custom',
        columns: [
          { id: 'nome', name: 'Banco / Conta', type: 'text' },
          { id: 'val', name: 'Valor (R$)', type: 'number' },
        ],
        rows: [],
        sign: 1,
        includeInSaldo: true,
      });
    }
  }

  let migratedProspectivoV1 = Boolean(raw._migratedProspectivoV1);
  if (!migratedProspectivoV1) {
    migratedProspectivoV1 = true;
    if (!balancoTables.find(t => t.type === 'prospectivo')) {
      balancoTables.push({
        id: 'prospectivo',
        name: 'Orçamento prospectivo',
        icon: '',
        type: 'prospectivo',
        rows: [],
        sign: 0,
        includeInSaldo: false,
      });
    }
  }

  return {
    _migratedBancoV1: migratedBancoV1,
    _migratedProspectivoV1: migratedProspectivoV1,
    profiles,
    activeProfiles: profiles.length,
    profileCategories,
    entradasProfiles,
    faturas,
    payments,
    pixRows,
    saidas: Array.isArray(raw.saidas) ? raw.saidas : [],
    saldoSectionIndex: raw.saldoSectionIndex !== undefined ? raw.saldoSectionIndex : 999,
    balancoTables,
  };
}

export function loadLocalFinanceState(): FinanceAppState | null {
  try {
    const raw = localStorage.getItem('cf_state');
    if (!raw) return null;
    return migrateFinanceState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveLocalFinanceState(state: FinanceAppState, userId?: string | null): void {
  try {
    localStorage.setItem('cf_state', JSON.stringify(state));
    if (userId) {
      localStorage.setItem('cf_state_uid', userId);
    }
  } catch {
    // Armazenamento indisponível
  }
}

// Remove faturas somente leitura do modo família antes de salvar em finance_data
export function stateForCloud(state: FinanceAppState): FinanceAppState {
  const clone = JSON.parse(JSON.stringify(state)) as FinanceAppState;
  clone.faturas = (clone.faturas || []).filter(f => !f.family);
  return clone;
}

export function getActiveProfiles(state: FinanceAppState): ActiveProfileInfo[] {
  return state.profiles.map((p, idx) => ({
    name: p.name,
    idx,
    linkedUserId: p.linkedUserId || null,
  }));
}

export function getProfileCategories(state: FinanceAppState, pIdx: number | null | undefined): string[] | null {
  if (pIdx === null || pIdx === undefined) return null;
  const cats = state.profileCategories[pIdx];
  return cats && cats.length > 0 ? cats : null;
}

export function defaultCategoryForProfile(state: FinanceAppState, pIdx: number | null | undefined): string | null {
  const cats = getProfileCategories(state, pIdx);
  if (!cats || cats.length === 0) return null;
  return cats.includes('Restaurantes') ? 'Restaurantes' : cats[0];
}

export function shiftIndexedObjectInsert<T>(
  obj: Record<number, T>,
  insertAt: number,
  defaultValue: T,
): Record<number, T> {
  const result: Record<number, T> = {};
  Object.keys(obj || {}).forEach(k => {
    const ki = parseInt(k, 10);
    result[ki >= insertAt ? ki + 1 : ki] = obj[ki];
  });
  result[insertAt] = defaultValue;
  return result;
}

export function shiftIndexedObjectRemove<T>(obj: Record<number, T>, idx: number): Record<number, T> {
  const result: Record<number, T> = {};
  Object.keys(obj || {}).forEach(k => {
    const ki = parseInt(k, 10);
    if (ki === idx) return;
    result[ki > idx ? ki - 1 : ki] = obj[ki];
  });
  return result;
}

export function sortedRowsForDisplay(rows: FaturaRowItem[]): FaturaRowItem[] {
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      const da = a.r.date || '';
      const db = b.r.date || '';
      if (!da && !db) return b.i - a.i;
      if (!da) return -1;
      if (!db) return 1;
      if (da !== db) return da < db ? 1 : -1;
      return b.i - a.i;
    })
    .map(x => x.r);
}

export function getAllRowsByProfileDetailed(state: FinanceAppState, pIdx: number): ProfileExpenseItem[] {
  const rows: ProfileExpenseItem[] = [];
  state.faturas.forEach(f => {
    f.rows.forEach(r => {
      if (r.profileIdx === pIdx && (parseFloat(String(r.value)) || 0) !== 0) {
        rows.push({
          id: r.id,
          date: r.date,
          name: r.name,
          parcelas: r.parcelas,
          value: r.value,
          profileIdx: pIdx,
          category: r.category,
          faturaName: f.name,
          faturaId: f.id,
          kind: 'expense',
          family: Boolean(f.family || r.family),
        });
      }
    });
  });
  state.pixRows.forEach(p => {
    if (p.profileIdx === pIdx && (parseFloat(String(p.value)) || 0) !== 0) {
      rows.push({
        id: p.id,
        date: p.date,
        name: p.desc,
        parcelas: '',
        value: p.value,
        profileIdx: pIdx,
        category: p.category || null,
        faturaName: 'Pix',
        kind: 'pix',
      });
    }
  });
  return rows;
}

export function getAllTransactionsByProfile(state: FinanceAppState, pIdx: number): ProfileTransactionItem[] {
  const expenses: ProfileTransactionItem[] = getAllRowsByProfileDetailed(state, pIdx).map(r => ({
    id: r.id,
    txKind: r.kind,
    txDate: r.date || '',
    name: r.name,
    value: r.value,
    faturaName: r.faturaName,
    faturaId: r.faturaId,
    family: r.family,
  }));
  const payments: ProfileTransactionItem[] = state.payments
    .filter(p => p.profileIdx === pIdx)
    .map(p => ({
      id: p.id,
      txKind: 'payment',
      txDate: p.date || '',
      name: p.desc,
      value: p.value,
    }));
  return [...expenses, ...payments].sort((a, b) => (a.txDate || '').localeCompare(b.txDate || ''));
}

/** Dias até o próximo vencimento (o campo guarda o dia do mês, ex.: "4" ou "dia 4"). Sem dia válido: Infinity. */
export function daysUntilVencimento(venc: string | undefined, today: Date = new Date()): number {
  const m = String(venc ?? '').match(/\d{1,2}/);
  const day = m ? parseInt(m[0], 10) : 0;
  if (day < 1 || day > 31) return Infinity;
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const inMonth = (y: number, mo: number) => new Date(y, mo, Math.min(day, new Date(y, mo + 1, 0).getDate()));
  let due = inMonth(base.getFullYear(), base.getMonth());
  if (due < base) due = inMonth(base.getFullYear(), base.getMonth() + 1);
  return Math.round((due.getTime() - base.getTime()) / 86400000);
}

/** Faturas da mais próxima de vencer para a mais distante (só para exibição; a ordem salva não muda). */
export function sortFaturasByVencimento<T extends { vencimento?: string }>(faturas: T[], today: Date = new Date()): T[] {
  return faturas
    .map((f, i) => ({ f, i, d: daysUntilVencimento(f.vencimento, today) }))
    .sort((a, b) => (a.d === b.d ? a.i - b.i : a.d - b.d))
    .map(x => x.f);
}
