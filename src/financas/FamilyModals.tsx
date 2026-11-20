// src/financas/FamilyModals.tsx — Cartões e modais do Modo Família
import { useState, useEffect } from 'react';
import {
  FinanceIcon,
  fmtMoney,
  formatDateBR,
  monthLabelFromISO,
  todayLocalISO,
} from './FinanceIcons';
import {
  closingsOf,
  createFamilyClosing,
  deleteFamilyClosing,
  desiredCharges,
  groupByPeriod,
  updateClosingPaid,
} from './familySync';
import type {
  FamilyClosingRecord,
  FamilyMemberOverview,
  FamilyPaidPeriod,
  FamilyPeriodGroup,
  FinanceAppState,
} from './financeTypes';

export function FamilyChoiceCard({
  busy,
  onCreateFamily,
  onJoinFamily,
}: {
  busy: boolean;
  onCreateFamily: () => void;
  onJoinFamily: (code: string) => void;
}) {
  const [showJoin, setShowJoin] = useState(false);
  const [code, setCode] = useState('');

  return (
    <div id="family-choice-card" style={{ margin: '0 0 16px' }}>
      <div
        className="card"
        style={{
          padding: 20,
          textAlign: 'center',
          background: 'var(--accent-soft)',
          borderColor: 'transparent',
        }}
      >
        <div style={{ color: 'var(--accent)', marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
          <FinanceIcon name="users" size={36} strokeWidth={1.5} />
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            fontWeight: 500,
            color: 'var(--text)',
            marginBottom: 6,
          }}
        >
          Modo família
        </div>
        <div
          style={{
            fontSize: 14,
            color: 'var(--text-2)',
            marginBottom: 16,
            maxWidth: 420,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          Divida gastos de cartão com alguém da família. Cada pessoa continua vendo só as próprias finanças. Alguém já te mandou um código de convite?
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            id="fam-create-btn"
            type="button"
            className="btn btn-primary"
            style={{ padding: '12px 18px' }}
            disabled={busy}
            onClick={onCreateFamily}
          >
            Ativar meu modo família
          </button>
          <button
            id="fam-join-toggle-btn"
            type="button"
            className="btn btn-ghost"
            style={{ padding: '12px 18px', background: 'var(--surface)' }}
            disabled={busy}
            onClick={() => setShowJoin(s => !s)}
          >
            Tenho um código de convite
          </button>
        </div>
        {showJoin && (
          <div id="fam-join-form" style={{ maxWidth: 360, margin: '14px auto 0' }}>
            <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 10 }}>
              Ao entrar, o líder poderá lançar gastos do cartão dele para você. Ele não vê as suas finanças.
            </div>
            <input
              id="fam-code-input"
              type="text"
              placeholder="FAM-XXXXXX"
              value={code}
              onChange={e => setCode(e.target.value)}
              style={{
                width: '100%',
                padding: 12,
                border: '1px solid var(--border)',
                borderRadius: 12,
                textAlign: 'center',
                fontFamily: 'var(--font-body)',
                fontVariantNumeric: 'tabular-nums',
                fontSize: 14,
                textTransform: 'uppercase',
                boxSizing: 'border-box',
                marginBottom: 10,
              }}
            />
            <button
              id="fam-join-btn"
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', padding: 12 }}
              disabled={busy || !code.trim()}
              onClick={() => {
                if (code.trim()) onJoinFamily(code.trim());
              }}
            >
              Entrar no modo família
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FamilyExplainDetails({ isLeader }: { isLeader: boolean }) {
  const shared = isLeader
    ? [
        'Cada lançamento que você atrela a um membro: ele vê, só para leitura.',
        'O fechamento do mês e se já foi marcado como pago.',
        'Os avisos de novo lançamento, de fechamento e de pagamento chegam para o membro.',
      ]
    : [
        'Cada lançamento que o líder atrela a você: aparece na aba Faturas, só para leitura.',
        'O fechamento do mês e se o líder já marcou como pago.',
        'Você recebe um aviso quando o líder lança, fecha ou marca como pago.',
      ];

  const mine = isLeader
    ? [
        'Suas outras faturas, entradas, saldo, planejamento e Pix.',
        'Tudo o que o membro tem na conta dele: você não vê.',
        'O membro só aparece para você pelo e-mail e pelo total que você já lançou.',
      ]
    : [
        'Suas outras faturas, entradas, saldo, planejamento e Pix.',
        'O líder não vê as suas finanças. Ele só vê que você entrou e o total que ele mesmo lançou.',
        'Hábitos, dieta, treinos e estudos nunca são compartilhados.',
      ];

  const who = isLeader
    ? 'Só você, como líder, lança, edita, fecha o mês e marca como pago. O membro apenas lê.'
    : 'Só o líder lança, edita, fecha o mês e marca como pago. Você apenas lê. Para corrigir algo, fale com ele.';

  return (
    <details
      className="fam-explain"
      style={{ marginTop: 12, borderTop: '1px solid var(--border2)', paddingTop: 10 }}
    >
      <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>Quem vê o quê</summary>
      <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
        <div style={{ fontWeight: 700, fontSize: 13, margin: '10px 0 2px', color: 'var(--text)' }}>
          O que é compartilhado
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {shared.map((item, i) => (
            <li key={i} style={{ margin: '3px 0' }}>
              {item}
            </li>
          ))}
        </ul>
        <div style={{ fontWeight: 700, fontSize: 13, margin: '10px 0 2px', color: 'var(--text)' }}>
          O que continua só seu
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {mine.map((item, i) => (
            <li key={i} style={{ margin: '3px 0' }}>
              {item}
            </li>
          ))}
        </ul>
        <div style={{ fontWeight: 700, fontSize: 13, margin: '10px 0 2px', color: 'var(--text)' }}>
          Quem pode alterar
        </div>
        <div>{who}</div>
      </div>
    </details>
  );
}

export function FamilySummaryCard({
  familyId,
  isLeader,
  familyInviteCode,
  familyPaidPeriods,
  masked,
  onOpenFamilyAccounts,
}: {
  familyId: string | null;
  isLeader: boolean;
  familyInviteCode: string | null;
  familyPaidPeriods: FamilyPaidPeriod[];
  masked: boolean;
  onOpenFamilyAccounts: () => void;
}) {
  if (!familyId) return null;

  const handleCopyCode = () => {
    if (!familyInviteCode) {
      alert('O código ainda não carregou. Aguarde um instante e tente de novo.');
      return;
    }
    navigator.clipboard
      .writeText(familyInviteCode)
      .then(() => {
        alert('Código copiado! Envie para quem você quer convidar para o modo família.');
      })
      .catch(() => {
        window.prompt('Copie o código abaixo:', familyInviteCode);
      });
  };

  return (
    <div className="card" id="family-card" style={{ padding: 16, marginBottom: 12 }}>
      <div id="family-card-body">
        {isLeader ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <strong style={{ fontSize: 16 }}>Modo família</strong>
              <span className="badge">Você é o líder</span>
            </div>
            <ol
              style={{
                fontSize: 14,
                color: 'var(--text-2)',
                margin: '0 0 12px',
                paddingLeft: 20,
                lineHeight: 1.5,
              }}
            >
              <li>Envie o código de convite para a pessoa entrar.</li>
              <li>
                Em <strong>Gerenciar perfis</strong>, atrele um perfil seu a cada membro.
              </li>
              <li>Quando ele comprar no seu cartão, lance na sua fatura e escolha o perfil dele.</li>
              <li>No fim do mês, feche o mês dele e marque como pago quando ele quitar.</li>
            </ol>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Código de convite:</span>
              <span
                id="family-invite-code"
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: 'var(--accent-dark)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {familyInviteCode || '—'}
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleCopyCode}>
                Copiar
              </button>
            </div>
            <button type="button" className="btn btn-primary" onClick={onOpenFamilyAccounts}>
              Ver extrato da família
            </button>
            <FamilyExplainDetails isLeader={true} />
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <strong style={{ fontSize: 16 }}>Modo família</strong>
              <span className="badge">Membro</span>
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>
              Quando o líder lançar um gasto do cartão dele para você, ele aparece na aba Faturas e entra no seu saldo do mês. Quando ele fechar o mês, o valor fica a pagar até ele marcar como pago.
            </div>
            {familyPaidPeriods.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 13, color: 'var(--muted)' }}>
                Meses já quitados no histórico:{' '}
                <strong>
                  {familyPaidPeriods.length} (
                  {fmtMoney(
                    familyPaidPeriods.reduce(
                      (s, p) => s + p.rows.reduce((u, r) => u + (Number(r.value) || 0), 0),
                      0,
                    ),
                    masked,
                  )}
                  )
                </strong>
              </div>
            )}
            <FamilyExplainDetails isLeader={false} />
          </>
        )}
      </div>
    </div>
  );
}

function CloseMonthForm({
  familyId,
  leaderId,
  memberId,
  period,
  latestClosing,
  masked,
  onCreated,
  onCancel,
}: {
  familyId: string;
  leaderId: string;
  memberId: string;
  period: FamilyPeriodGroup;
  latestClosing: FamilyClosingRecord | null;
  masked: boolean;
  onCreated: (closing: FamilyClosingRecord) => void;
  onCancel: () => void;
}) {
  const [cutoff, setCutoff] = useState(() => todayLocalISO());
  const [label, setLabel] = useState(() => monthLabelFromISO(todayLocalISO()));
  const [labelTouched, setLabelTouched] = useState(false);
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const inside = period.rows.filter(c => c.date && c.date <= cutoff);
  const undated = period.rows.filter(c => !c.date).length;
  const afterCount = period.rows.length - inside.length - undated;

  const previewText = !cutoff
    ? ''
    : `${inside.length} ${inside.length === 1 ? 'gasto entra' : 'gastos entram'} neste mês (${fmtMoney(
        inside.reduce((t, c) => t + c.value, 0),
        masked,
      )}).${afterCount > 0 ? ` Os de depois de ${formatDateBR(cutoff)} ficam no próximo mês.` : ''}${
        undated ? ` ${undated} sem data continuam em aberto.` : ''
      }`;

  const handleSubmit = async () => {
    if (!cutoff) {
      setErr('Escolha a data de corte.');
      return;
    }
    if (latestClosing && cutoff <= String(latestClosing.cutoff)) {
      setErr(`Já existe um fechamento até ${formatDateBR(latestClosing.cutoff)}. Escolha uma data depois dela.`);
      return;
    }
    setSubmitting(true);
    setErr('');
    const finalLabel = label.trim() || monthLabelFromISO(cutoff);
    const res = await createFamilyClosing({
      familyId,
      leaderId,
      memberId,
      cutoff,
      label: finalLabel,
    });
    setSubmitting(false);
    if (res.error || !res.closing) {
      setErr(`Não foi possível fechar o mês: ${res.error?.message || 'erro desconhecido'}`);
      return;
    }
    onCreated(res.closing);
  };

  return (
    <div
      className="close-form"
      style={{
        margin: '0 18px 12px',
        padding: 12,
        border: '1px solid var(--border)',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        background: 'var(--surface2)',
      }}
    >
      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
        Fechar o mês até (data de corte)
      </label>
      <input
        type="date"
        value={cutoff}
        onChange={e => {
          const d = e.target.value;
          setCutoff(d);
          setErr('');
          if (!labelTouched) setLabel(monthLabelFromISO(d));
        }}
        style={{
          minHeight: 44,
          padding: '6px 10px',
          border: '1px solid var(--border)',
          borderRadius: 8,
          background: 'var(--surface)',
          color: 'var(--text)',
          fontSize: 14,
        }}
      />
      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Nome do mês</label>
      <input
        type="text"
        maxLength={40}
        value={label}
        onChange={e => {
          setLabelTouched(true);
          setLabel(e.target.value);
        }}
        style={{
          minHeight: 44,
          padding: '6px 10px',
          border: '1px solid var(--border)',
          borderRadius: 8,
          background: 'var(--surface)',
          color: 'var(--text)',
          fontSize: 14,
        }}
      />
      {previewText && <div style={{ fontSize: 13, color: 'var(--muted)' }}>{previewText}</div>}
      {err && <div style={{ fontSize: 13, color: 'var(--danger)' }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn-primary btn-sm" disabled={submitting} onClick={handleSubmit}>
          Fechar mês
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={submitting} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function FamilyAccountsModal({
  open,
  onClose,
  state,
  familyId,
  leaderId,
  leaderLabel,
  familyMembers,
  familyClosings,
  familyClosingsOk,
  masked,
  onToggleMask,
  onLinkProfileToMember,
  onClosingsChange,
}: {
  open: boolean;
  onClose: () => void;
  state: FinanceAppState;
  familyId: string | null;
  leaderId: string | null;
  leaderLabel: string;
  familyMembers: FamilyMemberOverview[];
  familyClosings: FamilyClosingRecord[];
  familyClosingsOk: boolean;
  masked: boolean;
  onToggleMask: () => void;
  onLinkProfileToMember: (memberUserId: string, profileIdx: number | null) => void;
  onClosingsChange: (next: FamilyClosingRecord[]) => void;
}) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [closeFormOpen, setCloseFormOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedMemberId(null);
      setCloseFormOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !familyId || !leaderId) return null;

  const allCharges = [...desiredCharges(state, familyId, leaderId, leaderLabel, familyMembers).values()];

  const handleTogglePaid = async (cl: FamilyClosingRecord, paid: boolean) => {
    const res = await updateClosingPaid(cl.id, paid);
    if (res.error) {
      alert(`Não foi possível atualizar: ${res.error.message}`);
      return;
    }
    onClosingsChange(
      familyClosings.map(c => (c.id === cl.id ? { ...c, paid_at: res.paidAt } : c)),
    );
  };

  const handleReopen = async (cl: FamilyClosingRecord) => {
    if (!window.confirm(`Reabrir "${cl.label || 'este mês'}"? Os gastos dele voltam para o mês em aberto.`)) {
      return;
    }
    const res = await deleteFamilyClosing(cl.id);
    if (res.error) {
      alert(`Não foi possível reabrir: ${res.error.message}`);
      return;
    }
    onClosingsChange(familyClosings.filter(c => c.id !== cl.id));
  };

  const renderOverview = () => {
    if (familyMembers.length === 0) {
      return <div className="empty">Ainda não há membros. Envie o código de convite para alguém entrar.</div>;
    }

    const summaryByMember: Record<string, { n: number; sum: number; closedUnpaid: number }> = {};
    familyMembers.forEach(m => {
      const x = { n: 0, sum: 0, closedUnpaid: 0 };
      summaryByMember[m.user_id] = x;
      groupByPeriod(
        allCharges.filter(c => c.member_id === m.user_id),
        closingsOf(familyClosings, leaderId, m.user_id),
      ).forEach(per => {
        if (per.closing && per.closing.paid_at) return;
        if (per.closing) x.closedUnpaid++;
        per.rows.forEach(c => {
          x.n++;
          x.sum += c.value;
        });
      });
    });

    return (
      <>
        <div
          style={{
            padding: '12px 18px',
            fontSize: 13,
            color: 'var(--muted)',
            borderBottom: '1px solid var(--border2)',
          }}
        >
          Os gastos que você lançou nos perfis atrelados a cada membro.
        </div>
        {familyMembers.map(m => {
          const x = summaryByMember[m.user_id] || { n: 0, sum: 0, closedUnpaid: 0 };
          const linked = state.profiles.some(p => p.linkedUserId === m.user_id);
          const subtitle = linked
            ? `${x.n} ${x.n === 1 ? 'lançamento' : 'lançamentos'}${
                x.closedUnpaid
                  ? ` · ${x.closedUnpaid} ${x.closedUnpaid === 1 ? 'fechamento a pagar' : 'fechamentos a pagar'}`
                  : ''
              }`
            : 'Nenhum perfil atrelado ainda';

          return (
            <button
              key={m.user_id}
              type="button"
              className="saldo-line"
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                borderBottom: '1px solid var(--border2)',
                textAlign: 'left',
                fontFamily: 'inherit',
                color: 'inherit',
              }}
              onClick={() => {
                setSelectedMemberId(m.user_id);
                setCloseFormOpen(false);
              }}
            >
              <span className="row-ic">
                <FinanceIcon name="users" size={20} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="row-name" style={{ display: 'block', overflowWrap: 'anywhere' }}>
                  {m.email || 'Sem e-mail'}
                </span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{subtitle}</span>
              </span>
              <span className="val-cell" style={{ fontWeight: 700 }}>
                {fmtMoney(x.sum, masked)}
              </span>
            </button>
          );
        })}
      </>
    );
  };

  const renderMemberDetail = (uid: string) => {
    const member = familyMembers.find(x => x.user_id === uid) || { user_id: uid, email: 'Membro' };
    const list = allCharges
      .filter(c => c.member_id === uid)
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    const closings = closingsOf(familyClosings, leaderId, uid);
    const periods = groupByPeriod(list, closings);
    const latest = closings.length > 0 ? closings[closings.length - 1] : null;
    const pending = periods.reduce(
      (t, per) => t + (per.closing && per.closing.paid_at ? 0 : per.rows.reduce((u, c) => u + c.value, 0)),
      0,
    );
    const curIdx = state.profiles.findIndex(p => p.linkedUserId === uid);

    return (
      <>
        <div
          style={{
            padding: '10px 12px',
            borderBottom: '1px solid var(--border2)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            id="fam-back"
            onClick={() => {
              setSelectedMemberId(null);
              setCloseFormOpen(false);
            }}
          >
            ← Todos
          </button>
          <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere', fontWeight: 600 }}>
            {member.email}
          </span>
          <span
            className="val-cell"
            style={{ fontWeight: 700 }}
            title="A receber: em aberto + meses fechados ainda não pagos"
          >
            {fmtMoney(pending, masked)}
          </span>
        </div>

        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--border2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
            Perfil desta pessoa
          </label>
          <select
            aria-label={`Perfil atrelado a ${member.email || 'membro'}`}
            value={curIdx >= 0 ? String(curIdx) : ''}
            onChange={e => {
              const v = e.target.value;
              onLinkProfileToMember(uid, v === '' ? null : Number(v));
            }}
            style={{
              minHeight: 44,
              padding: '6px 10px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: 14,
              width: '100%',
            }}
          >
            <option value="">Escolha um perfil…</option>
            {state.profiles.map((p, i) => (
              <option key={i} value={String(i)}>
                {p.name || `Perfil ${i + 1}`}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {curIdx >= 0
              ? `Na aba Faturas, todo gasto lançado no perfil "${state.profiles[curIdx]?.name || ''}" vai para esta pessoa.`
              : 'Escolha um perfil. Depois, na aba Faturas, todo gasto lançado nesse perfil vai para esta pessoa.'}
          </div>
        </div>

        {!familyClosingsOk && (
          <div
            style={{
              padding: '10px 18px',
              fontSize: 13,
              color: 'var(--danger)',
              borderBottom: '1px solid var(--border2)',
            }}
          >
            Fechar mês ainda não está disponível: rode o SQL do esquema no Supabase.
          </div>
        )}

        {periods.map(per => {
          const cl = per.closing;
          const tot = per.rows.reduce((t, c) => t + c.value, 0);
          const title = cl ? cl.label || 'Fechamento' : 'Em aberto';
          const meta = cl
            ? `até ${formatDateBR(cl.cutoff)}${
                cl.paid_at ? ` · pago em ${formatDateBR(String(cl.paid_at).slice(0, 10))}` : ' · a pagar'
              }`
            : latest
              ? `gastos depois de ${formatDateBR(latest.cutoff)}`
              : 'ainda sem fechamento';
          const sortedRows = per.rows
            .slice()
            .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));

          return (
            <div
              key={cl ? cl.id : 'aberto'}
              className="family-period"
              data-period={cl ? cl.id : 'aberto'}
              style={{ borderBottom: '1px solid var(--border2)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px 6px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{meta}</div>
                </div>
                <span className="val-cell" style={{ fontWeight: 700 }}>
                  {fmtMoney(tot, masked)}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0 18px 10px' }}>
                {!cl ? (
                  familyClosingsOk &&
                  !closeFormOpen && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setCloseFormOpen(true)}
                    >
                      Fechar mês…
                    </button>
                  )
                ) : cl.paid_at ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleTogglePaid(cl, false)}
                  >
                    Desfazer pago
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleTogglePaid(cl, true)}
                    >
                      Marcar como pago
                    </button>
                    {latest && cl.id === latest.id && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleReopen(cl)}
                      >
                        Reabrir mês
                      </button>
                    )}
                  </>
                )}
              </div>

              {!cl && closeFormOpen && (
                <CloseMonthForm
                  familyId={familyId}
                  leaderId={leaderId}
                  memberId={uid}
                  period={per}
                  latestClosing={latest}
                  masked={masked}
                  onCreated={newClosing => {
                    onClosingsChange([...familyClosings, newClosing]);
                    setCloseFormOpen(false);
                  }}
                  onCancel={() => setCloseFormOpen(false)}
                />
              )}

              {sortedRows.length > 0 ? (
                sortedRows.map(c => {
                  const sub = [c.date ? formatDateBR(c.date) : '', c.category, c.fatura_name]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <div
                      key={c.source_id}
                      className="saldo-line"
                      style={{ cursor: 'default', minHeight: 56 }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="row-name" style={{ overflowWrap: 'anywhere' }}>
                          {c.description || 'Gasto'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', overflowWrap: 'anywhere' }}>
                          {sub}
                        </div>
                      </div>
                      <span className="val-cell negative" style={{ fontWeight: 700 }}>
                        {fmtMoney(c.value, masked)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="empty">
                  {cl ? 'Nenhum lançamento neste fechamento.' : 'Nenhum lançamento em aberto.'}
                </div>
              )}
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div
      id="family-view"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(16, 22, 18, 0.55)',
        zIndex: 2500,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '24px 12px',
        overflowY: 'auto',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Extrato da família"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          width: '100%',
          maxWidth: 640,
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '12px 12px 12px 18px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              fontWeight: 500,
              minWidth: 0,
              overflowWrap: 'anywhere',
            }}
          >
            Extrato da família
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              id="fam-eye"
              aria-label={masked ? 'Mostrar valores' : 'Ocultar valores'}
              onClick={onToggleMask}
            >
              <FinanceIcon name={masked ? 'eyeOff' : 'eye'} />
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              aria-label="Fechar"
              onClick={onClose}
            >
              <FinanceIcon name="x" />
            </button>
          </div>
        </div>
        <div id="family-view-body">
          {selectedMemberId ? renderMemberDetail(selectedMemberId) : renderOverview()}
        </div>
      </div>
    </div>
  );
}
