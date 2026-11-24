// src/financas/financeTypes.ts — Tipos estritos do módulo nativo de Finanças
import type { FinanceState } from '../types';

export type FinanceTabId = 'faturas' | 'resumo' | 'balanco';

export type IconName =
  | 'search'
  | 'x'
  | 'plus'
  | 'check'
  | 'eye'
  | 'eyeOff'
  | 'trash'
  | 'copy'
  | 'camera'
  | 'image'
  | 'fileText'
  | 'users'
  | 'user'
  | 'trendUp'
  | 'trendDown'
  | 'landmark'
  | 'card'
  | 'utensils'
  | 'car'
  | 'scissors'
  | 'gift'
  | 'dots'
  | 'home'
  | 'book'
  | 'leaf'
  | 'dumbbell'
  | 'wallet'
  | 'link'
  | 'chevron';

export interface ProfileItem {
  name: string;
  linkedUserId: string | null;
}

export interface ActiveProfileInfo {
  name: string;
  idx: number;
  linkedUserId: string | null;
}

export interface FaturaRowItem {
  id: string;
  date: string;
  name: string;
  parcelas: string;
  value: number | string;
  profileIdx: number | null;
  category: string | null;
  family?: boolean;
  receiptPath?: string;
  faturaOrigem?: string;
}

export interface FaturaClosingSummary {
  id: string;
  cutoff: string;
  label: string | null;
}

export interface FaturaItem {
  id: string;
  name: string;
  fechamento?: string;
  vencimento?: string;
  family?: boolean;
  kind?: string;
  who?: string;
  closing?: FaturaClosingSummary | null;
  rows: FaturaRowItem[];
}

export interface PixRowItem {
  id: string;
  date: string;
  desc: string;
  value: number;
  profileIdx: number | null;
  category: string | null;
  receiptPath?: string;
}

export interface PaymentItem {
  id: string;
  profileIdx: number | null;
  desc: string;
  value: number;
  date: string;
}

export interface BalancoColumnItem {
  id: string;
  name: string;
  type: 'text' | 'number';
}

export interface BalancoRowItem {
  id: string;
  values?: Record<string, string | number>;
  categoria?: string;
  profileIdx?: number | null;
  valor?: number;
}

export type BalancoTableType = 'entradas' | 'lancamentos' | 'faturas_auto' | 'planejamento' | 'custom' | 'prospectivo';

export interface BalancoTableItem {
  id: string;
  name: string;
  icon: string;
  type: BalancoTableType;
  sign: -1 | 0 | 1;
  includeInSaldo: boolean;
  refTableId?: string;
  columns?: BalancoColumnItem[];
  rows: BalancoRowItem[];
}

export interface FinanceAppState extends FinanceState {
  _isFreshDefault?: boolean;
  _migratedBancoV1?: boolean;
  _migratedProspectivoV1?: boolean;
  profiles: ProfileItem[];
  activeProfiles: number;
  profileCategories: Record<number, string[]>;
  entradasProfiles: Record<number, boolean>;
  faturas: FaturaItem[];
  payments: PaymentItem[];
  pixRows: PixRowItem[];
  saidas?: unknown[];
  saldoSectionIndex: number;
  balancoTables: BalancoTableItem[];
}

export interface ProfileExpenseItem {
  id: string;
  date: string;
  name: string;
  parcelas: string;
  value: number | string;
  profileIdx: number;
  category: string | null;
  faturaName: string;
  faturaId?: string;
  kind: 'expense' | 'pix';
  family?: boolean;
}

export interface ProfileTransactionItem {
  id: string;
  txKind: 'expense' | 'pix' | 'payment';
  txDate: string;
  name: string;
  value: number | string;
  faturaName?: string;
  faturaId?: string;
  family?: boolean;
}

export interface FamilyInfo {
  id: string;
  owner_id: string;
  invite_code: string | null;
}

export interface FamilyMemberOverview {
  user_id: string;
  email: string;
}

export interface FamilyChargeRecord {
  id?: string;
  family_id: string;
  leader_id: string;
  member_id: string;
  source_id: string;
  leader_label: string;
  fatura_name: string;
  description: string;
  category: string | null;
  parcelas: string;
  value: number;
  date: string | null;
}

export interface FamilyClosingRecord {
  id: string;
  family_id?: string;
  leader_id: string;
  member_id: string;
  cutoff: string;
  label: string | null;
  paid_at: string | null;
  created_at?: string;
}

export interface FamilyPeriodGroup {
  closing: FamilyClosingRecord | null;
  rows: FamilyChargeRecord[];
}

export interface FamilyPaidPeriod {
  who: string;
  closing: FamilyClosingRecord;
  rows: FaturaRowItem[];
}
