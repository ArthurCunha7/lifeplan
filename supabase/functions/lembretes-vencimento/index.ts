// Função "lembretes-vencimento": roda 1 vez por dia (agendada) e cria o aviso "Fatura X vence
// em N dias" para quem ativou o push — assim o lembrete chega mesmo com o app fechado.
// O aviso criado aqui dispara o "enviar-push" pelo mesmo Database Webhook.
//
// Quem não ativou o push recebe o mesmo lembrete quando abre o app (o app cria a linha sozinho,
// com a mesma chave anti-duplicidade, então ninguém é avisado duas vezes).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { vencimentosProximos, textoVencimento } from "../_shared/vencimentos.js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";
const supa = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// "hoje" no horário de Brasília (UTC-3, sem horário de verão)
function hojeBrasilia(): string {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (!SECRET || req.headers.get("x-webhook-secret") !== SECRET) return json({ error: "forbidden" }, 403);
  const hoje = hojeBrasilia();

  // só quem tem aparelho cadastrado (os demais recebem o lembrete ao abrir o app)
  const { data: subs, error: e1 } = await supa.from("push_subscriptions").select("user_id");
  if (e1) return json({ error: e1.message }, 500);
  const users = [...new Set((subs ?? []).map((s: any) => s.user_id))];

  let criados = 0, lidos = 0;
  for (let i = 0; i < users.length; i += 100) {
    const lote = users.slice(i, i + 100);
    const { data: rows, error } = await supa.from("finance_data").select("user_id, data").in("user_id", lote);
    if (error) { console.error(error.message); continue; }
    const novos: any[] = [];
    (rows ?? []).forEach((r: any) => {
      lidos++;
      vencimentosProximos(r.data?.faturas ?? [], hoje).forEach((v: any) => {
        const t = textoVencimento(v);
        novos.push({ user_id: r.user_id, kind: "vencimento", title: t.title, body: t.body, data: t.data, dedupe_key: t.dedupe_key });
      });
    });
    if (novos.length) {
      // ignoreDuplicates: quem já foi avisado desse vencimento não é avisado de novo
      const { data: inseridos, error: e2 } = await supa.from("notifications")
        .upsert(novos, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true }).select("id");
      if (e2) console.error(e2.message); else criados += inseridos?.length ?? 0;
    }
  }
  return json({ ok: true, hoje, usuarios: lidos, avisos_criados: criados });
});
