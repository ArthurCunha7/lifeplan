// Função "enviar-push": manda o push para os aparelhos da pessoa quando um aviso novo
// é criado na tabela notifications. É chamada por um Database Webhook (INSERT em notifications).
//
// Segurança: só aceita chamadas com o cabeçalho x-webhook-secret igual ao segredo WEBHOOK_SECRET.
// Privacidade: o push leva só título e texto do aviso (que nunca têm valores em reais).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:contato@exemplo.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

const supa = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (!SECRET || req.headers.get("x-webhook-secret") !== SECRET) return json({ error: "forbidden" }, 403);

  let payload: any;
  try { payload = await req.json(); } catch { return json({ error: "json inválido" }, 400); }
  const rec = payload?.record;
  if (payload?.type !== "INSERT" || !rec?.user_id) return json({ ok: true, ignorado: true });

  const { data: subs, error } = await supa
    .from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", rec.user_id);
  if (error) return json({ error: error.message }, 500);
  if (!subs?.length) return json({ ok: true, aparelhos: 0 });

  const msg = JSON.stringify({ id: rec.id, title: rec.title, body: rec.body || "", tag: rec.kind, url: "/" });
  let enviados = 0;
  const mortos: string[] = [];

  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, msg, { TTL: 60 * 60 * 24 });
      enviados++;
    } catch (e: any) {
      // 404/410 = o aparelho cancelou ou o navegador apagou a inscrição: limpa da lista
      if (e?.statusCode === 404 || e?.statusCode === 410) mortos.push(s.id);
      else console.error("push falhou", s.endpoint.slice(0, 40), e?.statusCode, e?.body);
    }
  }));

  if (mortos.length) await supa.from("push_subscriptions").delete().in("id", mortos);
  return json({ ok: true, enviados, removidos: mortos.length });
});
