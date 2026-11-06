// src/notificationsApi.js — avisos do app (sino) e push no celular.
//
// Os avisos moram na tabela `notifications` do Supabase (SQL "notificacoes-parte-E.sql").
// O push usa o service worker /sw.js + a chave pública VAPID (VITE_VAPID_PUBLIC_KEY).
// Nenhum aviso leva valores em reais no texto: o valor fica em `data` e o app mostra
// (ou mascara) conforme a configuração de privacidade.

import { supabase } from "./supabaseClient";
import { vencimentosProximos, textoVencimento } from "./lembretes";

const VAPID = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_VAPID_PUBLIC_KEY) || "";

export const KIND_ICON = { gasto: "wallet", mes_fechado: "calendar", mes_pago: "check", familia_entrada: "user", vencimento: "clock" };

// ── Lista, leitura e tempo real ────────────────────────────────────────────
export async function fetchNotifications(limit = 40) {
  const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}
export async function markRead(ids) {
  if (!ids || !ids.length) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
}
export async function markAllRead(userId) {
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
}
// Avisos já lidos há mais de 60 dias saem da caixa (não cresce para sempre)
export async function cleanupOld(userId) {
  try {
    const cut = new Date(Date.now() - 60 * 86400000).toISOString();
    await supabase.from("notifications").delete().eq("user_id", userId).not("read_at", "is", null).lt("created_at", cut);
  } catch { /* sem problema: tenta na próxima */ }
}
export function subscribeNotifications(userId, onInsert) {
  if (!supabase || typeof supabase.channel !== "function") return () => {};
  try {
    const ch = supabase.channel("notif-" + userId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: "user_id=eq." + userId }, (p) => onInsert && onInsert(p.new))
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch { /* ignora */ } };
  } catch { return () => {}; }
}

// ── Lembretes de vencimento (criados aqui, a partir das faturas guardadas neste aparelho) ──
export function localDateISO(d = new Date()) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
export async function syncVencimentos(userId) {
  try {
    // o cache das finanças só vale se for desta conta
    if (localStorage.getItem("cf_state_uid") !== userId) return 0;
    const st = JSON.parse(localStorage.getItem("cf_state") || "null");
    if (!st || !Array.isArray(st.faturas)) return 0;
    const rows = vencimentosProximos(st.faturas, localDateISO()).map((v) => {
      const t = textoVencimento(v);
      return { user_id: userId, kind: "vencimento", title: t.title, body: t.body, data: t.data, dedupe_key: t.dedupe_key };
    });
    if (!rows.length) return 0;
    // ignoreDuplicates: o mesmo vencimento não é avisado duas vezes (nem pelo app, nem pela função agendada)
    const { error } = await supabase.from("notifications").upsert(rows, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true });
    if (error) { console.error("Lembretes de vencimento:", error); return 0; }
    return rows.length;
  } catch (e) { console.error(e); return 0; }
}
export async function sendTestNotification(userId) {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId, kind: "vencimento", title: "Aviso de teste", body: "Se você está vendo isto, os avisos estão funcionando.",
    dedupe_key: "teste:" + Date.now(), data: { teste: true },
  });
  if (error) throw error;
}

// ── Texto na tela ──────────────────────────────────────────────────────────
export function timeAgo(iso, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "agora";
  const m = Math.round(s / 60); if (m < 60) return "há " + m + " min";
  const h = Math.round(m / 60); if (h < 24) return "há " + h + " h";
  const d = Math.round(h / 24); if (d === 1) return "ontem";
  if (d < 7) return "há " + d + " dias";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
export function brl(v) { return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
// Valor do aviso (gasto / mês fechado), ou null quando o aviso não tem valor
export function noticeAmount(n) {
  const d = n && n.data;
  if (!d || d.total == null || !(n.kind === "gasto" || n.kind === "mes_fechado")) return null;
  return Number(d.total);
}

// ── Push no celular ────────────────────────────────────────────────────────
export function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); }
export function isStandalone() {
  try { return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true; } catch { return false; }
}
export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}
// 'ligado' | 'desligado' | 'bloqueado' | 'nao-configurado' | 'ios-instalar' | 'sem-suporte'
export async function getPushStatus() {
  if (!pushSupported()) return isIOS() && !isStandalone() ? "ios-instalar" : "sem-suporte";
  if (!VAPID) return "nao-configurado";
  if (Notification.permission === "denied") return "bloqueado";
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = reg && (await reg.pushManager.getSubscription());
    return sub && Notification.permission === "granted" ? "ligado" : "desligado";
  } catch { return "desligado"; }
}
function b64ToU8(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
export async function enablePush(userId) {
  if (!pushSupported() || !VAPID) throw new Error("push-indisponivel");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("permissao-negada");
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  // Sempre uma inscrição nova: se este navegador já foi usado por outra conta, o endpoint antigo
  // continua ligado a ela, e reaproveitá-lo faria os avisos de uma conta caírem na outra.
  const old = await reg.pushManager.getSubscription();
  if (old) { try { await old.unsubscribe(); } catch { /* segue */ } }
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(VAPID) });
  const j = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: userId, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_agent: (navigator.userAgent || "").slice(0, 200) },
    { onConflict: "endpoint" });
  if (error) { try { await sub.unsubscribe(); } catch { /* ignora */ } throw error; }
}
// Tira ESTE aparelho da lista de push (desligar, sair da conta) — precisa rodar ANTES de sair da sessão
export async function disablePush() {
  try {
    if (!pushSupported()) return;
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = reg && (await reg.pushManager.getSubscription());
    if (!sub) return;
    try { await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint); } catch { /* ignora */ }
    await sub.unsubscribe();
  } catch (e) { console.error(e); }
}
// Reaproveita a inscrição se o navegador a trocou sozinho (acontece de tempos em tempos)
export async function ensureServiceWorker() {
  try {
    if (!pushSupported() || Notification.permission !== "granted") return;
    await navigator.serviceWorker.register("/sw.js");
  } catch { /* ignora */ }
}
// O manifest e o ícone fazem o app poder ser "instalado" (obrigatório para push no iPhone)
export function ensurePwaTags() {
  try {
    const add = (rel, href) => { if (!document.querySelector('link[rel="' + rel + '"]')) { const l = document.createElement("link"); l.rel = rel; l.href = href; document.head.appendChild(l); } };
    add("manifest", "/manifest.webmanifest");
    add("apple-touch-icon", "/icon-192.png");
  } catch { /* ignora */ }
}
