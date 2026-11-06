// Lógica dos lembretes de vencimento de fatura. JavaScript puro, sem dependências:
// a MESMA lógica roda no app (src/lembretes.js é cópia idêntica deste arquivo) e na
// função agendada do Supabase. Se mudar aqui, copie para src/lembretes.js.
//
// As datas são sempre texto "AAAA-MM-DD" no fuso de quem usa (hoje = dia local).

export const JANELA_DIAS = 3; // avisa de 3 dias antes até o dia do vencimento

// O campo "Vencimento" das faturas é texto livre ("17", "dia 12", "dia 5 de cada mês").
// Pega o primeiro número de 1 a 31.
export function parseDiaVencimento(txt) {
  const m = /(\d{1,2})/.exec(String(txt == null ? '' : txt));
  if (!m) return null;
  const d = Number(m[1]);
  return d >= 1 && d <= 31 ? d : null;
}

function diasNoMes(ano, mes) { return new Date(Date.UTC(ano, mes, 0)).getUTCDate(); } // mes: 1..12
function iso(a, m, d) { return a + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }
function partes(s) { return String(s).split('-').map(Number); }

// Próximo vencimento a partir de hoje (hoje conta). Dia 31 em mês curto vira o último dia do mês.
export function proximoVencimento(dia, hojeISO) {
  const [a, m, d] = partes(hojeISO);
  let ano = a, mes = m;
  let dd = Math.min(dia, diasNoMes(ano, mes));
  if (dd < d) {
    mes += 1; if (mes > 12) { mes = 1; ano += 1; }
    dd = Math.min(dia, diasNoMes(ano, mes));
  }
  return iso(ano, mes, dd);
}

export function diasEntre(deISO, ateISO) {
  const [a1, m1, d1] = partes(deISO), [a2, m2, d2] = partes(ateISO);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000);
}

// faturas: [{id, name, vencimento, family?}]. Ignora as faturas "da família" (somente leitura).
export function vencimentosProximos(faturas, hojeISO, janela = JANELA_DIAS) {
  const out = [];
  (faturas || []).forEach(f => {
    if (!f || f.family) return;
    const dia = parseDiaVencimento(f.vencimento);
    if (!dia) return;
    const due = proximoVencimento(dia, hojeISO);
    const dias = diasEntre(hojeISO, due);
    if (dias >= 0 && dias <= janela) out.push({ id: String(f.id), name: f.name || 'Fatura', dia, due, dias });
  });
  return out.sort((x, y) => x.dias - y.dias || x.name.localeCompare(y.name));
}

// Texto do aviso (sem valores) e a chave que impede avisar duas vezes o mesmo vencimento.
export function textoVencimento(v) {
  const quando = v.dias === 0 ? 'vence hoje' : v.dias === 1 ? 'vence amanhã' : 'vence em ' + v.dias + ' dias';
  return {
    title: v.name + ' ' + quando,
    body: 'Vencimento dia ' + v.dia + '. Confira em Finanças.',
    dedupe_key: 'venc:' + v.id + ':' + v.due,
    data: { fatura_id: v.id, due: v.due, dias: v.dias }
  };
}
